import { defineConfig, devices } from '@playwright/test';

/**
 * Kidrove E2E suite — see e2e/README.md.
 *
 * Runs against a LOCAL seeded stack (never production): the backend on :5001
 * with E2E_RELAX_RATE_LIMITS=true, and a PRODUCTION BUILD of the frontend served
 * by `vite preview` on :5173 (the dev server compiles modules per browser and
 * takes ~40s a page under test load). Both are started automatically, or reused
 * if already running. Point E2E_BASE_URL at the dev server to skip the build.
 */
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
// /api/health returns 503 when a queue backlog is "degraded", so wait on a plain public read instead.
const API_READY = (process.env.E2E_API_URL || 'http://localhost:5001/api') + '/events?limit=1';
const AUTH = (role: string) => `e2e/.auth/${role}.json`;
// Locally use the installed Chrome: Playwright's downloaded headless shell stalls
// 10-30s per page on some Windows machines (security scanning). CI uses the bundled build.
// Override with E2E_CHANNEL=chromium | msedge | chrome.
const CHANNEL = process.env.E2E_CHANNEL ?? (process.env.CI ? undefined : 'chrome');
const browser = (device: object) => ({ ...device, ...(CHANNEL && CHANNEL !== 'chromium' ? { channel: CHANNEL } : {}) });

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The dev stack is one Node process; a few workers keeps it from thrashing.
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    navigationTimeout: 45_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/, use: browser(devices['Desktop Chrome']) },

    // Anonymous visitor, desktop + phone.
    { name: 'public', dependencies: ['setup'], testMatch: /(public|auth)\/.*\.spec\.ts/, use: browser(devices['Desktop Chrome']) },
    { name: 'mobile', dependencies: ['setup'], testMatch: /public\/.*\.spec\.ts/, grep: /@mobile/, use: browser(devices['Pixel 7']) },

    // Logged-in roles (session saved once by auth.setup.ts).
    { name: 'customer', testMatch: /customer\/.*\.spec\.ts/, dependencies: ['setup'], use: { ...browser(devices['Desktop Chrome']), storageState: AUTH('customer') } },
    { name: 'vendor', testMatch: /vendor\/.*\.spec\.ts/, dependencies: ['setup'], use: { ...browser(devices['Desktop Chrome']), storageState: AUTH('vendor') } },
    { name: 'admin', testMatch: /admin\/.*\.spec\.ts/, dependencies: ['setup'], use: { ...browser(devices['Desktop Chrome']), storageState: AUTH('admin'), acceptDownloads: true } },

    // HTTP-only security checks (no browser).
    { name: 'api', dependencies: ['setup'], testMatch: /api\/.*\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run dev',
      url: API_READY,
      env: { E2E_RELAX_RATE_LIMITS: 'true' },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // :5173 is on the backend's dev CORS allowlist; preview reuses the dev /api proxy.
      command: 'npm run build && npx vite preview --port 5173 --strictPort',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 600_000,
    },
  ],
});
