/** Pruebas del bazar de equipo: objetos que se compran una vez y sirven toda la temporada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GEAR, GEAR_BY_ID } from '../../js/data/gear.js';
import { CITY_TYPES_BY_ID } from '../../js/data/cities.js';
import { createSeason, rest, travel } from '../../js/game/season.js';
import { gearHere, buyGear, hasGear } from '../../js/game/gear.js';
import { createEvent, optionState } from '../../js/game/events.js';
import { validateState } from '../../js/game/validate.js';
import { Rng } from '../../js/core/rng.js';

const fresh = () => createSeason({ seed: 'bazar', events: false });

/** Lleva la caravana a una ciudad del tipo pedido. */
function goTo(g, type) {
  const c = g.map.cities.find((x) => x.type === type);
  g.state.location = c.id;
  g.state.visited[c.id] = true;
  return c;
}

test('el equipo está bien armado y cada objeto se vende en algún lado', () => {
  assert.ok(GEAR.length >= 6);
  for (const it of GEAR) {
    assert.ok(it.name && it.desc && it.price > 0, it.id);
    assert.ok(it.sold.length > 0 && it.sold.every((t) => CITY_TYPES_BY_ID[t]), it.id);
  }
});

test('se compra una sola vez, sólo donde lo venden y si alcanza el oro', () => {
  const g = fresh();
  goTo(g, 'capital');
  assert.ok(gearHere(g).some((it) => it.id === 'lampara'));
  g.state.gold = 10;
  assert.equal(buyGear(g, 'lampara').ok, false);
  g.state.gold = 500;
  assert.ok(buyGear(g, 'lampara').ok);
  assert.equal(g.state.gold, 500 - GEAR_BY_ID.lampara.price);
  assert.ok(hasGear(g.state, 'lampara'));
  assert.equal(buyGear(g, 'lampara').ok, false);
  goTo(g, 'oasis');
  assert.equal(buyGear(g, 'catalejo').ok, false);
});

test('la lámpara mejora pasar la tormenta y la brújula, huir', () => {
  const g = fresh();
  const route = g.map.routesByCity[g.state.location][0];
  const to = route.a === g.state.location ? route.b : route.a;
  g.state.trip = { routeId: route.id, from: g.state.location, to, done: 0, days: 5, rolled: 1, event: null };
  g.state.trip.event = createEvent(g, 'tormenta', new Rng('t'));
  const storm = optionState(g, 1).chance;
  g.state.gear.lampara = true;
  assert.ok(optionState(g, 1).chance > storm);
  g.state.trip.event = createEvent(g, 'bandidos', new Rng('b'));
  const flee = optionState(g, 2).chance;
  g.state.gear.brujula = true;
  assert.ok(optionState(g, 2).chance > flee);
});

test('con el toldo, descansar cura más', () => {
  const a = fresh();
  const b = fresh();
  b.state.gear.toldo = true;
  a.state.camelHp = [40, 40];
  b.state.camelHp = [40, 40];
  rest(a);
  rest(b);
  assert.ok(b.state.camelHp[0] > a.state.camelHp[0]);
});

test('el equipo se guarda y una partida vieja sin equipo carga vacía', () => {
  const g = fresh();
  g.state.gear.cofre = true;
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.gear, { cofre: true });
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.gear;
  assert.deepEqual(validateState(old).game.state.gear, {});
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.gear.espada = true;
  assert.equal(validateState(bad).ok, false);
});

test('con el catalejo, al llegar se ven los precios de una vecina desconocida', () => {
  const run = (withScope) => {
    const g = fresh();
    if (withScope) g.state.gear.catalejo = true;
    const route = g.map.routesByCity[g.state.location][0];
    travel(g, route.id);
    return Object.keys(g.state.prices).length;
  };
  assert.ok(run(true) > run(false));
});
