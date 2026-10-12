/**
 * La deuda con el Gremio: cuotas, pagos adelantados, cobro y embargo.
 *
 * Reglas (etapa 1, ver docs/DECISIONES.md):
 *  - Se paga en la Capital o en un Puesto del Gremio; se puede adelantar.
 *  - Al vencer una cuota impaga, si tenés el oro, el cobrador del Gremio
 *    te la cobra donde estés con un 15% de comisión.
 *  - Si no te alcanza, te embarga la carga más valiosa (se descuenta su
 *    valor base), lo que falte sube un 50% y pasa a la cuota siguiente,
 *    y sumás una falta. Con dos faltas, perdés la temporada.
 */

import { RULES, getDifficulty } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { noteFlow } from './ledger.js';

const D = RULES.debt;

/**
 * Crea el estado de la deuda según la dificultad.
 * @param {string} difficultyId
 * @param {{mult?:number, delays?:number}} [opts] ver debtPlan
 */
export function createDebt(difficultyId, opts = {}) {
  return { installments: debtPlan(difficultyId, opts), strikes: 0, renegotiations: 0 };
}

/**
 * Cuotas de una dificultad, con el multiplicador del mercader (el Viejo
 * Sultán debe el doble) y la prórroga del Gremio (5 días más para las
 * primeras `delays` cuotas, sin pasar del último día).
 * @param {string} difficultyId
 * @param {{mult?:number, delays?:number}} [opts]
 */
export function debtPlan(difficultyId, { mult = 1, delays = 0 } = {}) {
  const diff = getDifficulty(difficultyId);
  const last = diff.installments[diff.installments.length - 1].day;
  return diff.installments.map((i, k) => ({
    day: k < delays && i.day < last ? Math.min(last, i.day + 5) : i.day,
    amount: Math.round(i.amount * mult),
    paid: 0,
  }));
}

/**
 * Cuánto falta pagar de una cuota.
 * @param {{amount:number,paid:number}} inst
 */
export function owedOn(inst) {
  return Math.max(0, inst.amount - inst.paid);
}

/**
 * Deuda total que queda.
 * @param {object} debt
 */
export function totalOwed(debt) {
  return debt.installments.reduce((sum, i) => sum + owedOn(i), 0);
}

/**
 * Próxima cuota con saldo, o null si no queda nada.
 * @param {object} debt
 * @returns {{day:number,amount:number,paid:number}|null}
 */
export function nextInstallment(debt) {
  return debt.installments.find((i) => owedOn(i) > 0) ?? null;
}

/**
 * Dice si en esta ciudad se puede pagar al Gremio.
 * @param {{type:string,guildPost:boolean}} city
 */
export function canPayHere(city) {
  return city.type === 'capital' || city.guildPost;
}

/**
 * Paga (o adelanta) deuda con oro, empezando por la cuota más próxima.
 * @param {object} state se modifica
 * @param {number} amount oro a pagar; se limita al oro y a la deuda
 * @returns {number} lo que efectivamente se pagó
 */
export function payDebt(state, amount) {
  let left = Math.min(Math.floor(amount), state.gold, totalOwed(state.debt));
  const paid = Math.max(0, left);
  for (const inst of state.debt.installments) {
    if (left <= 0) break;
    const part = Math.min(left, owedOn(inst));
    inst.paid += part;
    left -= part;
  }
  state.gold -= paid;
  noteFlow(state, 'gremio', -paid);
  return paid;
}

/**
 * La carga más valiosa (a precio base): el bien del que llevás más valor.
 * @param {Record<string,number>} cargo
 * @returns {{goodId:string,qty:number,value:number}|null}
 */
export function mostValuableCargo(cargo) {
  let best = null;
  for (const [goodId, qty] of Object.entries(cargo)) {
    if (qty <= 0) continue;
    const value = qty * getGood(goodId).base;
    if (!best || value > best.value) best = { goodId, qty, value };
  }
  return best;
}

/**
 * Paga con el oro de la bolsa y, si no alcanza, con el guardado en el Gremio.
 * @param {object} state
 * @param {number} amount no mayor que lo disponible
 */
export function spendFunds(state, amount) {
  const fromGold = Math.min(state.gold, amount);
  state.gold -= fromGold;
  state.deposit = (state.deposit ?? 0) - (amount - fromGold);
}

/**
 * Procesa una cuota que vence hoy. Devuelve un resumen para el diario.
 * @param {object} state se modifica
 * @param {{day:number,amount:number,paid:number}} inst
 * @returns {{kind:'paid'|'collected'|'seized', fee?:number, seized?:object, carried?:number, lost:boolean}}
 */
export function settleInstallment(state, inst) {
  const owed = owedOn(inst);
  if (owed <= 0) return { kind: 'paid', lost: false };

  const funds = state.gold + (state.deposit ?? 0);
  if (funds >= owed) {
    const fee = Math.min(funds - owed, Math.ceil(owed * D.collectorFee));
    const before = state.gold;
    spendFunds(state, owed + fee);
    noteFlow(state, 'gremio', state.gold - before);
    inst.paid = inst.amount;
    return { kind: 'collected', fee, lost: false };
  }

  // No alcanza: embargo de la carga más valiosa y el resto sube un 50%.
  state.debt.strikes += 1;
  const seized = mostValuableCargo(state.cargo);
  let remaining = owed;
  if (seized) {
    state.cargo[seized.goodId] = 0;
    remaining = Math.max(0, remaining - seized.value);
  }
  const carried = Math.ceil(remaining * D.unpaidPenalty);
  inst.paid = inst.amount;
  const later = state.debt.installments.find((i) => i.day > inst.day);
  if (carried > 0) {
    if (later) later.amount += carried;
    else inst.amount += carried; // última cuota: queda como deuda al cierre
  }
  return { kind: 'seized', seized, carried, lost: state.debt.strikes >= D.maxStrikes };
}
