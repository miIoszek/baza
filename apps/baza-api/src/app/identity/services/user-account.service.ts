import { DataSource, EntityManager } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import {
  UserAccount,
  type RefreshRevocationReason,
} from '@baza/api-data-access';
import {
  ACCOUNT_LOCK_DURATION_MS,
  IDENTITY_METRICS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from '../identity.constants';
import { AccountSessionCache } from './account-session-cache.service';
import { PasswordHasherService } from './password-hasher.service';
import { RefreshTokenService } from './refresh-token.service';

export type RegisterLocalInput = {
  email: string;
  password: string;
  roles: string[];
  /** Registration proves nothing about the mailbox; set true only when verification is disabled. */
  emailVerified: boolean;
};

export type RegisterLocalOutcome =
  | { kind: 'created'; account: UserAccount }
  | { kind: 'already-registered' };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UserAccountService {
  private readonly logger = new Logger(UserAccountService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasherService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly sessionCache: AccountSessionCache
  ) {}

  /**
   * The KDF runs BEFORE the uniqueness check, so a fresh and a claimed address cost the same
   * (no timing oracle). `ON CONFLICT DO NOTHING` — rather than catching 23505 — keeps an enclosing
   * transaction usable when the address is taken.
   */
  async registerLocal(
    input: RegisterLocalInput,
    manager?: EntityManager
  ): Promise<RegisterLocalOutcome> {
    const em = manager ?? this.dataSource.manager;
    const passwordHash = await this.hasher.hash(input.password);

    const rows: { id: string }[] = await em.query(
      `INSERT INTO user_account (email, password_hash, roles, email_verified_at)
       VALUES ($1, $2, $3, CASE WHEN $4::boolean THEN now() ELSE NULL END)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [normalizeEmail(input.email), passwordHash, input.roles, input.emailVerified]
    );
    if (!rows.length) {
      return { kind: 'already-registered' };
    }
    const account = await em
      .getRepository(UserAccount)
      .findOneOrFail({ where: { id: rows[0].id } });
    return { kind: 'created', account };
  }

  findById(id: string): Promise<UserAccount | null> {
    return this.dataSource.getRepository(UserAccount).findOne({ where: { id } });
  }

  /** Loads the account WITH its password hash (`select: false` by default). */
  findLoginCandidate(email: string): Promise<UserAccount | null> {
    return this.dataSource
      .getRepository(UserAccount)
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.email = :email', { email: normalizeEmail(email) })
      .andWhere("a.status = 'active'")
      .andWhere('a.canLogin = true')
      .getOne();
  }

  findWithPasswordHash(id: string): Promise<UserAccount | null> {
    return this.dataSource
      .getRepository(UserAccount)
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.id = :id', { id })
      .getOne();
  }

  isLocked(account: UserAccount): boolean {
    return !!account.lockedUntil && account.lockedUntil.getTime() > Date.now();
  }

  /** Atomic increment + lock in one statement: concurrent guesses cannot slip past the threshold. */
  async recordFailedLogin(userId: string): Promise<void> {
    const rows: { failed_login_count: number; locked: boolean }[] =
      await this.dataSource.query(
        `UPDATE user_account
            SET failed_login_count = failed_login_count + 1,
                locked_until = CASE
                  WHEN failed_login_count + 1 >= $2
                  THEN now() + ($3::int * interval '1 millisecond')
                  ELSE locked_until END
          WHERE id = $1
        RETURNING failed_login_count, (locked_until > now()) AS locked`,
        [userId, MAX_FAILED_LOGIN_ATTEMPTS, ACCOUNT_LOCK_DURATION_MS]
      );
    const row = Array.isArray(rows[0]) ? (rows[0] as unknown as typeof rows)[0] : rows[0];
    if (row?.locked) {
      this.logger.warn(
        `${IDENTITY_METRICS.accountLocked} userId=${userId} failures=${row.failed_login_count}`
      );
    }
  }

  async recordSuccessfulLogin(userId: string): Promise<void> {
    await this.dataSource
      .getRepository(UserAccount)
      .update(
        { id: userId },
        { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
      );
  }

  /** Upgrades the stored hash to the current KDF parameters. Not a credential change: no epoch bump. */
  async setPasswordHashOnly(userId: string, password: string): Promise<void> {
    const passwordHash = await this.hasher.hash(password);
    await this.dataSource
      .getRepository(UserAccount)
      .update({ id: userId }, { passwordHash });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(UserAccount)
      .set({ emailVerifiedAt: () => 'COALESCE("email_verified_at", now())' })
      .where('id = :userId', { userId })
      .execute();
  }

  /**
   * Sets a new password and kills every existing session: bumps `session_epoch` (dead access
   * tokens) and revokes every refresh family (no new ones). One transaction — a half-applied
   * password change would leave old sessions alive.
   */
  async setPassword(
    userId: string,
    newPassword: string,
    reason: Extract<RefreshRevocationReason, 'password-changed' | 'password-reset'>
  ): Promise<void> {
    const passwordHash = await this.hasher.hash(newPassword);
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE user_account
            SET password_hash = $2,
                session_epoch = session_epoch + 1,
                failed_login_count = 0,
                locked_until = NULL,
                updated_at = now()
          WHERE id = $1`,
        [userId, passwordHash]
      );
      await this.refreshTokens.revokeAllForUser(userId, reason, manager);
    });
    this.sessionCache.invalidate(userId);
  }

  /** Ban/disable (support tooling, future admin): status + epoch + refresh families in one go. */
  async disable(
    userId: string,
    reason: Extract<RefreshRevocationReason, 'account-disabled' | 'account-deleted'>
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `UPDATE user_account
            SET status = $2, can_login = false,
                session_epoch = session_epoch + 1, updated_at = now()
          WHERE id = $1`,
        [userId, reason === 'account-deleted' ? 'deleted' : 'banned']
      );
      await this.refreshTokens.revokeAllForUser(userId, reason, manager);
    });
    this.sessionCache.invalidate(userId);
  }
}
