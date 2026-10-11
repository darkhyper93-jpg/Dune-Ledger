/**
 * Caravanas dibujadas en el mapa: la tuya (camellos en fila con fardos de
 * colores) y la del rival (más chica, con fardos color zorro).
 */

import { CAMEL_PATH } from './scenes.js';

const paths = new Map();
/** Path2D cacheado (crearlos cada cuadro es caro). */
function path(key, d) {
  if (!paths.has(key)) paths.set(key, new Path2D(d));
  return paths.get(key);
}

/**
 * Dibuja una fila de camellos.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number, y:number, s:number, dir?:number, ink:string, packs:string[], size?:number}} o
 *   x, y en píxeles; s = escala del mapa; size achica o agranda
 */
export function drawCamelRow(ctx, o) {
  const dir = o.dir ?? 1;
  const size = o.size ?? 1;
  const k = 0.065 * o.s * size;
  const body = path('camel', CAMEL_PATH);
  const pack = path('pack', 'M-16 -4h22v-8h-22z');
  o.packs.forEach((color, i) => {
    ctx.save();
    ctx.translate(o.x - i * 5.4 * o.s * size * dir, o.y);
    ctx.scale(k * dir, k);
    ctx.fillStyle = o.ink;
    ctx.fill(body);
    ctx.fillStyle = color;
    ctx.fill(pack);
    ctx.restore();
  });
}

/** Colores de los fardos de Kasim "el Zorro". */
export const RIVAL_PACKS = ['#D9773A', '#C8642E'];
