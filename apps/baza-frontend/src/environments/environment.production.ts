import type { BazaEnvironment } from './environment.model';

/**
 * Production defaults (no secrets in git).
 * Set real anon values in Cloudflare Pages build env / fileReplacements later.
 */
export const environment: BazaEnvironment = {
  production: true,
  apiBaseUrl: 'https://baza-api-production-4306.up.railway.app',
  supabaseUrl: '',
  supabaseAnonKey: '',
};
