import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) {
    return client;
  }

  const url = environment.supabaseUrl?.trim();
  const anonKey = environment.supabaseAnonKey?.trim();
  if (!url || !anonKey) {
    throw new Error(
      'Missing environment.supabaseUrl / environment.supabaseAnonKey'
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
