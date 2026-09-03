import { Module } from '@nestjs/common';

/**
 * Database / repository layer for Nest.
 * Hook Supabase Postgres (or Prisma) providers here later — keep controllers thin.
 */
@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class ApiDataAccessModule {}
