/**
 * El jugador ve lo que arriesga: la carta de bandidos dice qué se pierde si
 * sale mal, descansar sin provisiones pide confirmación y la compra marca
 * cuánto conviene llevar.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=riesgo');
  await page.evaluate(() => localStorage.clear());
});

/** Guarda una partida modificada por `setup` (que corre en la página) y la abre. */
async function openWith(page, setup) {
  await page.evaluate(async (code) => {
    const { createSeason } = await import('./js/game/season.js');
    const { createEvent } = await import('./js/game/events.js');
    const { Rng } = await import('./js/core/rng.js');
    const g = createSeason({ seed: 'riesgo' });
    new Function('g', 'createEvent', 'Rng', code)(g, createEvent, Rng);
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(g.state));
  }, setup);
  await page.reload();
  await page.getByTestId('continue').click();
}

test('la carta de bandidos dice cuánto se pierde si sale mal', async ({ page }) => {
  await openWith(page, `
    g.state.cargo.te = 10;
    const r = g.map.routesByCity[g.state.location][0];
    const to = r.a === g.state.location ? r.b : r.a;
    g.state.trip = { routeId: r.id, from: g.state.location, to, done: 0, days: r.days, rolled: 1, event: null };
    g.state.trip.event = createEvent(g, 'bandidos', new Rng('carta'));
  `);
  await expect(page.getByTestId('event-card')).toBeVisible();
  await expect(page.getByTestId('event-risk-1')).toContainText('40% de la carga');
  await expect(page.getByTestId('event-risk-2')).toContainText('25% de la carga');
  await expect(page.getByTestId('event-risk-0')).toHaveCount(0);
});

test('descansar sin agua pide confirmación y explica lo que se pierde', async ({ page }) => {
  await openWith(page, 'g.state.water = 0;');
  await page.getByTestId('tab-provisiones').click();
  await page.getByTestId('rest').click();
  await expect(page.getByTestId('rest-risk')).toContainText('sin agua');
  const day = await page.getByTestId('hud-day').locator('b').innerText();
  await page.getByText('Mejor cargo provisiones').click();
  await expect(page.getByTestId('hud-day').locator('b')).toHaveText(day);
});

test('la compra marca cuánto conviene llevar al mejor destino conocido', async ({ page }) => {
  await openWith(page, `
    const other = g.map.cities.find((c) => c.id !== g.state.location);
    g.state.gold = 3000;
    const here = g.state.prices[g.state.location];
    g.state.prices[other.id] = { ...here, sell: Object.fromEntries(Object.entries(here.sell).map(([id, p]) => [id, Math.round(p * 3)])) };
  `);
  await page.locator('.good-row').first().click();
  await expect(page.getByTestId('qty-worth')).toBeVisible();
  await expect(page.getByTestId('worth-note')).toContainText('conviene hasta');
  await expect(page.getByTestId('unit-why')).toContainText('queda menos');
  await page.getByTestId('qty-worth').click();
  const n = Number((await page.getByTestId('qty-worth').innerText()).match(/\((\d+)\)/)[1]);
  await expect(page.getByTestId('qty')).toHaveText(String(n));
});
