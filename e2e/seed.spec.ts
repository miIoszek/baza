import { test, expect } from '@playwright/test';

/**
 * Seed exemplar — every generated E2E test should follow this shape.
 * Patterns: getByRole/getByLabel, wait-for-URL/state (no waitForTimeout),
 * risk-tied name, isolated guest session.
 *
 * Risk #5 (test-plan.md): guest must not reach /company/* employer surfaces.
 */
test('guest is redirected from company inbox to login (Risk #5)', async ({
  page,
}) => {
  await page.goto('/company/inbox');

  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  // Material mat-card-title is not exposed as role=heading in this app.
  await expect(page.getByText('Witaj ponownie')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
});
