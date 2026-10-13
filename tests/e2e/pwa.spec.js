/**
 * La app del celular: se ofrece instalarla y, cuando sale una versión nueva
 * mientras jugás, aparece un cartel para actualizar; al tocarlo se actualiza
 * sola y avisa "¡Listo!". Usa el service worker de verdad: la prueba cambia
 * el sw.js del sitio armado como si se hubiera publicado una versión nueva.
 */
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SW = fileURLToPath(new URL('../../_site/sw.js', import.meta.url));

test('el menú ofrece instalar el juego y explica cómo', async ({ page }) => {
  await page.goto('/?semilla=pwa');
  await page.getByTestId('install').click();
  await expect(page.getByTestId('install-sheet')).toContainText('Instalar en el celular');
  await expect(page.getByTestId('install-sheet').locator('ol li')).toHaveCount(3);
});

test('versión nueva en plena partida: cartel, actualizar y "¡Listo!"', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'El service worker en WebKit de Playwright no es confiable.');
  const original = readFileSync(SW, 'utf8');
  try {
    await page.goto('/?semilla=pwa');
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.getByTestId('new-season').click();
    await page.getByTestId('start-season').click();
    await expect(page.getByTestId('city-name')).toBeVisible();
    // "Se publica" una versión nueva y la app la busca (como al volver de segundo plano).
    writeFileSync(SW, `${original}\n// versión de prueba ${Date.now()}\n`);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    await expect(page.getByTestId('update-banner')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('update-banner')).toContainText('versión nueva');
    await page.getByTestId('update-now').click();
    await expect(page.locator('.toast')).toContainText('¡Listo!', { timeout: 15_000 });
    // La partida sigue ahí después de actualizar.
    await expect(page.getByTestId('continue')).toBeVisible();
  } finally {
    writeFileSync(SW, original);
  }
});
