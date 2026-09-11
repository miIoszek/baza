import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import type { AuthMeResponse } from '@baza/shared-types';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { JwtAuthGuard, type AuthedRequest } from './jwt-auth.guard';

const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // TODO(error-system): see context/changes/auth-company-logo-r2/follow-ups/backend-error-handling.md
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_UPLOAD_MIME.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Dozwolone są tylko pliki JPEG, PNG lub WebP'
            ) as unknown as Error,
            false
          );
          return;
        }
        cb(null, true);
      },
    })
  )
  register(
    @Body() dto: RegisterCompanyDto,
    @UploadedFile() photo?: Express.Multer.File
  ) {
    return this.authService.register(dto, photo);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthedRequest): Promise<AuthMeResponse> {
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
