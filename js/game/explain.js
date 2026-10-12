/**
 * "¿Por qué ganaste o perdiste?": razones concretas de la temporada, con
 * los números del libro mayor, y preguntas para conversar después de jugar
 * (en una clase, lo que más se aprende es la charla de después).
 */

import { getGood } from '../data/goods.js';
import { ledgerView } from './ledger.js';
import { fmt, plural } from '../core/text.js';

/**
 * Explica la temporada terminada.
 * @param {object} state con `over`
 * @returns {{title:string, reasons:string[], questions:string[]}}
 */
export function explainSeason(state) {
  const over = state.over;
  const v = ledgerView(state);
  const reasons = [];
  const interest = -(v.flows.find((f) => f.id === 'intereses')?.amount ?? 0);
  if (interest > 0) reasons.push(`Pagaste ${fmt(interest)} de intereses del préstamo: cada día que lo tuviste costó más.`);
  if (state.stats.shortageDays > 0) {
    reasons.push(`Pasaste ${plural(state.stats.shortageDays, 'día', 'días')} sin provisiones: los animales sufrieron y se perdió carga.`);
  }
  if (v.worst) reasons.push(`Con ${getGood(v.worst.goodId).name} perdiste ${fmt(-v.worst.profit)}: compraste caro o vendiste donde ya pagaban poco.`);
  if (state.debt.strikes > 0) reasons.push(`Tuviste ${plural(state.debt.strikes, 'falta', 'faltas')} con el Gremio: una cuota venció sin el oro para pagarla.`);
  if ((state.debt.renegotiations ?? 0) > 0) reasons.push('Renegociaste una cuota: ganaste tiempo, pero pagaste recargo.');
  if (v.best) reasons.push(`Tu mejor negocio fue ${getGood(v.best.goodId).name}: ganaste ${fmt(v.best.profit)}.`);
  if (over.rivalGold !== null && over.rivalGold !== undefined) {
    reasons.push(over.score >= over.rivalGold ? 'Le ganaste a Kasim: comerciaste mejor que un mercader de oficio.' : 'Kasim terminó con más que vos: ¿fue a los mismos mercados antes?');
  }
  const title = over.won ? '¿Por qué ganaste?' : '¿Por qué perdiste?';
  const questions = over.won
    ? ['¿Qué negocio repetirías la próxima temporada?', '¿En qué momento te arriesgaste más? ¿Valió la pena?', '¿Qué harías para terminar con más oro?']
    : ['¿En qué día empezaron los problemas?', '¿Qué hubieras hecho distinto con la primera cuota?', '¿Te convenía pedir prestado? ¿Cuánto te costó?'];
  return { title, reasons, questions };
}
