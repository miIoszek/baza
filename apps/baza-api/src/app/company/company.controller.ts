import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { AuthMeResponse } from '@baza/shared-types';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  async session(@Req() req: AuthedRequest): Promise<AuthMeResponse> {
    const user = req.user;
    if (!user) {
      return { user: { id: '', email: null }, company: null };
    }

    const company = await this.authService.getCompanyForUser(user.id);

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      company,
    };
  }
}
