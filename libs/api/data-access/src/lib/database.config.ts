import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { ALL_ENTITIES } from './entities';
import { ALL_MIGRATIONS } from './migrations';

type Env = Record<string, string | undefined>;

const DEFAULT_POOL_MAX = 15;
const STATEMENT_TIMEOUT_MS = 15_000;
const CONNECT_TIMEOUT_MS = 5_000;

/**
 * `DATABASE_SSL`: `disable` | `require`. Unset means: no TLS on Railway's private network
 * (`*.railway.internal`) and on localhost, TLS everywhere else. `require` accepts Railway's
 * self-signed certificate (encrypted, not identity-verified); set `DATABASE_SSL_CA` to verify.
 */
function resolveSsl(url: URL, env: Env): PostgresConnectionOptions['ssl'] {
  const mode = env['DATABASE_SSL']?.trim().toLowerCase();
  const host = url.hostname;
  const isPrivate =
    host.endsWith('.railway.internal') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1';

  if (mode === 'disable' || (!mode && isPrivate)) {
    return false;
  }

  const ca = env['DATABASE_SSL_CA']?.trim();
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false };
}

export function assertDatabaseEnv(env: Env = process.env): string {
  const raw = env['DATABASE_URL']?.trim();
  if (!raw) {
    throw new Error('DATABASE_URL is required');
  }
  try {
    new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is not a valid connection URL');
  }
  return raw;
}

export function buildDataSourceOptions(
  env: Env = process.env,
): PostgresConnectionOptions {
  const connectionUrl = assertDatabaseEnv(env);
  const parsed = new URL(connectionUrl);
  const poolMax = Number(env['DATABASE_POOL_MAX']);

  return {
    type: 'postgres',
    url: connectionUrl,
    ssl: resolveSsl(parsed, env),
    entities: ALL_ENTITIES,
    migrations: ALL_MIGRATIONS,
    // The schema is owned by migrations. `synchronize` would silently diverge it.
    synchronize: false,
    migrationsRun: false,
    migrationsTransactionMode: 'each',
    extra: {
      max:
        Number.isInteger(poolMax) && poolMax > 0 ? poolMax : DEFAULT_POOL_MAX,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
      keepAlive: true,
    },
  };
}
