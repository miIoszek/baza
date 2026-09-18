import type { BazaEnvironment } from './environment.model';
import { localEnvironment } from './environment.local';

/** Committed shell — secrets live in gitignored environment.local.ts */
export const environment: BazaEnvironment = {
  production: false,
  apiBaseUrl: localEnvironment.apiBaseUrl ?? '',
  sentryDsn: localEnvironment.sentryDsn ?? '',
  sentryRelease: localEnvironment.sentryRelease ?? '',
};
