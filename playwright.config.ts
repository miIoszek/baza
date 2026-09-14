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
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      // Firefox — ManageEngine Browser Security Plus blocks automated Chrome.
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: [/auth\.setup\.ts/, /\.authenticated\.spec\.ts/],
    },
    {
      name: 'firefox-authenticated',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
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
