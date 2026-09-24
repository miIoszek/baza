import { DataSource } from 'typeorm';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserAccount } from '@baza/api-data-access';
import { AuthErrorCode, AuthException } from '../errors/auth-error';
import { IS_PUBLIC_KEY, type AuthedRequest } from '../decorators';
import {
  AccountSessionCache,
  type CachedAccount,
} from '../services/account-session-cache.service';
import { JwtSigningService } from '../services/jwt-signing.service';

/**
 * Global HTTP authentication against access tokens WE mint. Verification is local (no network); on
 * every authenticated request the account's `session_epoch`/status is re-checked (short per-process
 * cache, see AccountSessionCache), so ban / password change kill tokens before `exp`.
 *
 * Infrastructure failures loading the account become 503, never SESSION_EXPIRED: the SPA reacts to
 * a 401 by clearing the session, which is exactly the wrong recovery for a transient DB blip.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  private readonly logger = new Logger(AccessTokenGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtSigningService,
    private readonly dataSource: DataSource,
    private readonly cache: AccountSessionCache
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : '';
    if (!token) {
      throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
    }

    try {
      const claims = this.jwt.verifyAccessToken(token);
      const account = await this.loadAccount(claims.sub);
      if (!account?.usable || claims.epc !== account.sessionEpoch) {
        throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
      }
      request.user = {
        id: claims.sub,
        email: account.email,
        roles: account.roles,
      };
      return true;
    } catch (error) {
      if (error instanceof AuthException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
      }
      this.logger.warn(
        `Access-token guard failed (infra): ${error instanceof Error ? error.message : String(error)}`
      );
      throw new ServiceUnavailableException(
        'Authentication temporarily unavailable'
      );
    }
  }

  private async loadAccount(userId: string): Promise<CachedAccount | null> {
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }
    const account = await this.dataSource.getRepository(UserAccount).findOne({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        sessionEpoch: true,
        roles: true,
        status: true,
        canLogin: true,
      },
    });
    if (!account) {
      this.cache.invalidate(userId);
      return null;
    }
    const entry: CachedAccount = {
      email: account.email,
      roles: account.roles ?? [],
      sessionEpoch: account.sessionEpoch,
      usable: account.canLogin && account.status === 'active',
    };
    this.cache.set(userId, entry);
    return entry;
  }
}
