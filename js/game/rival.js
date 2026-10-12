/**
 * La caravana rival: Kasim "el Zorro", un mercader temerario del Gremio, que
 * prefiere los atajos peligrosos. Recorre el mismo mapa
 * comprando donde algo es barato y vendiendo donde se paga bien. No pelea
 * con vos: compite por los mercados. Donde compra, el bien se encarece;
 * donde vende, se abarata. Al final de la temporada se compara su oro con
 * tu puntaje.
 *
 * Usa su propio azar (derivado de la semilla y el día), así no cambia los
 * eventos ni los precios que te tocan a vos.
 */

import { RULES } from '../data/rules.js';
import { ACTIVE_GOODS, getGood, isTradedIn, inRegion } from '../data/goods.js';
import { Rng } from '../core/rng.js';
import { buyPriceAt, sellPriceAt } from './market.js';
import { otherEnd } from './map-gen.js';
import { regionId, hasPerk } from './perks.js';
import { addLog } from './knowledge.js';
import { betRivalArrive } from './rival-deals.js';

/** Datos fijos del rival. */
export const RIVAL = {
  name: 'Kasim',
  startGold: 400,
  /** Carga que lleva (un poco más que un camello y medio). */
  capacity: 32,
  /** Días que descansa en cada ciudad antes de volver a salir. */
  restDays: 2,
  /** Margen mínimo para que le convenga cargar algo (venta / compra). */
  minMargin: 1.2,
  /** Cuánto le gusta cada peligro de ruta (es temerario). */
  danger: { bajo: 0.7, medio: 1.1, alto: 1.25 },
};

const M = RULES.market;
const step = (goodId) => getGood(goodId).stockStep * M.stockImpact;
const clampStock = (s) => Math.min(M.stockMax, Math.max(M.stockMin, s));

/**
 * Crea al rival en una ciudad distinta de la tuya.
 * @param {object} map
 * @param {string} seed
 * @param {string} playerStart
 */
export function createRival(map, seed, playerStart) {
  const rng = new Rng(`rival:${seed}`);
  const at = rng.pick(map.cities.filter((c) => c.id !== playerStart)).id;
  return { at, to: null, left: 0, days: 0, wait: 0, gold: RIVAL.startGold, cargo: null };
}

/** Vende toda la carga del rival en su ciudad (el precio baja con cada unidad). */
function sellCargo(game) {
  const { state, map } = game;
  const r = state.rival;
  const city = map.cityById[r.at];
  const stock = state.stock[r.at];
  let total = 0;
  for (let i = 0; i < r.cargo.qty; i++) {
    total += sellPriceAt(state.seed, city, r.cargo.goodId, stock[r.cargo.goodId]);
    stock[r.cargo.goodId] = clampStock(stock[r.cargo.goodId] + step(r.cargo.goodId));
  }
  r.gold += Math.round(total);
  if (r.at === state.location && !state.trip) {
    addLog(state, `${RIVAL.name}, la caravana rival, vendió ${r.cargo.qty} de ${getGood(r.cargo.goodId).name} en ${city.name}: ahí ya se paga menos.`, 'info');
  }
  r.cargo = null;
}

/**
 * Elige qué cargar y adónde ir: el bien y la ciudad vecina con mejor margen
 * a los precios de hoy. Si nada conviene, sale vacío a una vecina al azar.
 */
function planTrip(game, rng) {
  const { state, map } = game;
  const r = state.rival;
  const here = map.cityById[r.at];
  const region = regionId(state);
  let best = null;
  for (const route of map.routesByCity[r.at]) {
    const dest = map.cityById[otherEnd(route, r.at)];
    for (const id of ACTIVE_GOODS) {
      if (!inRegion(id, region) || !isTradedIn(id, here.type) || !isTradedIn(id, dest.type) || getGood(id).decay) continue;
      const buy = buyPriceAt(state.seed, here, id, state.stock[r.at][id]);
      const sell = sellPriceAt(state.seed, dest, id, state.stock[dest.id][id]);
      const margin = sell / buy;
      // Kasim es temerario: prefiere los atajos peligrosos a los caminos seguros.
      const taste = margin * (RIVAL.danger[route.danger] ?? 1);
      if (margin >= RIVAL.minMargin && (!best || taste > best.taste)) best = { route, dest, id, margin, taste };
    }
  }
  const route = best?.route ?? rng.pick(map.routesByCity[r.at]);
  if (best) buyCargo(game, best.id);
  r.to = otherEnd(route, r.at);
  r.days = route.days;
  r.left = route.days;
}

