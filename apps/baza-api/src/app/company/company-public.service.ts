import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CompanyDirectoryItem,
  CompanyPublicProfile,
} from '@baza/shared-types';
import { rewriteR2PhotoUrls } from '../storage/photo-url.util';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

@Injectable()
export class CompanyPublicService {
  private readonly logger = new Logger(CompanyPublicService.name);

  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

  async list(): Promise<CompanyDirectoryItem[]> {
    const { data: companies, error: companiesError } = await this.supabaseAuth
      .getClient()
      .from('companies')
      .select('id, name, base_location, photo_urls, created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (companiesError) {
      this.logger.warn(
        `Public companies list failed: ${companiesError.message}`
      );
      throw new BadRequestException(
        'Nie udało się pobrać listy pracodawców'
      );
    }

    const { data: offers, error: offersError } = await this.supabaseAuth
      .getClient()
      .from('job_offers')
      .select('company_id')
      .eq('published', true);

    if (offersError) {
      this.logger.warn(
        `Public companies offer count failed: ${offersError.message}`
      );
      throw new BadRequestException(
        'Nie udało się pobrać listy pracodawców'
      );
    }

    const offerCountByCompany = new Map<string, number>();
    for (const row of offers ?? []) {
      const companyId = row.company_id as string;
      offerCountByCompany.set(
        companyId,
        (offerCountByCompany.get(companyId) ?? 0) + 1
      );
    }

    return (companies ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      baseLocation: row.base_location as string,
      photoUrls: rewriteR2PhotoUrls(
        (row.photo_urls as Record<string, string> | null) ?? null
      ),
      offerCount: offerCountByCompany.get(row.id as string) ?? 0,
    }));
  }

  async getById(id: string): Promise<CompanyPublicProfile> {
    const { data, error } = await this.supabaseAuth
      .getClient()
      .from('companies')
      .select('id, name, nip, description, base_location, base_lat, base_lng, photo_urls')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      throw new NotFoundException('Company not found');
    }

    return {
      id: data.id as string,
      name: data.name as string,
      nip: data.nip as string,
      description: data.description as string,
      baseLocation: data.base_location as string,
      baseLat: (data.base_lat as number | null) ?? null,
      baseLng: (data.base_lng as number | null) ?? null,
      photoUrls: rewriteR2PhotoUrls(
        (data.photo_urls as Record<string, string> | null) ?? null
      ),
    };
  }
}
