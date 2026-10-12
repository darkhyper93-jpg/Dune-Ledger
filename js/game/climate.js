/**
 * El clima de la temporada (los datos están en js/data/climates.js): cuál
 * toca según la semilla y cuánto cambia un precio.
 */

import { CLIMATES, CLIMATES_BY_ID } from '../data/climates.js';
import { Rng } from '../core/rng.js';

/**
 * Clima de una semilla (siempre el mismo para la misma semilla).
 * @param {string} seed
 */
export function pickClimate(seed) {
  const rng = new Rng(`clima:${seed}`);
  return rng.weighted(Object.fromEntries(CLIMATES.map((c) => [c.id, c.weight])));
}

/**
 * Clima de la temporada (templado si es una partida vieja).
 * @param {{climate?:string}} state
 */
export function climateOf(state) {
  return CLIMATES_BY_ID[state.climate] ?? CLIMATES_BY_ID.templado;
}

/**
 * Multiplicador de precio que pone el clima a un bien en un tipo de ciudad.
 * @param {object} state
 * @param {string} cityType
 * @param {string} goodId
 */
export function climatePrice(state, cityType, goodId) {
  let mult = 1;
  for (const p of climateOf(state).prices ?? []) {
    if (p.goods.includes(goodId) && (!p.cityTypes || p.cityTypes.includes(cityType))) mult *= p.mult;
  }
  return mult;
}
