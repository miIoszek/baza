import { Injectable, NotFoundException } from '@nestjs/common';
import type { CompanyPublicProfile } from '@baza/shared-types';
import { rewriteR2PhotoUrls } from '../storage/photo-url.util';
import { SupabaseAuthService } from '../auth/supabase-auth.service';

@Injectable()
export class CompanyPublicService {
  constructor(private readonly supabaseAuth: SupabaseAuthService) {}

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
