import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Arbitrary constant; every replica must use the same value to serialise on it. */
const MIGRATION_LOCK_KEY = 7_461_902;
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1_000;

/**
 * Runs pending migrations before the HTTP server starts listening (Nest awaits `onModuleInit`
 * before `listen`). A Postgres advisory lock held on a dedicated connection serialises
 * concurrent replicas / overlapping deploys, so two instances never race on the same migration.
 *
 * Opt out with `DATABASE_RUN_MIGRATIONS=false` (e.g. tests that manage their own schema).
 */
@Injectable()
export class MigrationRunnerService implements OnModuleInit {
  private readonly logger = new Logger(MigrationRunnerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (process.env['DATABASE_RUN_MIGRATIONS'] === 'false') {
      this.logger.warn('Migrations skipped (DATABASE_RUN_MIGRATIONS=false)');
      return;
    }

    for (let attempt = 1; ; attempt += 1) {
      try {
        await this.runWithLock();
        return;
      } catch (error) {
        if (attempt >= MAX_ATTEMPTS || !isTransientConnectionError(error)) {
          throw error;
        }
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        this.logger.warn(
          `Migration attempt ${attempt}/${MAX_ATTEMPTS} failed (${describe(error)}); retrying in ${delay} ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private async runWithLock(): Promise<void> {
    const lockRunner = this.dataSource.createQueryRunner();
    await lockRunner.connect();
    try {
      await lockRunner.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
      try {
        const applied = await this.dataSource.runMigrations({
          transaction: 'each',
        });
        this.logger.log(
          applied.length
            ? `Applied ${applied.length} migration(s): ${applied.map((m) => m.name).join(', ')}`
            : 'Database schema is up to date',
        );
      } finally {
        await lockRunner.query('SELECT pg_advisory_unlock($1)', [
          MIGRATION_LOCK_KEY,
        ]);
      }
    } finally {
      await lockRunner.release();
    }
  }
}

const TRANSIENT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  '57P03', // cannot_connect_now (database starting up)
  '08006',
  '08001',
]);

function isTransientConnectionError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code && TRANSIENT_CODES.has(code)) {
    return true;
  }
  return /timeout|terminated unexpectedly|ECONNREFUSED/i.test(describe(error));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
