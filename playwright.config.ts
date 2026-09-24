import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200',
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Firefox — ManageEngine Browser Security Plus blocks automated Chrome.
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/\.authenticated\.spec\.ts/],
    },
    {
      name: 'firefox-authenticated',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /\.authenticated\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run serve:frontend',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
