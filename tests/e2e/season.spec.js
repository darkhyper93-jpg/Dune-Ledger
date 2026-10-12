/**
 * Se juega una temporada corta tocando la pantalla: comprar, cargar
 * provisiones, viajar, vender, recargar la página y cerrar la temporada.
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dailyDate, scoreCode } from '../../js/game/daily.js';

/** Número que muestra un dato de la barra superior. */
async function hudNumber(page, id) {
  const text = await page.getByTestId(id).locator('b').innerText();
  return Number(text.split('/')[0].replace(/\./g, ''));
}

/**
 * Termina el viaje en curso: si aparece un evento, elige la primera opción
 * que se pueda y sigue, hasta llegar a una ciudad.
 */
async function finishTrip(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.getByTestId('city-name').count()) return;
    if (await page.getByTestId('event-card').count()) {
      await page.locator('.event-opt:enabled').first().click();
      await page.getByTestId('event-continue').click();
    }
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('city-name')).toBeVisible();
}

/** Empieza una temporada con el Aprendiz. */
async function newSeason(page) {
  await page.getByTestId('new-season').click();
  await page.getByTestId('start-season').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=e2e');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?semilla=e2e');
});

test('una temporada: comprar, viajar, vender y seguir después de recargar', async ({ page }) => {
  await newSeason(page);
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
  await finishTrip(page);
  await expect(page.getByTestId('city-name')).not.toHaveText(startCity, { timeout: 15_000 });
  expect(await hudNumber(page, 'hud-day')).toBeGreaterThan(1);

  // Vender lo que llevamos (si un evento no nos dejó sin carga).
  const owned = page.locator('.good-row', { hasText: 'llevás' });
  if (await owned.count()) {
    await owned.first().click();
    await page.getByTestId('mode-sell').click();
    await page.getByTestId('qty-max').click();
    await page.getByTestId('trade-confirm').click();
  }

  // Cargar provisiones.
  const food = await hudNumber(page, 'hud-food');
  await page.getByTestId('tab-provisiones').click();
  await page.getByTestId('food-1').click();
  expect(await hudNumber(page, 'hud-food')).toBeGreaterThan(food);

  // El diario anotó todo.
  await page.getByTestId('nav-journal').click();
  await expect(page.getByTestId('journal')).toContainText('Llegaste');

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
  await expect(page.locator('.profile-strip')).toContainText(`${seals} sellos`);
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
  await newSeason(page);
  await expect(page.getByTestId('city-name')).toBeVisible();
  await context.setOffline(false);
});

test('contratos de la taberna y eventos que se retoman al recargar', async ({ page }) => {
  await newSeason(page);
  await page.getByTestId('tab-taberna').click();
  const accept = page.locator('[data-testid^=accept-]').first();
  await accept.click();
  await page.getByTestId('nav-caravan').click();
  await expect(page.locator('[data-testid^=contract-]')).toHaveCount(1);

  // Un viaje con un evento armado a mano: al recargar, la carta sigue ahí.
  await page.evaluate(async () => {
    const { loadSeason, saveSeason } = await import('./js/core/save.js');
    const { startTrip } = await import('./js/game/season.js');
    const { createEvent } = await import('./js/game/events.js');
    const { Rng } = await import('./js/core/rng.js');
    const game = loadSeason();
    game.state.food = 100;
    game.state.water = 100;
    startTrip(game, game.map.routesByCity[game.state.location][0].id);
    game.state.trip.rolled = 1;
    game.state.trip.event = createEvent(game, 'tormenta', new Rng('e2e'));
    saveSeason(game);
  });
  await page.reload();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('event-card')).toBeVisible();
  await expect(page.getByTestId('event-card')).toContainText('Tormenta de arena');
  await expect(page.getByTestId('event-opt-1')).toContainText('60% de salir bien');
  await page.getByTestId('event-opt-0').click();
  await page.getByTestId('event-continue').click();
  await finishTrip(page);
});

