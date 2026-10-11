/** Pruebas de los eventos de viaje (datos y motor). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from '../../js/data/events.js';
import { createEvent, optionState, resolveOption, CHANCES } from '../../js/game/events.js';
import { validateState } from '../../js/game/validate.js';
import { Rng } from '../../js/core/rng.js';
import { RULES } from '../../js/data/rules.js';
import { ACTIVE_GOODS } from '../../js/data/goods.js';
import { testGame } from './helpers.js';

/** Pone al juego en medio de un viaje (sin evento) por su primera ruta. */
function onTrip(g) {
  const route = g.map.routesByCity[g.state.location][0];
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: route.days, rolled: 1, event: null };
  return route;
}

/** Valores imposibles en un estado. */
function assertSane(state, where) {
  assert.ok(Number.isInteger(state.gold) && state.gold >= 0, `${where}: oro ${state.gold}`);
  assert.ok(state.food >= 0 && state.food <= RULES.provisionCap, `${where}: comida`);
  assert.ok(state.water >= 0 && state.water <= RULES.provisionCap, `${where}: agua`);
  assert.ok(state.camels >= 1 && state.camels <= RULES.maxCamels, `${where}: camellos`);
  for (const id of ACTIVE_GOODS) assert.ok(Number.isInteger(state.cargo[id]) && state.cargo[id] >= 0, `${where}: ${id}`);
}

test('cada evento de los datos está bien armado', () => {
  const ids = new Set();
  for (const e of EVENTS) {
    assert.ok(e.id && !ids.has(e.id), e.id);
    ids.add(e.id);
    assert.ok(typeof e.text === 'string' && e.weight >= 0);
    assert.ok(e.options.length >= 1 && e.options.length <= 3, e.id);
    for (const o of e.options) {
      assert.ok(o.label, e.id);
      if (typeof o.chance === 'string') assert.ok(Object.hasOwn(CHANCES, o.chance), `${e.id}: ${o.chance}`);
      if (o.chance !== undefined) assert.ok(o.win && o.lose, `${e.id}: falta win/lose`);
    }
  }
});

test('ningún efecto de ningún evento deja valores imposibles (recorre todos)', () => {
  for (let i = 0; i < 25; i++) {
    for (const def of EVENTS) {
      for (let k = 0; k < def.options.length; k++) {
        const g = testGame({ gold: i * 37 % 400, food: i % 7, water: (i * 3) % 9, camels: 1 + (i % 3) });
        g.state.cargo.te = i % 5;
        g.state.cargo.ceramica = i % 4;
        g.state.cargo.armas = i % 2;
        g.state.cargo.perlas = i % 3;
        onTrip(g);
        const rng = new Rng(`fuzz-${i}-${def.id}-${k}`);
        g.state.trip.event = createEvent(g, def.id, rng);
        const opt = optionState(g, k);
        const res = resolveOption(g, k, rng);
        assert.equal(res.ok, opt.available, `${def.id}/${k}`);
        assertSane(g.state, `${def.id}/${k}`);
        const v = validateState(JSON.parse(JSON.stringify(g.state)));
        assert.ok(v.ok, `${def.id}/${k}: ${v.error}`);
      }
    }
  }
});

test('pelear contra bandidos sale mejor con armas en la carga', () => {
  const g = testGame();
  onTrip(g);
  const without = CHANCES.fight(g);
  g.state.cargo.armas = 3;
  assert.ok(CHANCES.fight(g) > without);
  assert.ok(CHANCES.fight(g) <= 0.95 && without >= 0.05);
});

test('una opción que cuesta oro no se puede elegir sin oro', () => {
  const g = testGame({ gold: 0 });
  onTrip(g);
  g.state.cargo.te = 10;
  g.state.trip.event = createEvent(g, 'bandidos', new Rng('x'));
  const pay = optionState(g, 0);
  assert.equal(pay.available, false);
  assert.ok(pay.reason);
  assert.equal(resolveOption(g, 0, new Rng('x')).ok, false);
});

test('las opciones con chance muestran su probabilidad', () => {
  const g = testGame();
  onTrip(g);
  g.state.trip.event = createEvent(g, 'bandidos', new Rng('x'));
  const fight = optionState(g, 1);
  assert.ok(fight.chance > 0 && fight.chance < 1);
  assert.equal(optionState(g, 0).chance, null);
});

test('esperar la tormenta agrega un día al viaje', () => {
  const g = testGame();
  const route = onTrip(g);
  g.state.trip.event = createEvent(g, 'tormenta', new Rng('x'));
  const res = resolveOption(g, 0, new Rng('x'));
  assert.ok(res.ok);
  assert.equal(g.state.trip.days, route.days + 1);
  assert.equal(g.state.trip.event, null);
});

test('no se puede esperar si eso pasa del día 60', () => {
  const g = testGame();
  const route = onTrip(g);
  g.state.day = RULES.seasonDays - route.days;
  g.state.trip.event = createEvent(g, 'tormenta', new Rng('x'));
  assert.equal(optionState(g, 0).available, false);
});

test('el control descubre armas y las confisca', () => {
  const g = testGame({ gold: 500 });
  onTrip(g);
  g.state.cargo.armas = 2;
  g.state.trip.event = createEvent(g, 'control', new Rng('x'));
  resolveOption(g, 0, new Rng('x'));
  assert.equal(g.state.cargo.armas, 0);
  assert.ok(g.state.gold < 500);
});
