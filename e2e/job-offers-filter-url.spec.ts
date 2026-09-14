import { test, expect } from '@playwright/test';

/**
 * Risk #3 (browser face) — filters silently wrong/empty while offers exist.
 * Unit tests own membership oracles; this E2E asserts the rendered filter UI
 * keeps the selected country in the URL across reload (user-visible contract).
 */
test('job offers country filter stays in URL after reload (Risk #3 UI)', async ({
  page,
}) => {
  await page.goto('/job-offers');
  await expect(page.getByRole('heading', { name: 'Oferty pracy' })).toBeVisible();

  await page.getByLabel('Kraje trasy').click();
  await page.getByRole('option', { name: /Polska/i }).first().click();
  await page.keyboard.press('Escape');

  await expect(page).toHaveURL(/countries=PL/, { timeout: 15_000 });

  await page.reload();
  await expect(page).toHaveURL(/countries=PL/);
  await expect(page.getByRole('heading', { name: 'Oferty pracy' })).toBeVisible();
});
