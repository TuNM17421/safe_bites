import { defineConfig, devices } from '@playwright/test';

// Point at an already-running server with E2E_BASE_URL (e.g. a local dev server on another port);
// otherwise Playwright starts its own built server. CI builds + seeds + approves first.
const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? 'http://localhost:3000';

// e2e is a separate gate from `pnpm test` (unit): it needs a built app + seeded DB + a browser.
export default defineConfig({
  testDir: './src/tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, trace: 'on-first-retry' },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: 'pnpm --filter @safebite/web start',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});
