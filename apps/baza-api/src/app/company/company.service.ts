import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AuthMeCompany } from '@baza/shared-types';
import { AuthService } from '../auth/auth.service';
import { SupabaseAuthService } from '../auth/supabase-auth.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
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

    const db = this.supabaseAuth.getClient();
    const { data: existing, error: findError } = await db
      .from('companies')
      .select('id, photo_key')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError || !existing) {
      throw new NotFoundException('Company profile not found');
    }

    const patch: Record<string, unknown> = {
      name: dto.name,
      nip: dto.nip,
      description: dto.description,
      base_location: dto.baseLocation,
    };

    const previousPhotoKey =
      typeof existing.photo_key === 'string' && existing.photo_key.length > 0
        ? existing.photo_key
        : null;
    let uploadedPhotoKey: string | null = null;

    if (photo?.buffer?.length) {
      const uploaded = await this.r2.uploadCompanyLogo(
        existing.id as string,
        photo.buffer,
        photo.mimetype || 'image/jpeg'
      );
      uploadedPhotoKey = uploaded.photoKey;
      patch['photo_key'] = uploaded.photoKey;
      patch['photo_urls'] = uploaded.photoUrls;
    }

    const { error: updateError } = await db
      .from('companies')
      .update(patch)
      .eq('user_id', userId);

    if (updateError) {
      if (uploadedPhotoKey) {
        await this.r2.deletePrefix(uploadedPhotoKey);
      }
      this.logger.warn(
        `Company update failed for user ${userId}: ${updateError.message}`
      );
      throw new BadRequestException('Failed to update company profile');
    }

    // Best-effort: remove previous version (or legacy `…/logo`) after DB points at the new key.
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
