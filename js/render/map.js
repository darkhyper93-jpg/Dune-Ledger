/**
 * Dibujo del mapa en canvas: dunas de fondo, rutas conocidas (color por
 * terreno, trazo por peligro, días en el medio), ciudades con su silueta,
 * la caravana y el ciclo de día y noche durante los viajes.
 *
 * Sólo lee el estado del juego; nunca lo cambia.
 */

import { CITY_PATHS, FLAG_PATH } from './shapes.js';
import { drawCamelRow, RIVAL_PACKS } from './caravans.js';
import { rivalNews } from '../game/rival.js';
import { TERRAINS } from '../data/routes.js';
import { routeDays } from '../game/travel.js';
import { hashUnit } from '../core/rng.js';
import { drawMoon, drawStars } from './moon-art.js';
import { moonLight } from '../game/moon.js';

const CITY_R = 4.4;
/** Alto del nombre de una ciudad y ancho aproximado por letra (en unidades del mapa). */
const LABEL_H = 2.8;
const LABEL_CHAR = 1.3;
/** Puntos de la ruta donde puede ir el círculo de días, del medio hacia afuera. */
const BADGE_SPOTS = [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72];

/**
 * Rectángulo que ocupa el nombre de una ciudad, debajo del disco.
 * @param {{x:number,y:number,name:string}} c
 */
function labelBox(c) {
  const w = (c.name.length + 2) * LABEL_CHAR;
  const top = c.y + CITY_R + 1.1;
  return { x0: c.x - w / 2, x1: c.x + w / 2, y0: top, y1: top + LABEL_H };
}

/**
 * Elige dónde poner el círculo de días de una ruta para no tapar nombres ni
 * ciudades: el punto más cercano al medio que quede libre o, si la ruta es
 * muy corta y ninguno lo está, el que menos tape.
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @param {{x0:number,x1:number,y0:number,y1:number}[]} boxes nombres
 * @param {{x:number,y:number}[]} cities discos
 * @param {number} r radio del círculo
 */
export function badgeSpot(a, b, boxes, cities, r) {
  // Cuánto se mete el círculo en los nombres y en los discos (0 = nada).
  const clash = (x, y) => {
    let sum = 0;
    for (const q of boxes) {
      const dx = Math.min(x + r, q.x1) - Math.max(x - r, q.x0);
      const dy = Math.min(y + r, q.y1) - Math.max(y - r, q.y0);
      if (dx > 0 && dy > 0) sum += 2 * Math.min(dx, dy);
    }
    for (const c of cities) sum += 2 * Math.max(0, CITY_R + 1.8 + r - Math.hypot(c.x - x, c.y - y));
    return sum;
  };
  let best = null;
  for (const t of BADGE_SPOTS) {
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const cost = clash(x, y);
    if (cost === 0) return { x, y };
    if (!best || cost < best.cost) best = { x, y, cost };
  }
  return { x: best.x, y: best.y };
}
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
    // Con pocas ciudades conocidas, no acercar tanto: las rutas quedarían
    // cortas al lado de los nombres.
    [minX, maxX] = grow(minX, maxX, 60);
    [minY, maxY] = grow(minY, maxY, 72);
    const top = 56;
    const bottom = 72;
    const scale = Math.max(0.5, Math.min((w - 16) / (maxX - minX), (hgt - top - bottom) / (maxY - minY), 7));
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
   * @param {{selected?:string|null, travel?:{route:object,from:string,t:number}, night?:number, moon?:number}} [extra]
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
    const shown = map.cities.filter((c) => state.known[c.id]);
    const boxes = shown.map(labelBox);
    for (const r of map.routes) {
      if (!state.knownRoutes[r.id]) continue;
      const a = map.cityById[r.a];
      const b = map.cityById[r.b];
      const fromHere = r.a === state.location || r.b === state.location;
      const picked = extra.selected && fromHere && (r.a === extra.selected || r.b === extra.selected);
      ctx.save();
      ctx.lineCap = 'round';
      if (r.terrain === 'mar') {
        // Ruta por mar: un canal de agua ancho debajo de la línea.
        ctx.strokeStyle = TERRAINS.mar.color;
        ctx.globalAlpha = 0.22;
        ctx.lineWidth = 5 * s;
        ctx.beginPath();
        ctx.moveTo(sx(a.x), sy(a.y));
        ctx.lineTo(sx(b.x), sy(b.y));
        ctx.stroke();
      }
      ctx.strokeStyle = TERRAINS[r.terrain].color;
      ctx.lineWidth = (picked ? 1.9 : fromHere ? 1.3 : 0.9) * s;
      ctx.globalAlpha = fromHere || picked ? 1 : 0.7;
      ctx.setLineDash(r.danger === 'alto' ? [1.2 * s, 1.4 * s] : r.danger === 'medio' ? [3.5 * s, 1.5 * s] : []);
      ctx.beginPath();
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.lineTo(sx(b.x), sy(b.y));
      ctx.stroke();
      ctx.restore();
      const spot = badgeSpot(a, b, boxes, shown, picked ? 3.2 : 2.6);
      drawDays(pal, spot.x, spot.y, routeDays(state, r.days), r.danger, picked);
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
    drawRival(pal, game);
    drawCaravan(pal, caravan);

    if (extra.night) {
      ctx.fillStyle = `rgba(8, 16, 46, ${Math.min(0.6, extra.night)})`;
      ctx.fillRect(0, 0, w, hgt);
    }
    if (extra.moon !== undefined) {
      drawStars(ctx, w, hgt, state.seed, moonLight(extra.moon));
      drawMoon(ctx, extra.moon, w - 44, 130, 20); // debajo del cartel del viaje
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
    // Un borde del color del suelo para que el nombre se lea sobre las rutas.
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = pal.bg;
    ctx.strokeText(f.visited ? c.name : `${c.name} ?`, x, y + r + 1.1 * s);
    ctx.fillText(f.visited ? c.name : `${c.name} ?`, x, y + r + 1.1 * s);
    ctx.globalAlpha = 1;
  }

  /** La caravana: tres camellos chiquitos en fila. */
  function drawCaravan(pal, pos) {
    const s = view.scale;
    drawCamelRow(ctx, {
      x: sx(pos.x) + (pos.moving ? 0 : CITY_R * s + 14 * s),
      y: sy(pos.y) - (pos.moving ? 0 : CITY_R * s * 0.9),
      s, dir: pos.dir, ink: pal.ink, packs: [pal.accent, pal.teal, pal.gold],
    });
  }

  /** La caravana rival, si las noticias dicen dónde anda (del otro lado de la ciudad). */
  function drawRival(pal, game) {
    const { state, map } = game;
    const r = state.rival;
    if (!r || !rivalNews(game) || !state.known[r.at]) return;
    const a = map.cityById[r.at];
    const b = r.to && state.known[r.to] ? map.cityById[r.to] : null;
    const t = b && r.days ? 1 - r.left / r.days : 0;
    const x = b ? a.x + (b.x - a.x) * t : a.x;
    const y = b ? a.y + (b.y - a.y) * t : a.y;
    const s = view.scale;
    const dir = b ? Math.sign(b.x - a.x) || 1 : -1;
    drawCamelRow(ctx, {
      x: sx(x) + (b ? 0 : -(CITY_R * s + 6 * s)), y: sy(y) + (b ? 0 : CITY_R * s * 0.6),
      s, dir, ink: pal.ink, packs: RIVAL_PACKS, size: 0.8,
    });
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
    // Al menos 26 px de radio para tocar con el dedo, aunque el mapa esté lejos.
    let bestD = Math.max(CITY_R * 1.9, 26 / view.scale);
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
