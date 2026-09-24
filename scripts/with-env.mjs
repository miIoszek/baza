// Runs a command with the variables from .env added to the environment — the portable
// replacement for `VAR=value cmd` in npm scripts (which cmd.exe on Windows does not understand).
//
//   node scripts/with-env.mjs nx test baza-api
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (!existsSync(envFile)) {
  console.error('✖ No .env in the repo root — see README, "Lokalne środowisko".');
  process.exit(1);
}
// Variables already set in the shell win over .env.
process.loadEnvFile(envFile);

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, { stdio: 'inherit', shell: true, env: process.env });
process.exit(result.status ?? 1);
