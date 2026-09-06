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
    // Prefer service role (required for Nest boot); anon is a last-resort fallback
    // only if someone constructs this service outside normal bootstrap.
    const key =
      process.env['SUPABASE_SERVICE_ROLE_KEY']?.trim() ||
      process.env['SUPABASE_ANON_KEY']?.trim();

    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Supabase is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required; ANON alone is not enough for Nest API)'
      );
    }

    this.client = createClient(url, key, {
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
