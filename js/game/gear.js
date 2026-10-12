/**
 * Bazar de equipo: qué se vende en la ciudad actual, comprar un objeto y
 * saber si la caravana lo tiene. Los objetos están en js/data/gear.js.
 */

import { GEAR, GEAR_BY_ID } from '../data/gear.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';

/**
 * Dice si la caravana tiene un objeto.
 * @param {object} state
 * @param {string} id
 */
export function hasGear(state, id) {
  return state.gear?.[id] === true;
}

/**
 * Objetos que vende la ciudad donde estás.
 * @param {{map:object, state:object}} game
 */
export function gearHere(game) {
  const type = game.map.cityById[game.state.location].type;
  return GEAR.filter((it) => it.sold.includes(type));
}

/**
 * Compra un objeto en la ciudad actual.
 * @param {{map:object, state:object}} game
 * @param {string} id
 * @returns {{ok:boolean, error?:string, total?:number}}
 */
export function buyGear(game, id) {
  const { state, map } = game;
  const it = GEAR_BY_ID[id];
  if (!it) return { ok: false, error: 'Ese objeto no existe.' };
  if (state.over || state.trip) return { ok: false, error: 'Ahora no se puede.' };
  if (!gearHere(game).includes(it)) return { ok: false, error: `En ${map.cityById[state.location].name} no venden ${it.name.toLowerCase()}.` };
  if (hasGear(state, id)) return { ok: false, error: 'Ya lo tenés.' };
  if (state.gold < it.price) return { ok: false, error: 'No te alcanza el oro.' };
  state.gold -= it.price;
  state.gear[id] = true;
  state.undo = [];
  addLog(state, `Compraste ${it.name.toLowerCase()} por ${fmt(it.price)} en ${map.cityById[state.location].name}.`, 'trade');
  return { ok: true, total: it.price };
}
