/**
 * Pruebas de los efectos que antes eran un número chico y ahora cambian una
 * decisión: el amuleto salva una vez, el Socio del Gremio da más plazo y la
 * inversión da un descuento que se nota.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, resolveOption, optionState } from '../../js/game/events.js';
import { canRenegotiate, renegotiate, renegotiateFee } from '../../js/game/renegotiate.js';
import { INVEST_DISCOUNT } from '../../js/game/invest.js';
import { Rng } from '../../js/core/rng.js';
import { testGame } from './helpers.js';

/** Un generador que hace salir mal todo lo que depende de la suerte. */
const unlucky = () => ({ next: () => 0.999, chance: () => false, int: (a) => a, range: (a) => a, pick: (l) => l[0] });

/** Temporada en viaje con bandidos y 10 de té. */
function bandits(patch = {}) {
  const g = testGame(patch);
  const route = g.map.routesByCity[g.state.location][0];
  route.danger = 'alto';
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: 3, rolled: 1, event: null };
  g.state.cargo.te = 10;
  g.state.trip.event = createEvent(g, 'bandidos', new Rng('amuleto'));
  return g;
}

test('el amuleto ya no suma chance: la primera vez que algo sale mal, se rompe y no perdés nada', () => {
  const plain = bandits();
  const lucky = bandits({ gear: { amuleto: true } });
  assert.equal(optionState(lucky, 2).chance, optionState(plain, 2).chance);
  const res = resolveOption(lucky, 2, unlucky());
  assert.equal(res.success, false);
  assert.equal(lucky.state.cargo.te, 10, 'el amuleto salvó la carga');
  assert.equal(lucky.state.amuletUsed, true);
  lucky.state.trip.event = createEvent(lucky, 'bandidos', new Rng('otra'));
  resolveOption(lucky, 2, unlucky());
  assert.ok(lucky.state.cargo.te < 10, 'la segunda vez ya no protege');
});

test('Socio del Gremio: nivel 1 renegocia dos veces; nivel 2, con menos recargo', () => {
  const g = testGame({ upgrades: { socio: 1 } });
  g.state.location = g.map.capitalId;
  g.state.debt.installments.push({ day: 50, amount: 100, paid: 0 });
  g.state.debt.installments.sort((a, b) => a.day - b.day);
  g.state.day = 17;
  assert.ok(renegotiate(g).ok);
  g.state.day = 37;
  assert.equal(canRenegotiate(g).ok, true, 'con nivel 1 se puede una segunda vez');
  const normal = testGame();
  assert.equal(renegotiateFee(normal.state), 0.25);
  const partner = testGame({ upgrades: { socio: 2 } });
  assert.equal(renegotiateFee(partner.state), 0.1);
});

test('cada nivel de inversión da 5% de descuento', () => {
  assert.equal(INVEST_DISCOUNT, 0.05);
});

test('la carta avisa que el amuleto salva la primera vez', async () => {
  const { riskOf } = await import('../../js/game/event-risk.js');
  const g = bandits({ gear: { amuleto: true } });
  assert.match(riskOf(g, 2), /amuleto/);
  g.state.amuletUsed = true;
  assert.doesNotMatch(riskOf(g, 2), /amuleto/);
});
