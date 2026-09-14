import { test, expect } from '@playwright/test';

/**
 * Risk #5 — owning session allowed on employer routes (test-plan.md).
 * Uses storageState from playwright/.auth/user.json (CLI state-save or auth.setup).
 */
test('logged-in company can open company profile (Risk #5 auth)', async ({
  page,
}) => {
  await page.goto('/company/profile');

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/company\/profile/);
  // Profile page should render employer UI, not the login form.
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toHaveCount(0);
});
