/**
 * Libro mayor: después de comprar y cargar provisiones, el Diario muestra
 * el asiento del bien y la cuenta de provisiones, y las cuentas cierran con
 * el oro de la barra.
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/?semilla=e2e');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/?semilla=e2e');
});

test('libro mayor: anota compras y provisiones y cierra con el oro de hoy', async ({ page }) => {
  await page.getByTestId('new-season').click();
  await page.getByTestId('start-season').click();
  await page.getByTestId('nav-journal').click();
  await page.getByTestId('journal-tab-libro').click();
  await expect(page.getByTestId('ledger')).toContainText('Todavía no hay asientos');

  await page.getByTestId('nav-city').click();
  await page.locator('.good-row', { hasText: 'Barato acá' }).first().click();
  await page.getByTestId('qty-max').click();
  await page.getByTestId('trade-confirm').click();
  await page.getByTestId('tab-provisiones').click();
  await page.getByTestId('food-1').click();

  await page.getByTestId('nav-journal').click();
  // El diario recuerda que estabas mirando el libro.
  await expect(page.getByTestId('journal-tab-libro')).toHaveAttribute('aria-checked', 'true');
  const ledger = page.getByTestId('ledger');
  await expect(ledger.locator('tbody tr')).toHaveCount(1);
  await expect(ledger).toContainText('comprados');
  await expect(page.getByTestId('ledger-flow-provisiones')).toContainText('−');
  const gold = (await page.getByTestId('hud-gold').locator('b').innerText()).trim();
  await expect(ledger).toContainText(`Hoy tenés ${gold}`);
  await expect(page.getByTestId('ledger-other').locator('b')).toHaveText('0');

  await page.getByTestId('journal-tab-diario').click();
  await expect(page.getByTestId('journal')).toContainText('Compraste');
});