test('caravana viva: contratar tripulación y ver la salud de los camellos', async ({ page }) => {
  await newSeason(page);
  await page.getByTestId('tab-taberna').click();
  const hireBtn = page.locator('[data-testid^=hire-t]').first();
  await hireBtn.click();
  await expect(page.getByTestId('hud-morale')).toBeVisible();
  await page.getByTestId('nav-caravan').click();
  await expect(page.getByTestId('crew')).toBeVisible();
  await expect(page.getByTestId('camels')).toContainText('Camello 2');
  await expect(page.getByTestId('hud-camels')).toContainText('100%');
});

test('progreso: comprar en el Gremio, elegir mercader y pasar el código', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('dune-ledger:perfil', JSON.stringify({ seals: 200, totalSeals: 200, seasons: 3, wins: 2, bestScore: 900, tutorialDone: false, merchants: ['aprendiz'], upgrades: {}, achievements: {}, codex: {} }));
  });
  await page.reload();
  await page.getByTestId('shop').click();
  await expect(page.getByTestId('shop-seals')).toHaveText('200');
  await page.getByTestId('shop-nomada').getByRole('button').click();
  await expect(page.getByTestId('shop-seals')).toHaveText('140');
  await page.getByTestId('upgrade-oro').getByRole('button').click();
  await expect(page.getByTestId('shop-seals')).toHaveText('130');
  await page.getByText('Volver').click();

  await page.getByTestId('new-season').click();
  await page.getByTestId('merchant-nomada').click();
  await page.getByTestId('start-season').click();
  await expect(page.getByTestId('hud-gold')).toContainText('350');

  // El código de progreso: se copia, se borra todo y se vuelve a cargar.
  await page.getByTestId('nav-city').click();
  await page.goto('/?semilla=e2e');
  await page.getByTestId('settings').click();
  await page.getByTestId('show-code').click();
  const code = await page.getByTestId('progress-code').inputValue();
  expect(code).toMatch(/^DL1-/);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('settings').click();
  await page.getByTestId('load-code').click();
  await page.getByTestId('progress-input').fill(code);
  await page.getByTestId('progress-load').click();
  await page.getByText('Volver').click();
  await expect(page.getByTestId('shop')).toContainText('130 sellos');
  await page.getByTestId('records').click();
  await expect(page.getByTestId('achievements-count')).toContainText('/51');
});

test('regiones y dificultades: lo bloqueado no se elige y la Estepa se juega a caballo', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('dune-ledger:perfil', JSON.stringify({ seals: 0, totalSeals: 0, seasons: 1, wins: 1, bestScore: 900, tutorialDone: false, merchants: ['aprendiz'], upgrades: {}, achievements: {}, codex: {}, regions: ['desierto', 'estepa'], hardWin: false }));
  });
  await page.reload();
  await page.getByTestId('new-season').click();
  await expect(page.getByTestId('region-costa')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByTestId('difficulty-pesadilla')).toHaveAttribute('aria-disabled', 'true');
  // Tocar algo bloqueado no lo elige.
  await page.getByTestId('region-costa').click({ force: true });
  await expect(page.getByTestId('region-desierto')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('region-estepa').click();
  await page.getByTestId('difficulty-dificil').click();
  await expect(page.getByText('Deuda: 2.200 de oro')).toBeVisible();
  await page.getByTestId('start-season').click();
  await expect(page.getByTestId('hud-camels')).toContainText('Caballos');
  await page.getByTestId('tab-provisiones').click();
  await expect(page.getByText('Cada caballo lleva 12 de carga')).toBeVisible();
});

