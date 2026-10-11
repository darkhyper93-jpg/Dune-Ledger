/**
 * Ventajas de la temporada: el mercader elegido y las mejoras del Gremio
 * compradas con sellos. La temporada guarda una copia (`state.merchant` y
 * `state.upgrades`) para que la partida no dependa del perfil.
 */

import { MERCHANTS_BY_ID } from '../data/merchants.js';
import { UPGRADES_BY_ID } from '../data/upgrades.js';
import { isTradedIn } from '../data/goods.js';

/**
 * Dice si la temporada se juega con ese mercader.
 * @param {object} state
 * @param {string} merchantId
 */
export function hasPerk(state, merchantId) {
  return state.merchant === merchantId;
}

/**
 * Nivel comprado de una mejora (0 si no se compró).
 * @param {object} state
 * @param {string} id
 */
export function upgradeLevel(state, id) {
  return state.upgrades?.[id] ?? 0;
}

/**
 * Lo que suma una mejora: nivel × lo que da cada nivel.
 * @param {object} state
 * @param {string} id
 */
export function upgradeValue(state, id) {
  return upgradeLevel(state, id) * UPGRADES_BY_ID[id].step;
}

/**
 * Limpia las mejoras pedidas: sólo ids que existen y niveles posibles.
 * @param {Record<string, number>} upgrades
 */
export function cleanUpgrades(upgrades = {}) {
  const out = {};
  for (const [id, lvl] of Object.entries(upgrades)) {
    if (Object.hasOwn(UPGRADES_BY_ID, id) && Number.isInteger(lvl) && lvl > 0) out[id] = Math.min(lvl, UPGRADES_BY_ID[id].costs.length);
  }
  return out;
}

/**
 * Devuelve el mercader o lanza un error si no existe.
 * @param {string} id
 */
export function getMerchant(id) {
  if (!Object.hasOwn(MERCHANTS_BY_ID, id)) throw new Error(`Mercader desconocido: ${id}`);
  return MERCHANTS_BY_ID[id];
}

/**
 * Dice si este jugador puede comerciar un bien en un tipo de ciudad
 * (al Contrabandista no le importa que las armas estén prohibidas).
 * @param {object} state
 * @param {string} goodId
 * @param {string} cityType
 */
export function canTrade(state, goodId, cityType) {
  return isTradedIn(goodId, cityType) || hasPerk(state, 'contrabandista');
}
