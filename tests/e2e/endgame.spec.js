/**
 * Mecánicas para remontar y para el final: pedir más plazo al Gremio y el
 * aviso de la Gran Feria en la ciudad.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=final');
  await page.evaluate(() => localStorage.clear());
});

/** Arma una partida guardada en la Capital el día pedido y la abre. */
async function openAt(page, day, patch = '') {
  await page.evaluate(async ({ day, patch }) => {
    const { createSeason } = await import('./js/game/season.js');
    const g = createSeason({ seed: 'final' });
    g.state.location = g.map.capitalId;
    g.state.visited[g.map.capitalId] = true;
    g.state.day = day;
    g.state.food = 40;
    g.state.water = 40;
    if (patch === 'feria') {
      const { tickFair } = await import('./js/game/fair.js');
      tickFair(g);
    }
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(g.state));
  }, { day, patch });
  await page.reload();
  await page.getByTestId('continue').click();
}

test('pedir más plazo al Gremio: la cuota pasa a la siguiente con recargo', async ({ page }) => {
  await openAt(page, 16);
  await page.getByTestId('tab-gremio').click();
  await expect(page.getByTestId('renegotiate')).toBeVisible();
  await page.getByTestId('renegotiate-go').click();
  await page.getByTestId('renegotiate-confirm').click();
  await expect(page.locator('.toast')).toContainText('la cuota pasa al día 40');
  await expect(page.getByTestId('renegotiate')).toHaveCount(0);
  await expect(page.locator('.kv').first()).toContainText('Paga');
});

test('la Gran Feria se anuncia en la ciudad', async ({ page }) => {
  await openAt(page, 41, 'feria');
  await expect(page.getByTestId('fair')).toContainText('Gran Feria');
  await expect(page.getByTestId('fair')).toContainText('del día 55 al 60');
});