test('desafío del día: mismo mapa para todos y comparar el código de un amigo', async ({ page }) => {
  await page.getByTestId('daily').click();
  const today = dailyDate();
  await page.getByTestId('compare-input').fill(scoreCode(today, 1500));
  await page.getByTestId('compare-check').click();
  await expect(page.getByTestId('compare-result')).toContainText('Código válido: 1.500 puntos');
  await page.getByTestId('compare-input').fill(scoreCode(today, 1500).replace('1500', '9500'));
  await page.getByTestId('compare-check').click();
  await expect(page.getByTestId('compare-result')).toContainText('modificado');
  await page.getByTestId('daily-play').click();
  const city = await page.getByTestId('city-name').innerText();
  await expect(page.getByTestId('hud-day')).toContainText('1/60');
  // Otro jugador (otro almacenamiento) arranca en la misma ciudad.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('daily').click();
  await page.getByTestId('daily-play').click();
  await expect(page.getByTestId('city-name')).toHaveText(city);
});

test('modo libre: sin deuda, se termina cuando quieras y no da sellos', async ({ page }) => {
  await page.getByTestId('free').click();
  await expect(page.getByTestId('hud-due')).toContainText('Modo libre');
  await expect(page.getByTestId('hud-day')).not.toContainText('/60');
  await page.getByTestId('finish').click();
  await page.getByTestId('finish-confirm').click();
  await expect(page.getByText('Fin del modo libre')).toBeVisible();
  await expect(page.getByTestId('final-seals')).toHaveCount(0);
});

test('tutorial: aconseja paso a paso y se puede saltear para siempre', async ({ page }) => {
  await newSeason(page);
  await expect(page.getByTestId('coach-comprar')).toBeVisible();
  await page.getByTestId('nav-map').click();
  // En el mapa todavía no hay consejo: primero hay que comprar.
  await expect(page.getByTestId('coach-ruta')).toHaveCount(0);
  await page.getByTestId('nav-city').click();
  await page.getByTestId('coach-skip').click();
  await expect(page.getByTestId('coach-comprar')).toHaveCount(0);
  await page.reload();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('city-name')).toBeVisible();
  await expect(page.locator('.coach')).toHaveCount(0);
});

test('caravana rival: Kasim aparece en la taberna y en el resumen', async ({ page }) => {
  await newSeason(page);
  await page.getByTestId('tab-taberna').click();
  await expect(page.getByTestId('rival')).toContainText('Kasim');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dune-ledger:temporada'));
    s.gold = 3000; s.debt.installments.forEach((i) => { i.paid = i.amount; });
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(s));
  });
  await page.reload();
  await page.getByTestId('continue').click();
  await page.getByTestId('finish').click();
  await page.getByTestId('finish-confirm').click();
  await expect(page.getByTestId('rival-result')).toContainText('Le ganaste');
});

test('crónica en la taberna y bazar de equipo en provisiones', async ({ page }) => {
  await newSeason(page);
  await page.getByTestId('tab-taberna').click();
  await expect(page.getByTestId('chronicle')).toContainText('capítulo 1 de 3');
  // Llevamos la caravana a la Capital con oro, para ver el bazar ahí.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('dune-ledger:temporada'));
    s.gold = 500;
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(s));
  });
  await page.reload();
  await page.getByTestId('continue').click();
  await page.getByTestId('tab-provisiones').click();
  const bazaar = page.getByTestId('bazaar');
  if (await bazaar.count()) {
    const first = bazaar.locator('button').first();
    await first.click();
    await expect(bazaar).toContainText('Ya lo tenés');
    await page.getByTestId('nav-caravan').click();
    await expect(page.getByTestId('gear-owned')).toBeVisible();
  }
});

test('invertir en la ciudad sube el nivel y descuenta el oro', async ({ page }) => {
  await newSeason(page);
  await page.getByTestId('tab-provisiones').click();
  const card = page.getByTestId('invest');
  await expect(card).toContainText('nivel 0 de 3');
  const gold = await hudNumber(page, 'hud-gold');
  await card.getByTestId('invest-buy').click();
  await expect(card).toContainText('nivel 1 de 3');
  expect(await hudNumber(page, 'hud-gold')).toBe(gold - 120);
});
