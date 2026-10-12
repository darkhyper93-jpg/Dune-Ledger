/**
 * Gráfico de líneas del resumen: tu patrimonio y el oro de Kasim, día a día.
 * SVG hecho a mano (sin librerías): líneas de 2 px, punto final con un aro
 * del color de fondo, etiqueta directa al final de cada línea, grilla tenue,
 * cursor con tooltip al tocar o pasar el dedo (y con las flechas del
 * teclado) y una tabla con los mismos datos para lectores de pantalla.
 */

import { h } from './dom.js';
import { fmt } from '../core/text.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 340;
const H = 190;
const PAD = { top: 14, right: 74, bottom: 24, left: 44 };

/** Crea un elemento SVG con atributos. */
function s(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** Tres o cuatro valores "redondos" para la grilla entre lo y hi. */
function ticks(lo, hi) {
  const span = Math.max(1, hi - lo);
  const raw = span / 3;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((x) => x >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

/**
 * Gráfico de la temporada (o null si hay menos de 2 días anotados).
 * @param {{day:number, me:number, rival:number|null}[]} history
 */
export function worthChart(history) {
  if (!history || history.length < 2) return null;
  const series = [
    { key: 'me', name: 'Vos', cls: 'you' },
    ...(history.some((p) => p.rival !== null) ? [{ key: 'rival', name: 'Kasim', cls: 'rival' }] : []),
  ];
  const values = history.flatMap((p) => series.map((se) => p[se.key]).filter((v) => v !== null));
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const grid = ticks(lo, hi);
  const yMin = Math.min(lo, grid[0]);
  const yMax = Math.max(hi, grid.at(-1));
  const d0 = history[0].day;
  const d1 = history.at(-1).day;
  const x = (day) => PAD.left + ((day - d0) / Math.max(1, d1 - d0)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', role: 'img', tabindex: '0', 'aria-label': 'Gráfico de tu patrimonio y el de Kasim por día. Usá las flechas para recorrerlo.' });
  for (const v of grid) {
    svg.append(s('line', { x1: PAD.left, x2: W - PAD.right, y1: y(v), y2: y(v), class: v === 0 ? 'chart-zero' : 'chart-grid' }));
    const t = s('text', { x: PAD.left - 6, y: y(v) + 4, class: 'chart-tick', 'text-anchor': 'end' });
    t.textContent = fmt(v);
    svg.append(t);
  }
  for (const day of [d0, Math.round((d0 + d1) / 2), d1].filter((v, i, a) => a.indexOf(v) === i)) {
    const t = s('text', { x: x(day), y: H - 6, class: 'chart-tick', 'text-anchor': 'middle' });
    t.textContent = `día ${day}`;
    svg.append(t);
  }

  // Líneas, punto final y etiqueta directa (corrida si se pisan).
  const ends = [];
  for (const se of series) {
    const pts = history.filter((p) => p[se.key] !== null).map((p) => `${x(p.day).toFixed(1)},${y(p[se.key]).toFixed(1)}`);
    svg.append(s('polyline', { points: pts.join(' '), class: `chart-line ${se.cls}` }));
    const last = history.at(-1);
    if (last[se.key] !== null) ends.push({ se, cx: x(last.day), cy: y(last[se.key]), v: last[se.key] });
  }
  ends.sort((a, b) => a.cy - b.cy);
  for (let i = 1; i < ends.length; i++) ends[i].ly = Math.max(ends[i].cy, (ends[i - 1].ly ?? ends[i - 1].cy) + 26);
  for (const e of ends) {
    svg.append(s('circle', { cx: e.cx, cy: e.cy, r: 4, class: `chart-dot ${e.se.cls}` }));
    const t = s('text', { x: e.cx + 9, y: (e.ly ?? e.cy) - 2, class: 'chart-label' });
    t.textContent = e.se.name;
    const v = s('text', { x: e.cx + 9, y: (e.ly ?? e.cy) + 12, class: 'chart-value' });
    v.textContent = fmt(e.v);
    svg.append(t, v);
  }

  // Cursor: línea vertical, puntos y tooltip.
  const cross = s('line', { y1: PAD.top, y2: H - PAD.bottom, class: 'chart-cross', visibility: 'hidden' });
  const marks = series.map((se) => s('circle', { r: 5, class: `chart-dot ${se.cls}`, visibility: 'hidden' }));
  svg.append(cross, ...marks);
  const tip = h('div', { class: 'chart-tip', hidden: true, 'aria-live': 'polite' });
  let idx = history.length - 1;
  const show = (i) => {
    idx = Math.max(0, Math.min(history.length - 1, i));
    const p = history[idx];
    const px = x(p.day);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    cross.setAttribute('visibility', 'visible');
    series.forEach((se, k) => {
      const v = p[se.key];
      marks[k].setAttribute('visibility', v === null ? 'hidden' : 'visible');
      if (v !== null) { marks[k].setAttribute('cx', px); marks[k].setAttribute('cy', y(v)); }
    });
    tip.replaceChildren(h('b', {}, `Día ${p.day}`), ...series.map((se) => h('span', { class: 'chart-tip-row' },
      h('i', { class: `chart-swatch ${se.cls}`, 'aria-hidden': 'true' }), `${se.name}: ${p[se.key] === null ? '—' : fmt(p[se.key])}`)));
    tip.hidden = false;
    tip.style.left = `${(px / W) * 100}%`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    marks.forEach((m) => m.setAttribute('visibility', 'hidden'));
    tip.hidden = true;
  };
  const nearest = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0;
    history.forEach((p, i) => { if (Math.abs(x(p.day) - vx) < Math.abs(x(history[best].day) - vx)) best = i; });
    return best;
  };
  svg.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerdown', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
  });

  const legend = h('div', { class: 'chart-legend' }, series.map((se) => h('span', {}, h('i', { class: `chart-swatch ${se.cls}`, 'aria-hidden': 'true' }), se.name)));
  const table = h('details', { class: 'chart-table' },
    h('summary', {}, 'Ver los números día por día'),
    h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Día'), series.map((se) => h('th', { scope: 'col' }, se.name)))),
      h('tbody', {}, history.map((p) => h('tr', {}, h('td', {}, String(p.day)), series.map((se) => h('td', {}, p[se.key] === null ? '—' : fmt(p[se.key]))))))));

  return h('figure', { class: 'card chart', 'data-testid': 'worth-chart' },
    h('figcaption', {}, h('h3', {}, 'Tu patrimonio y el de Kasim'),
      h('span', { class: 'small muted' }, 'Oro, más lo que pagaste por la carga, menos lo que debías. Tocá el gráfico para ver cada día.')),
    legend,
    h('div', { class: 'chart-wrap' }, svg, tip),
    table);
}
