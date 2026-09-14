import fs from 'node:fs';

/**
 * True when playwright storageState has a Supabase auth token that is not expired.
 * Presence of localStorage alone is not enough — stale tokens redirect to /login.
 */
export function hasValidAuthStorageState(filePath: string): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      origins?: { localStorage?: { name?: string; value?: string }[] }[];
    };
    const skewMs = 60_000;
    for (const origin of raw.origins ?? []) {
      for (const item of origin.localStorage ?? []) {
        const name = item.name ?? '';
        if (!name.includes('auth-token') || !item.value) {
          continue;
        }
        const tok = JSON.parse(item.value) as { expires_at?: number };
        if (
          typeof tok.expires_at === 'number' &&
          tok.expires_at * 1000 > Date.now() + skewMs
        ) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
