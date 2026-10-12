/**
 * Pruebas de las decisiones que antes eran trampa: pagar a los bandidos da
 * un salvoconducto (a veces conviene) y las perlas tienen su propio riesgo
 * aunque vayas por rutas seguras.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, eventWeights, eventAllowed, resolveOption, SAFE_PASS_DAYS } from '../../js/game/events.js';
import { EVENTS_BY_ID } from '../../js/data/events.js';
import { bestOption } from '../sim/bot-choices.js';
import { validateState } from '../../js/game/validate.js';
import { Rng } from '../../js/core/rng.js';
import { testGame } from './helpers.js';

/** Temporada en viaje por una ruta con el peligro pedido. */
function onRoute(danger, patch = {}) {
  const g = testGame({ gold: 2000, ...patch });
  const route = g.map.routesByCity[g.state.location][0];
  route.danger = danger;
  route.terrain = 'arena';
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: 3, rolled: 1, event: null };
  return { g, route };
}

test('pagar a los bandidos da un salvoconducto: unos días sin bandidos', () => {
  const { g, route } = onRoute('alto');
  g.state.cargo.te = 10;
  g.state.trip.event = createEvent(g, 'bandidos', new Rng('peaje'));
  assert.ok(eventWeights(g, route).bandidos > 0);
  const res = resolveOption(g, 0, new Rng('pagar'));
  assert.ok(res.ok);
  assert.equal(g.state.safeUntil, g.state.day + SAFE_PASS_DAYS);
  assert.equal(eventWeights(g, route).bandidos ?? 0, 0);
  g.state.day += SAFE_PASS_DAYS + 1;
  assert.ok(eventWeights(g, route).bandidos > 0);
  const saved = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(saved.ok, saved.error);
});

test('por valor esperado, con mucha carga en peligro alto conviene pagar; con poca, no', () => {
  const big = onRoute('alto');
  big.g.state.cargo.seda = 20;
  big.g.state.trip.event = createEvent(big.g, 'bandidos', new Rng('mucha'));
  assert.equal(bestOption(big.g), 0, 'con 20 de seda paga');
  const small = onRoute('alto');
  small.g.state.cargo.sal = 3;
  small.g.state.trip.event = createEvent(small.g, 'bandidos', new Rng('poca'));
  assert.notEqual(bestOption(small.g), 0, 'con 3 de sal no paga');
});

test('el ladrón de perlas sale aunque la ruta sea segura, sólo si llevás perlas', () => {
  const def = EVENTS_BY_ID['ladron-perlas'];
  const { g, route } = onRoute('bajo');
  assert.equal(eventAllowed(g, route, def), false);
  g.state.cargo.perlas = 8;
  assert.equal(eventAllowed(g, route, def), true);
  assert.ok(eventWeights(g, route)['ladron-perlas'] > 0);
});

test('si te roban, se llevan la mitad de las perlas (el cofre achica la pérdida)', () => {
  const { g } = onRoute('bajo');
  g.state.cargo.perlas = 8;
  g.state.trip.event = createEvent(g, 'ladron-perlas', new Rng('ladron'));
  const idx = EVENTS_BY_ID['ladron-perlas'].options.findIndex((o) => o.chance !== undefined);
  // Forzamos que salga mal con un generador que siempre da 0,99.
  const res = resolveOption(g, idx, { next: () => 0.99, chance: () => false, int: (a) => a, range: (a) => a, pick: (l) => l[0] });
  assert.ok(res.ok);
  assert.equal(g.state.cargo.perlas, 4);
});
