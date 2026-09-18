import { randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '@baza/api-data-access';

/**
 * Integration tests run against a real Postgres (`TEST_DATABASE_URL`), each test file inside its
 * own throw-away schema so Jest workers never collide. In CI the variable is mandatory: a green
 * run must never mean "all DB tests were silently skipped".
 */
export const testDatabaseUrl = process.env['TEST_DATABASE_URL']?.trim();

if (!testDatabaseUrl && process.env['CI']) {
  throw new Error('TEST_DATABASE_URL must be set in CI for DB integration tests');
}

export const describeDb: jest.Describe = testDatabaseUrl
  ? describe
  : (describe.skip as jest.Describe);

export type TestDb = {
  dataSource: DataSource;
  schema: string;
  destroy: () => Promise<void>;
};

export async function createTestDb(): Promise<TestDb> {
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set');
  }
  const schema = `t_${randomBytes(6).toString('hex')}`;
  const base = buildDataSourceOptions({
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
  });

  const admin = new DataSource({ ...base, entities: [], migrations: [] });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.destroy();

  const dataSource = new DataSource({
    ...base,
    schema,
    extra: { ...(base.extra ?? {}), options: `-c search_path=${schema}` },
  });
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });

  return {
    dataSource,
    schema,
    destroy: async () => {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      const cleanup = new DataSource({ ...base, entities: [], migrations: [] });
      await cleanup.initialize();
      await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await cleanup.destroy();
    },
  };
}
