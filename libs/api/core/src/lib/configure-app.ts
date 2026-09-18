import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './all-exceptions.filter';

const DEV_DEFAULT_ORIGINS = ['http://localhost:4200'];

/**
 * Exact-match allowlist from `CORS_ORIGIN` (comma separated). Never a wildcard and never
 * "reflect the caller": the refresh cookie makes credentialed CORS a session-theft surface.
 * Unset in production is a boot error; unset elsewhere falls back to the local dev server.
 */
export function resolveCorsOrigins(
  env: Record<string, string | undefined> = process.env
): string[] {
  const configured = (env['CORS_ORIGIN'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (configured.includes('*')) {
    throw new Error('CORS_ORIGIN must list exact origins; "*" is not allowed');
  }
  if (configured.length) {
    return configured;
  }
  if (env['NODE_ENV'] === 'production') {
    throw new Error('CORS_ORIGIN is required in production');
  }
  return DEV_DEFAULT_ORIGINS;
}

/** Shared Nest bootstrap helpers — call from apps/baza-api main.ts. */
export function configureApp(app: INestApplication): void {
  // One proxy hop (Railway edge). More hops would let clients spoof the IP used for rate limits.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  new Logger('configureApp').log(
    `CORS origins: ${resolveCorsOrigins().join(', ')}`
  );
}
