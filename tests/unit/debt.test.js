/** Pruebas de la deuda: pagos, cobrador, embargo, faltas y fin de temporada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { payDebt, totalOwed, settleInstallment, nextInstallment, mostValuableCargo } from '../../js/game/debt.js';
import { finishSeason, rest, sealsFor, canFinish } from '../../js/game/season.js';
import { payGuild } from '../../js/game/actions.js';
import { testGame } from './helpers.js';
import { animalsValue } from '../../js/game/caravan.js';

test('Normal: 1.900 en cuotas que suben: 300, 600 y 1.000', () => {
  const g = testGame();
  assert.equal(totalOwed(g.state.debt), 1900);
  assert.deepEqual(g.state.debt.installments.map((i) => [i.day, i.amount]), [[20, 300], [40, 600], [60, 1000]]);
});

test('pagar adelantado cubre primero la cuota más próxima', () => {
  const g = testGame({ gold: 1000 });
  assert.equal(payDebt(g.state, 450), 450);
  assert.equal(g.state.gold, 550);
  assert.equal(g.state.debt.installments[0].paid, 300);
  assert.equal(g.state.debt.installments[1].paid, 150);
  assert.equal(nextInstallment(g.state.debt).day, 40);
});

test('no se paga más que el oro ni más que la deuda', () => {
  const g = testGame({ gold: 100 });
  assert.equal(payDebt(g.state, 500), 100);
  g.state.gold = 5000;
  assert.equal(payDebt(g.state, 5000), 1800);
  assert.equal(totalOwed(g.state.debt), 0);
});

test('sólo se paga en la Capital o en un Puesto del Gremio', () => {
  const g = testGame({ gold: 500 });
  const here = g.map.cityById[g.state.location];
  const res = payGuild(g, 100);
  assert.equal(res.ok, here.type === 'capital' || here.guildPost);
  const capital = g.map.capitalId;
  g.state.location = capital;
  g.state.visited[capital] = true;
  assert.equal(payGuild(g, 100).ok, true);
});

test('el cobrador cobra la cuota vencida con 15% de comisión', () => {
  const g = testGame({ gold: 1000 });
  const inst = g.state.debt.installments[0];
  const res = settleInstallment(g.state, inst);
  assert.equal(res.kind, 'collected');
  assert.equal(res.fee, 45);
  assert.equal(g.state.gold, 1000 - 345);
  assert.equal(g.state.debt.strikes, 0);
});

test('sin oro: embargo de la carga más valiosa, +50% a la próxima cuota y una falta', () => {
  const g = testGame({ gold: 50 });
  g.state.cargo.sal = 10; // 80 a precio base
  g.state.cargo.te = 5; // 90 a precio base
  assert.equal(mostValuableCargo(g.state.cargo).goodId, 'te');
  const res = settleInstallment(g.state, g.state.debt.installments[0]);
  assert.equal(res.kind, 'seized');
  assert.equal(g.state.cargo.te, 0);
  assert.equal(g.state.cargo.sal, 10);
  assert.equal(res.carried, Math.ceil((300 - 90) * 1.5));
  assert.equal(g.state.debt.installments[1].amount, 600 + res.carried);
  assert.equal(g.state.debt.strikes, 1);
  assert.equal(res.lost, false);
});

test('dos cuotas impagas terminan la temporada', () => {
  const g = testGame({ gold: 0, food: 200, water: 200 });
  g.state.day = 20;
  rest(g); // vence la del día 20
  assert.equal(g.state.debt.strikes, 1);
  assert.equal(g.state.over, null);
  g.state.day = 40;
  rest(g); // vence la del día 40
  assert.equal(g.state.over.reason, 'deuda');
  assert.equal(g.state.over.won, false);
});

test('cerrar la temporada con toda la deuda paga es ganar', () => {
  const g = testGame({ gold: 3000 });
  payDebt(g.state, 1900);
  assert.ok(canFinish(g));
  const over = finishSeason(g, 'retiro');
  assert.equal(over.won, true);
  // Oro más los dos camellos sanos, que también son bienes.
  assert.equal(over.score, 1100 + animalsValue(g.state));
  assert.equal(over.seals, sealsFor(1100 + animalsValue(g.state), 'normal'));
});

test('el día 60 el Gremio cobra lo que falte al cerrar', () => {
  const g = testGame({ gold: 2500, day: 60 });
  payDebt(g.state, 900); // quedan 1.000 del día 60
  const over = finishSeason(g, 'fin');
  assert.equal(over.won, true);
  assert.equal(g.state.gold, 1600 - 1000 - Math.ceil(1000 * 0.15));
});

test('sellos: puntaje / 100 por el multiplicador, nunca negativos', () => {
  assert.equal(sealsFor(999, 'facil'), 9);
  assert.equal(sealsFor(1000, 'normal'), 12);
  assert.equal(sealsFor(-500, 'normal'), 0);
});
