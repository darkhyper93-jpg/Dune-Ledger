/** Pruebas de préstamos y depósitos en el Gremio. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { takeLoan, repayLoan, depositGold, withdrawGold, maxLoan, LOAN_TERMS } from '../../js/game/bank.js';
import { ledgerView } from '../../js/game/ledger.js';
import { createSeason, rest, finishSeason } from '../../js/game/season.js';
import { settleInstallment } from '../../js/game/debt.js';
import { animalsValue } from '../../js/game/caravan.js';

/** Temporada parada en la Capital (donde está el Gremio). */
function atGuild(merchant = 'aprendiz', patch = {}) {
  const g = createSeason({ seed: 'banco', merchant, events: false });
  g.state.location = g.map.capitalId;
  g.state.visited[g.map.capitalId] = true;
  Object.assign(g.state, { food: 200, water: 200 }, patch);
  return g;
}

test('el Gremio presta según tu oro propio: mínimo 100, tope 1.000', () => {
  const g = atGuild();
  assert.equal(maxLoan(g.state), 300);
  assert.equal(takeLoan(g, 400).ok, false);
  assert.ok(takeLoan(g, 300).ok);
  assert.equal(g.state.gold, 600);
  assert.equal(g.state.loan, 300);
  // Lo prestado no cuenta como oro propio: no se puede encadenar.
  assert.equal(maxLoan(g.state), 300);
  assert.equal(takeLoan(g, 100).ok, false);
  const poor = atGuild('aprendiz', { gold: 20 });
  assert.equal(maxLoan(poor.state), LOAN_TERMS.minimum);
  const rich = atGuild('aprendiz', { gold: 9000 });
  assert.equal(maxLoan(rich.state), LOAN_TERMS.limit);
});

test('sólo se pide y se paga en la Capital o un Puesto', () => {
  const g = createSeason({ seed: 'banco', events: false });
  const here = g.map.cityById[g.state.location];
  if (here.type !== 'capital' && !here.guildPost) {
    assert.equal(takeLoan(g, 100).ok, false);
    assert.equal(depositGold(g, 100).ok, false);
  }
});

test('el préstamo cobra 2% por día sobre lo que se debe; la Banquera, 1%', () => {
  for (const [merchant, rate] of [['aprendiz', 1.02], ['banquera', 1.01]]) {
    const g = atGuild(merchant, { gold: 5000 });
    takeLoan(g, 500);
    rest(g);
    assert.equal(g.state.loan, Math.ceil(500 * rate), merchant);
    rest(g);
    assert.equal(g.state.loan, Math.ceil(Math.ceil(500 * rate) * rate), `${merchant}: interés compuesto`);
    assert.equal(g.state.loanTaken, 500);
  }
});

test('al devolver se paga primero el interés, y el libro lo separa', () => {
  const g = atGuild('aprendiz', { gold: 5000 });
  g.state.stats.ledger.start = g.state.gold;
  takeLoan(g, 1000);
  for (let i = 0; i < 7; i++) rest(g);
  const owed = g.state.loan;
  const interest = owed - 1000;
  assert.ok(interest > 145 && interest < 155, `una semana al 2% diario (con redondeo hacia arriba): ${interest}`);
  repayLoan(g, interest + 200);
  assert.equal(g.state.loanTaken, 800);
  repayLoan(g, g.state.loan);
  assert.equal(g.state.loan, 0);
  const v = ledgerView(g.state);
  assert.equal(v.flows.find((f) => f.id === 'intereses').amount, -interest);
  assert.equal(v.flows.find((f) => f.id === 'prestamo').amount, 0);
});

test('devolver el préstamo baja la deuda', () => {
  const g = atGuild('aprendiz', { gold: 500 });
  takeLoan(g, 400);
  assert.ok(repayLoan(g, 150).ok);
  assert.equal(g.state.loan, 250);
  assert.equal(g.state.gold, 500 + 400 - 150);
  assert.ok(repayLoan(g, 9999).ok);
  assert.equal(g.state.loan, 0);
});

test('depositar y retirar; la Banquera cobra 2% diario', () => {
  const g = atGuild('aprendiz');
  assert.ok(depositGold(g, 200).ok);
  assert.equal(g.state.gold, 100);
  assert.equal(g.state.deposit, 200);
  rest(g);
  assert.equal(g.state.deposit, 200);
  assert.ok(withdrawGold(g, 50).ok);
  assert.equal(g.state.gold, 150);
  const b = atGuild('banquera');
  depositGold(b, 200);
  rest(b);
  assert.equal(b.state.deposit, 204);
});

test('el cobrador usa también el oro guardado', () => {
  const g = atGuild('aprendiz', { gold: 100 });
  g.state.deposit = 400;
  const res = settleInstallment(g.state, g.state.debt.installments[0]);
  assert.equal(res.kind, 'collected');
  assert.equal(g.state.gold + g.state.deposit, 500 - 300 - 45);
});

test('al cerrar, el préstamo se cobra y cuenta como deuda', () => {
  const g = atGuild('aprendiz', { gold: 3000 });
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  takeLoan(g, 500);
  const over = finishSeason(g, 'retiro');
  assert.equal(g.state.loan, 0);
  assert.equal(over.won, true);
  assert.equal(over.gold, 3000);
  const poor = atGuild('aprendiz', { gold: 0 });
  poor.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  poor.state.loan = 300;
  const o2 = finishSeason(poor, 'fin');
  assert.equal(o2.won, false);
  assert.equal(o2.owed, 300);
  assert.equal(o2.score, -300 + animalsValue(poor.state));
});

test('el oro guardado cuenta para el puntaje', () => {
  const g = atGuild('aprendiz', { gold: 2000 });
  g.state.debt.installments.forEach((i) => { i.paid = i.amount; });
  depositGold(g, 1000);
  const over = finishSeason(g, 'retiro');
  assert.equal(over.score, 2000 + animalsValue(g.state));
});
