import { Global, Module } from '@nestjs/common';
import { IDENTITY_CONFIG } from './identity.constants';
import { loadIdentityConfig } from './identity.config';
import { IdentityController } from './identity.controller';
import { MailerService } from './mail/mailer.service';
import { AccountSessionCache } from './services/account-session-cache.service';
import { AuthCookieService } from './services/auth-cookie.service';
import { JwtSigningService } from './services/jwt-signing.service';
import { LocalAuthService } from './services/local-auth.service';
import { OneTimeTokenService } from './services/one-time-token.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SessionService } from './services/session.service';
import { UserAccountService } from './services/user-account.service';

/**
 * Self-hosted identity (email + password). Global so its services are injectable anywhere. The
 * global guards (throttler, then AccessTokenGuard, then RolesGuard) are registered in AppModule so
 * their ORDER lives in one place. Everything requires an access token unless marked `@Public()`.
 */
@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    { provide: IDENTITY_CONFIG, useFactory: () => loadIdentityConfig() },
    PasswordHasherService,
    JwtSigningService,
    RefreshTokenService,
    OneTimeTokenService,
    UserAccountService,
    LocalAuthService,
    SessionService,
    AuthCookieService,
    MailerService,
    AccountSessionCache,
  ],
  exports: [
    IDENTITY_CONFIG,
    UserAccountService,
    LocalAuthService,
    PasswordHasherService,
    JwtSigningService,
    AccountSessionCache,
  ],
})
export class IdentityModule {}