/** Compra todo lo que puede de un bien en la ciudad del rival. */
function buyCargo(game, goodId) {
  const { state, map } = game;
  const r = state.rival;
  const city = map.cityById[r.at];
  const stock = state.stock[r.at];
  const w = getGood(goodId).weight;
  const max = w > 0 ? Math.floor(RIVAL.capacity / w) : RIVAL.capacity;
  let qty = 0;
  let cost = 0;
  while (qty < max) {
    const price = buyPriceAt(state.seed, city, goodId, stock[goodId]);
    if (cost + price > r.gold) break;
    cost += price;
    qty++;
    stock[goodId] = clampStock(stock[goodId] - step(goodId));
  }
  if (!qty) return;
  r.gold -= Math.round(cost);
  r.cargo = { goodId, qty, cost: Math.round(cost) };
  if (r.at === state.location && !state.trip) {
    addLog(state, `${RIVAL.name}, la caravana rival, compró ${qty} de ${getGood(goodId).name} en ${city.name}: ahí ya está más caro.`, 'info');
  }
}

/**
 * Un día del rival: avanza su viaje, o vende y compra al llegar, o descansa.
 * Se llama una vez por día desde passDay.
 * @param {{map:object, state:object}} game
 */
export function rivalDay(game) {
  const r = game.state.rival;
  if (!r) return;
  const rng = new Rng(`rival:${game.state.seed}:${game.state.day}`);
  if (r.to) {
    r.left -= 1;
    if (r.left > 0) return;
    r.at = r.to;
    r.to = null;
    r.days = 0;
    if (r.cargo) sellCargo(game);
    if (game.state.bet) betRivalArrive(game);
    r.wait = RIVAL.restDays;
    return;
  }
  if (r.wait > 0) {
    r.wait -= 1;
    return;
  }
  planTrip(game, rng);
}

/** Dice si una ciudad está a una ruta de distancia (o es la misma). */
function nearby(map, from, cityId) {
  return from === cityId || map.routesByCity[from].some((route) => otherEnd(route, from) === cityId);
}

/**
 * Lo que se sabe del rival en la ciudad donde estás: sólo si anda cerca.
 * @param {{map:object, state:object}} game
 * @returns {string|null}
 */
export function rivalNews(game) {
  const { state, map } = game;
  const r = state.rival;
  if (!r) return null;
  const here = state.location;
  const close = hasPerk(state, 'espia') || nearby(map, here, r.at) || (r.to && nearby(map, here, r.to));
  if (!close) return null;
  const name = (id) => map.cityById[id].name;
  if (!r.to) return `${RIVAL.name}, la caravana rival, está en ${name(r.at)}${r.at === here ? ', acá mismo' : ''}.`;
  const load = r.cargo ? ` con ${r.cargo.qty} de ${getGood(r.cargo.goodId).name}` : ' sin carga';
  return `${RIVAL.name}, la caravana rival, salió de ${name(r.at)} hacia ${name(r.to)}${load}. Llega en ${r.left} ${r.left === 1 ? 'día' : 'días'}.`;
}

/**
 * Oro del rival para comparar al final (lo que lleva cuenta a lo que pagó).
 * @param {object} state
 * @returns {number|null}
 */
export function rivalWorth(state) {
  const r = state.rival;
  if (!r) return null;
  return r.gold + (r.cargo?.cost ?? 0);
}
