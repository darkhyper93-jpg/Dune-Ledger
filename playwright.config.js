/**
 * Pruebas de navegador: se juega como una persona en tamaño Android
 * (Chromium) y iPhone (WebKit), más Safari de escritorio.
 * En local, si sólo tenés Chromium: npx playwright test --project=android
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && node scripts/serve.js',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
