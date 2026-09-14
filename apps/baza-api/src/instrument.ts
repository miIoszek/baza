import * as Sentry from '@sentry/nestjs';

/**
 * Call only after dotenv has loaded. Empty/missing SENTRY_DSN → no init (SDK no-op).
 */
const dsn = process.env['SENTRY_DSN']?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env['SENTRY_ENVIRONMENT']?.trim() || undefined,
    release:
      process.env['SENTRY_RELEASE']?.trim() ||
      process.env['RAILWAY_GIT_COMMIT_SHA']?.trim() ||
      undefined,
    // Errors-first; avoid free-tier burn from performance traces.
    tracesSampleRate: 0,
  });
}
