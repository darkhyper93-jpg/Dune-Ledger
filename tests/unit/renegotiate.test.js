/** Pruebas de renegociar una cuota con el Gremio (una vez por temporada). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canRenegotiate, renegotiate, RENEGOTIATE_FEE } from '../../js/game/renegotiate.js';
import { totalOwed } from '../../js/game/debt.js';
import { validateState } from '../../js/game/validate.js';
import { testGame } from './helpers.js';

/** Temporada parada en la Capital unos días antes de la primera cuota. */
function atGuild(day = 17) {
  const g = testGame({ food: 200, water: 200 });
  g.state.location = g.map.capitalId;
  g.state.visited[g.map.capitalId] = true;
  g.state.day = day;
  return g;
}

test('pasa la cuota que viene a la siguiente con recargo, sin falta', () => {
  const g = atGuild();
  const [first, second] = g.state.debt.installments.map((i) => ({ ...i }));
  assert.equal(canRenegotiate(g).ok, true);
  const before = totalOwed(g.state.debt);
  const res = renegotiate(g);
  assert.ok(res.ok, res.error);
  const [a, b] = g.state.debt.installments;
  assert.equal(a.amount - a.paid, 0, 'la primera queda saldada');
  assert.equal(b.amount, second.amount + Math.ceil(first.amount * (1 + RENEGOTIATE_FEE)));
  assert.equal(totalOwed(g.state.debt), before + Math.ceil(first.amount * RENEGOTIATE_FEE));
  assert.equal(g.state.debt.strikes, 0);
});

test('una sola vez por temporada, sólo en el Gremio y cerca del vencimiento', () => {
  const g = atGuild();
  renegotiate(g);
  assert.equal(canRenegotiate(g).ok, false);
  assert.match(canRenegotiate(g).error, /una vez/);
  const early = atGuild(5);
  assert.equal(canRenegotiate(early).ok, false);
  assert.match(canRenegotiate(early).error, /días/);
  const away = atGuild();
  away.state.location = away.map.cities.find((c) => c.type !== 'capital' && !c.guildPost).id;
  assert.equal(canRenegotiate(away).ok, false);
});

test('la última cuota no se puede pasar: no hay otra después', () => {
  const g = atGuild(57);
  g.state.debt.installments.slice(0, -1).forEach((i) => { i.paid = i.amount; });
  assert.equal(canRenegotiate(g).ok, false);
  assert.match(canRenegotiate(g).error, /última/);
});

test('se guarda que ya renegociaste', () => {
  const g = atGuild();
  renegotiate(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.equal(res.game.state.debt.renegotiated, true);
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.debt.renegotiated;
  assert.equal(validateState(old).game.state.debt.renegotiated, false);
});
