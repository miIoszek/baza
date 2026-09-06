import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_API_BASE_URL =
  'https://baza-api-production-4306.up.railway.app';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const apiBaseUrl =
  process.env.API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'write-fe-production-env: SUPABASE_URL and SUPABASE_ANON_KEY are required'
  );
  process.exit(1);
}

function tsString(value) {
  return JSON.stringify(value);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(
  root,
  'apps/baza-frontend/src/environments/environment.production.ts'
);

const contents = `import type { BazaEnvironment } from './environment.model';

/**
 * Generated for production/CI Pages builds. Do not commit real secrets —
 * this file in git stays placeholder-safe; CI overwrites it at build time.
 */
export const environment: BazaEnvironment = {
  production: true,
  apiBaseUrl: ${tsString(apiBaseUrl)},
  supabaseUrl: ${tsString(supabaseUrl)},
  supabaseAnonKey: ${tsString(supabaseAnonKey)},
};
`;

writeFileSync(target, contents, 'utf8');
console.log(`Wrote ${target}`);
