/**
 * "Si sale mal": describe en palabras lo que se pierde en una opción de
 * evento que depende de la suerte, con los mismos números que aplica el
 * juego (el Seguro y el cofre achican la pérdida de carga). Así el jugador
 * siempre ve lo que arriesga, no sólo la probabilidad.
 */

import { getGood } from '../data/goods.js';
import { eventDef, val, cargoLossFactor } from './events.js';
import { regionOf } from './perks.js';
import { hasGear } from './gear.js';
import { fmt, plural } from '../core/text.js';

/** Valor de la carga a precio base (para decir cuánto oro es una pérdida). */
function cargoValue(state) {
  return Object.entries(state.cargo).reduce((sum, [id, qty]) => sum + qty * getGood(id).base, 0);
}

/**
 * Lo que se pierde si una opción sale mal, o null si no depende de la suerte.
 * @param {object} game
 * @param {number} idx índice de la opción del evento en curso
 * @returns {string|null}
 */
export function riskOf(game, idx) {
  const { state } = game;
  const ev = state.trip?.event;
  const opt = ev ? eventDef(ev.id).options[idx] : null;
  if (!opt || opt.chance === undefined) return null;
  const lose = opt.lose ?? {};
  const p = ev.params;
  const parts = [];
  if (lose.cargoPct && cargoValue(state) > 0) {
    const part = lose.cargoPct * cargoLossFactor(state);
    parts.push(`perdés el ${Math.round(part * 100)}% de la carga (unos ${fmt(Math.round(cargoValue(state) * part))} de oro)`);
  }
  if (lose.losePart && state.cargo[lose.losePart.good] > 0) {
    const n = Math.round(state.cargo[lose.losePart.good] * lose.losePart.pct * cargoLossFactor(state));
    parts.push(`te roban ${n} de ${getGood(lose.losePart.good).name.toLowerCase()}`);
  }
  if (lose.breakFragile && state.cargo.ceramica > 0) {
    parts.push(`se rompe el ${Math.round(lose.breakFragile * cargoLossFactor(state) * 100)}% de la cerámica`);
  }
  const gold = lose.gold !== undefined ? val(lose.gold, p) : 0;
  if (gold < 0) parts.push(`pagás ${fmt(-gold)} de oro`);
  if (lose.inspect && state.cargo.armas > 0) parts.push('te revisan: te sacan las armas y te multan');
  else if (lose.inspect) parts.push('te revisan la carga');
  if (lose.camelHp) parts.push(`los ${regionOf(state).mount.many} pierden ${Math.abs(lose.camelHp)} de salud`);
  if (lose.morale && state.crew.length) parts.push(`baja la moral (${lose.morale})`);
  if (lose.delay) parts.push(`perdés ${plural(lose.delay, 'día', 'días')}`);
  if (lose.water < 0) parts.push(`gastás ${-lose.water} de agua`);
  if (lose.rep < 0) parts.push(`baja tu fama en la zona (${lose.rep})`);
  if (!parts.length) return 'Si sale mal: no perdés nada, sólo no conseguís lo que buscabas.';
  const amulet = hasGear(state, 'amuleto') && !state.amuletUsed ? ' Tu amuleto te salva la primera vez.' : '';
  return `Si sale mal: ${parts.join(', ')}.${amulet}`;
}
