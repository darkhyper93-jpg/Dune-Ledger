/**
 * El banco del Gremio: préstamos y oro guardado (a salvo y, para la
 * Banquera, con 2% de interés por día). Se usa en la Capital o en un Puesto
 * del Gremio.
 *
 * El préstamo cobra interés todos los días, sobre lo que se debe (interés
 * compuesto), y el Gremio presta según lo que tenés: nunca más que tu oro
 * propio. Así un préstamo sirve para aprovechar una buena oportunidad, pero
 * tenerlo mucho tiempo sale caro (ver docs/DECISIONES.md).
 */

import { canPayHere } from './debt.js';
import { hasPerk } from './perks.js';
import { getDifficulty } from '../data/rules.js';
import { isFree } from './modes.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';
import { noteFlow } from './ledger.js';

/**
 * Condiciones del préstamo (un objeto para poder calibrarlas con los bots).
 * limit: lo máximo que se puede deber; daily: interés por día; minimum: lo
 * que presta aunque tengas poco; ofGold: parte de tu oro propio que presta.
 */
export const LOAN_TERMS = { limit: 1000, daily: 0.02, minimum: 100, ofGold: 1 };
/** Máximo absoluto que se puede deber en préstamos. */
export const LOAN_LIMIT = LOAN_TERMS.limit;
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

/**
 * Cuánto se puede deber en préstamos ahora: tu oro propio (bolsa y guardado,
 * sin contar lo prestado), con un mínimo y un tope. Redondeado a 100.
 * @param {object} state
 */
export function maxLoan(state) {
  const own = Math.max(0, state.gold + state.deposit - state.loan);
  const byGold = Math.floor((own * LOAN_TERMS.ofGold) / 100) * 100;
  return Math.min(LOAN_TERMS.limit, Math.max(LOAN_TERMS.minimum, byGold));
}

/**
 * Interés diario del préstamo para esta temporada (la Banquera paga la mitad).
 * @param {object} state
 */
export function loanRate(state) {
  return hasPerk(state, 'banquera') ? LOAN_TERMS.daily / 2 : LOAN_TERMS.daily;
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
  if (getDifficulty(state.difficulty).noLoans) return { ok: false, error: 'En Pesadilla el Gremio no presta.' };
  if (isFree(state)) return { ok: false, error: 'En el modo libre no hay deuda ni préstamos.' };
  const max = maxLoan(state);
  if (state.loan + amount > max) {
    return { ok: false, error: `Con lo que tenés, el Gremio te presta hasta ${fmt(max)} en total${state.loan ? ` (ya debés ${fmt(state.loan)})` : ''}.` };
  }
  state.loan += amount;
  state.loanTaken += amount;
  state.gold += amount;
  noteFlow(state, 'prestamo', amount);
  state.undo = [];
  addLog(state, `Pediste ${fmt(amount)} prestados al Gremio (${pct(loanRate(state))} de interés por día).`, 'debt');
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
  settleLoan(state, pay);
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
 * Baja el préstamo por un pago y lo anota en el libro: primero se paga el
 * interés que se juntó y después lo que te prestaron.
 * @param {object} state
 * @param {number} pay oro que va al préstamo (ya descontado o por descontar)
 */
export function settleLoan(state, pay) {
  const interest = Math.min(pay, Math.max(0, state.loan - state.loanTaken));
  state.loan -= pay;
  state.loanTaken = Math.max(0, state.loanTaken - (pay - interest));
  if (state.loan === 0) state.loanTaken = 0;
  noteFlow(state, 'intereses', -interest);
  noteFlow(state, 'prestamo', -(pay - interest));
}

/** "3%" o "1,5%". */
function pct(rate) {
  return `${String(Math.round(rate * 1000) / 10).replace('.', ',')}%`;
}

/**
 * Paso diario del banco: interés del oro guardado (Banquera) e interés del
 * préstamo (se anota en el diario una vez por semana).
 * @param {object} state
 */
export function tickBank(state) {
  if (hasPerk(state, 'banquera') && state.deposit > 0) state.deposit = Math.round(state.deposit * (1 + DEPOSIT_RATE));
  if (state.loan > 0) {
    state.loan = Math.ceil(state.loan * (1 + loanRate(state)));
    if (state.day % 7 === 0) {
      addLog(state, `El préstamo ya suma ${fmt(state.loan - state.loanTaken)} de interés: debés ${fmt(state.loan)} (te prestaron ${fmt(state.loanTaken)}).`, 'debt');
    }
  }
}
