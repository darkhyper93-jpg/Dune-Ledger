/**
 * Tarjeta del banco en la pestaña Gremio: préstamos y oro guardado.
 */

import { h } from './dom.js';
import { takeLoan, repayLoan, depositGold, withdrawGold, loanRate, maxLoan, DEPOSIT_RATE } from '../game/bank.js';
import { hasPerk } from '../game/perks.js';
import { fmt } from '../core/text.js';
import { getDifficulty } from '../data/rules.js';

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
  const room = Math.max(0, maxLoan(state) - state.loan);
  const rate = loanRate(state);
  const noLoans = getDifficulty(state.difficulty).noLoans;
  const rateText = `${String(Math.round(rate * 1000) / 10).replace('.', ',')}% por día`;
  return h('div', { class: 'card stack', 'data-testid': 'bank' },
    h('h3', {}, 'Banco del Gremio'),
    h('dl', { class: 'kv' },
      h('dt', {}, 'Préstamo'), h('dd', { class: state.loan ? 'bad' : '', 'data-testid': 'loan-owed' }, noLoans ? 'No hay en Pesadilla'
        : state.loan ? `Debés ${fmt(state.loan)} (te prestaron ${fmt(state.loanTaken)})` : 'No debés nada'),
      noLoans ? null : [h('dt', {}, 'Interés'), h('dd', {}, rateText)],
      noLoans ? null : [h('dt', {}, 'Te presta hasta'), h('dd', { 'data-testid': 'loan-room' }, fmt(room))],
      h('dt', {}, 'Oro guardado'), h('dd', {}, `${fmt(state.deposit)}${hasPerk(state, 'banquera') ? ` (+${DEPOSIT_RATE * 100}% por día)` : ''}`)),
    noLoans ? null : loanSchedule(rate),
    h('p', { class: 'muted small', style: 'margin:0' }, 'El Gremio presta hasta lo que tenés de oro propio. El interés se suma todos los días sobre lo que debés, así que conviene devolverlo rápido. Al final cuenta como deuda. El oro guardado está a salvo y el cobrador lo usa si te falta.'),
    noLoans ? null : h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', 'data-testid': 'loan-100', disabled: room < 100, onclick: () => run((g) => takeLoan(g, 100), (n) => `Te prestaron ${fmt(n)}.`) }, 'Pedir 100'),
      h('button', { class: 'btn small', disabled: room < 500, onclick: () => run((g) => takeLoan(g, 500), (n) => `Te prestaron ${fmt(n)}.`) }, 'Pedir 500'),
      h('button', { class: 'btn small', 'data-testid': 'loan-repay', disabled: !state.loan || !state.gold, onclick: () => run((g) => repayLoan(g, g.state.loan), (n) => `Devolviste ${fmt(n)}.`) }, 'Devolver')),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', 'data-testid': 'deposit-100', disabled: state.gold < 100, onclick: () => run((g) => depositGold(g, 100), (n) => `Guardaste ${fmt(n)}.`) }, 'Guardar 100'),
      h('button', { class: 'btn small', disabled: !state.gold, onclick: () => run((g) => depositGold(g, g.state.gold), (n) => `Guardaste ${fmt(n)}.`) }, 'Guardar todo'),
      h('button', { class: 'btn small', 'data-testid': 'withdraw', disabled: !state.deposit, onclick: () => run((g) => withdrawGold(g, g.state.deposit), (n) => `Retiraste ${fmt(n)}.`) }, 'Retirar todo')));
}

/**
 * Cuánto se devuelve por 100 prestados según cuándo lo devuelvas: así se ve
 * cómo crece el interés compuesto.
 * @param {number} rate interés por día
 */
function loanSchedule(rate) {
  const owe = (days) => Math.round(100 * (1 + rate) ** days);
  return h('div', { class: 'loan-schedule', 'data-testid': 'loan-schedule' },
    h('p', { class: 'small', style: 'margin:0' }, h('b', {}, 'Por cada 100 que pedís, devolvés:')),
    h('dl', { class: 'kv small' }, [7, 14, 30].map((d) => [h('dt', {}, `a los ${d} días`), h('dd', {}, fmt(owe(d)))])));
}
