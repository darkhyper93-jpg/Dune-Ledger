/**
 * Libro mayor: una página de libro de cuentas con lo que compraste (Debe)
 * y vendiste (Haber) de cada bien y su ganancia, y abajo adónde fue el oro
 * de la temporada, cuenta por cuenta, hasta el oro de hoy.
 */

import { h } from './dom.js';
import { getGood } from '../data/goods.js';
import { ledgerView } from '../game/ledger.js';
import { fmt } from '../core/text.js';
import { goodArt } from './art.js';

/** Monto con signo (+120 / −45), con el menos tipográfico. */
export function signed(n) {
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`;
}

/** Clase de color para un monto (el signo ya lo dice en texto). */
function tone(n) {
  return n > 0 ? 'good' : n < 0 ? 'bad' : '';
}

/**
 * Una línea del resumen de cuentas.
 * @param {string} label
 * @param {number} amount
 * @param {string} [testId]
 */
function accountLine(label, amount, testId) {
  return h('div', { class: 'ledger-line', 'data-testid': testId },
    h('span', {}, label), h('b', { class: tone(amount) }, signed(amount)));
}

/**
 * La página del libro mayor.
 * @param {object} app
 */
export function renderLedger(app) {
  const v = ledgerView(app.game.state);
  if (!v.rows.length && v.flows.every((f) => f.amount === 0)) {
    return h('div', { class: 'ledger-page', 'data-testid': 'ledger' },
      h('p', { class: 'ledger-empty' }, 'Todavía no hay asientos. Cada compra, venta y gasto de la temporada se anota acá.'));
  }
  const rows = v.rows.map((r) => h('tr', { 'data-testid': `ledger-${r.goodId}` },
    h('th', { scope: 'row' }, h('span', { class: 'ledger-good' }, goodArt(r.goodId, 24), h('span', {}, getGood(r.goodId).name,
      h('span', { class: 'ledger-qty' }, `${r.bought} comprados, ${r.sold} vendidos`)))),
    h('td', { class: 'num' }, r.spent ? fmt(r.spent) : '—'),
    h('td', { class: 'num' }, r.revenue ? fmt(r.revenue) : '—'),
    h('td', { class: `num ${r.sold ? tone(r.profit) : ''}` }, h('b', {}, r.sold ? signed(r.profit) : '—'))));
  return h('div', { class: 'ledger-page', 'data-testid': 'ledger' },
    rows.length ? h('table', { class: 'ledger-table' },
      h('caption', { class: 'sr-only' }, 'Compras y ventas por bien'),
      h('thead', {}, h('tr', {},
        h('th', { scope: 'col' }, 'Bien'), h('th', { scope: 'col', class: 'num' }, 'Debe'), h('th', { scope: 'col', class: 'num' }, 'Haber'), h('th', { scope: 'col', class: 'num' }, 'Ganancia'))),
      h('tbody', {}, rows)) : null,
    h('div', { class: 'ledger-sum' },
      h('h3', {}, '¿Adónde fue el oro?'),
      accountLine('Comercio (ventas menos compras)', v.tradeNet, 'ledger-trade'),
      v.flows.filter((f) => f.amount !== 0).map((f) => accountLine(f.name, f.amount, `ledger-flow-${f.id}`)),
      v.other === null ? null : accountLine('Camino, contratos, banco y otros', v.other, 'ledger-other'),
      v.start === null ? null : h('div', { class: 'ledger-total' },
        h('span', {}, `Empezaste con ${fmt(v.start)}`), h('b', {}, `Hoy tenés ${fmt(v.now)}`))),
    v.best || v.worst ? h('p', { class: 'small ledger-note' },
      v.best ? `Tu mejor negocio: ${getGood(v.best.goodId).name} (${signed(v.best.profit)}). ` : '',
      v.worst ? `Donde perdiste: ${getGood(v.worst.goodId).name} (${signed(v.worst.profit)}).` : '') : null);
}
