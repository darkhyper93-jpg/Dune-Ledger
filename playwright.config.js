/**
 * Pruebas de navegador: se juega como una persona en tamaño Android
 * (Chromium) y iPhone (WebKit), más Safari de escritorio.
 * En local, si sólo tenés Chromium: npx playwright test --project=android
 */
import { defineConfig, devices } from '@playwright/test';

/** La prueba de rendimiento (ver el proyecto 'rendimiento'). */
const PERF = /perf\.spec\.js/;

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
    { name: 'android', use: { ...devices['Pixel 7'] }, testIgnore: PERF },
    { name: 'iphone', use: { ...devices['iPhone 13'] }, testIgnore: PERF },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: PERF },
    // La medición de rendimiento corre sola, al final: con otras pruebas en
    // paralelo el procesador está ocupado y los tiempos salen inflados.
    { name: 'rendimiento', use: { ...devices['Pixel 7'] }, testMatch: PERF, dependencies: ['android', 'iphone', 'webkit'] },
  ],
});
