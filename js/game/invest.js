/**
 * Invertir en ciudades: hasta 3 niveles por ciudad (pozo, mercado techado,
 * caravasar). Cada nivel da 3% de descuento al comprar ahí, hace que ese
 * mercado se reponga más rápido y suma reputación en la zona. Al final de
 * la temporada, lo invertido cuenta la mitad en el puntaje.
 */

import { changeRep } from './reputation.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';

/** Niveles de inversión, en orden. */
export const INVEST = [
  { name: 'Pozo nuevo', cost: 120, desc: 'Agua para todos: el mercado se repone más rápido.' },
  { name: 'Mercado techado', cost: 200, desc: 'Los mercaderes te hacen precio: compras más baratas.' },
  { name: 'Caravasar', cost: 320, desc: 'Una posada para caravanas con tu nombre en la puerta.' },
];

/** Descuento por nivel al comprar en una ciudad con inversión. */
export const INVEST_DISCOUNT = 0.03;
/** Reposición extra del mercado por nivel (sobre la normal). */
export const INVEST_RECOVERY = 0.5;

/**
 * Nivel de inversión de una ciudad (0 a 3).
 * @param {object} state
 * @param {string} cityId
 */
export function investLevel(state, cityId) {
  return state.invest?.[cityId] ?? 0;
}

/**
 * Próximo nivel que se puede comprar en la ciudad actual, o null.
 * @param {{state:object}} game
 */
export function nextInvest(game) {
  return INVEST[investLevel(game.state, game.state.location)] ?? null;
}

/**
 * Invierte en la ciudad actual (sube un nivel).
 * @param {{map:object, state:object}} game
 * @returns {{ok:boolean, error?:string}}
 */
export function invest(game) {
  const { state, map } = game;
  const next = nextInvest(game);
  if (state.over || state.trip) return { ok: false, error: 'Ahora no se puede.' };
  if (!next) return { ok: false, error: 'Ya invertiste todo lo posible acá.' };
  if (state.gold < next.cost) return { ok: false, error: 'No te alcanza el oro.' };
  const city = map.cityById[state.location];
  state.gold -= next.cost;
  state.invest[city.id] = investLevel(state, city.id) + 1;
  changeRep(state, city.zone, 4);
  state.undo = [];
  addLog(state, `Invertiste ${fmt(next.cost)} en ${city.name}: ${next.name.toLowerCase()}.`, 'trade');
  return { ok: true };
}

/**
 * Lo que valen tus inversiones al cierre: la mitad de lo que pusiste.
 * @param {object} state
 */
export function investValue(state) {
  let spent = 0;
  for (const lvl of Object.values(state.invest ?? {})) for (let i = 0; i < lvl; i++) spent += INVEST[i].cost;
  return Math.round(spent / 2);
}
