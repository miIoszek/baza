import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database.config';
import { MigrationRunnerService } from './migration-runner.service';

/**
 * Postgres access for the API (TypeORM). Feature modules register the repositories they need with
 * `TypeOrmModule.forFeature([...])`; entities and migrations live in this library.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
  ],
  providers: [MigrationRunnerService],
  exports: [TypeOrmModule],
})
export class ApiDataAccessModule {}
