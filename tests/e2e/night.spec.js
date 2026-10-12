/**
 * Marcha nocturna: en la hoja de una ruta de arena o piedra se ve la luna
 * de hoy, se elige salir de noche (baja el agua necesaria) y el viaje se
 * hace con el cielo oscuro hasta llegar.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=e2e');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?semilla=e2e');
});

/**
 * Busca en la partida guardada una ciudad vecina por arena o piedra.
 * @returns {Promise<string|null>} id de la ciudad
 */
function landNeighbor(page) {
  return page.evaluate(async () => {
    const { generateMap, otherEnd } = await import('./js/game/map-gen.js');
    const state = JSON.parse(localStorage.getItem('dune-ledger:temporada'));
    const map = generateMap(state.seed, state.region);
    const r = map.routesByCity[state.location].find((x) => x.terrain === 'arena' || x.terrain === 'piedra');
    return r ? otherEnd(r, state.location) : null;
  });
}

test('salir de noche: se ve la luna, baja el agua y se llega', async ({ page }) => {
  // Buscamos una semilla cuya ciudad de salida tenga una ruta por tierra.
  let dest = null;
  for (let i = 0; i < 8 && !dest; i++) {
    await page.goto(`/?semilla=noche-${i}`);
    await page.getByTestId('new-season').click();
    await page.getByTestId('start-season').click();
    await expect(page.getByTestId('city-name')).toBeVisible();
    dest = await landNeighbor(page);
    if (!dest) await page.evaluate(() => localStorage.clear());
  }
  expect(dest).not.toBeNull();
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`dest-${dest}`).click();
  await expect(page.getByTestId('moon')).toContainText(/Luna|Creciente|Cuarto|Gibosa|Menguante/);
  const dayWater = Number((await page.getByTestId('route-water').innerText()).split(' ')[0]);
  await page.getByTestId('march-night').click();
  await expect(page.getByTestId('march-night')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('night-note')).toBeVisible();
  const nightWater = Number((await page.getByTestId('route-water').innerText()).split(' ')[0]);
  expect(nightWater).toBeLessThan(dayWater);
  await expect(page.getByTestId('travel')).toContainText('de noche');
  await page.getByTestId('travel').click();
  await expect(page.getByTestId('travel-banner')).toContainText('Marcha nocturna');
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('city-name').count()) break;
    if (await page.getByTestId('event-card').count()) {
      await page.locator('.event-opt:enabled').first().click();
      await page.getByTestId('event-continue').click();
    }
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('city-name')).toBeVisible();
  await page.getByTestId('nav-journal').click();
  await expect(page.getByTestId('journal')).toContainText('Saliste de noche');
});
