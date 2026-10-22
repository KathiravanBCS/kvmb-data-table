import { defineConfig, devices } from '@playwright/test';

// Use a pre-installed Chromium when provided (e.g. CI images or sandboxes);
// otherwise Playwright's own downloaded browser is used.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'chromium-light', use: { ...devices['Desktop Chrome'], colorScheme: 'light', launchOptions: { executablePath } } },
    {
      name: 'chromium-dark',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark', launchOptions: { executablePath } },
      testMatch: /theme|a11y/,
    },
  ],
  webServer: {
    command: 'npm run docs:build && npx vite preview --config docs/vite.config.ts --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
