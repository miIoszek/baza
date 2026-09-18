import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserAccount } from '@baza/api-data-access';
import { AuthErrorCode, AuthException } from '../errors/auth-error';
import { IDENTITY_CONFIG, IDENTITY_METRICS } from '../identity.constants';
import type { IdentityConfig } from '../identity.config';
import { MailerService } from '../mail/mailer.service';
import { isAcceptablePassword } from '../password-policy.util';
import { OneTimeTokenService } from './one-time-token.service';
import { PasswordHasherService } from './password-hasher.service';
import { UserAccountService } from './user-account.service';

/**
 * Email + password authentication.
 *
 * Property that shapes almost every method: NO ENUMERATION ORACLE. `resendVerification` and
 * `forgotPassword` take an address from an anonymous caller and behave identically (same result,
 * same shape, comparable time) whether or not it exists; the difference travels by email, the only
 * channel that proves mailbox ownership. `login` runs the KDF even for unknown addresses.
 */
@Injectable()
export class LocalAuthService {
  private readonly logger = new Logger(LocalAuthService.name);

  constructor(
    @Inject(IDENTITY_CONFIG) private readonly config: IdentityConfig,
    private readonly accounts: UserAccountService,
    private readonly oneTimeTokens: OneTimeTokenService,
    private readonly hasher: PasswordHasherService,
    private readonly mailer: MailerService
  ) {}

  assertPasswordPolicy(password: unknown, email: string | null): void {
    if (!isAcceptablePassword(password, email)) {
      throw new AuthException(AuthErrorCode.WEAK_PASSWORD);
    }
  }

  /** Mails a verification link to a freshly registered account (never throws). */
  async sendVerificationEmail(account: UserAccount): Promise<void> {
    if (account.emailVerifiedAt) {
      return;
    }
    const issued = await this.oneTimeTokens.issue(account.id, 'verify_email');
    await this.mailer.sendEmailVerification(
      account.email,
      this.link('/verify-email', issued.token)
    );
  }

  async sendAlreadyRegisteredNotice(email: string): Promise<void> {
    await this.mailer.sendAccountAlreadyExistsNotice(
      email.trim().toLowerCase(),
      `${this.config.webBaseUrl}/login`
    );
  }

  async resendVerification(email: string): Promise<void> {
    const account = await this.accounts.findLoginCandidate(email);
    if (!account || account.emailVerifiedAt) {
      return;
    }
    await this.sendVerificationEmail(account);
  }

  /** @throws AuthException INVALID_TOKEN — unknown, expired, consumed and wrong-purpose look alike. */
  async verifyEmail(token: string): Promise<void> {
    const userId = await this.oneTimeTokens.consume(token, 'verify_email');
    if (!userId) {
      throw new AuthException(AuthErrorCode.INVALID_TOKEN);
    }
    await this.accounts.markEmailVerified(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const account = await this.accounts.findLoginCandidate(email);
    if (!account) {
      return;
    }
    const issued = await this.oneTimeTokens.issue(account.id, 'reset_password');
    await this.mailer.sendPasswordReset(
      account.email,
      this.link('/reset-password', issued.token)
    );
  }

  /**
   * Consuming the token proves mailbox control, so it also verifies the address. Every session dies
   * (`setPassword` bumps the epoch and revokes all refresh families) and the caller is NOT signed
   * in: a stolen reset link must hand over a password the owner can immediately change again, not
   * a live session.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Cheap checks first: a weak password must not burn the single-use link. The email-equality
    // rule needs the account, so it is re-checked after the token is consumed.
    this.assertPasswordPolicy(newPassword, null);
    const userId = await this.oneTimeTokens.consume(token, 'reset_password');
    if (!userId) {
      throw new AuthException(AuthErrorCode.INVALID_TOKEN);
    }
    const account = await this.accounts.findById(userId);
    if (!account) {
      throw new AuthException(AuthErrorCode.INVALID_TOKEN);
    }
    this.assertPasswordPolicy(newPassword, account.email);
    await this.accounts.setPassword(userId, newPassword, 'password-reset');
    await this.accounts.markEmailVerified(userId);
    await this.mailer.sendPasswordChangedNotice(
      account.email,
      `${this.config.webBaseUrl}/forgot-password`
    );
  }

  /**
   * The order of checks is load-bearing:
   * 1. lockout BEFORE the KDF (a locked account gives an attacker no oracle);
   * 2. the KDF ALWAYS runs (dummy hash when no account matched);
   * 3. EMAIL_NOT_VERIFIED only AFTER the password checks out, or the login form becomes a probe
   *    for "does this address have an account".
   */
  async login(email: string, password: string): Promise<UserAccount> {
    const account = await this.accounts.findLoginCandidate(email);

    if (!account) {
      await this.hasher.verifyDummy(password);
      this.logger.warn(`${IDENTITY_METRICS.loginFailed} reason=unknown-account`);
      throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
    }

    if (this.accounts.isLocked(account)) {
      this.logger.warn(`${IDENTITY_METRICS.loginFailed} userId=${account.id} reason=locked`);
      throw new AuthException(AuthErrorCode.ACCOUNT_LOCKED);
    }

    const matches = account.passwordHash
      ? await this.hasher.verify(account.passwordHash, password)
      : await this.hasher.verifyDummy(password);

    if (!matches) {
      await this.accounts.recordFailedLogin(account.id);
      this.logger.warn(`${IDENTITY_METRICS.loginFailed} userId=${account.id} reason=bad-password`);
      throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
    }

    if (this.config.requireEmailVerification && !account.emailVerifiedAt) {
      throw new AuthException(AuthErrorCode.EMAIL_NOT_VERIFIED);
    }

    if (account.passwordHash && this.hasher.needsRehash(account.passwordHash)) {
      await this.accounts.setPasswordHashOnly(account.id, password);
    }

    await this.accounts.recordSuccessfulLogin(account.id);
    this.logger.log(`${IDENTITY_METRICS.loginSucceeded} userId=${account.id}`);
    return account;
  }

  /**
   * Requires the current password even though the caller holds a valid access token: the token may
   * have been stolen, and "can change the password" is a strictly higher privilege than "can read".
   * Returns the reloaded account so the caller's fresh session carries the bumped epoch.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<UserAccount> {
    const account = await this.accounts.findWithPasswordHash(userId);
    if (!account) {
      throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
    }
    const matches = account.passwordHash
      ? await this.hasher.verify(account.passwordHash, currentPassword)
      : await this.hasher.verifyDummy(currentPassword);
    if (!matches) {
      throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
    }
    this.assertPasswordPolicy(newPassword, account.email);
    await this.accounts.setPassword(userId, newPassword, 'password-changed');
    await this.oneTimeTokens.invalidateOutstanding(userId, 'reset_password');
    await this.mailer.sendPasswordChangedNotice(
      account.email,
      `${this.config.webBaseUrl}/forgot-password`
    );
    return (await this.accounts.findById(userId)) as UserAccount;
  }

  private link(path: string, token: string): string {
    return `${this.config.webBaseUrl}${path}?token=${encodeURIComponent(token)}`;
  }
}
