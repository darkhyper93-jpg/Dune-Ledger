/**
 * El banco del Gremio: préstamos (hasta 1.000, con interés en cada cuota) y
 * oro guardado (a salvo y, para la Banquera, con 2% de interés por día).
 * Se usa en la Capital o en un Puesto del Gremio.
 */

import { canPayHere } from './debt.js';
import { hasPerk } from './perks.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';

/** Máximo que se puede deber en préstamos. */
export const LOAN_LIMIT = 1000;
/** Interés del préstamo en cada cuota (la Banquera paga la mitad). */
export const LOAN_RATE = 0.2;
/** Interés diario del oro guardado para la Banquera. */
export const DEPOSIT_RATE = 0.02;

/** Revisa que se pueda operar con el Gremio acá y ahora. */
function check(game, amount) {
  const { state, map } = game;
  if (state.over || state.trip) return 'Ahora no se puede.';
  if (!canPayHere(map.cityById[state.location])) return 'Acá no hay oficina del Gremio.';
  if (!Number.isInteger(amount) || amount <= 0) return 'Cantidad inválida.';
  return null;
}

/** Interés del préstamo para esta temporada. */
export function loanRate(state) {
  return hasPerk(state, 'banquera') ? LOAN_RATE / 2 : LOAN_RATE;
}

/**
 * Pide un préstamo.
 * @param {object} game
 * @param {number} amount
 */
export function takeLoan(game, amount) {
  const err = check(game, amount);
  if (err) return { ok: false, error: err };
  const { state } = game;
  if (state.loan + amount > LOAN_LIMIT) return { ok: false, error: `El Gremio presta hasta ${fmt(LOAN_LIMIT)} en total.` };
  state.loan += amount;
  state.gold += amount;
  state.undo = [];
  addLog(state, `Pediste ${fmt(amount)} prestados al Gremio (${Math.round(loanRate(state) * 100)}% de interés en cada cuota).`, 'debt');
  return { ok: true, total: amount };
}

/**
 * Devuelve (parte de) el préstamo.
 * @param {object} game
 * @param {number} amount se limita al oro y a lo que se debe
 */
export function repayLoan(game, amount) {
  const { state } = game;
  const pay = Math.min(amount, state.loan, state.gold);
  const err = check(game, pay);
  if (err) return { ok: false, error: state.loan === 0 ? 'No debés préstamos.' : err };
  state.loan -= pay;
  state.gold -= pay;
  state.undo = [];
  addLog(state, `Devolviste ${fmt(pay)} del préstamo. Quedan ${fmt(state.loan)}.`, 'debt');
  return { ok: true, total: pay };
}

/**
 * Guarda oro en el Gremio.
 * @param {object} game
 * @param {number} amount
 */
export function depositGold(game, amount) {
  const pay = Math.min(amount, game.state.gold);
  const err = check(game, pay);
  if (err) return { ok: false, error: err };
  game.state.gold -= pay;
  game.state.deposit += pay;
  game.state.undo = [];
  return { ok: true, total: pay };
}

/**
 * Retira oro guardado en el Gremio.
 * @param {object} game
 * @param {number} amount
 */
export function withdrawGold(game, amount) {
  const take = Math.min(amount, game.state.deposit);
  const err = check(game, take);
  if (err) return { ok: false, error: err };
  game.state.deposit -= take;
  game.state.gold += take;
  game.state.undo = [];
  return { ok: true, total: take };
}

/**
 * Paso diario del banco: interés del oro guardado (Banquera) y, en los días
 * de cuota, interés del préstamo.
 * @param {object} state
 * @param {boolean} dueDay si hoy venció una cuota
 */
export function tickBank(state, dueDay) {
  if (hasPerk(state, 'banquera') && state.deposit > 0) state.deposit = Math.round(state.deposit * (1 + DEPOSIT_RATE));
  if (dueDay && state.loan > 0) {
    const before = state.loan;
    state.loan = Math.ceil(state.loan * (1 + loanRate(state)));
    addLog(state, `El préstamo del Gremio generó ${fmt(state.loan - before)} de interés.`, 'debt');
  }
}
