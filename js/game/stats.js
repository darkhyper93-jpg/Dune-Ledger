/**
 * Estadísticas de la temporada (para el resumen y los logros) y lo que se
 * vio en ella (para el códice del perfil).
 */

import { levelOf } from './crew.js';

/** Estadísticas en cero. */
export function initialStats() {
  return {
    trips: 0, bestSale: null, routeProfit: {}, earned: 0, spent: 0,
    sold: {}, fightsWon: 0, contractsDone: 0, smuggled: 0, highTrips: 0, riskyTrips: 0,
    restDays: 0, shortageDays: 0, treasures: 0, stormsBeaten: 0, helped: 0,
    maxCamels: 0, maxCrew: 0, maxLevel: 0,
    pilgrims: 0, wolves: 0, banquets: 0, piratesBeaten: 0,
  };
}

/** Lo visto en la temporada, por sección del códice. */
export function initialSeen() {
  return { goods: {}, cityTypes: {}, events: {}, roles: {}, traits: {} };
}

/**
 * Suma a un contador de estadísticas.
 * @param {object} state
 * @param {string} key
 * @param {number} [n=1]
 */
export function bump(state, key, n = 1) {
  state.stats[key] = (state.stats[key] ?? 0) + n;
}

/**
 * Anota algo visto para el códice.
 * @param {object} state
 * @param {'goods'|'cityTypes'|'events'|'roles'|'traits'} section
 * @param {string} id
 */
export function see(state, section, id) {
  state.seen[section][id] = true;
}

/**
 * Actualiza los récords de la temporada (camellos, tripulación, nivel).
 * @param {object} state
 */
export function notePeaks(state) {
  const st = state.stats;
  st.maxCamels = Math.max(st.maxCamels, state.camels);
  st.maxCrew = Math.max(st.maxCrew, state.crew.length);
  for (const m of state.crew) st.maxLevel = Math.max(st.maxLevel, levelOf(m));
}
