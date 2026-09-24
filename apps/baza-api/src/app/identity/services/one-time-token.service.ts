import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import {
  AuthOneTimeToken,
  type OneTimeTokenPurpose,
} from '@baza/api-data-access';
import {
  EMAIL_VERIFICATION_TTL_MS,
  IDENTITY_METRICS,
  PASSWORD_RESET_TTL_MS,
} from '../identity.constants';

export type IssuedOneTimeToken = { token: string; expiresAt: Date };

const TOKEN_BYTES = 32;

const TTL_BY_PURPOSE: Record<OneTimeTokenPurpose, number> = {
  verify_email: EMAIL_VERIFICATION_TTL_MS,
  reset_password: PASSWORD_RESET_TTL_MS,
};

export function hashOneTimeToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Opaque tokens behind "verify your email" and "reset your password". Only the SHA-256 reaches the
 * database. `consume` is ONE conditional UPDATE, not read-then-write: mail scanners prefetch links,
 * so two requests for the same link race, and the row's own state must be the lock.
 */
@Injectable()
export class OneTimeTokenService {
  private readonly logger = new Logger(OneTimeTokenService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Issues a token and supersedes this user's other outstanding tokens of the same purpose. */
  async issue(
    userId: string,
    purpose: OneTimeTokenPurpose,
    manager?: EntityManager
  ): Promise<IssuedOneTimeToken> {
    const em = manager ?? this.dataSource.manager;
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + TTL_BY_PURPOSE[purpose]);

    await this.invalidateOutstanding(userId, purpose, em);
    await em.getRepository(AuthOneTimeToken).insert({
      userId,
      purpose,
      tokenHash: hashOneTimeToken(token),
      expiresAt,
      consumedAt: null,
    });
    return { token, expiresAt };
  }

  /**
   * @returns the owning user id, or null when the token is unknown, of another purpose, consumed or
   * expired — all deliberately indistinguishable (telling them apart is a probing oracle).
   */
  async consume(
    token: string,
    purpose: OneTimeTokenPurpose,
    manager?: EntityManager
  ): Promise<string | null> {
    const em = manager ?? this.dataSource.manager;
    const rows: { user_id: string }[] = await em.query(
      `UPDATE auth_one_time_token
          SET consumed_at = now()
        WHERE token_hash = $1
          AND purpose = $2
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING user_id`,
      [hashOneTimeToken(token), purpose]
    );
    // pg returns [rows, count] for UPDATE via TypeORM on some drivers; normalise.
    const first = Array.isArray(rows[0]) ? (rows[0] as unknown as { user_id: string }[])[0] : rows[0];
    const userId = first?.user_id ?? null;

    if (!userId) {
      this.logger.warn(`${IDENTITY_METRICS.oneTimeTokenRejected} purpose=${purpose}`);
      return null;
    }
    // Consuming proves mailbox control: any older link of this purpose dies now.
    await this.invalidateOutstanding(userId, purpose, em);
    this.logger.log(
      `${IDENTITY_METRICS.oneTimeTokenConsumed} purpose=${purpose} userId=${userId}`
    );
    return userId;
  }

  async invalidateOutstanding(
    userId: string,
    purpose: OneTimeTokenPurpose,
    manager?: EntityManager
  ): Promise<void> {
    await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(AuthOneTimeToken)
      .set({ consumedAt: () => 'now()' })
      .where('"user_id" = :userId', { userId })
      .andWhere('"purpose" = :purpose', { purpose })
      .andWhere('"consumed_at" IS NULL')
      .execute();
  }
}
