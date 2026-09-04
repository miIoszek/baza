import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthMeCompany } from '@baza/shared-types';
import {
  R2StorageService,
  type CompanyPhotoUrls,
} from '../storage/r2-storage.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { SupabaseAuthService } from './supabase-auth.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly r2: R2StorageService
  ) {}

  async register(
    dto: RegisterCompanyDto,
    photo?: Express.Multer.File
  ): Promise<{
    userId: string;
    companyId: string;
  }> {
    if (!dto.termsAccepted) {
      throw new BadRequestException('Terms must be accepted');
    }

    if (photo && !this.r2.isConfigured()) {
      throw new ServiceUnavailableException(
        'Photo upload requires R2 configuration'
      );
    }

    const url = process.env['SUPABASE_URL']?.trim();
    const anonKey = process.env['SUPABASE_ANON_KEY']?.trim();
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim();
    if (!url || !anonKey) {
      throw new ServiceUnavailableException('Supabase anon config missing');
    }

    let userId: string | null = null;
    let photoKey: string | null = null;
    let photoUrls: CompanyPhotoUrls | null = null;
    let db: SupabaseClient;
    let adminClient: SupabaseClient | null = null;

    try {
      if (serviceKey) {
        adminClient = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        db = adminClient;
        const { data, error } = await adminClient.auth.admin.createUser({
          email: dto.email,
          password: dto.password,
          email_confirm: true,
        });
        if (error) {
          throw this.mapSignUpError(error.message);
        }
        if (!data.user) {
          throw new BadRequestException('Admin createUser returned no user');
        }
        userId = data.user.id;
      } else {
        const anon = createClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: signUpData, error: signUpError } = await anon.auth.signUp({
          email: dto.email,
          password: dto.password,
        });
        if (signUpError) {
          throw this.mapSignUpError(signUpError.message);
        }
        const user = signUpData.user;
        if (!user) {
          throw new BadRequestException('Sign-up did not return a user');
        }
        userId = user.id;
        const accessToken = signUpData.session?.access_token;
        if (!accessToken) {
          throw new BadRequestException(
            'No session after sign-up — disable Confirm email in Supabase Auth, or set SUPABASE_SERVICE_ROLE_KEY'
          );
        }
        db = createClient(url, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        });
      }

      if (photo?.buffer?.length) {
        const uploaded = await this.r2.uploadCompanyLogo(
          userId,
          photo.buffer,
          photo.mimetype || 'image/jpeg'
        );
        photoKey = uploaded.photoKey;
        photoUrls = uploaded.photoUrls;
      }

      const { data: company, error: companyError } = await db
        .from('companies')
        .insert({
          user_id: userId,
          name: dto.name,
          nip: dto.nip,
          description: dto.description,
          base_location: dto.baseLocation,
          photo_key: photoKey,
          photo_urls: photoUrls,
        })
        .select('id')
        .single();

      if (companyError || !company) {
        throw new BadRequestException(
          companyError?.message ?? 'Failed to create company profile'
        );
      }

      return { userId, companyId: company.id as string };
    } catch (err) {
      await this.compensateFailedRegister({
        userId,
        photoKey,
        adminClient,
        serviceKey,
        url,
      });
      throw err;
    }
  }

  async getCompanyForUser(userId: string): Promise<AuthMeCompany | null> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('companies')
      .select('id, name, nip, description, base_location, photo_urls')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id as string,
      name: data.name as string,
      nip: data.nip as string,
      description: data.description as string,
      baseLocation: data.base_location as string,
      photoUrls: (data.photo_urls as Record<string, string> | null) ?? null,
    };
  }

  private async compensateFailedRegister(args: {
    userId: string | null;
    photoKey: string | null;
    adminClient: SupabaseClient | null;
    serviceKey: string | undefined;
    url: string;
  }): Promise<void> {
    const { userId, photoKey, serviceKey, url } = args;
    let admin = args.adminClient;

    if (photoKey) {
      await this.r2.deletePrefix(photoKey);
    }

    if (!userId) {
      return;
    }

    if (!admin && serviceKey) {
      admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    if (!admin) {
      this.logger.warn(
        `Cannot delete orphaned auth user ${userId} — set SUPABASE_SERVICE_ROLE_KEY for compensation`
      );
      return;
    }

    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (e) {
      this.logger.warn(
        `Failed to delete orphaned auth user ${userId}: ${String(e)}`
      );
    }
  }

  private mapSignUpError(message: string): Error {
    const msg = message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered')) {
      return new ConflictException('Email already registered');
    }
    return new BadRequestException(message);
  }
}
