/**
 * Dibujo del mapa en canvas: dunas de fondo, rutas conocidas (color por
 * terreno, trazo por peligro, días en el medio), ciudades con su silueta,
 * la caravana y el ciclo de día y noche durante los viajes.
 *
 * Sólo lee el estado del juego; nunca lo cambia.
 */

import { CITY_PATHS, FLAG_PATH } from './shapes.js';
import { CAMEL_PATH } from './scenes.js';
import { TERRAINS } from '../data/routes.js';
import { hashUnit } from '../core/rng.js';

const CITY_R = 5.2;
const PATHS = {};

/** Path2D de una silueta (se crea una vez y se reutiliza). */
function pathFor(key, d) {
  PATHS[key] ??= new Path2D(d);
  return PATHS[key];
}

/** Lee los colores actuales del tema (claro u oscuro) desde CSS. */
function palette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    bg: v('--bg'), surface: v('--surface'), surface2: v('--surface-2'), ink: v('--ink'), ink2: v('--ink-2'),
    line: v('--line'), accent: v('--accent'), teal: v('--teal'), bad: v('--bad'), gold: v('--gold'),
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
  };
}

/**
 * Crea la vista del mapa sobre un canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{onPick:(cityId:string|null)=>void}} opts
 */
export function createMapView(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1 };
  let last = null; // último pedido de dibujo, para redibujar al cambiar tamaño

  /** Ajusta el canvas al tamaño de su caja. */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    view.dpr = dpr;
    if (last) draw(last.game, last.extra);
  }

  /**
   * Encuadra las ciudades conocidas: al principio se ve de cerca y el mapa
   * se va abriendo a medida que se descubre más desierto.
   */
  function fit(game) {
    const w = canvas.width / view.dpr;
    const hgt = canvas.height / view.dpr;
    const known = game.map.cities.filter((c) => game.state.known[c.id]);
    let minX = Math.min(...known.map((c) => c.x)) - 10;
    let maxX = Math.max(...known.map((c) => c.x)) + 10;
    let minY = Math.min(...known.map((c) => c.y)) - 10;
    let maxY = Math.max(...known.map((c) => c.y)) + 12;
    const grow = (lo, hi, min) => {
      const extra = Math.max(0, min - (hi - lo)) / 2;
      return [lo - extra, hi + extra];
    };
    [minX, maxX] = grow(minX, maxX, 50);
    [minY, maxY] = grow(minY, maxY, 60);
    const top = 56;
    const bottom = 72;
    const scale = Math.max(0.5, Math.min((w - 16) / (maxX - minX), (hgt - top - bottom) / (maxY - minY), 9));
    view.scale = scale;
    view.ox = w / 2 - ((minX + maxX) / 2) * scale;
    view.oy = top + (hgt - top - bottom) / 2 - ((minY + maxY) / 2) * scale;
  }

  /** Coordenadas de mapa → píxeles CSS. */
  const sx = (x) => view.ox + x * view.scale;
  const sy = (y) => view.oy + y * view.scale;

  /**
   * Dibuja todo. `extra` puede traer la ciudad elegida, la posición de la
   * caravana en viaje (0..1 sobre una ruta) y la oscuridad del cielo.
   * @param {{map:object,state:object}} game
   * @param {{selected?:string|null, travel?:{route:object,from:string,t:number}, night?:number}} [extra]
   */
  function draw(game, extra = {}) {
    last = { game, extra };
    const { map, state } = game;
    const pal = palette();
    const w = canvas.width / view.dpr;
    const hgt = canvas.height / view.dpr;
    if (w < 20 || hgt < 20) return;
    fit(game);
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    drawGround(pal, w, hgt, state.seed);

    const s = view.scale;
    for (const r of map.routes) {
      if (!state.knownRoutes[r.id]) continue;
      const a = map.cityById[r.a];
      const b = map.cityById[r.b];
      const fromHere = r.a === state.location || r.b === state.location;
      const picked = extra.selected && fromHere && (r.a === extra.selected || r.b === extra.selected);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = TERRAINS[r.terrain].color;
      ctx.lineWidth = (picked ? 1.9 : fromHere ? 1.3 : 0.9) * s;
      ctx.globalAlpha = fromHere || picked ? 1 : 0.7;
      ctx.setLineDash(r.danger === 'alto' ? [1.2 * s, 1.4 * s] : r.danger === 'medio' ? [3.5 * s, 1.5 * s] : []);
      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
      ctx.restore();
      drawDays(pal, (a.x + b.x) / 2, (a.y + b.y) / 2, r.days, r.danger, picked);
    }

    const targets = new Set(state.contracts.active.map((k) => k.to));
    for (const c of map.cities) {
      if (!state.known[c.id]) continue;
      drawCity(pal, c, {
        target: targets.has(c.id),
        visited: !!state.visited[c.id],
        here: c.id === state.location && !extra.travel,
        selected: c.id === extra.selected,
      });
    }

    let caravan = map.cityById[state.location];
    if (extra.travel) {
      const { route, from, t } = extra.travel;
      const a = map.cityById[from];
      const b = map.cityById[route.a === from ? route.b : route.a];
      caravan = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, moving: true, dir: Math.sign(b.x - a.x) || 1 };
    }
    drawCaravan(pal, caravan);

    if (extra.night) {
      ctx.fillStyle = `rgba(8, 16, 46, ${Math.min(0.6, extra.night)})`;
      ctx.fillRect(0, 0, w, hgt);
    }
  }

  /** Fondo: arena (o noche) con ondas de dunas fijas por semilla. */
  function drawGround(pal, w, hgt, seed) {
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, w, hgt);
    ctx.save();
    ctx.strokeStyle = pal.line;
    ctx.globalAlpha = pal.dark ? 0.35 : 0.55;
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const y = (i + 0.5) * (hgt / 14);
      const amp = 4 + hashUnit(`${seed}|duna|${i}`) * 8;
      const phase = hashUnit(`${seed}|fase|${i}`) * Math.PI * 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12) {
        const yy = y + Math.sin(x / 38 + phase) * amp;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Círculo con los días de la ruta, en el medio del camino. */
  function drawDays(pal, x, y, days, danger, picked) {
    const r = (picked ? 3.2 : 2.6) * view.scale;
    ctx.beginPath();
    ctx.arc(sx(x), sy(y), r, 0, Math.PI * 2);
    ctx.fillStyle = pal.surface;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, 0.35 * view.scale);
    ctx.strokeStyle = danger === 'alto' ? pal.bad : danger === 'medio' ? pal.gold : pal.teal;
    ctx.stroke();
    ctx.fillStyle = pal.ink;
    ctx.font = `700 ${Math.round(r * 1.1)}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${days}d`, sx(x), sy(y) + 0.5);
  }

  /** Ciudad: disco, silueta según el tipo, nombre y marcas. */
  function drawCity(pal, c, f) {
    const s = view.scale;
    const x = sx(c.x);
    const y = sy(c.y);
    const r = CITY_R * s;
    if (f.target) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r + 2.6 * s, 0, Math.PI * 2);
      ctx.setLineDash([1.2 * s, 1 * s]);
      ctx.strokeStyle = pal.gold;
      ctx.lineWidth = 0.6 * s;
      ctx.stroke();
      ctx.restore();
    }
    if (f.here || f.selected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 1.4 * s, 0, Math.PI * 2);
      ctx.strokeStyle = f.selected ? pal.teal : pal.accent;
      ctx.lineWidth = 0.9 * s;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = f.visited ? pal.surface : pal.surface2;
    ctx.fill();
    ctx.lineWidth = Math.max(1, 0.3 * s);
    ctx.strokeStyle = pal.line;
    ctx.stroke();

    ctx.save();
    const k = (r * 1.45) / 24;
    ctx.translate(x - 12 * k, y - 12.5 * k);
    ctx.scale(k, k);
    ctx.globalAlpha = f.visited ? 1 : 0.45;
    ctx.fillStyle = c.type === 'capital' ? pal.accent : pal.ink;
    ctx.fill(pathFor(c.type, CITY_PATHS[c.type]));
    ctx.restore();

    if (c.guildPost) {
      ctx.save();
      const fk = (2.6 * s) / 24;
      ctx.translate(x + r * 0.55, y - r * 1.25);
      ctx.scale(fk, fk);
      ctx.fillStyle = pal.accent;
      ctx.fill(pathFor('flag', FLAG_PATH));
      ctx.restore();
    }

    ctx.fillStyle = pal.ink;
    ctx.globalAlpha = f.visited ? 1 : 0.7;
    ctx.font = `${f.here ? 700 : 500} ${Math.max(11, Math.round(2.3 * s))}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(f.visited ? c.name : `${c.name} ?`, x, y + r + 1.1 * s);
    ctx.globalAlpha = 1;
  }

  /** La caravana: tres camellos chiquitos en fila. */
  function drawCaravan(pal, pos) {
    const s = view.scale;
    const dir = pos.dir ?? 1;
    const baseX = sx(pos.x) + (pos.moving ? 0 : CITY_R * s + 14 * s);
    const baseY = sy(pos.y) - (pos.moving ? 0 : CITY_R * s * 0.9);
    const k = 0.065 * s;
    const body = pathFor('camel', CAMEL_PATH);
    const pack = pathFor('pack', 'M-16 -4h22v-8h-22z');
    const packs = [pal.accent, pal.teal, pal.gold];
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(baseX - i * 5.4 * s * dir, baseY);
      ctx.scale(k * dir, k);
      ctx.fillStyle = pal.ink;
      ctx.fill(body);
      ctx.fillStyle = packs[i];
      ctx.fill(pack);
      ctx.restore();
    }
  }

  /**
   * Ciudad conocida más cercana a un toque (en px CSS), o null.
   * @param {object} game
   * @param {number} px
   * @param {number} py
   */
  function pick(game, px, py) {
    const mx = (px - view.ox) / view.scale;
    const my = (py - view.oy) / view.scale;
    let best = null;
    let bestD = CITY_R * 1.9;
    for (const c of game.map.cities) {
      if (!game.state.known[c.id]) continue;
      const d = Math.hypot(c.x - mx, c.y - my);
      if (d < bestD) {
        bestD = d;
        best = c.id;
      }
    }
    return best;
  }

  canvas.addEventListener('click', (e) => {
    if (!last) return;
    const rect = canvas.getBoundingClientRect();
    opts.onPick(pick(last.game, e.clientX - rect.left, e.clientY - rect.top));
  });

  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);

  return {
    draw,
    resize,
    /** Coordenadas en pantalla (px CSS) de una ciudad, para pruebas y ayudas. */
    cityPoint(city) {
      return { x: sx(city.x), y: sy(city.y) };
    },
    destroy() {
      ro.disconnect();
    },
  };
}
