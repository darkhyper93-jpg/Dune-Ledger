/**
 * Renegociar con el Gremio: una vez por temporada, en la Capital o en un
 * Puesto, la cuota que vence en los próximos días pasa a la siguiente con
 * un recargo, sin contar como falta. Es la salida para el que viene mal:
 * cuesta, pero da tiempo para recuperarse (ver docs/DECISIONES.md).
 */

import { canPayHere, nextInstallment, owedOn } from './debt.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';
import { isFree } from './modes.js';
import { upgradeValue } from './perks.js';

/** Recargo sobre lo que se pasa a la cuota siguiente (con Socio nivel 2, 10%). */
export const RENEGOTIATE_FEE = 0.25;
export const PARTNER_FEE = 0.1;

/**
 * Recargo de renegociar para esta temporada.
 * @param {object} state
 */
export function renegotiateFee(state) {
  return upgradeValue(state, 'socio') >= 2 ? PARTNER_FEE : RENEGOTIATE_FEE;
}

/**
 * Cuántas veces se puede renegociar en la temporada (Socio del Gremio: dos).
 * @param {object} state
 */
export function renegotiateLimit(state) {
  return upgradeValue(state, 'socio') >= 1 ? 2 : 1;
}
/** Con cuántos días de anticipación se puede renegociar una cuota. */
export const RENEGOTIATE_DAYS = 7;

/**
 * Dice si se puede renegociar ahora y, si no, por qué.
 * @param {object} game
 * @returns {{ok:true, inst:object, later:object, extra:number}|{ok:false, error:string}}
 */
export function canRenegotiate(game) {
  const { state, map } = game;
  if (state.over || state.trip || isFree(state)) return { ok: false, error: 'Ahora no se puede.' };
  if ((state.debt.renegotiations ?? 0) >= renegotiateLimit(state)) {
    return { ok: false, error: renegotiateLimit(state) > 1 ? 'Ya renegociaste las dos veces que te da el Gremio.' : 'Ya renegociaste esta temporada: el Gremio da más plazo una vez.' };
  }
  if (!canPayHere(map.cityById[state.location])) return { ok: false, error: 'Se renegocia en la Capital o en un Puesto del Gremio.' };
  const inst = nextInstallment(state.debt);
  if (!inst) return { ok: false, error: 'No debés nada.' };
  const later = state.debt.installments.find((i) => i.day > inst.day);
  if (!later) return { ok: false, error: 'La última cuota no se puede pasar: no hay otra después.' };
  if (inst.day - state.day > RENEGOTIATE_DAYS) {
    return { ok: false, error: `Se puede pedir más plazo desde ${RENEGOTIATE_DAYS} días antes del vencimiento (día ${inst.day - RENEGOTIATE_DAYS}).` };
  }
  return { ok: true, inst, later, extra: Math.ceil(owedOn(inst) * renegotiateFee(state)) };
}

/**
 * Pasa lo que falta de la próxima cuota a la siguiente, con recargo.
 * @param {object} game
 */
export function renegotiate(game) {
  const check = canRenegotiate(game);
  if (!check.ok) return check;
  const { state } = game;
  const { inst, later, extra } = check;
  const moved = owedOn(inst);
  later.amount += moved + extra;
  inst.paid = inst.amount;
  state.debt.renegotiations = (state.debt.renegotiations ?? 0) + 1;
  state.undo = [];
  addLog(state, `Renegociaste con el Gremio: los ${fmt(moved)} de la cuota del día ${inst.day} pasan al día ${later.day}, con ${fmt(extra)} de recargo.`, 'debt');
  return { ok: true, moved, extra, day: later.day };
}
