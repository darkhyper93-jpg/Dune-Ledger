/** Pruebas de los eventos nuevos: curar animales, estadísticas para logros y regiones. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS_BY_ID } from '../../js/data/events.js';
import { createEvent, resolveOption, eventAllowed, optionState } from '../../js/game/events.js';
import { createSeason } from '../../js/game/season.js';
import { Rng } from '../../js/core/rng.js';
import { testGame } from './helpers.js';

/** Pone el juego en viaje con el evento pedido. */
function withEvent(g, id) {
  const route = g.map.routesByCity[g.state.location][0];
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: route.days + 3, rolled: 1, event: null };
  g.state.trip.event = createEvent(g, id, new Rng(`ev-${id}`));
  return route;
}

test('descansar en el monasterio cura a los animales', () => {
  const g = createSeason({ seed: 'monjes', region: 'jade', events: false });
  g.state.camelHp = [50, 60];
  withEvent(g, 'monasterio');
  assert.ok(resolveOption(g, 1, new Rng('x')).ok);
  assert.deepEqual(g.state.camelHp, [75, 85]);
});

test('los monjes compran el jade que llevás, y sin jade no se puede', () => {
  const g = createSeason({ seed: 'monjes', region: 'jade', events: false });
  withEvent(g, 'monasterio');
  assert.equal(optionState(g, 0).available, false);
  g.state.cargo.jade = 4;
  withEvent(g, 'monasterio');
  const gold = g.state.gold;
  assert.ok(resolveOption(g, 0, new Rng('x')).ok);
  assert.equal(g.state.cargo.jade, 0);
  assert.equal(g.state.gold, gold + Math.round(4 * 150 * 1.25));
});

test('acompañar peregrinos suma oro, reputación y cuenta para los logros', () => {
  const g = testGame();
  withEvent(g, 'peregrinos');
  const gold = g.state.gold;
  assert.ok(resolveOption(g, 0, new Rng('x')).ok);
  assert.equal(g.state.gold, gold + 25);
  assert.equal(g.state.stats.pilgrims, 1);
});

test('una opción con suerte sólo cuenta la estadística si sale bien', () => {
  let beaten = 0;
  for (let i = 0; i < 30; i++) {
    const g = createSeason({ seed: `piratas-${i}`, region: 'costa', events: false });
    withEvent(g, 'piratas');
    const res = resolveOption(g, 1, new Rng(`p-${i}`));
    assert.equal(g.state.stats.piratesBeaten, res.success ? 1 : 0);
    beaten += g.state.stats.piratesBeaten;
  }
  assert.ok(beaten > 0 && beaten < 30);
});

test('cada evento nuevo aparece sólo donde corresponde', () => {
  const estepa = createSeason({ seed: 'r', region: 'estepa', events: false });
  const desierto = createSeason({ seed: 'r', events: false });
  const land = (g) => g.map.routes.find((r) => r.terrain !== 'mar');
  assert.ok(eventAllowed(estepa, land(estepa), EVENTS_BY_ID.lobos));
  assert.ok(!eventAllowed(desierto, land(desierto), EVENTS_BY_ID.lobos));
  const sultan = createSeason({ seed: 'r', region: 'sultan', events: false });
  assert.ok(eventAllowed(sultan, sultan.map.routes[0], EVENTS_BY_ID.banquete));
  assert.ok(!eventAllowed(desierto, desierto.map.routes[0], EVENTS_BY_ID.banquete));
  const costa = createSeason({ seed: 'costa-0', region: 'costa', events: false });
  const sea = costa.map.routes.find((r) => r.terrain === 'mar');
  assert.ok(sea, 'la costa tiene que tener rutas por mar');
  assert.ok(eventAllowed(costa, sea, EVENTS_BY_ID.niebla));
  for (const id of ['pata-herida', 'peregrinos', 'mercado-negro', 'pozo']) assert.ok(!eventAllowed(costa, sea, EVENTS_BY_ID[id]), id);
});
