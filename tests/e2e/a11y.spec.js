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

for (const scheme of ['light', 'dark']) {
test(`el resumen con el gráfico y el historial son accesibles (${scheme === 'light' ? 'claro' : 'noche'})`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.goto('/?semilla=a11y-grafico');
  await page.evaluate(async () => {
    localStorage.clear();
    const { createSeason, rest } = await import('./js/game/season.js');
    const g = createSeason({ seed: 'a11y-grafico' });
    for (let i = 0; i < 6; i++) { g.state.food = 40; g.state.water = 40; rest(g); }
    g.state.gold = 3000;
    g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
    localStorage.setItem('dune-ledger:temporada', JSON.stringify(g.state));
  });
  await page.reload();
  await page.getByTestId('continue').click();
  await page.getByTestId('finish').click();
  await page.getByTestId('finish-confirm').click();
  await expect(page.getByTestId('worth-chart')).toBeVisible();
  await page.getByTestId('worth-chart').locator('svg').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.chart-tip')).toContainText('Día');
  await check(page, 'resumen');
  await page.getByText('Volver al menú').click();
  await page.getByTestId('records').click();
  await expect(page.getByTestId('season-history')).toContainText('Ganada');
  await check(page, 'historial');
});
}
