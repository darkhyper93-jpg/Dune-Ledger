/**
 * Rendimiento en un celular viejo: con el procesador 6 veces más lento
 * (sólo en Chromium, que deja simularlo), arrancar y cada toque tienen que
 * responder rápido. Presupuesto: abrir el juego en menos de 3 segundos,
 * empezar una temporada (genera el mapa entero) en menos de 600 ms y cada
 * otro toque en menos de 400 ms.
 */
import { test, expect } from '@playwright/test';

test('responde rápido aunque el celular sea lento', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Simular un procesador lento sólo se puede en Chromium.');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });

  await page.goto('/?semilla=lento');
  await expect(page.getByTestId('new-season')).toBeVisible();
  // Tiempo desde que empezó la navegación hasta que el menú está dibujado,
  // medido por el navegador (sin la demora de Playwright).
  const load = await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(Math.round(performance.now())))));
  console.log(`  abrir: ${load} ms (presupuesto 3000)`);
  expect(load, `abrir tardó ${load} ms`).toBeLessThan(3000);

  /**
   * Mide un toque dentro de la página: desde el click hasta que la pantalla
   * nueva se pintó (dos cuadros), sin contar la demora de Playwright.
   */
  const timed = async (what, testId, ready, budget = 400) => {
    const ms = await page.evaluate(async (id) => {
      const t = performance.now();
      document.querySelector(`[data-testid="${id}"]`).click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return Math.round(performance.now() - t);
    }, testId);
    await expect(page.getByTestId(ready)).toBeVisible();
    console.log(`  ${what}: ${ms} ms (presupuesto ${budget})`);
    expect(ms, `${what} tardó ${ms} ms`).toBeLessThan(budget);
  };
  await timed('nueva temporada', 'new-season', 'start-season');
  await timed('empezar', 'start-season', 'city-name', 600);
  await timed('provisiones', 'tab-provisiones', 'rest');
  await timed('mapa', 'nav-map', 'map-canvas');
  await timed('caravana', 'nav-caravan', 'camels');
  await timed('ciudad', 'nav-city', 'city-name');
});
