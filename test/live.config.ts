import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig(config, {
  testMatch: 'live-archive.ts',
  timeout: 60_000,
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 1024 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
