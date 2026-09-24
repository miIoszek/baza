import { test as base, expect } from '@playwright/test';

export const hasE2ECredentials = !!(
  process.env.E2E_EMAIL && process.env.E2E_PASSWORD
);

/**
 * `test` whose `page` is already signed in as the E2E company.
 *
 * Every test logs in with its OWN session (POST /api/auth/login sets the HttpOnly refresh cookie in
 * that browser context). A shared storageState cannot work with rotating refresh tokens: parallel
 * contexts would replay one cookie, and the API correctly treats reuse outside the grace window as
 * theft and revokes the whole session family.
 *
 * Specs should call `test.skip(!hasE2ECredentials, ...)` so a missing E2E_EMAIL/E2E_PASSWORD skips
 * instead of failing.
 */
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (hasE2ECredentials) {
      const res = await page.request.post('/api/auth/login', {
        // The API requires an allowed Origin on cookie endpoints (CSRF defence in depth).
        headers: { Origin: baseURL ?? 'http://localhost:4200' },
        data: {
          email: process.env.E2E_EMAIL,
          password: process.env.E2E_PASSWORD,
        },
      });
      expect(
        res.ok(),
        `E2E login failed with HTTP ${res.status()} (check E2E_EMAIL / E2E_PASSWORD and that the account is verified)`
      ).toBe(true);
    }
    await use(page);
  },
});

export { expect };
