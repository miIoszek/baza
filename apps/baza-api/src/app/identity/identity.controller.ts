import type { Request, Response } from 'express';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthSessionResponse } from '@baza/shared-types';
import { CurrentUser, Public, type AuthenticatedUser } from './decorators';
import {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/auth.dto';
import { AuthErrorCode, AuthException } from './errors/auth-error';
import { AuthCookieService } from './services/auth-cookie.service';
import { LocalAuthService } from './services/local-auth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { SessionService, type StartedSession } from './services/session.service';

const MINUTE = 60_000;

/**
 * `/api/auth/*`. Responses never contain the refresh token (cookie only). Anonymous email-taking
 * endpoints always answer 202 with no body: same response whether or not the address exists.
 */
@Controller('auth')
export class IdentityController {
  constructor(
    private readonly localAuth: LocalAuthService,
    private readonly sessions: SessionService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly cookies: AuthCookieService
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSessionResponse> {
    this.cookies.assertAllowedOrigin(req);
    const account = await this.localAuth.login(dto.email, dto.password);
    return this.respond(res, await this.sessions.start(account));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSessionResponse> {
    this.cookies.assertAllowedOrigin(req);
    const presented = this.cookies.read(req);
    if (!presented) {
      throw new AuthException(AuthErrorCode.SESSION_EXPIRED);
    }
    try {
      return this.respond(res, await this.sessions.refresh(presented));
    } catch (error) {
      // A dead cookie is useless; drop it so the SPA stops presenting it.
      this.cookies.clear(res);
      throw error;
    }
  }

  /** Idempotent: unknown or already-revoked cookies are a no-op. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    this.cookies.assertAllowedOrigin(req);
    const presented = this.cookies.read(req);
    if (presented) {
      await this.refreshTokens.revokeByToken(presented, 'logout');
    }
    this.cookies.clear(res);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  async verifyEmail(@Body() dto: TokenDto): Promise<void> {
    await this.localAuth.verifyEmail(dto.token);
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  async resendVerification(@Body() dto: EmailDto): Promise<void> {
    await this.localAuth.resendVerification(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  async forgotPassword(@Body() dto: EmailDto): Promise<void> {
    await this.localAuth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.localAuth.resetPassword(dto.token, dto.password);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: MINUTE } })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSessionResponse> {
    this.cookies.assertAllowedOrigin(req);
    const account = await this.localAuth.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword
    );
    // All sessions (including this one) just died; hand the caller a fresh one.
    return this.respond(res, await this.sessions.start(account));
  }

  private respond(res: Response, session: StartedSession): AuthSessionResponse {
    this.cookies.set(res, session.refreshToken);
    return {
      accessToken: session.accessToken,
      expiresInSeconds: session.expiresInSeconds,
    };
  }
}
