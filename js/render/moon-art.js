/**
 * Dibujo de la luna en su fase: el disco oscuro y la parte iluminada
 * (creciente a la derecha, menguante a la izquierda), con el mismo contorno
 * índigo que el resto de las ilustraciones.
 */

import { MOON_CYCLE, moonLight } from '../game/moon.js';
import { hashUnit } from '../core/rng.js';

/**
 * Camino SVG de la parte iluminada de la luna.
 * @param {number} phase 0..27
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {string} '' si es luna nueva
 */
export function litPath(phase, cx, cy, r) {
  const k = moonLight(phase);
  if (k <= 0.02) return '';
  if (k >= 0.98) return `M${cx} ${cy - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}z`;
  const waxing = phase < MOON_CYCLE / 2;
  const rx = Math.abs(1 - 2 * k) * r;
  const gibbous = k > 0.5;
  // El borde del lado iluminado, de arriba hacia abajo, y la sombra de vuelta.
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${outer} ${cx} ${cy + r}A${rx.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${cy - r}z`;
}

/**
 * SVG de la luna en una fase (caja de 24×24).
 * @param {number} phase
 */
export function moonSvg(phase) {
  const lit = litPath(phase, 12, 12, 9);
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="#2E3657"/>
    ${lit ? `<path d="${lit}" fill="#F6E7B8"/>` : ''}
    <circle cx="12" cy="12" r="9" fill="none" stroke="#2A2340" stroke-width="1.6"/></svg>`;
}

/**
 * Dibuja la luna en un canvas (para el cielo de la marcha nocturna).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} phase
 * @param {number} x centro
 * @param {number} y centro
 * @param {number} r radio
 */
export function drawMoon(ctx, phase, x, y, r) {
  ctx.save();
  ctx.fillStyle = 'rgba(46, 54, 87, 0.9)';
  ctx.strokeStyle = 'rgba(246, 231, 184, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const lit = litPath(phase, x, y, r);
  if (lit) {
    ctx.shadowColor = 'rgba(246, 231, 184, 0.8)';
    ctx.shadowBlur = r;
    ctx.fillStyle = '#F6E7B8';
    ctx.fill(new Path2D(lit));
  }
  ctx.restore();
}

/**
 * Estrellas fijas (salen de la semilla) para el cielo de la marcha nocturna;
 * con más luna se ven menos.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} hgt
 * @param {string} seed
 * @param {number} light 0 sin luna, 1 llena
 */
export function drawStars(ctx, w, hgt, seed, light) {
  ctx.save();
  ctx.fillStyle = '#FBF3E4';
  for (let i = 0; i < 46; i++) {
    const x = hashUnit(`${seed}|estrella-x|${i}`) * w;
    const y = hashUnit(`${seed}|estrella-y|${i}`) * hgt;
    const big = hashUnit(`${seed}|estrella-r|${i}`);
    ctx.globalAlpha = (0.35 + 0.5 * big) * (1 - 0.6 * light);
    ctx.beginPath();
    ctx.arc(x, y, 0.7 + big * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
