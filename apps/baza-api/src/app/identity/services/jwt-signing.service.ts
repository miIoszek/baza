import * as jwt from 'jsonwebtoken';
import { createPublicKey, KeyObject, randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ACCESS_TOKEN_AUDIENCE,
  ACCESS_TOKEN_TTL_SECONDS,
  ACCESS_TOKEN_TYPE,
  IDENTITY_CONFIG,
} from '../identity.constants';
import type { IdentityConfig, SigningKeyStatus } from '../identity.config';

/** Exhaustive by construction: adding a claim means adding a field here, so a reviewer sees it. */
export type AccessTokenClaims = {
  sub: string;
  aud: string;
  iss: string;
  typ: string;
  roles: string[];
  /** Session epoch: a token behind the account's current epoch is dead regardless of `exp`. */
  epc: number;
  jti: string;
  iat: number;
  exp: number;
};

export type MintAccessTokenInput = {
  userId: string;
  roles: string[];
  sessionEpoch: number;
};

export type MintedAccessToken = {
  token: string;
  expiresAt: Date;
  expiresInSeconds: number;
};

type LoadedKey = {
  kid: string;
  status: SigningKeyStatus;
  privateKeyPem: string;
  publicKey: KeyObject;
};

const ALGORITHM = 'ES256';

/**
 * Keyring + explicit claim builder. One `active` key signs; `retiring` keys still verify until their
 * tokens expire, so keys rotate without logging anyone out: add the new key as `active`, demote the
 * old one to `retiring`, drop it after ACCESS_TOKEN_TTL_SECONDS.
 *
 * Claims are an explicit object literal — never a spread of a DTO or row: a single `{ ...input }`
 * here would be a self-service `roles: ['admin']`.
 *
 * Verification is in-process (no JWKS, no network). Only ES256 is accepted and the `kid` pins one
 * key, so the algorithm can never be attacker-influenced.
 */
@Injectable()
export class JwtSigningService {
  private readonly logger = new Logger(JwtSigningService.name);
  private readonly keys = new Map<string, LoadedKey>();
  private readonly activeKey: LoadedKey;
  private readonly issuer: string;

  constructor(@Inject(IDENTITY_CONFIG) config: IdentityConfig) {
    this.issuer = config.issuer;

    for (const key of config.signingKeys) {
      if (this.keys.has(key.kid)) {
        throw new Error(`Duplicate signing key id: ${key.kid}`);
      }
      let publicKey: KeyObject;
      try {
        publicKey = createPublicKey(key.privateKeyPem);
      } catch (error) {
        // Never include key material in the message — only the kid.
        this.logger.error(`Signing key ${key.kid} is not a readable private key`);
        throw error;
      }
      if (
        publicKey.asymmetricKeyType !== 'ec' ||
        publicKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
      ) {
        throw new Error(`Signing key ${key.kid} must be EC P-256`);
      }
      this.keys.set(key.kid, {
        kid: key.kid,
        status: key.status,
        privateKeyPem: key.privateKeyPem,
        publicKey,
      });
    }

    const active = [...this.keys.values()].filter((k) => k.status === 'active');
    if (active.length !== 1) {
      throw new Error(
        `Identity signing keyring must contain exactly one active key (found ${active.length})`
      );
    }
    this.activeKey = active[0];
    this.logger.log(
      `Signing keyring loaded: active=${this.activeKey.kid}, total=${this.keys.size}`
    );
  }

  mintAccessToken(input: MintAccessTokenInput): MintedAccessToken {
    const issuedAt = Math.floor(Date.now() / 1000);
    const exp = issuedAt + ACCESS_TOKEN_TTL_SECONDS;

    const claims: AccessTokenClaims = {
      sub: input.userId,
      aud: ACCESS_TOKEN_AUDIENCE,
      iss: this.issuer,
      typ: ACCESS_TOKEN_TYPE,
      roles: input.roles,
      epc: input.sessionEpoch,
      jti: randomUUID(),
      iat: issuedAt,
      exp,
    };

    const token = jwt.sign(claims, this.activeKey.privateKeyPem, {
      algorithm: ALGORITHM,
      keyid: this.activeKey.kid,
    });

    return {
      token,
      expiresAt: new Date(exp * 1000),
      expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const decoded = jwt.decode(token, { complete: true });
    const kid = decoded?.header?.kid;
    const key = kid ? this.keys.get(kid) : undefined;
    if (!key) {
      this.logger.warn(`Access token with unknown kid=${kid ?? '<none>'}`);
      throw new UnauthorizedException('Invalid token');
    }

    let payload: string | jwt.JwtPayload;
    try {
      payload = jwt.verify(token, key.publicKey, {
        algorithms: [ALGORITHM],
        audience: ACCESS_TOKEN_AUDIENCE,
        issuer: this.issuer,
      });
    } catch (error) {
      this.logger.warn(
        `Access token verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new UnauthorizedException('Invalid token');
    }

    if (
      typeof payload === 'string' ||
      !payload.sub ||
      typeof payload.exp !== 'number' ||
      payload['typ'] !== ACCESS_TOKEN_TYPE
    ) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      sub: payload.sub,
      aud: ACCESS_TOKEN_AUDIENCE,
      iss: this.issuer,
      typ: ACCESS_TOKEN_TYPE,
      roles: Array.isArray(payload['roles']) ? (payload['roles'] as string[]) : [],
      epc: typeof payload['epc'] === 'number' ? (payload['epc'] as number) : 0,
      jti: typeof payload.jti === 'string' ? payload.jti : '',
      iat: typeof payload.iat === 'number' ? payload.iat : 0,
      exp: payload.exp,
    };
  }
}
