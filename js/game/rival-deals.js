/**
 * Tratos con Kasim, la caravana rival, el día que sale de tu ciudad:
 * comprarle lo que acaba de cargar (al precio que pagó más un 20%) o
 * apostarle que llegás antes que él a su destino. La apuesta se resuelve
 * al llegar vos (ganás si llegaste antes) o al llegar él (perdés).
 */

import { getGood } from '../data/goods.js';
import { cargoFree } from './caravan.js';
import { addLog } from './knowledge.js';
import { RIVAL } from './rival.js';
import { fmt } from '../core/text.js';

/** Apuesta de carrera: cuánto se pone y por cuánto se multiplica si ganás. */
export const BET = { stake: 60, payout: 2 };

/** Kasim está saliendo hoy de tu ciudad (todavía cargando). */
function departingHere(state) {
  const r = state.rival;
  return !!r && !state.trip && !state.over && r.at === state.location && r.to !== null && r.left === r.days;
}

/**
 * Lo que ofrece Kasim por su carga hoy, o null.
 * @param {{state:object}} game
 * @returns {{goodId:string, qty:number, price:number}|null}
 */
export function rivalOffer(game) {
  const { state } = game;
  if (!departingHere(state) || !state.rival.cargo) return null;
  const c = state.rival.cargo;
  return { goodId: c.goodId, qty: c.qty, price: Math.round(c.cost * 1.2) };
}

/**
 * Le compra a Kasim toda su carga.
 * @param {{map:object, state:object}} game
 * @returns {{ok:boolean, error?:string}}
 */
export function buyRivalCargo(game) {
  const { state, map } = game;
  const offer = rivalOffer(game);
  if (!offer) return { ok: false, error: `${RIVAL.name} no tiene nada para venderte ahora.` };
  if (state.gold < offer.price) return { ok: false, error: 'No te alcanza el oro.' };
  if (offer.qty * getGood(offer.goodId).weight > cargoFree(state)) return { ok: false, error: 'No te entra en la carga.' };
  const had = state.cargo[offer.goodId];
  state.costBasis[offer.goodId] = (state.costBasis[offer.goodId] * had + offer.price) / (had + offer.qty);
  state.cargo[offer.goodId] = had + offer.qty;
  state.gold -= offer.price;
  state.rival.gold += offer.price;
  state.rival.cargo = null;
  state.stats.cargoBought = (state.stats.cargoBought ?? 0) + 1;
  state.undo = [];
  addLog(state, `Le compraste a ${RIVAL.name} ${offer.qty} de ${getGood(offer.goodId).name} por ${fmt(offer.price)} en ${map.cityById[state.location].name}. Se va con las manos vacías.`, 'trade');
  return { ok: true };
}

/**
 * Dice si se puede apostar hoy la carrera contra Kasim.
 * @param {{state:object}} game
 */
export function canBet(game) {
  const { state } = game;
  if (!departingHere(state)) return { ok: false, error: `${RIVAL.name} no está saliendo de acá.` };
  if (state.bet) return { ok: false, error: 'Ya tenés una apuesta en juego.' };
  if (state.gold < BET.stake) return { ok: false, error: 'No te alcanza el oro.' };
  return { ok: true };
}

/**
 * Apuesta que llegás antes que Kasim a su destino.
 * @param {{map:object, state:object}} game
 */
export function placeBet(game) {
  const check = canBet(game);
  if (!check.ok) return check;
  const { state, map } = game;
  const r = state.rival;
  state.gold -= BET.stake;
  state.bet = { to: r.to, stake: BET.stake, rivalDay: state.day + r.left };
  state.undo = [];
  addLog(state, `Apostaste ${fmt(BET.stake)} a que llegás a ${map.cityById[r.to].name} antes que ${RIVAL.name} (él llega el día ${state.bet.rivalDay}).`, 'info');
  return { ok: true };
}

/**
 * Al llegar a una ciudad: si era la de la apuesta y llegaste antes, cobrás.
 * @param {{map:object, state:object}} game
 */
export function betArrive(game) {
  const { state, map } = game;
  const bet = state.bet;
  if (!bet || bet.to !== state.location) return;
  if (state.day < bet.rivalDay) {
    const prize = bet.stake * BET.payout;
    state.gold += prize;
    state.stats.betsWon = (state.stats.betsWon ?? 0) + 1;
    addLog(state, `¡Llegaste a ${map.cityById[bet.to].name} antes que ${RIVAL.name}! Cobrás ${fmt(prize)} de la apuesta.`, 'good');
  }
  state.bet = null;
}

/**
 * Cuando Kasim llega a una ciudad: si era la de la apuesta, la perdiste.
 * @param {{map:object, state:object}} game
 */
export function betRivalArrive(game) {
  const { state, map } = game;
  const bet = state.bet;
  if (!bet || bet.to !== state.rival?.at) return;
  addLog(state, `${RIVAL.name} llegó primero a ${map.cityById[bet.to].name}: perdiste la apuesta de ${fmt(bet.stake)}.`, 'bad');
  state.bet = null;
}
