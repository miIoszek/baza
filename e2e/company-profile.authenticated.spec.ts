import { test, expect, hasE2ECredentials } from './authenticated';

/**
 * Risk #5 — owning session allowed on employer routes (test-plan.md).
 * Signs in through the API (see ./authenticated.ts); needs E2E_EMAIL + E2E_PASSWORD.
 */
test('logged-in company can open company profile (Risk #5 auth)', async ({
  page,
}) => {
  test.skip(
    !hasE2ECredentials,
    'Set E2E_EMAIL / E2E_PASSWORD (a verified company account) to run authenticated specs'
  );

  await page.goto('/company/profile');

  await expect(page).not.toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/company\/profile/);
  // Profile page should render employer UI, not the login form.
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toHaveCount(0);
});

test('session survives a full page reload (restored from the refresh cookie)', async ({
  page,
}) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL / E2E_PASSWORD');

  await page.goto('/company/profile');
  await expect(page).toHaveURL(/\/company\/profile/);
  await page.reload();
  await expect(page).toHaveURL(/\/company\/profile/);
});

test('logging out ends the session: employer routes redirect to /login', async ({
  page,
}) => {
  test.skip(!hasE2ECredentials, 'Set E2E_EMAIL / E2E_PASSWORD');

  await page.goto('/company/profile');
  const out = await page.request.post('/api/auth/logout', {
    headers: { Origin: page.url().replace(/\/company.*$/, '') },
  });
  expect(out.status()).toBe(204);

  await page.goto('/company/profile');
  await expect(page).toHaveURL(/\/login/);
});
