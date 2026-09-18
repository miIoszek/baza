import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import {
  RefreshToken,
  type RefreshRevocationReason,
} from '@baza/api-data-access';
import {
  IDENTITY_METRICS,
  REFRESH_MAX_GRACE_REISSUES,
  REFRESH_ROTATION_GRACE_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../identity.constants';
import { AuthErrorCode, AuthException } from '../errors/auth-error';

export type IssuedRefreshToken = {
  /** Opaque value for the cookie. Never persisted, never logged. */
  token: string;
  userId: string;
  familyId: string;
  generation: number;
  expiresAt: Date;
};

type RotateOutcome =
  | { kind: 'ok'; issued: IssuedRefreshToken }
  | { kind: 'invalid' };

const TOKEN_BYTES = 32;

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Rotating token family with reuse detection. Every refresh exchanges the presented token for a new
 * one in the same family; a rotated token is single-use, so presenting it again means two parties
 * hold the same secret. The whole family is then revoked.
 *
 * Rotation runs in ONE transaction under a row lock (`SELECT ... FOR UPDATE`), so two concurrent
 * requests with the same token are serialised: the second sees `used_at` set and takes the grace
 * path instead of both "winning" (a race the read-then-write version of this pattern has).
 *
 * The grace window forgives a just-used token (parallel 401 recovery, lost response + retry) up to
 * REFRESH_MAX_GRACE_REISSUES times by issuing a fresh sibling; outside it, it is treated as theft.
 * Revocation is committed BEFORE the caller throws — throwing inside the transaction would roll it back.
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Starts a new family. Called on login only. */
  async issue(
    userId: string,
    manager?: EntityManager
  ): Promise<IssuedRefreshToken> {
    return this.persist(
      { userId, familyId: randomUUID(), generation: 1 },
      manager ?? this.dataSource.manager
    );
  }

  /** @throws AuthException SESSION_EXPIRED for unknown, expired, revoked and reused tokens alike. */
  async rotate(presentedToken: string): Promise<IssuedRefreshToken> {
    const tokenHash = hashRefreshToken(presentedToken);
    const outcome = await this.dataSource.transaction((manager) =>
      this.rotateLocked(tokenHash, manager)
    );
    if (outcome.kind === 'invalid') {
      throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
    }
    return outcome.issued;
  }

  async revokeFamily(
    familyId: string,
    reason: RefreshRevocationReason,
    manager?: EntityManager
  ): Promise<number> {
    const result = await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'now()', revokedReason: reason })
      .where('"family_id" = :familyId', { familyId })
      .andWhere('"revoked_at" IS NULL')
      .execute();
    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.warn(
        `${IDENTITY_METRICS.familyRevoked} familyId=${familyId} reason=${reason} tokens=${affected}`
      );
    }
    return affected;
  }

  /** "Sign out everywhere": password change/reset, ban, deletion. Access tokens are `sessionEpoch`'s job. */
  async revokeAllForUser(
    userId: string,
    reason: RefreshRevocationReason,
    manager?: EntityManager
  ): Promise<number> {
    const result = await (manager ?? this.dataSource.manager)
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: () => 'now()', revokedReason: reason })
      .where('"user_id" = :userId', { userId })
      .andWhere('"revoked_at" IS NULL')
      .execute();
    return result.affected ?? 0;
  }

  /** Logout: ends one session. Idempotent — unknown/already-dead tokens are a no-op. */
  async revokeByToken(
    presentedToken: string,
    reason: RefreshRevocationReason
  ): Promise<void> {
    const existing = await this.dataSource.getRepository(RefreshToken).findOne({
      where: { tokenHash: hashRefreshToken(presentedToken) },
    });
    if (existing && !existing.revokedAt) {
      await this.revokeFamily(existing.familyId, reason);
    }
  }

  /** Housekeeping for a future sweeper/cron: rows past expiry are useless. */
  async deleteExpired(): Promise<number> {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(RefreshToken)
      .where('"expires_at" < now()')
      .execute();
    return result.affected ?? 0;
  }

  private async rotateLocked(
    tokenHash: string,
    manager: EntityManager
  ): Promise<RotateOutcome> {
    const existing = await manager
      .getRepository(RefreshToken)
      .createQueryBuilder('t')
      .setLock('pessimistic_write')
      .where('t.tokenHash = :tokenHash', { tokenHash })
      .getOne();

    if (!existing) {
      // Cannot be attributed to a user (that is the point of hashing): nothing to revoke.
      this.logger.warn(IDENTITY_METRICS.refreshUnknown);
      return { kind: 'invalid' };
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId, 'reuse-detected', manager);
      this.logger.error(
        `${IDENTITY_METRICS.refreshReuseDetected} revoked token presented userId=${existing.userId} familyId=${existing.familyId}`
      );
      return { kind: 'invalid' };
    }

    if (existing.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(
        `${IDENTITY_METRICS.refreshExpired} userId=${existing.userId} familyId=${existing.familyId}`
      );
      return { kind: 'invalid' };
    }

    if (existing.usedAt) {
      const usedAgeMs = Date.now() - existing.usedAt.getTime();
      const withinGrace = usedAgeMs <= REFRESH_ROTATION_GRACE_MS;
      const underCap = existing.graceReissueCount < REFRESH_MAX_GRACE_REISSUES;
      if (!withinGrace || !underCap) {
        await this.revokeFamily(existing.familyId, 'reuse-detected', manager);
        // `error`: the one signal in this module that should page someone. The grace window keeps
        // it rare, and therefore trusted.
        this.logger.error(
          `${IDENTITY_METRICS.refreshReuseDetected} userId=${existing.userId} familyId=${existing.familyId} usedAgeMs=${usedAgeMs} graceReissues=${existing.graceReissueCount}`
        );
        return { kind: 'invalid' };
      }
      await manager
        .getRepository(RefreshToken)
        .increment({ id: existing.id }, 'graceReissueCount', 1);
      this.logger.warn(
        `${IDENTITY_METRICS.refreshGraceReissued} userId=${existing.userId} familyId=${existing.familyId}`
      );
    } else {
      await manager
        .getRepository(RefreshToken)
        .update({ id: existing.id }, { usedAt: new Date() });
      this.logger.log(
        `${IDENTITY_METRICS.refreshRotated} userId=${existing.userId} familyId=${existing.familyId} generation=${existing.generation + 1}`
      );
    }

    const issued = await this.persist(
      {
        userId: existing.userId,
        familyId: existing.familyId,
        generation: existing.generation + 1,
      },
      manager
    );
    return { kind: 'ok', issued };
  }

  private async persist(
    input: { userId: string; familyId: string; generation: number },
    manager: EntityManager
  ): Promise<IssuedRefreshToken> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    // Sliding expiry: every rotation resets the full TTL.
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await manager.getRepository(RefreshToken).insert({
      userId: input.userId,
      familyId: input.familyId,
      tokenHash: hashRefreshToken(token),
      generation: input.generation,
      expiresAt,
      usedAt: null,
      revokedAt: null,
    });
    return { token, ...input, expiresAt };
  }
}
