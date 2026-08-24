import { defineConfig } from '@playwright/test';

const e2ePort = Number.parseInt(process.env.E2E_PORT || process.env.PORT || '4173', 10);
const baseURL = `http://127.0.0.1:${Number.isFinite(e2ePort) ? e2ePort : 4173}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/start-production-test.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
