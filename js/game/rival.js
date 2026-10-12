/**
 * La caravana rival: Kasim "el Zorro", un mercader temerario del Gremio, que
 * prefiere los atajos peligrosos. Recorre el mismo mapa
 * comprando donde algo es barato y vendiendo donde se paga bien. No pelea
 * con vos: compite por los mercados. Donde compra, el bien se encarece;
 * donde vende, se abarata. Con lo que gana agranda su caravana, va detrás
 * de tus negocios (los destinos de tus contratos y la Gran Feria) y, por
 * temerario, a veces los bandidos le sacan la carga. Al final de la
 * temporada se compara su patrimonio con tu puntaje.
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
import { ANIMAL_VALUE } from './caravan.js';

/** Datos fijos del rival. */
export const RIVAL = {
  name: 'Kasim',
  startGold: 400,
  /** Carga con la que empieza (dos camellos, como vos). */
  capacity: 40,
  /** Cada camello que compra suma esta carga, hasta el tope. */
  growStep: 20,
  maxCapacity: 160,
  /** Precio de un camello para Kasim y oro que no toca para comprarlo. */
  camelCost: 100,
  growReserve: 300,
  /** Días que descansa en cada ciudad antes de volver a salir. */
  restDays: 1,
  /** Chance de que los bandidos le saquen la mitad de la carga según el peligro. */
  robbed: { bajo: 0, medio: 0.06, alto: 0.14 },
  /** Oro que nunca gasta en carga (así un asalto no lo deja en la ruina). */
  keep: 80,
  /** Ganancia mínima por unidad para seguir cargando (sobre lo que paga). */
  unitMargin: 1.08,
  /** Cuánto más le atrae ir adonde van tus contratos o la Gran Feria. */
  chase: 1.3,
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
  return { at, to: null, left: 0, days: 0, wait: 0, gold: RIVAL.startGold, cargo: null, capacity: RIVAL.capacity, danger: 'bajo', full: false };
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
      // Kasim es temerario: prefiere los atajos peligrosos a los caminos seguros,
      // y le gusta ir a pisarte los negocios.
      const taste = margin * (RIVAL.danger[route.danger] ?? 1) * (chased(state, dest.id, id) ? RIVAL.chase : 1);
      if (margin >= RIVAL.minMargin && (!best || taste > best.taste)) best = { route, dest, id, margin, taste };
    }
  }
  const route = best?.route ?? rng.pick(map.routesByCity[r.at]);
  if (best) buyCargo(game, best.id, best.dest);
  r.to = otherEnd(route, r.at);
  r.days = route.days;
  r.left = route.days;
  r.danger = route.danger;
}

/**
 * Dice si un destino es uno de tus negocios: adonde va un contrato tuyo con
 * ese bien, o la ciudad de la Gran Feria con su bien.
 */
function chased(state, destId, goodId) {
  if (state.contracts.active.some((k) => k.to === destId && k.goodId === goodId)) return true;
  const f = state.fair;
  return !!f && f.cityId === destId && f.goodId === goodId && state.day >= f.start - 8;
}

/**
 * Con lo que gana, Kasim compra un camello más cuando su última carga vino
 * llena (si no, no le hace falta) y le sobra el oro.
 */
function grow(state) {
  const r = state.rival;
  const cap = r.capacity ?? RIVAL.capacity;
  if (r.full && cap < RIVAL.maxCapacity && r.gold >= RIVAL.camelCost + RIVAL.growReserve) {
    r.full = false;
    r.gold -= RIVAL.camelCost;
    r.capacity = cap + RIVAL.growStep;
  }
}

/**
 * Compra un bien en la ciudad del rival mientras cada unidad deje ganancia
 * en el destino (allá el precio baja con cada una que vende) y sin tocar su
 * reserva.
 */
function buyCargo(game, goodId, dest) {
  const { state, map } = game;
  const r = state.rival;
  const city = map.cityById[r.at];
  const stock = state.stock[r.at];
  const w = getGood(goodId).weight;
  const cap = r.capacity ?? RIVAL.capacity;
  const max = w > 0 ? Math.floor(cap / w) : cap;
  let destStock = state.stock[dest.id][goodId];
  let qty = 0;
  let cost = 0;
  while (qty < max) {
    const price = buyPriceAt(state.seed, city, goodId, stock[goodId]);
    if (cost + price > r.gold - RIVAL.keep) break;
    if (sellPriceAt(state.seed, dest, goodId, destStock) < price * RIVAL.unitMargin) break;
    destStock = clampStock(destStock + step(goodId));
    cost += price;
    qty++;
    stock[goodId] = clampStock(stock[goodId] - step(goodId));
  }
  if (!qty) return;
  r.gold -= Math.round(cost);
  r.cargo = { goodId, qty, cost: Math.round(cost) };
  r.full = qty * Math.max(1, w) >= cap * 0.9;
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
    // Temerario: en las rutas peligrosas, a veces lo asaltan y pierde la mitad.
    if (r.cargo && rng.chance(RIVAL.robbed[r.danger ?? 'bajo'] ?? 0)) {
      if (nearby(game.map, game.state.location, r.at)) {
        addLog(game.state, `Dicen que a ${RIVAL.name} lo asaltaron en el camino: perdió media carga.`, 'info');
      }
      const left = Math.floor(r.cargo.qty / 2);
      r.cargo = left > 0 ? { ...r.cargo, qty: left, cost: Math.round((r.cargo.cost * left) / r.cargo.qty) } : null;
    }
    if (r.cargo) sellCargo(game);
    grow(game.state);
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
 * Patrimonio del rival para comparar al final: oro, lo que lleva (a lo que
 * pagó) y sus camellos (como los tuyos).
 * @param {object} state
 * @returns {number|null}
 */
export function rivalWorth(state) {
  const r = state.rival;
  if (!r) return null;
  return r.gold + (r.cargo?.cost ?? 0) + Math.round(((r.capacity ?? RIVAL.capacity) / RIVAL.growStep) * ANIMAL_VALUE);
}
