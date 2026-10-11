/**
 * Salud de los camellos (0 a 100, uno por camello).
 *
 * Baja un poco con cada día de viaje (más en la montaña, menos por el río)
 * y mucho si no hay agua; se recupera descansando en una ciudad. Un camello
 * sin salud muere y la carga que no entra en los demás se deja en el camino.
 * El último camello nunca muere: queda arrastrándose con 1 de salud.
 */

import { getGood } from '../data/goods.js';
import { TERRAINS } from '../data/routes.js';
import { cargoUsed, capacity } from './caravan.js';

/** Cansancio por día de viaje en terreno normal. */
export const FATIGUE_PER_DAY = 3;
/** Cansancio extra por cada día sin agua. */
export const THIRST_HP = 15;
/** Recuperación por día de descanso en una ciudad. */
export const REST_HP = 25;

/**
 * Cansancio de un día de viaje en un terreno.
 * @param {string} terrain
 */
export function dayFatigue(terrain) {
  return Math.round(FATIGUE_PER_DAY * TERRAINS[terrain].fatigue);
}

/**
 * Salud promedio de los camellos (redondeada).
 * @param {object} state
 */
export function avgHealth(state) {
  return Math.round(state.camelHp.reduce((a, b) => a + b, 0) / state.camelHp.length);
}

/**
 * Deja en el camino la carga que no entra (primero lo más barato por lugar).
 * @param {object} state
 * @returns {string[]} lo que se dejó
 */
export function dropOverflow(state) {
  const lines = [];
  while (cargoUsed(state) > capacity(state)) {
    const ids = Object.keys(state.cargo).filter((id) => state.cargo[id] > 0 && getGood(id).weight > 0);
    ids.sort((a, b) => getGood(a).base / getGood(a).weight - getGood(b).base / getGood(b).weight);
    const id = ids[0];
    const over = cargoUsed(state) - capacity(state);
    const n = Math.min(state.cargo[id], Math.ceil(over / getGood(id).weight));
    state.cargo[id] -= n;
    lines.push(`Dejaste ${n} de ${getGood(id).name} en el camino`);
  }
  return lines;
}

/**
 * Cansa a todos los camellos. Los que llegan a 0 mueren (salvo el último).
 * @param {object} state
 * @param {number} amount
 * @returns {string[]} qué pasó, para el diario
 */
export function tireCamels(state, amount) {
  const lines = [];
  state.camelHp = state.camelHp.map((hp) => hp - amount);
  const alive = state.camelHp.filter((hp) => hp > 0);
  const dead = state.camelHp.length - alive.length;
  if (dead > 0) {
    if (alive.length === 0) alive.push(1);
    const died = state.camelHp.length - alive.length;
    if (died > 0) lines.push(died === 1 ? 'Murió un camello de cansancio' : `Murieron ${died} camellos de cansancio`);
    state.camelHp = alive;
    state.camels = alive.length;
    lines.push(...dropOverflow(state));
  }
  state.camelHp = state.camelHp.map((hp) => Math.max(1, hp));
  return lines;
}

/**
 * Recupera la salud de todos los camellos (tope 100).
 * @param {object} state
 * @param {number} amount
 */
export function healCamels(state, amount) {
  state.camelHp = state.camelHp.map((hp) => Math.min(100, hp + amount));
}
