import type { Request, Response } from 'express';
import { Inject, Injectable } from '@nestjs/common';
import { REFRESH_TOKEN_TTL_MS, IDENTITY_CONFIG } from '../identity.constants';
import type { IdentityConfig } from '../identity.config';
import { AuthErrorCode, AuthException } from '../errors/auth-error';

/**
 * The refresh token lives ONLY in an HttpOnly cookie and is never returned in a response body, so
 * an XSS on the SPA cannot read a long-lived credential. `SameSite=Strict` + `Path=/` + (in
 * production) the `__Host-` prefix pin it to this exact host. Because Strict cookies are not sent
 * cross-site, the SPA and API must be same-site (custom domain or a same-origin `/api` proxy).
 *
 * CSRF defence in depth: cookie-authenticated endpoints additionally require an `Origin` header
 * from the allowlist. Browsers always send it on POST; non-browser clients have no need for cookies.
 */
@Injectable()
export class AuthCookieService {
  constructor(@Inject(IDENTITY_CONFIG) private readonly config: IdentityConfig) {}

  set(res: Response, token: string): void {
    res.cookie(this.config.cookie.name, token, {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite: 'strict',
      path: '/',
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  clear(res: Response): void {
    res.clearCookie(this.config.cookie.name, {
      httpOnly: true,
      secure: this.config.cookie.secure,
      sameSite: 'strict',
      path: '/',
    });
  }

  read(req: Request): string | null {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[
      this.config.cookie.name
    ];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  assertAllowedOrigin(req: Request): void {
    const origin = req.headers.origin;
    if (typeof origin !== 'string' || !this.config.allowedOrigins.includes(origin)) {
      throw new AuthException(AuthErrorCode.FORBIDDEN_ORIGIN);
    }
  }
}
