/**
 * Generador del mapa de una temporada.
 *
 * A partir de la semilla arma 12 a 16 ciudades, cada una con 2 a 4 rutas
 * que no se cruzan, y comprueba tres cosas antes de aceptarlo:
 *  - se puede llegar a todas las ciudades;
 *  - todas tienen entre 2 y 4 rutas;
 *  - desde cada ciudad hay al menos un negocio razonable con una vecina.
 * Si algo falla, prueba con otra variante de la misma semilla.
 */

import { Rng } from '../core/rng.js';
import { CITY_TYPES, CITY_NAMES } from '../data/cities.js';
import { ACTIVE_GOODS } from '../data/goods.js';
import { RULES } from '../data/rules.js';
import { sellPriceAt, buyPriceAt } from './market.js';

const R = RULES.map;

/** Ganancia mínima (venta/compra) que debe ofrecer cada ciudad hacia alguna vecina. */
export const MIN_ROUTE_MARGIN = 1.25;

/**
 * Distancia entre dos puntos.
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 */
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Dice si los segmentos ab y cd se cruzan (sin contar extremos compartidos).
 */
function segmentsCross(a, b, c, d) {
  if (a === c || a === d || b === c || b === d) return false;
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/**
 * Distancia de un punto p al segmento ab.
 */
function pointSegDist(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ubica n ciudades separadas al menos minDist, con margen en los bordes.
 * @returns {{x:number,y:number}[]|null} null si no entran
 */
function placePoints(rng, n) {
  const pts = [];
  const margin = 9;
  for (let tries = 0; pts.length < n && tries < 4000; tries++) {
    const p = { x: rng.range(margin, R.width - margin), y: rng.range(margin, R.height - margin) };
    if (pts.every((q) => dist(p, q) >= R.minDist)) pts.push(p);
  }
  return pts.length === n ? pts.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })) : null;
}

/**
 * Elige el tipo de cada ciudad respetando mínimos y máximos por tipo.
 * La capital va en la ciudad más cercana al centro del mapa.
 */
function assignTypes(rng, points) {
  const n = points.length;
  const center = { x: R.width / 2, y: R.height / 2 };
  const capitalIdx = points.reduce((best, p, i) => (dist(p, center) < dist(points[best], center) ? i : best), 0);
  const types = [];
  for (const t of CITY_TYPES) for (let i = 0; i < t.min; i++) types.push(t.id);
  const counts = Object.fromEntries(CITY_TYPES.map((t) => [t.id, t.min]));
  while (types.length < n) {
    const weights = {};
    for (const t of CITY_TYPES) if (counts[t.id] < t.max) weights[t.id] = t.weight;
    const id = rng.weighted(weights);
    counts[id]++;
    types.push(id);
  }
  const others = rng.shuffle(types.filter((t) => t !== 'capital'));
  return points.map((_, i) => (i === capitalIdx ? 'capital' : others.pop()));
}

/**
 * Une ciudades con rutas: primero las más cortas, sin cruces ni pasar
 * pegado a otra ciudad, respetando el máximo de rutas por ciudad.
 * @returns {[number,number][]} pares de índices
 */
function buildEdges(points) {
  const n = points.length;
  const maxLen = R.maxDays * R.distPerDay;
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j, dist(points[i], points[j])]);
  pairs.sort((p, q) => p[2] - q[2]);
  const deg = new Array(n).fill(0);
  const edges = [];
  const canAdd = (i, j, len, maxDeg) => {
    if (len > maxLen || deg[i] >= maxDeg || deg[j] >= maxDeg) return false;
    if (edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i))) return false;
    if (edges.some(([a, b]) => segmentsCross(points[i], points[j], points[a], points[b]))) return false;
    return points.every((p, k) => k === i || k === j || pointSegDist(p, points[i], points[j]) > 6);
  };
  for (const [i, j, len] of pairs) {
    // Rutas largas sólo si alguna de las dos ciudades tiene pocas.
    if (len > R.distPerDay * 3.2 && deg[i] >= R.minDegree && deg[j] >= R.minDegree) continue;
    if (canAdd(i, j, len, R.maxDegree)) {
      edges.push([i, j]);
      deg[i]++;
      deg[j]++;
    }
  }
  return edges;
}

/**
 * Comprueba que desde la ciudad 0 se llegue a todas.
 */
function isConnected(n, edges) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    for (const nb of adj[queue.shift()]) {
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  return seen.size === n;
}

/**
 * Elige el terreno de una ruta según el tipo de las ciudades que une.
 */
