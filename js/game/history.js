/**
 * Registro día a día de la temporada para el gráfico del resumen: tu
 * patrimonio (oro + oro guardado + lo que pagaste por la carga + la mitad
 * de lo invertido − deudas) y
 * el oro de Kasim. Se anota al empezar y al final de cada día.
 */

import { totalOwed } from './debt.js';
import { rivalWorth } from './rival.js';
import { investValue } from './invest.js';

/** Máximo de días guardados (el modo libre puede durar cientos). */
export const HISTORY_LIMIT = 120;

/**
 * Patrimonio de hoy: rápido de calcular (la carga cuenta a lo que pagaste).
 * @param {object} state
 */
export function worthNow(state) {
  let cargo = 0;
  for (const [id, qty] of Object.entries(state.cargo)) cargo += qty * (state.costBasis[id] ?? 0);
  return Math.round(state.gold + state.deposit + cargo + investValue(state) - totalOwed(state.debt) - state.loan);
}

/**
 * Anota el día de hoy (reemplaza si ya estaba anotado).
 * @param {object} state
 */
export function recordDay(state) {
  if (!state.history) state.history = [];
  const entry = { day: state.day, me: worthNow(state), rival: rivalWorth(state) };
  if (state.history.at(-1)?.day === state.day) state.history[state.history.length - 1] = entry;
  else state.history.push(entry);
  if (state.history.length > HISTORY_LIMIT) state.history.splice(0, state.history.length - HISTORY_LIMIT);
}
