import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(
  root,
  'apps/baza-frontend/src/environments/environment.local.ts'
);
const example = join(
  root,
  'apps/baza-frontend/src/environments/environment.local.ts.example'
);

if (!existsSync(local)) {
  if (!existsSync(example)) {
    console.error('Missing environment.local.ts.example');
    process.exit(1);
  }
  copyFileSync(example, local);
  console.warn(
    '[env] Created apps/baza-frontend/src/environments/environment.local.ts — fill supabaseUrl / supabaseAnonKey'
  );
}
