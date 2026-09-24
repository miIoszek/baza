/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';

// Webpack runs the compiled app from dist/apps/baza-api, so cwd `.env` misses the repo root file.
const envPath = [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../.env')].find(
  (candidate) => existsSync(candidate)
);
loadEnv(envPath ? { path: envPath } : undefined);

// After dotenv so SENTRY_DSN is visible; before Nest so instrumentation can wrap modules.
import './instrument';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';
import { configureApp } from '@baza/api-core';
import { AppModule } from './app/app.module';
import { assertDatabaseEnv } from '@baza/api-data-access';

async function bootstrap() {
  assertDatabaseEnv();

  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env['PORT'] || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap().catch((err) => {
  Logger.error(
    err instanceof Error ? err.message : String(err),
    err instanceof Error ? err.stack : undefined,
    'Bootstrap'
  );
  Sentry.captureException(err);
  void Sentry.close(2000).finally(() => process.exit(1));
});
