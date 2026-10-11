/**
 * Genera los íconos PNG de la app a partir de icons/icon.svg usando el
 * Chromium de Playwright. Se corre a mano cuando cambia el ícono:
 *   node scripts/gen-icons.js
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();

/** Renderiza el SVG a un PNG cuadrado; `pad` deja margen para íconos maskable. */
async function render(size, file, pad = 0) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size - pad * 2;
  const bg = pad ? '#f4e9d8' : 'transparent';
  await page.setContent(`<html><body style="margin:0;background:${bg}"><div style="padding:${pad}px;width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  await page.screenshot({ path: new URL(`../icons/${file}`, import.meta.url).pathname, omitBackground: !pad });
}

await render(192, 'icon-192.png');
await render(512, 'icon-512.png');
await render(512, 'icon-maskable-512.png', 56);
await browser.close();
console.log('Íconos generados en icons/');
