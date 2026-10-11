/**
 * Accesibilidad: cada pantalla principal pasa las reglas de axe (contraste,
 * nombres de botones, roles, encabezados) en modo claro y en modo noche.
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Revisa la página con axe y falla mostrando qué regla y dónde. */
async function check(page, where) {
  const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const problems = res.violations.map((v) => `${where} · ${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(problems).toEqual([]);
}

for (const scheme of ['light', 'dark']) {
  test(`pantallas accesibles en modo ${scheme === 'light' ? 'claro' : 'noche'}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto('/?semilla=a11y');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await check(page, 'menú');
    await page.getByTestId('shop').click();
    await check(page, 'gremio');
    await page.getByText('Volver').click();
    await page.getByTestId('records').click();
    await check(page, 'logros');
    await page.getByText('Volver').click();
    await page.getByTestId('settings').click();
    await check(page, 'ajustes');
    await page.getByText('Volver').click();
    await page.getByTestId('daily').click();
    await check(page, 'desafío');
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await page.getByTestId('new-season').click();
    await check(page, 'nueva temporada');
    await page.getByTestId('start-season').click();
    await check(page, 'ciudad');
    await page.getByTestId('tab-provisiones').click();
    await check(page, 'provisiones');
    await page.getByTestId('tab-taberna').click();
    await check(page, 'taberna');
    await page.locator('[data-testid="nav-map"]').click();
    await check(page, 'mapa');
    await page.getByTestId('nav-caravan').click();
    await check(page, 'caravana');
    await page.getByTestId('nav-journal').click();
    await check(page, 'diario');
    await page.getByTestId('nav-city').click();
    await page.locator('.good-row').first().click();
    await check(page, 'hoja de compra');
  });
}
