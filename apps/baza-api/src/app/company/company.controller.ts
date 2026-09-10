import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { AuthMeCompany, AuthMeResponse } from '@baza/shared-types';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard, type AuthedRequest } from '../auth/jwt-auth.guard';
import { CompanyService } from './company.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

const ALLOWED_UPLOAD_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(
    private readonly authService: AuthService,
    private readonly companyService: CompanyService
  ) {}

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

  @Patch('profile')
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
  async updateProfile(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateCompanyProfileDto,
    @UploadedFile() photo?: Express.Multer.File
  ): Promise<AuthMeCompany> {
    const user = req.user;
    if (!user?.id) {
      throw new NotFoundException('Company profile not found');
    }
    return this.companyService.updateProfile(user.id, dto, photo);
  }
}
