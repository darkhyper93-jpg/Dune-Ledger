/**
 * El mapa del tesoro: la Taberna vende un rumor de dónde hay un pedazo, la
 * Caravana muestra lo que se sabe y, con el mapa entero, al pasar por la
 * ruta se puede cavar.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=tesoro');
  await page.evaluate(() => localStorage.clear());
});

/** Guarda una partida modificada por `setup` (que corre en la página) y la abre. */
async function openWith(page, setup) {
  await page.evaluate(async (code) => {
    const { createSeason } = await import('./js/game/season.js');
    const { treasureArrive } = await import('./js/game/treasure.js');
    const g = createSeason({ seed: 'tesoro' });
    new Function('g', 'treasureArrive', code)(g, treasureArrive);
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(g.state));
  }, setup);
  await page.reload();
  await page.getByTestId('continue').click();
}

/** Encuentra los primeros `n` pedazos y vuelve a donde estaba. */
const FIND = (n) => `
  const home = g.state.location;
  for (const id of g.state.treasure.pieces.slice(0, ${n})) { g.state.location = id; treasureArrive(g); }
  g.state.location = home;
`;

test('el rumor de la Taberna marca dónde hay un pedazo', async ({ page }) => {
  await openWith(page, FIND(1));
  await page.getByTestId('tab-taberna').click();
  const card = page.getByTestId('treasure');
  await expect(card.getByTestId('treasure-pieces')).toHaveText('1 de 3 pedazos');
  await expect(card.getByTestId('treasure-clue')).toContainText('zona');
  await card.getByTestId('buy-rumor').click();
  await expect(card.getByTestId('treasure-hint')).toContainText('hay un pedazo en');
  await expect(card.getByTestId('buy-rumor')).toHaveCount(0);
  await page.getByTestId('nav-caravan').click();
  await expect(page.getByTestId('treasure').getByTestId('treasure-hint')).toBeVisible();
});

test('con el mapa entero, al pasar por la ruta se cava el tesoro', async ({ page }) => {
  await openWith(page, `${FIND(3)}
    const r = g.map.routeById[g.state.treasure.route];
    g.state.location = r.a;
    g.state.visited[r.a] = true;
    g.state.food = 40;
    g.state.water = 40;
  `);
  await page.getByTestId('nav-caravan').click();
  await expect(page.getByTestId('treasure-clue')).toContainText('podés parar a cavar');
  const to = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem('dune-ledger:temporada'));
    const { generateMap } = await import('./js/game/map-gen.js');
    const map = generateMap(s.seed, s.region);
    const r = map.routes.find((x) => x.id === s.treasure.route);
    return r.a === s.location ? r.b : r.a;
  });
  await page.getByTestId('nav-map').click();
  await page.getByTestId(`dest-${to}`).click();
  await page.getByTestId('travel').click();
  let dug = false;
  for (let i = 0; i < 30 && !(await page.getByTestId('city-name').count()); i++) {
    if (await page.getByTestId('event-card').count()) {
      const card = page.getByTestId('event-card');
      if (!dug && (await card.innerText()).includes('El lugar del mapa')) {
        await page.getByTestId('event-opt-0').click();
        await expect(card).toContainText('cofre');
        dug = true;
      } else {
        await page.locator('.event-opt:enabled').first().click();
      }
      await page.getByTestId('event-continue').click();
    }
    await page.waitForTimeout(300);
  }
  expect(dug).toBe(true);
  await expect(page.getByTestId('city-name')).toBeVisible();
  await page.getByTestId('nav-caravan').click();
  await expect(page.getByTestId('treasure-pieces')).toHaveText('Tesoro desenterrado');
});
