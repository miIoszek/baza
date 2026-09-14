import { test as setup, expect, firefox } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { hasValidAuthStorageState } from './auth-session';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

/**
 * Captures company storageState when E2E_EMAIL + E2E_PASSWORD are set.
 * If env is unset but playwright/.auth/user.json already has a fresh CLI-saved
 * session, keep it. Never treat an expired token as a valid session.
 *
 * No `{ page }` fixture — so skip paths do not launch a browser.
 */
setup('save company storageState', async () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  if (!email || !password) {
    if (hasValidAuthStorageState(authFile)) {
      setup.skip(true, 'Using existing playwright/.auth/user.json (CLI state-save)');
      return;
    }
    setup.skip(
      true,
      'Set E2E_EMAIL/E2E_PASSWORD or run: playwright-cli state-save playwright/.auth/user.json'
    );
    return;
  }

  const browser = await firefox.launch();
  const page = await browser.newPage();
  try {
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('textbox', { name: 'Hasło' }).fill(password);
    await page.getByRole('button', { name: 'Zaloguj się' }).click();
    await expect(page).toHaveURL(/\/company(\/|$)/, { timeout: 30_000 });
    await page.context().storageState({ path: authFile });
  } finally {
    await browser.close();
  }
});
