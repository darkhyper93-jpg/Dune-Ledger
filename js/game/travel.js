/**
 * Viajes: cuánto cuesta una ruta, el paso de los días y la llegada.
 *
 * Por cada día de viaje se gasta 1 de comida y 1 de agua por cada 2 seres
 * (personas + camellos), redondeando hacia arriba; el terreno multiplica
 * el agua. Si falta comida o agua, cada día se abandona un 10% de la carga.
 */

import { RULES } from '../data/rules.js';
import { TERRAINS } from '../data/routes.js';
import { getGood } from '../data/goods.js';
import { recoverStock } from './market.js';
import { settleInstallment } from './debt.js';
import { otherEnd } from './map-gen.js';
import { addLog, discoverAround, snapshotPrices } from './knowledge.js';
import { plural } from '../core/text.js';

/** Parte de la carga que se pierde por cada día sin comida o sin agua. */
export const SHORTAGE_LOSS = 0.1;

/**
 * Cuántos seres comen y toman agua: personas más camellos.
 * @param {object} state
 */
export function mouths(state) {
  return RULES.people + state.camels;
}

/**
 * Raciones de comida (y de agua base) por día.
 * @param {object} state
 */
export function dailyRation(state) {
  return Math.ceil(mouths(state) / 2);
}

/**
 * Agua que se gasta en total hasta el día k de una ruta (acumulado).
 */
function waterUntil(state, terrain, k) {
  return Math.ceil(k * dailyRation(state) * TERRAINS[terrain].water - 1e-9);
}

/**
 * Lo que hace falta para recorrer una ruta: días, comida y agua.
 * @param {object} state
 * @param {{days:number,terrain:string}} route
 * @returns {{days:number,food:number,water:number,enoughFood:boolean,enoughWater:boolean}}
 */
export function tripNeeds(state, route) {
  const food = route.days * dailyRation(state);
  const water = waterUntil(state, route.terrain, route.days);
  return { days: route.days, food, water, enoughFood: state.food >= food, enoughWater: state.water >= water };
}

/**
 * Dice si se puede salir por esta ruta y, si no, por qué.
 * @param {object} game
 * @param {string} routeId
 * @returns {{ok:boolean, error?:string}}
 */
export function canTravel(game, routeId) {
  const { map, state } = game;
  if (state.over) return { ok: false, error: 'La temporada terminó.' };
  const route = Object.hasOwn(map.routeById, routeId) ? map.routeById[routeId] : null;
  if (!route || (route.a !== state.location && route.b !== state.location)) {
    return { ok: false, error: 'No hay ruta directa a esa ciudad.' };
  }
  if (state.day + route.days > RULES.seasonDays) {
    return { ok: false, error: `No llegás antes del día ${RULES.seasonDays}.` };
  }
  return { ok: true };
}

/**
 * Pierde una parte de cada bien de la carga (por falta de provisiones).
 * @returns {number} unidades perdidas
 */
function loseCargo(state, part) {
  let lost = 0;
  for (const [id, qty] of Object.entries(state.cargo)) {
    if (qty <= 0) continue;
    const n = Math.ceil(qty * part);
    state.cargo[id] = qty - n;
    lost += n;
  }
  return lost;
}

/**
 * Hace pasar un día: gasta provisiones, recupera los mercados, envejece los
 * dátiles y cobra las cuotas que vencen. Lo usan viajar y descansar.
 * @param {object} game
 * @param {{food:number,water:number}} use lo que se gasta ese día
 * @param {string} where texto para el diario ("en el camino", "en Kharsa")
 * @returns {{lost:boolean}} lost: la temporada terminó por la deuda
 */
export function passDay(game, use, where) {
  const { state } = game;
  const hungry = state.food < use.food;
  const thirsty = state.water < use.water;
  state.food = Math.max(0, state.food - use.food);
  state.water = Math.max(0, state.water - use.water);
  state.day += 1;
  if (hungry || thirsty) {
    const lost = loseCargo(state, SHORTAGE_LOSS);
    const what = hungry && thirsty ? 'comida ni agua' : hungry ? 'comida' : 'agua';
    addLog(state, `Sin ${what} ${where}: dejaste ${lost} unidades de carga.`, 'bad');
  }
  recoverStock(state.stock);
  for (const id of Object.keys(state.freshness)) {
    const good = getGood(id);
    if (good.decay) state.freshness[id] = Math.max(0.05, state.freshness[id] * (1 - good.decay));
  }
  for (const inst of state.debt.installments) {
    if (inst.day === state.day - 1) {
      const res = settleInstallment(state, inst);
      logSettlement(state, inst, res);
      if (res.lost) return { lost: true };
    }
  }
  return { lost: false };
}

/**
 * Anota en el diario qué pasó con una cuota vencida.
 */
function logSettlement(state, inst, res) {
  if (res.kind === 'collected') {
    addLog(state, `El cobrador del Gremio te alcanzó: cuota del día ${inst.day} cobrada, con ${res.fee} de comisión.`, 'debt');
  } else if (res.kind === 'seized') {
    const what = res.seized ? `${res.seized.qty} de ${getGood(res.seized.goodId).name}` : 'nada (no llevabas carga)';
    addLog(state, `¡Cuota del día ${inst.day} impaga! El Gremio embargó ${what}. Pasan ${res.carried} a la próxima cuota.`, 'bad');
  }
}

/**
 * Recorre una ruta día por día y llega a destino (o termina la temporada
 * si en el camino vence una cuota que no se puede pagar por segunda vez:
 * en ese caso devuelve `lost: true` y season.js cierra la temporada).
 * @param {object} game
 * @param {string} routeId
 * @returns {{ok:boolean,error?:string,arrived?:boolean,lost?:boolean,days?:number,to?:string}}
 */
export function travel(game, routeId) {
  const check = canTravel(game, routeId);
  if (!check.ok) return check;
  const { map, state } = game;
  const route = map.routeById[routeId];
  const from = state.location;
  const to = otherEnd(route, from);
  addLog(state, `Saliste de ${map.cityById[from].name} rumbo a ${map.cityById[to].name} (${plural(route.days, 'día', 'días')}).`, 'travel');
  for (let k = 1; k <= route.days; k++) {
    const use = {
      food: dailyRation(state),
      water: waterUntil(state, route.terrain, k) - waterUntil(state, route.terrain, k - 1),
    };
    const res = passDay(game, use, 'en el camino');
    if (res.lost) return { ok: true, arrived: false, lost: true, days: k, to };
  }
  state.location = to;
  state.lastFrom = from;
  state.undo = [];
  state.stats.trips += 1;
  discoverAround(game, to);
  snapshotPrices(game, to);
  addLog(state, `Llegaste a ${map.cityById[to].name}.`, 'travel');
  return { ok: true, arrived: true, days: route.days, to };
}

