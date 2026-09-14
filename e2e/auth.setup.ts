import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

function hasSession(filePath: string): boolean {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      origins?: { localStorage?: unknown[] }[];
    };
    return (raw.origins ?? []).some((o) => (o.localStorage?.length ?? 0) > 0);
  } catch {
    return false;
  }
}

/**
 * Captures company storageState when E2E_EMAIL + E2E_PASSWORD are set.
 * If env is unset but playwright/.auth/user.json already has a CLI-saved session, keep it.
 * Never overwrite a good session with an empty marker.
 */
setup('save company storageState', async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!email || !password) {
    if (hasSession(authFile)) {
      setup.skip(true, 'Using existing playwright/.auth/user.json (CLI state-save)');
      return;
    }
    setup.skip(
      true,
      'Set E2E_EMAIL/E2E_PASSWORD or run: playwright-cli state-save playwright/.auth/user.json'
    );
    return;
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page).toHaveURL(/\/company(\/|$)/, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });
});
