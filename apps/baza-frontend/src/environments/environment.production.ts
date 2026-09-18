import type { BazaEnvironment } from './environment.model';

/**
 * Production defaults (no secrets in git).
 * CI overwrites this file via scripts/write-fe-production-env.mjs.
 */
export const environment: BazaEnvironment = {
  production: true,
  apiBaseUrl: '',
  sentryDsn: '',
  sentryRelease: '',
};
