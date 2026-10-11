/**
 * Tarjeta del banco en la pestaña Gremio: préstamos y oro guardado.
 */

import { h } from './dom.js';
import { takeLoan, repayLoan, depositGold, withdrawGold, loanRate, LOAN_LIMIT, DEPOSIT_RATE } from '../game/bank.js';
import { hasPerk } from '../game/perks.js';
import { fmt } from '../core/text.js';

/**
 * Banco del Gremio.
 * @param {object} app
 */
export function renderBank(app) {
  const { state } = app.game;
  const run = (fn, msg) => {
    const res = app.act(fn);
    if (res.ok) app.toast(msg(res.total));
  };
  const room = LOAN_LIMIT - state.loan;
  return h('div', { class: 'card stack', 'data-testid': 'bank' },
    h('h3', {}, 'Banco del Gremio'),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Préstamo'), h('dd', { class: state.loan ? 'bad' : '' }, `${fmt(state.loan)} (${Math.round(loanRate(state) * 100)}% en cada cuota)`),
      h('dt', {}, 'Oro guardado'), h('dd', {}, `${fmt(state.deposit)}${hasPerk(state, 'banquera') ? ` (+${DEPOSIT_RATE * 100}% por día)` : ''}`)),
    h('p', { class: 'muted small', style: 'margin:0' }, 'El préstamo hay que devolverlo antes del final: cuenta como deuda. El oro guardado está a salvo y el cobrador lo usa si te falta.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', 'data-testid': 'loan-100', disabled: room < 100, onclick: () => run((g) => takeLoan(g, 100), (n) => `Te prestaron ${fmt(n)}.`) }, 'Pedir 100'),
      h('button', { class: 'btn small', disabled: room < 500, onclick: () => run((g) => takeLoan(g, 500), (n) => `Te prestaron ${fmt(n)}.`) }, 'Pedir 500'),
      h('button', { class: 'btn small', 'data-testid': 'loan-repay', disabled: !state.loan || !state.gold, onclick: () => run((g) => repayLoan(g, g.state.loan), (n) => `Devolviste ${fmt(n)}.`) }, 'Devolver')),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', 'data-testid': 'deposit-100', disabled: state.gold < 100, onclick: () => run((g) => depositGold(g, 100), (n) => `Guardaste ${fmt(n)}.`) }, 'Guardar 100'),
      h('button', { class: 'btn small', disabled: !state.gold, onclick: () => run((g) => depositGold(g, g.state.gold), (n) => `Guardaste ${fmt(n)}.`) }, 'Guardar todo'),
      h('button', { class: 'btn small', 'data-testid': 'withdraw', disabled: !state.deposit, onclick: () => run((g) => withdrawGold(g, g.state.deposit), (n) => `Retiraste ${fmt(n)}.`) }, 'Retirar todo')));
}
