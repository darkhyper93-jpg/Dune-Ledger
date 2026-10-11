/**
 * Lo que sabe el jugador: ciudades descubiertas (niebla), precios vistos
 * (con el día en que los vio) y el diario de la temporada.
 */

import { ACTIVE_GOODS } from '../data/goods.js';
import { cityPrices } from './market.js';
import { otherEnd } from './map-gen.js';

/** Máximo de entradas que guarda el diario. */
export const LOG_LIMIT = 400;

/**
 * Agrega una línea al diario con el día actual.
 * @param {object} state
 * @param {string} text
 * @param {string} [kind='info'] info | trade | travel | debt | bad | good
 */
export function addLog(state, text, kind = 'info') {
  state.log.push({ day: state.day, text, kind });
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
}

/**
 * Al estar en una ciudad se conocen ella, sus rutas y sus vecinas.
 * @param {object} game
 * @param {string} cityId
 */
export function discoverAround(game, cityId) {
  const { map, state } = game;
  state.known[cityId] = true;
  state.visited[cityId] = true;
  for (const r of map.routesByCity[cityId]) {
    state.known[otherEnd(r, cityId)] = true;
    state.knownRoutes[r.id] = true;
  }
}

/**
 * Anota los precios actuales de una ciudad como "vistos hoy".
 * @param {object} game
 * @param {string} cityId
 */
export function snapshotPrices(game, cityId) {
  const p = cityPrices(game, cityId, ACTIVE_GOODS);
  game.state.prices[cityId] = { day: game.state.day, sell: p.sell, buy: p.buy };
}

/**
 * Mejor precio de venta conocido para un bien, en otra ciudad que no sea
 * la actual. Sirve para estimar la ganancia en el mercado.
 * @param {object} game
 * @param {string} goodId
 * @returns {{cityId:string,price:number,day:number}|null}
 */
export function bestKnownSell(game, goodId) {
  const { state } = game;
  let best = null;
  for (const [cityId, info] of Object.entries(state.prices)) {
    if (cityId === state.location) continue;
    const price = info.sell[goodId];
    if (price !== undefined && (!best || price > best.price)) best = { cityId, price, day: info.day };
  }
  return best;
}
