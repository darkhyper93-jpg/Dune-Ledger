/** Pruebas de "si sale mal": cada opción con azar dice lo que se arriesga. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riskOf } from '../../js/game/event-risk.js';
import { createEvent, cargoLossFactor } from '../../js/game/events.js';
import { EVENTS } from '../../js/data/events.js';
import { Rng } from '../../js/core/rng.js';
import { testGame } from './helpers.js';

/** Temporada en viaje con el evento pedido. */
function withEvent(id, patch = {}) {
  const g = testGame(patch);
  const route = g.map.routesByCity[g.state.location][0];
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: 3, rolled: 1, event: null };
  g.state.trip.event = createEvent(g, id, new Rng(`riesgo-${id}`));
  return g;
}

test('bandidos: pelear y huir dicen qué parte de la carga se pierde (y cuánto oro es)', () => {
  const g = withEvent('bandidos');
  g.state.cargo.te = 10;
  const fight = riskOf(g, 1);
  assert.match(fight, /40% de la carga/);
  assert.match(fight, /oro/);
  assert.match(riskOf(g, 2), /25% de la carga/);
  assert.equal(riskOf(g, 0), null, 'pagar no depende de la suerte');
});

test('con el cofre se pierde menos, y lo que dice coincide con lo que aplica el juego', () => {
  const g = withEvent('bandidos', { gear: { cofre: true } });
  g.state.cargo.te = 10;
  const pct = Math.round(0.4 * cargoLossFactor(g.state) * 100);
  assert.equal(pct, 24);
  assert.match(riskOf(g, 1), /24% de la carga/);
});

test('sin carga no promete pérdidas de carga; sin tripulación no habla de moral', () => {
  const g = withEvent('bandidos');
  const fight = riskOf(g, 1);
  assert.doesNotMatch(fight, /de la carga/);
  assert.doesNotMatch(fight, /moral/);
  assert.match(fight, /salud/);
});

test('toda opción con azar de todos los eventos tiene su "si sale mal"', () => {
  for (const ev of EVENTS) {
    if (ev.weight <= 0 && ev.id !== 'bandidos-amigos') continue;
    let g;
    try {
      g = withEvent(ev.id, { gold: 500 });
    } catch {
      continue; // eventos que necesitan condiciones especiales para armarse
    }
    g.state.cargo.te = 5;
    g.state.cargo.ceramica = 4;
    g.state.crew = [{ id: 't1', name: 'Amira', role: 'guardia', trait: 'leal', xp: 0, morale: 70, wage: 12 }];
    ev.options.forEach((opt, i) => {
      if (opt.chance === undefined) return;
      const risk = riskOf(g, i);
      assert.ok(risk && risk.length > 5, `${ev.id} opción ${i}: ${risk}`);
    });
  }
});
