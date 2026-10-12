/** Pruebas de invertir en ciudades: niveles, descuentos, mercado y puntaje. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSeason, rest, currentScore } from '../../js/game/season.js';
import { INVEST, investLevel, nextInvest, invest, investValue } from '../../js/game/invest.js';
import { quote } from '../../js/game/market.js';
import { validateState } from '../../js/game/validate.js';

const fresh = () => {
  const g = createSeason({ seed: 'inversion', events: false });
  g.state.gold = 2000;
  return g;
};

test('se invierte de a un nivel, hasta 3, y cada nivel cuesta más', () => {
  const g = fresh();
  const here = g.state.location;
  assert.equal(investLevel(g.state, here), 0);
  assert.equal(nextInvest(g).cost, INVEST[0].cost);
  assert.ok(invest(g).ok);
  assert.equal(investLevel(g.state, here), 1);
  assert.equal(g.state.gold, 2000 - INVEST[0].cost);
  assert.ok(invest(g).ok);
  assert.ok(invest(g).ok);
  assert.equal(investLevel(g.state, here), 3);
  assert.equal(nextInvest(g), null);
  assert.equal(invest(g).ok, false);
});

test('sin oro no se puede invertir', () => {
  const g = fresh();
  g.state.gold = 10;
  assert.equal(invest(g).ok, false);
});

test('invertir abarata las compras en esa ciudad', () => {
  const g = fresh();
  const here = g.state.location;
  const before = quote(g, here, 'te', 5, 'buy').total;
  invest(g);
  invest(g);
  assert.ok(quote(g, here, 'te', 5, 'buy').total < before);
});

test('el mercado de una ciudad con inversión se repone más rápido', () => {
  const a = fresh();
  const b = fresh();
  invest(b);
  invest(b);
  const here = a.state.location;
  a.state.stock[here].te = 10;
  b.state.stock[here].te = 10;
  rest(a);
  rest(b);
  assert.ok(b.state.stock[here].te > a.state.stock[here].te);
});

test('lo invertido cuenta la mitad en el puntaje y se guarda', () => {
  const g = fresh();
  const score = currentScore(g);
  invest(g);
  assert.equal(investValue(g.state), Math.round(INVEST[0].cost / 2));
  assert.equal(currentScore(g), score - INVEST[0].cost + Math.round(INVEST[0].cost / 2));
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.invest, g.state.invest);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.invest[g.state.location] = 9;
  assert.equal(validateState(bad).ok, false);
});
