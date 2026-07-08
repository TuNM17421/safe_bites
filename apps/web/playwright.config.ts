import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:3000';

// e2e is a separate gate from `pnpm test` (unit): it needs a built app + seeded DB + a browser.
// CI builds + seeds + approves before invoking `pnpm test:e2e`; locally, build first then run.
export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm --filter @safebite/web start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
