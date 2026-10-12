/**
 * Viajes: cuánto cuesta una ruta, el paso de los días y la llegada.
 *
 * Por cada día de viaje se gasta 1 de comida y 1 de agua por cada 2 seres
 * (personas + camellos), redondeando hacia arriba; el terreno multiplica
 * el agua. Sin agua, los camellos sufren mucho y se deja un 10% de la carga
 * por día; sin comida, la tripulación pierde moral y los camellos se cansan.
 * El recorrido día por día (con eventos) está en trip.js.
 */

import { RULES } from '../data/rules.js';
import { TERRAINS } from '../data/routes.js';
import { getGood } from '../data/goods.js';
import { recoverStock } from './market.js';
import { settleInstallment } from './debt.js';
import { addLog } from './knowledge.js';
import { tickNews, extraRumor } from './news.js';
import { crewDay, foodFactor, guideDays, healMult } from './crew.js';
import { hasPerk, regionOf } from './perks.js';
import { tickBank } from './bank.js';
import { notePeaks } from './stats.js';
import { tickContracts } from './contracts.js';
import { tireCamels, healCamels, dayFatigue, THIRST_HP, REST_HP } from './camels.js';
import { mountName } from './caravan.js';
import { rivalDay } from './rival.js';
import { hasGear } from './gear.js';
import { recordDay } from './history.js';
import { climateOf } from './climate.js';
import { investLevel, INVEST_RECOVERY } from './invest.js';
import { lastDay } from './modes.js';

/** Parte de la carga que se pierde por cada día sin agua. */
export const SHORTAGE_LOSS = 0.1;
/** Salud que pierde cada camello por día sin comida. */
export const HUNGER_HP = 5;

/**
 * Cuántos seres comen y toman agua: vos, la tripulación y los camellos.
 * @param {object} state
 */
export function mouths(state) {
  return RULES.people + state.crew.length + state.camels;
}

/**
 * Raciones por día: 1 cada 2 seres; la comida, menos si hay cocinero.
 * @param {object} state
 * @param {'food'|'water'} [kind='water']
 */
export function dailyRation(state, kind = 'water') {
  const base = Math.ceil(mouths(state) / 2);
  if (kind === 'food') return Math.ceil(base * foodFactor(state));
  const water = Math.ceil(base * (climateOf(state).water ?? 1));
  return hasPerk(state, 'nomada') ? Math.ceil(water / 2) : water;
}

/**
 * Días reales de una ruta: los caballos de la Estepa van más rápido y el
 * guía acorta un día (mínimo 1).
 * @param {object} state
 * @param {number} days días de la ruta en el mapa
 */
export function routeDays(state, days) {
  return guideDays(state, Math.max(1, Math.round(days * regionOf(state).mount.speed)));
}

/**
 * Agua que se gasta en total hasta el día k de una ruta (acumulado).
 * @param {object} state
 * @param {string} terrain
 * @param {number} k
 */
export function waterUntil(state, terrain, k) {
  return Math.ceil(k * dailyRation(state) * TERRAINS[terrain].water - 1e-9);
}

/**
 * Lo que hace falta para recorrer una ruta: días, comida y agua.
 * @param {object} state
 * @param {{days:number,terrain:string}} route
 * @returns {{days:number,food:number,water:number,enoughFood:boolean,enoughWater:boolean}}
 */
export function tripNeeds(state, route) {
  const days = routeDays(state, route.days);
  const food = days * dailyRation(state, 'food');
  const water = waterUntil(state, route.terrain, days);
  return { days, food, water, enoughFood: state.food >= food, enoughWater: state.water >= water };
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
  if (state.trip) return { ok: false, error: 'Ya estás viajando.' };
  const route = Object.hasOwn(map.routeById, routeId) ? map.routeById[routeId] : null;
  if (!route || (route.a !== state.location && route.b !== state.location)) {
    return { ok: false, error: 'No hay ruta directa a esa ciudad.' };
  }
  if (state.day + routeDays(state, route.days) > lastDay(state)) {
    return { ok: false, error: `No llegás antes del día ${lastDay(state)}.` };
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
 * @param {{terrain?:string, rest?:boolean}} [mode] día de viaje (cansa a los
 *   camellos según el terreno) o de descanso (los recupera)
 * @returns {{lost:boolean}} lost: la temporada terminó por la deuda
 */
export function passDay(game, use, where, mode = {}) {
  const { state } = game;
  const hungry = state.food < use.food;
  const thirsty = state.water < use.water;
  state.food = Math.max(0, state.food - use.food);
  state.water = Math.max(0, state.water - use.water);
  state.day += 1;
  if (thirsty) {
    const lost = loseCargo(state, SHORTAGE_LOSS);
    addLog(state, `Sin agua ${where}: los ${mountName(state, 2)} sufren y dejaste ${lost} unidades de carga.`, 'bad');
  }
  if (hungry || thirsty) state.stats.shortageDays += 1;
  if (hungry) addLog(state, `Sin comida ${where}: la caravana pasa hambre.`, 'bad');
  if (mode.terrain || thirsty || hungry) {
    const fatigue = (mode.terrain ? dayFatigue(mode.terrain) : 0) + (thirsty ? THIRST_HP : 0) + (hungry ? HUNGER_HP : 0);
    for (const line of tireCamels(state, fatigue)) addLog(state, `${line}.`, 'bad');
  }
  if (mode.rest && !thirsty && !hungry) healCamels(state, Math.round(REST_HP * healMult(state) * (hasGear(state, 'toldo') ? 1.5 : 1)));
  notePeaks(state);
  const crew = crewDay(game, { travel: !!mode.terrain, rest: !!mode.rest, hungry, thirsty });
  // Las ciudades donde invertiste se reponen más rápido.
  recoverStock(state.stock, RULES.market.stockRecovery * (hasPerk(state, 'negociante') ? 1.5 : 1), (id) => 1 + INVEST_RECOVERY * investLevel(state, id));
  rivalDay(game);
  tickNews(game);
  if (crew.extraRumor) extraRumor(game);
  tickContracts(game);
  for (const id of Object.keys(state.freshness)) {
    const good = getGood(id);
    if (good.decay) state.freshness[id] = Math.max(0.05, state.freshness[id] * (1 - good.decay));
  }
  let dueDay = false;
  for (const inst of state.debt.installments) {
    if (inst.day === state.day - 1) {
      dueDay = true;
      const res = settleInstallment(state, inst);
      logSettlement(state, inst, res);
      if (res.lost) {
        recordDay(state);
        return { lost: true };
      }
    }
  }
  tickBank(state, dueDay);
  recordDay(state);
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
