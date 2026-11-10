import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: '*.spec.ts', fullyParallel: false, workers: 1,
  timeout: 45_000,
  use: { baseURL: 'https://127.0.0.1:4000', browserName: 'chromium', channel: 'chrome', viewport: { width: 1366, height: 1024 } },
  webServer: { command: 'npm run preview', url: 'https://127.0.0.1:4000/entries/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
})
