import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Empty = same-origin `/api` (Cloudflare Pages Function proxies it to the API, so the HttpOnly
 * refresh cookie is first-party). Set API_BASE_URL only when the API is on a same-SITE subdomain
 * of the SPA (e.g. https://api.example.com): a cross-site API cannot hold the SameSite=Strict cookie.
 */
const apiBaseUrl = process.env.API_BASE_URL?.trim() ?? '';
/** Public FE DSN from Actions; empty when unset so builds do not require Sentry. */
const sentryDsn = process.env.SENTRY_DSN?.trim() || '';
const sentryRelease =
  process.env.SENTRY_RELEASE?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  '';

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
  sentryDsn: ${tsString(sentryDsn)},
  sentryRelease: ${tsString(sentryRelease)},
};
`;

writeFileSync(target, contents, 'utf8');
console.log(`Wrote ${target}`);
