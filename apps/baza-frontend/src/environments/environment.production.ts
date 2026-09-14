import type { BazaEnvironment } from './environment.model';

/**
 * Production defaults (no secrets in git).
 * CI overwrites this file via scripts/write-fe-production-env.mjs.
 */
export const environment: BazaEnvironment = {
  production: true,
  apiBaseUrl: 'https://baza-api-production-4306.up.railway.app',
  supabaseUrl: '',
  supabaseAnonKey: '',
  sentryDsn: '',
  sentryRelease: '',
};
