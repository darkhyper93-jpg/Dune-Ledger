/** Pruebas del viaje por pasos: salir, eventos en el camino, elegir y llegar. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startTrip, advanceTrip, chooseOption } from '../../js/game/trip.js';
import { createSeason, travel } from '../../js/game/season.js';
import { buy } from '../../js/game/actions.js';
import { validateState } from '../../js/game/validate.js';
import { optionState } from '../../js/game/events.js';

/** Temporada con provisiones de sobra y eventos configurables. */
function game(seed, options = {}) {
  const g = createSeason({ seed, ...options });
  Object.assign(g.state, { food: 200, water: 200, gold: 1000 });
  return g;
}

/** Primera opción disponible del evento en curso. */
function firstAvailable(g) {
  for (let i = 0; i < 3; i++) if (optionState(g, i).available) return i;
  return -1;
}

test('sin eventos, el viaje llega directo a destino', () => {
  const g = game('viaje-a', { events: false });
  const route = g.map.routesByCity[g.state.location][0];
  assert.ok(startTrip(g, route.id).ok);
  const res = advanceTrip(g);
  assert.equal(res.status, 'arrived');
  assert.equal(g.state.trip, null);
  assert.equal(g.state.location, route.a === res.from ? route.b : route.a);
  assert.equal(g.state.day, 1 + route.days);
});

test('un evento frena el viaje hasta que elegís una opción', () => {
  const g = game('viaje-b', { eventRate: 1 });
  const route = g.map.routesByCity[g.state.location][0];
  startTrip(g, route.id);
  const res = advanceTrip(g);
  assert.equal(res.status, 'event');
  assert.ok(g.state.trip.event);
  assert.equal(g.state.day, 1, 'el día no pasa hasta elegir');
  assert.equal(advanceTrip(g).status, 'event', 'sigue frenado');
  assert.ok(chooseOption(g, firstAvailable(g)).ok);
  assert.equal(g.state.trip?.event ?? null, null);
});

test('en viaje no se puede comprar ni salir de nuevo', () => {
  const g = game('viaje-c', { eventRate: 1 });
  const route = g.map.routesByCity[g.state.location][0];
  startTrip(g, route.id);
  advanceTrip(g);
  assert.equal(buy(g, 'te', 1).ok, false);
  assert.equal(startTrip(g, route.id).ok, false);
});

test('se puede guardar en medio de un evento y seguir igual', () => {
  const g = game('viaje-d', { eventRate: 1 });
  startTrip(g, g.map.routesByCity[g.state.location][0].id);
  advanceTrip(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.trip, g.state.trip);
});

test('la misma semilla y las mismas elecciones dan el mismo viaje', () => {
  const run = () => {
    const g = game('viaje-e', { eventRate: 0.6 });
    for (let t = 0; t < 4; t++) {
      travel(g, g.map.routesByCity[g.state.location][0].id, firstAvailable);
    }
    return g.state;
  };
  assert.deepEqual(run(), run());
});

test('en rutas seguras casi no pasa nada; en las peligrosas, un evento cada 2 días', () => {
  const perDay = { bajo: [0, 0], alto: [0, 0] };
  for (let i = 0; i < 300; i++) {
    const g = game(`frecuencia-${i}`);
    const route = g.map.routesByCity[g.state.location].find((r) => r.danger === 'bajo' || r.danger === 'alto');
    if (!route) continue;
    const res = travel(g, route.id, firstAvailable);
    perDay[route.danger][0] += res.events;
    perDay[route.danger][1] += route.days;
  }
  const low = perDay.bajo[0] / perDay.bajo[1];
  const high = perDay.alto[0] / perDay.alto[1];
  assert.ok(low > 0.07 && low < 0.22, `bajo ${low}`);
  assert.ok(high > 0.45 && high < 0.75, `alto ${high}`);
});
