import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthService {
  private client: SupabaseClient | null = null;

  getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    const url = process.env['SUPABASE_URL']?.trim();
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim();

    if (!url || !serviceKey) {
      throw new ServiceUnavailableException(
        'Supabase is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required)'
      );
    }

    this.client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return this.client;
  }

  async getUserFromAccessToken(accessToken: string): Promise<User | null> {
    const { data, error } = await this.getClient().auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  }
}
