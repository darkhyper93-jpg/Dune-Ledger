/**
 * Se juega una temporada corta tocando la pantalla: comprar, cargar
 * provisiones, viajar, vender, recargar la página y cerrar la temporada.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Número que muestra un dato de la barra superior. */
async function hudNumber(page, id) {
  const text = await page.getByTestId(id).locator('b').innerText();
  return Number(text.split('/')[0].replace(/\./g, ''));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=e2e');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?semilla=e2e');
});

test('una temporada: comprar, viajar, vender y seguir después de recargar', async ({ page }) => {
  await page.getByTestId('new-season').click();
  const startCity = await page.getByTestId('city-name').innerText();
  expect(await hudNumber(page, 'hud-gold')).toBe(300);

  // Comprar todo lo que se pueda de un bien barato en esta ciudad.
  await page.locator('.good-row', { hasText: 'Barato acá' }).first().click();
  await page.getByTestId('qty-max').click();
  await page.getByTestId('trade-confirm').click();
  const goldAfterBuy = await hudNumber(page, 'hud-gold');
  expect(goldAfterBuy).toBeLessThan(300);
  expect(await hudNumber(page, 'hud-cargo')).toBeGreaterThan(0);

  // Deshacer y volver a comprar: el deshacer es exacto.
  await page.getByTestId('undo').click();
  expect(await hudNumber(page, 'hud-gold')).toBe(300);
  await page.locator('.good-row', { hasText: 'Barato acá' }).first().click();
  await page.getByTestId('qty-max').click();
  await page.getByTestId('trade-confirm').click();
  expect(await hudNumber(page, 'hud-gold')).toBe(goldAfterBuy);

  // Viajar a la primera ciudad vecina.
  await page.getByTestId('nav-map').click();
  await expect(page.getByTestId('map-canvas')).toBeVisible();
  await page.locator('[data-testid^=dest-]').first().click();
  await page.getByTestId('travel').click();
  await expect(page.getByTestId('city-name')).not.toHaveText(startCity, { timeout: 15_000 });
  expect(await hudNumber(page, 'hud-day')).toBeGreaterThan(1);

  // Vender lo que llevamos.
  await page.locator('.good-row', { hasText: 'llevás' }).first().click();
  await page.getByTestId('mode-sell').click();
  await page.getByTestId('qty-max').click();
  await page.getByTestId('trade-confirm').click();
  expect(await hudNumber(page, 'hud-cargo')).toBe(0);

  // Cargar provisiones.
  const food = await hudNumber(page, 'hud-food');
  await page.getByTestId('tab-provisiones').click();
  await page.getByTestId('food-1').click();
  expect(await hudNumber(page, 'hud-food')).toBeGreaterThan(food);

  // El diario anotó todo.
  await page.getByTestId('nav-journal').click();
  await expect(page.getByTestId('journal')).toContainText('Vendiste');

  // Se guardó solo: recargar y continuar en el mismo día.
  const day = await hudNumber(page, 'hud-day');
  await page.reload();
  await page.getByTestId('continue').click();
  expect(await hudNumber(page, 'hud-day')).toBe(day);
});

test('cerrar la temporada muestra el resumen y suma sellos', async ({ page }) => {
  // Partida armada en el último día con oro de sobra (como si se hubiera jugado).
  await page.evaluate(async () => {
    const { createSeason } = await import('./js/game/season.js');
    const { saveSeason } = await import('./js/core/save.js');
    const game = createSeason({ seed: 'e2e-fin' });
    game.state.day = 60;
    game.state.gold = 3000;
    saveSeason(game);
  });
  await page.reload();
  await page.getByTestId('continue').click();
  await page.getByTestId('finish').click();
  await page.getByTestId('finish-confirm').click();
  await expect(page.getByTestId('final-score')).toBeVisible();
  await expect(page.getByText('¡Temporada ganada!')).toBeVisible();
  const seals = Number((await page.getByTestId('final-seals').innerText()).split(' ')[0]);
  expect(seals).toBeGreaterThan(0);
  await page.getByText('Volver al menú').click();
  await expect(page.getByText(`Sellos del Gremio: ${seals}`)).toBeVisible();
});

test('Ajustes muestra la misma versión que package.json', async ({ page }) => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  await page.getByTestId('settings').click();
  await expect(page.getByTestId('version')).toHaveText(pkg.version);
  await expect(page.getByTestId('update')).toBeVisible();
});

test('una partida guardada con datos tramposos no se carga', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('dune-ledger:temporada', '{"__proto__":{"gold":999999},"v":1}');
  });
  await page.reload();
  await expect(page.getByTestId('continue')).toHaveCount(0);
  await expect(page.getByTestId('new-season')).toBeVisible();
});

test('funciona sin conexión después de la primera visita', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'El service worker en WebKit de Playwright no es confiable sin conexión.');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('new-season')).toBeVisible();
  await page.getByTestId('new-season').click();
  await expect(page.getByTestId('city-name')).toBeVisible();
  await context.setOffline(false);
});
