/**
 * Cierre de la temporada: valor de la carga, puntaje, sellos y resultado.
 */

import { getDifficulty } from '../data/rules.js';
import { quote } from './market.js';
import { totalOwed, settleInstallment } from './debt.js';
import { addLog } from './knowledge.js';

/**
 * Valor de la carga si la vendieras toda acá, unidad por unidad.
 * @param {object} game
 * @returns {number}
 */
export function cargoValueHere(game) {
  const { state } = game;
  let total = 0;
  for (const [id, qty] of Object.entries(state.cargo)) {
    if (qty > 0) total += quote(game, state.location, id, qty, 'sell').total;
  }
  return total;
}

/**
 * Puntaje actual: oro + valor de la carga acá − deuda que queda.
 * @param {object} game
 */
export function currentScore(game) {
  return game.state.gold + cargoValueHere(game) - totalOwed(game.state.debt);
}

/**
 * Sellos que da un puntaje según la dificultad.
 * @param {number} score
 * @param {string} difficulty
 */
export function sealsFor(score, difficulty) {
  return Math.floor((Math.max(0, score) / 100) * getDifficulty(difficulty).sealMult);
}

/**
 * Cierra la temporada y calcula el resumen final.
 * @param {object} game
 * @param {'fin'|'retiro'|'deuda'} reason
 */
export function finishSeason(game, reason) {
  const { state } = game;
  if (state.over) return state.over;
  // Al cierre, el Gremio cobra lo que quede (con el cobrador, si hace falta).
  let lostByDebt = reason === 'deuda';
  if (!lostByDebt) {
    for (const inst of state.debt.installments) {
      if (inst.amount - inst.paid > 0) {
        const res = settleInstallment(state, inst);
        if (res.kind === 'collected') addLog(state, `El Gremio cobró la cuota del día ${inst.day} con ${res.fee} de comisión.`, 'debt');
        if (res.lost) lostByDebt = true;
      }
    }
  }
  const owed = totalOwed(state.debt);
  const score = currentScore(game);
  const won = !lostByDebt && owed === 0;
  state.over = {
    reason: lostByDebt ? 'deuda' : reason,
    won,
    score,
    seals: sealsFor(score, state.difficulty),
    day: state.day,
    gold: state.gold,
    owed,
    /** Si ya se sumó al perfil (sellos, récords). Lo marca la interfaz. */
    recorded: false,
  };
  state.undo = [];
  addLog(state, won ? '¡Pagaste toda la deuda! Temporada ganada.' : 'Terminó la temporada sin saldar la deuda.', won ? 'good' : 'bad');
  return state.over;
}

