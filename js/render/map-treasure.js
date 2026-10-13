/**
 * Marcas del tesoro sobre el mapa (canvas): una cruz roja en el medio de la
 * ruta del tesoro cuando ya tenés el mapa entero, y un pergamino chiquito
 * junto a la ciudad donde un rumor (o dos pedazos) dicen que hay algo.
 */

import { treasureClue } from '../game/treasure.js';

const RED = '#B4482A';
const PAPER = '#F1DDB0';

/**
 * Pergamino chiquito arriba a la izquierda de una ciudad.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawScroll(ctx, x, y, s, pal) {
  const w = 3 * s;
  const hh = 2.2 * s;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = Math.max(1, 0.25 * s);
  ctx.beginPath();
  ctx.rect(x - w / 2, y - hh / 2, w, hh);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = RED;
  ctx.lineWidth = Math.max(1.2, 0.3 * s);
  const k = 0.55 * s;
  ctx.beginPath();
  ctx.moveTo(x - k, y - k * 0.8);
  ctx.lineTo(x + k, y + k * 0.8);
  ctx.moveTo(x + k, y - k * 0.8);
  ctx.lineTo(x - k, y + k * 0.8);
  ctx.stroke();
  ctx.restore();
}

/**
 * Dibuja las marcas del tesoro que correspondan.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{game:object, sx:(x:number)=>number, sy:(y:number)=>number, s:number, r:number, pal:object}} o
 */
export function drawTreasureMarks(ctx, { game, sx, sy, s, r, pal }) {
  const { state, map } = game;
  const t = state.treasure;
  if (!t || t.dug) return;
  const clue = treasureClue(game);
  const marked = [t.hint, clue.cityId].filter((id) => id && state.known[id]);
  for (const id of new Set(marked)) {
    const c = map.cityById[id];
    drawScroll(ctx, sx(c.x) - r * 1.1, sy(c.y) - r * 1.1, s, pal);
  }
  if (!clue.routeId) return;
  const route = map.routeById[clue.routeId];
  const a = map.cityById[route.a];
  const b = map.cityById[route.b];
  // Un poco corrida del medio, para no tapar los días de la ruta.
  const x = sx(a.x + (b.x - a.x) * 0.35);
  const y = sy(a.y + (b.y - a.y) * 0.35);
  const k = 1.5 * s;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [color, width] of [[pal.bg, 0.9 * s + 3], [RED, 0.9 * s]]) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x - k, y - k);
    ctx.lineTo(x + k, y + k);
    ctx.moveTo(x + k, y - k);
    ctx.lineTo(x - k, y + k);
    ctx.stroke();
  }
  ctx.restore();
}
