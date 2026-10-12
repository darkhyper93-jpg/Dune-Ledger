/**
 * Cierre de la temporada: valor de la carga, puntaje, sellos y resultado.
 */

import { getDifficulty } from '../data/rules.js';
import { quote } from './market.js';
import { totalOwed, settleInstallment, spendFunds } from './debt.js';
import { addLog } from './knowledge.js';
import { isFree } from './modes.js';
import { rivalWorth } from './rival.js';
import { investValue } from './invest.js';

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
 * Puntaje actual: oro (en la bolsa y guardado) + valor de la carga acá +
 * la mitad de lo invertido en ciudades − deuda que queda (cuotas y préstamo).
 * @param {object} game
 */
export function currentScore(game) {
  const { state } = game;
  return state.gold + state.deposit + cargoValueHere(game) + investValue(state) - totalOwed(state.debt) - state.loan;
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
 * @param {'fin'|'retiro'|'deuda'} reason (en el modo libre, 'fin' o 'retiro')
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
  if (state.loan > 0) {
    const pay = Math.min(state.loan, state.gold + state.deposit);
    spendFunds(state, pay);
    state.loan -= pay;
    if (pay > 0) addLog(state, `El Gremio cobró ${pay} del préstamo.`, 'debt');
  }
  const owed = totalOwed(state.debt) + state.loan;
  const score = currentScore(game);
  const free = isFree(state);
  const won = !free && !lostByDebt && owed === 0;
  state.over = {
    reason: lostByDebt ? 'deuda' : reason,
    won,
    score,
    seals: free ? 0 : sealsFor(score, state.difficulty),
    day: state.day,
    gold: state.gold,
    owed,
    /** Si ya se sumó al perfil (sellos, récords). Lo marca la interfaz. */
    recorded: false,
    /** Logros que se ganaron al cerrar (los completa recordSeason). */
    newAchievements: [],
    /** En el desafío: si fue la primera partida del día (la que cuenta). */
    official: null,
    /** Oro de la caravana rival al cierre (para compararse). */
    rivalGold: rivalWorth(state),
  };
  state.undo = [];
  if (free) addLog(state, `Terminó el modo libre con ${score} de puntaje.`, 'info');
  else addLog(state, won ? '¡Pagaste toda la deuda! Temporada ganada.' : 'Terminó la temporada sin saldar la deuda.', won ? 'good' : 'bad');
  return state.over;
}

