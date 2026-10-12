/**
 * Ranking online del desafío: publicar con apodo, ver la tabla y qué pasa
 * sin conexión. Siempre con un servidor simulado: con el navegador manejado
 * por pruebas el juego apunta a un dominio .invalid, y además se revisa que
 * ningún pedido salga hacia la base real.
 */
import { test, expect } from '@playwright/test';
import { dailyDate, scoreCode } from '../../js/game/daily.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=e2e');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?semilla=e2e');
});

test.describe('ranking', () => {
  // Con el service worker activo, Playwright no ve los pedidos (y en WebKit
  // salían a la red): se bloquea para que el servidor simulado los atienda.
  test.use({ serviceWorkers: 'block' });
  /** Ningún pedido puede llegar a la base real. */
  let real = [];
  test.beforeEach(async ({ page }) => {
    real = [];
    page.on('request', (r) => { if (r.url().includes('supabase.co')) real.push(r.url()); });
  });
  test.afterEach(() => expect(real).toEqual([]));

  test('ranking del desafío: publicar con apodo y ver la tabla (servidor simulado)', async ({ page }) => {
    const posted = [];
    // Respuestas con permiso CORS, como las da el servidor de verdad.
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST' };
    await page.route('**/rest/v1/daily_scores**', async (route) => {
      const req = route.request();
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (req.method() === 'POST') {
        posted.push(JSON.parse(req.postData()));
        return route.fulfill({ status: 201, headers: cors, body: '' });
      }
      const mine = posted[0];
      const rows = [{ nickname: 'Zahra', score: 99999 }, ...(mine ? [{ nickname: mine.nickname, score: mine.score }] : [])];
      return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(rows) });
    });
    const today = dailyDate();
    await page.evaluate(async (date) => {
      const { createDaily } = await import('./js/game/daily.js');
      const g = createDaily(date);
      g.state.gold = 2500;
      g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
      localStorage.setItem('dune-ledger:temporada', JSON.stringify(g.state));
    }, today);
    await page.reload();
    await page.getByTestId('continue').click();
    await page.getByTestId('finish').click();
    await page.getByTestId('finish-confirm').click();
    await page.getByTestId('nickname').fill('a');
    await page.getByTestId('publish').click();
    await expect(page.getByTestId('publish-status')).toContainText('apodo');
    await page.getByTestId('nickname').fill('  La   Zorra ');
    await page.getByTestId('publish').click();
    await expect(page.getByTestId('publish-status')).toContainText('Publicado');
    expect(posted).toHaveLength(1);
    expect(posted[0].nickname).toBe('La Zorra');
    expect(posted[0].day).toBe(today);
    expect(posted[0].code).toBe(scoreCode(today, posted[0].score));
    await page.getByText('Volver al menú').click();
    await page.getByTestId('daily').click();
    await expect(page.getByTestId('ranking')).toContainText('Zahra');
    await expect(page.getByTestId('ranking')).toContainText('(vos)');
    await expect(page.getByTestId('publish')).toHaveCount(0);
  });

  test('ranking sin conexión: avisa y no rompe nada', async ({ page }) => {
    await page.route('**/rest/v1/daily_scores**', (route) => route.abort('internetdisconnected'));
    await page.getByTestId('daily').click();
    await expect(page.getByTestId('ranking')).toContainText('Sin conexión');
    await expect(page.getByTestId('daily-play')).toBeEnabled();
  });
});
