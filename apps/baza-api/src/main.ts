/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { config as loadEnv } from 'dotenv';
loadEnv();

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { configureApp } from '@baza/api-core';
import { AppModule } from './app/app.module';
import { assertRequiredSupabaseEnv } from './supabase-env';

async function bootstrap() {
  assertRequiredSupabaseEnv();

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
  process.exit(1);
});
