import { DataSource } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Company } from '@baza/api-data-access';
import type { AuthMeCompany } from '@baza/shared-types';
import { AuthService } from '../auth/auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly r2: R2StorageService,
    private readonly authService: AuthService
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateCompanyProfileDto,
    photo?: Express.Multer.File
  ): Promise<AuthMeCompany> {
    if (photo && !this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        'Photo upload requires R2 configuration'
      );
    }

    const companies = this.dataSource.getRepository(Company);
    const existing = await companies.findOne({
      where: { userId },
      select: { id: true, photoKey: true },
    });
    if (!existing) {
      throw new NotFoundException('Company profile not found');
    }

    const patch: Partial<Company> = {
      name: dto.name,
      nip: dto.nip,
      description: dto.description,
      baseLocation: dto.baseLocation,
      baseLat: dto.baseLat ?? null,
      baseLng: dto.baseLng ?? null,
    };

    const previousPhotoKey = existing.photoKey ? existing.photoKey : null;
    let uploadedPhotoKey: string | null = null;

    if (photo?.buffer?.length) {
      const uploaded = await this.r2.uploadCompanyLogo(
        existing.id,
        photo.buffer,
        photo.mimetype || 'image/jpeg'
      );
      uploadedPhotoKey = uploaded.photoKey;
      patch.photoKey = uploaded.photoKey;
      patch.photoUrls = uploaded.photoUrls;
    }

    try {
      await companies.update({ userId }, patch);
    } catch (error) {
      if (uploadedPhotoKey) {
        await this.r2.deletePrefix(uploadedPhotoKey);
      }
      this.logger.warn(
        `Company update failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw new BadRequestException('Failed to update company profile');
    }

    // Best-effort: remove the previous version (or legacy `…/logo`) once the DB points at the new key.
    if (
      uploadedPhotoKey &&
      previousPhotoKey &&
      previousPhotoKey !== uploadedPhotoKey
    ) {
      await this.r2.deletePrefix(previousPhotoKey);
    }

    const company = await this.authService.getCompanyForUser(userId);
    if (!company) {
      throw new NotFoundException('Company profile not found');
    }
    return company;
  }
}
