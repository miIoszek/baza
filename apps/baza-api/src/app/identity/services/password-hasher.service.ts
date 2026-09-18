import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

/**
 * Algorithm-tagged hashes (`scrypt$N$r$p$salt$hash`): the KDF can be strengthened or replaced by
 * rehashing on the next successful login, with no schema change. scrypt ships with Node (memory-hard,
 * OWASP-recommended); argon2id would be a native addon.
 *
 * Ops note: scrypt runs on libuv's threadpool (default 4). Keep a tight per-route throttle on login;
 * the account-keyed lockout, not CPU cost, is what bounds a stuffing run.
 */
type ScryptOptions = { N: number; r: number; p: number; maxmem: number };

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

export type ScryptParameters = {
  cost: number;
  blockSize: number;
  parallelization: number;
  keyLength: number;
};

/** N=2^15, r=8, p=1 => ~32 MiB and roughly 50-80 ms per hash. */
export const DEFAULT_SCRYPT_PARAMETERS: ScryptParameters = {
  cost: 32_768,
  blockSize: 8,
  parallelization: 1,
  keyLength: 32,
};

export const PASSWORD_PARAMETERS = 'identity:passwordParameters';

const ALGORITHM_TAG = 'scrypt';
const SALT_BYTES = 16;
const ENCODED_SEGMENTS = 6;

@Injectable()
export class PasswordHasherService {
  private readonly logger = new Logger(PasswordHasherService.name);
  private readonly parameters: ScryptParameters;
  /** Verified against when no account matched, so response time never reveals account existence. */
  private readonly dummyHash: Promise<string>;

  constructor(
    @Optional() @Inject(PASSWORD_PARAMETERS) parameters?: ScryptParameters
  ) {
    this.parameters = parameters ?? DEFAULT_SCRYPT_PARAMETERS;
    this.dummyHash = this.hash(randomBytes(32).toString('base64url'));
    this.dummyHash.catch(() => undefined);
  }

  async hash(password: string): Promise<string> {
    const { cost, blockSize, parallelization, keyLength } = this.parameters;
    const salt = randomBytes(SALT_BYTES);
    const derived = await this.derive(
      password,
      salt,
      keyLength,
      cost,
      blockSize,
      parallelization
    );
    return [
      ALGORITHM_TAG,
      cost,
      blockSize,
      parallelization,
      salt.toString('base64'),
      derived.toString('base64'),
    ].join('$');
  }

  /** Constant-time. A malformed stored hash is a data problem: logged, treated as "wrong password". */
  async verify(encodedHash: string, password: string): Promise<boolean> {
    const parsed = this.parse(encodedHash);
    if (!parsed) {
      return false;
    }
    const derived = await this.derive(
      password,
      parsed.salt,
      parsed.expected.length,
      parsed.cost,
      parsed.blockSize,
      parsed.parallelization
    );
    return (
      derived.length === parsed.expected.length &&
      timingSafeEqual(derived, parsed.expected)
    );
  }

  /** Burns the same CPU as `verify` and always returns false. */
  async verifyDummy(password: string): Promise<false> {
    try {
      await this.verify(await this.dummyHash, password);
    } catch (error) {
      this.logger.error(
        'Dummy password verification failed — login timing is no longer uniform',
        error instanceof Error ? error.stack : String(error)
      );
    }
    return false;
  }

  needsRehash(encodedHash: string): boolean {
    const parsed = this.parse(encodedHash);
    if (!parsed) {
      return true;
    }
    const { cost, blockSize, parallelization, keyLength } = this.parameters;
    return (
      parsed.cost !== cost ||
      parsed.blockSize !== blockSize ||
      parsed.parallelization !== parallelization ||
      parsed.expected.length !== keyLength
    );
  }

  private derive(
    password: string,
    salt: Buffer,
    keyLength: number,
    cost: number,
    blockSize: number,
    parallelization: number
  ): Promise<Buffer> {
    // Node's default maxmem (32 MiB) is below what N=2^15,r=8 needs: derive it with headroom.
    const maxmem = 256 * cost * blockSize;
    return scrypt(password, salt, keyLength, {
      N: cost,
      r: blockSize,
      p: parallelization,
      maxmem,
    });
  }

  private parse(encodedHash: string): {
    cost: number;
    blockSize: number;
    parallelization: number;
    salt: Buffer;
    expected: Buffer;
  } | null {
    const segments = encodedHash?.split('$') ?? [];
    if (segments.length !== ENCODED_SEGMENTS || segments[0] !== ALGORITHM_TAG) {
      this.logger.error(
        `Unparseable password hash encoding (segments=${segments.length})`
      );
      return null;
    }
    const [, cost, blockSize, parallelization, salt, expected] = segments;
    const parsed = {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization),
      salt: Buffer.from(salt, 'base64'),
      expected: Buffer.from(expected, 'base64'),
    };
    if (
      !Number.isInteger(parsed.cost) ||
      !Number.isInteger(parsed.blockSize) ||
      !Number.isInteger(parsed.parallelization)
    ) {
      this.logger.error('Password hash carries non-integer scrypt parameters');
      return null;
    }
    return parsed;
  }
}
