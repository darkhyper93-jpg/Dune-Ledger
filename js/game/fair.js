/**
 * La Gran Feria: el día 40 se anuncia que una ciudad hace una feria del día
 * 55 al 60 y que ahí se va a pagar mucho más por un bien. Le da al final de
 * la temporada algo por lo que jugar: al que va bien, un gran cierre; al que
 * va mal, una última apuesta (ver docs/DECISIONES.md).
 */

import { ACTIVE_GOODS, getGood, isTradedIn, inRegion } from '../data/goods.js';
import { cityMod } from './market.js';
import { regionId } from './perks.js';
import { withRng } from './random.js';
import { addLog } from './knowledge.js';
import { isFree } from './modes.js';

/** Día en que se anuncia la feria. */
export const FAIR_ANNOUNCE = 40;
/** Días de la feria (inclusive). */
export const FAIR_START = 55;
export const FAIR_END = 60;
/** Cuánto más se paga por el bien de la feria (el precio igual tiene su tope). */
export const FAIR_MULT = 2.2;

/**
 * Anuncia la feria cuando llega el día (una vez por temporada).
 * @param {object} game
 */
export function tickFair(game) {
  const { state, map } = game;
  if (state.fair || state.day < FAIR_ANNOUNCE || isFree(state)) return;
  const region = regionId(state);
  const options = [];
  for (const city of map.cities) {
    for (const goodId of ACTIVE_GOODS) {
      if (inRegion(goodId, region) && isTradedIn(goodId, city.type) && cityMod(city.type, goodId) >= 1) options.push({ cityId: city.id, goodId });
    }
  }
  if (!options.length) return;
  const pick = withRng(state, (rng) => rng.pick(options));
  state.fair = { ...pick, start: FAIR_START, end: FAIR_END };
  state.known[pick.cityId] = true;
  addLog(state, `¡Gran Feria! Del día ${FAIR_START} al ${FAIR_END}, en ${map.cityById[pick.cityId].name} van a pagar mucho más por ${getGood(pick.goodId).name.toLowerCase()}.`, 'good');
}

/**
 * Multiplicador de precio de la feria para un bien en una ciudad hoy.
 * @param {object} state
 * @param {string} cityId
 * @param {string} goodId
 */
export function fairMult(state, cityId, goodId) {
  const f = state.fair;
  if (!f || f.cityId !== cityId || f.goodId !== goodId || state.day < f.start || state.day > f.end) return 1;
  return FAIR_MULT;
}
