import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import type {
  AuthMeResponse,
  RegisterCompanyResponse,
} from '@baza/shared-types';
import {
  CurrentUser,
  Public,
  type AuthenticatedUser,
} from '../identity/decorators';
import { AuthService } from './auth.service';
import { RegisterCompanyDto } from './dto/register-company.dto';

const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Company-specific auth endpoints. Login/refresh/logout/verify/reset live in IdentityController. */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
  ): Promise<RegisterCompanyResponse> {
    return this.authService.register(dto, photo);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthMeResponse> {
    return {
      user: { id: user.id, email: user.email },
      company: await this.authService.getCompanyForUser(user.id),
    };
  }
}
