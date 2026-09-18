import { Injectable } from '@nestjs/common';
import type { UserAccount } from '@baza/api-data-access';
import { AuthErrorCode, AuthException } from '../errors/auth-error';
import { JwtSigningService } from './jwt-signing.service';
import { RefreshTokenService } from './refresh-token.service';
import { UserAccountService } from './user-account.service';

export type StartedSession = {
  accessToken: string;
  expiresInSeconds: number;
  /** For the cookie only — never serialised into a response body. */
  refreshToken: string;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly jwt: JwtSigningService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly accounts: UserAccountService
  ) {}

  /** New login: new refresh family + access token. */
  async start(account: UserAccount): Promise<StartedSession> {
    const refresh = await this.refreshTokens.issue(account.id, account.sessionEpoch);
    return this.build(account, refresh.token);
  }

  /** Rotates the refresh token and mints an access token from the account's CURRENT epoch/roles. */
  async refresh(presentedRefreshToken: string): Promise<StartedSession> {
    const rotated = await this.refreshTokens.rotate(presentedRefreshToken);
    const account = await this.accounts.findById(rotated.userId);
    if (!account || account.status !== 'active' || !account.canLogin) {
      await this.refreshTokens.revokeFamily(rotated.familyId, 'account-disabled');
      throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
    }
    // A password change / ban bumps the epoch. A refresh token issued under an older epoch must
    // never mint a session, even if it slipped past the revocation (a rotation that was in flight
    // when the family was revoked commits its successor AFTER the revoke).
    if (rotated.sessionEpoch !== account.sessionEpoch) {
      await this.refreshTokens.revokeFamily(rotated.familyId, 'password-changed');
      throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
    }
    return this.build(account, rotated.token);
  }

  private build(account: UserAccount, refreshToken: string): StartedSession {
    const access = this.jwt.mintAccessToken({
      userId: account.id,
      roles: account.roles ?? [],
      sessionEpoch: account.sessionEpoch,
    });
    return {
      accessToken: access.token,
      expiresInSeconds: access.expiresInSeconds,
      refreshToken,
    };
  }
}