function pickTerrain(rng, typeA, typeB) {
  const w = { arena: 4, piedra: 3, montana: 1, rio: 1 };
  for (const t of [typeA, typeB]) {
    if (t === 'oasis') w.arena += 3;
    if (t === 'minera') w.montana += 3;
    if (t === 'puerto') w.rio += 3;
    if (t === 'aldea') w.piedra += 2;
  }
  return rng.weighted(w);
}

/**
 * Mejor margen (venta en destino / compra en origen) desde una ciudad hacia
 * alguna vecina, con el stock normal. Sirve para la regla "siempre hay negocio".
 * @param {object} map
 * @param {string} seed
 * @param {string} cityId
 * @returns {number}
 */
export function bestNeighborMargin(map, seed, cityId) {
  const from = map.cityById[cityId];
  let best = 0;
  for (const route of map.routesByCity[cityId]) {
    const to = map.cityById[route.a === cityId ? route.b : route.a];
    for (const g of ACTIVE_GOODS) {
      const margin = sellPriceAt(seed, to, g, RULES.market.stockNormal) / buyPriceAt(seed, from, g, RULES.market.stockNormal);
      if (margin > best) best = margin;
    }
  }
  return best;
}

/**
 * Agrega índices de búsqueda al mapa (ciudad por id, rutas por ciudad).
 * Se usa al generar y al cargar una partida.
 * @param {{cities:object[],routes:object[]}} map
 */
export function indexMap(map) {
  map.cityById = Object.fromEntries(map.cities.map((c) => [c.id, c]));
  map.routeById = Object.fromEntries(map.routes.map((r) => [r.id, r]));
  map.routesByCity = Object.fromEntries(map.cities.map((c) => [c.id, []]));
  for (const r of map.routes) {
    map.routesByCity[r.a].push(r);
    map.routesByCity[r.b].push(r);
  }
  return map;
}

/**
 * Arma un intento de mapa. Devuelve null si no cumple las reglas.
 */
function tryMap(rng, seed) {
  const n = rng.int(R.minCities, R.maxCities);
  const points = placePoints(rng, n);
  if (!points) return null;
  const types = assignTypes(rng, points);
  const edges = buildEdges(points);
  const deg = new Array(n).fill(0);
  for (const [a, b] of edges) {
    deg[a]++;
    deg[b]++;
  }
  if (deg.some((d) => d < R.minDegree || d > R.maxDegree)) return null;
  if (!isConnected(n, edges)) return null;

  const names = rng.shuffle(CITY_NAMES);
  const cities = points.map((p, i) => ({ id: `c${i}`, name: names[i], type: types[i], x: p.x, y: p.y, guildPost: false }));
  const dangerW = { bajo: 4, medio: 3, alto: 2 };
  const routes = edges.map(([a, b], i) => {
    const len = dist(points[a], points[b]);
    return {
      id: `r${i}`,
      a: cities[a].id,
      b: cities[b].id,
      days: Math.min(R.maxDays, Math.max(1, Math.round(len / R.distPerDay))),
      terrain: pickTerrain(rng, types[a], types[b]),
      danger: rng.weighted(dangerW),
    };
  });
  const map = indexMap({ cities, routes });

  // Puestos del Gremio: en ciudades lejos de la capital (a 2 o más rutas).
  const capital = cities.find((c) => c.type === 'capital');
  const near = new Set([capital.id, ...map.routesByCity[capital.id].map((r) => (r.a === capital.id ? r.b : r.a))]);
  const far = rng.shuffle(cities.filter((c) => !near.has(c.id)));
  for (const c of far.slice(0, R.guildPosts)) c.guildPost = true;

  if (cities.some((c) => bestNeighborMargin(map, seed, c.id) < MIN_ROUTE_MARGIN)) return null;
  return map;
}

/**
 * Genera el mapa de una temporada a partir de su semilla. Siempre da el
 * mismo resultado para la misma semilla.
 * @param {string} seed
 * @returns {{cities:object[],routes:object[],cityById:object,routeById:object,routesByCity:object,capitalId:string}}
 */
export function generateMap(seed) {
  const rng = new Rng(`map:${seed}`);
  for (let attempt = 0; attempt < 400; attempt++) {
    const map = tryMap(rng, seed);
    if (map) {
      map.capitalId = map.cities.find((c) => c.type === 'capital').id;
      return map;
    }
  }
  throw new Error(`No se pudo generar un mapa para la semilla ${seed}`);
}

/**
 * Id de la ciudad al otro lado de una ruta.
 * @param {{a:string,b:string}} route
 * @param {string} fromId
 */
export function otherEnd(route, fromId) {
  return route.a === fromId ? route.b : route.a;
}
