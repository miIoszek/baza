import { test, expect } from '@playwright/test';

/**
 * Risk #5 — guest reaches /company/* (test-plan.md).
 * Seed covers inbox; this proves the same gate on profile + offers (isolated, no shared state).
 */
test('guest cannot open company profile or offers without login (Risk #5)', async ({
  page,
}) => {
  await page.goto('/company/profile');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByText('Witaj ponownie')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();

  await page.goto('/company/offers');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
});
