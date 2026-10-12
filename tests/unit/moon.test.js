/** Pruebas de la luna y la marcha nocturna. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOON_CYCLE, moonPhase, moonLight, moonName, canNightMarch, lostChance, nightBanditMult, NIGHT_WATER } from '../../js/game/moon.js';
import { startTrip, advance } from '../../js/game/season.js';
import { tripNeeds } from '../../js/game/travel.js';
import { eventWeights } from '../../js/game/events.js';
import { validateState } from '../../js/game/validate.js';
import { testGame } from './helpers.js';
import { seedState } from '../../js/core/rng.js';

/** Una ruta de la ciudad actual con el terreno pedido (o null). */
function routeWith(g, terrains) {
  return g.map.routesByCity[g.state.location].find((r) => terrains.includes(r.terrain)) ?? null;
}

/** Busca una semilla cuya ciudad inicial tenga una ruta de arena o piedra. */
function gameWithLandRoute() {
  for (let i = 0; i < 50; i++) {
    const g = testGame({}, `luna-${i}`);
    const r = routeWith(g, ['arena', 'piedra']);
    if (r) return { g, r };
  }
  throw new Error('sin ruta de tierra');
}

/** Pone la luna en la fase pedida moviendo el día. */
function setPhase(g, phase) {
  while (moonPhase(g.state) !== phase) g.state.day += 1;
}

test('la luna da una vuelta cada 28 días y depende de la semilla', () => {
  const g = testGame();
  const p = moonPhase(g.state);
  assert.ok(Number.isInteger(p) && p >= 0 && p < MOON_CYCLE);
  assert.equal(moonPhase(g.state, g.state.day + MOON_CYCLE), p);
  assert.equal(moonPhase(g.state, g.state.day + 1), (p + 1) % MOON_CYCLE);
  const phases = new Set();
  for (let i = 0; i < 20; i++) phases.add(moonPhase(testGame({}, `s${i}`).state));
  assert.ok(phases.size > 3, 'cada temporada arranca en otra fase');
});

test('luz y nombre de cada fase', () => {
  assert.equal(moonLight(0), 0);
  assert.equal(moonLight(14), 1);
  assert.ok(moonLight(7) > 0.4 && moonLight(7) < 0.6);
  assert.equal(moonName(0), 'Luna nueva');
  assert.equal(moonName(14), 'Luna llena');
  assert.equal(moonName(7), 'Cuarto creciente');
  assert.equal(moonName(21), 'Cuarto menguante');
  for (let i = 0; i < MOON_CYCLE; i++) assert.ok(moonName(i).length > 3);
});

test('de noche sólo se marcha por arena o piedra', () => {
  assert.equal(canNightMarch({ terrain: 'arena' }), true);
  assert.equal(canNightMarch({ terrain: 'piedra' }), true);
  for (const t of ['montana', 'rio', 'mar']) assert.equal(canNightMarch({ terrain: t }), false);
});

test('perderse: más fácil sin luna; el guía y el astrolabio ayudan', () => {
  const { g } = gameWithLandRoute();
  setPhase(g, 0);
  const dark = lostChance(g.state);
  setPhase(g, 14);
  const full = lostChance(g.state);
  assert.ok(dark > 0.35 && dark <= 0.4, `sin luna ${dark}`);
  assert.ok(full >= 0.04 && full <= 0.06, `luna llena ${full}`);
  setPhase(g, 0);
  g.state.crew = [{ id: 'x', name: 'Amira', role: 'guia', trait: 'leal', xp: 0, morale: 70, wage: 14 }];
  assert.ok(Math.abs(lostChance(g.state) - dark / 2) < 1e-9);
  g.state.gear = { astrolabio: true };
  assert.ok(Math.abs(lostChance(g.state) - dark / 4) < 1e-9);
});

test('de noche se gasta menos agua', () => {
  const { g, r } = gameWithLandRoute();
  const day = tripNeeds(g.state, r);
  const night = tripNeeds(g.state, r, { night: true });
  assert.equal(night.food, day.food);
  assert.ok(night.water < day.water);
  assert.ok(night.water >= Math.floor(day.water * NIGHT_WATER));
});

test('sin luna hay menos bandidos de noche; con luna llena, igual que de día', () => {
  const { g, r } = gameWithLandRoute();
  const route = { ...r, danger: 'alto' };
  setPhase(g, 0);
  const day = eventWeights(g, route).bandidos;
  g.state.trip = { routeId: r.id, from: g.state.location, to: 'x', done: 0, days: 3, rolled: 0, event: null, night: true };
  const dark = eventWeights(g, route).bandidos;
  assert.ok(Math.abs(dark - day * nightBanditMult(g.state)) < 1e-9);
  assert.ok(dark < day * 0.4);
  setPhase(g, 14);
  assert.ok(Math.abs(eventWeights(g, route).bandidos - day) < 1e-9);
});

test('salir de noche: queda anotado, gasta menos agua y a veces se pierde un día', () => {
  const { g, r } = gameWithLandRoute();
  setPhase(g, 14);
  const planned = tripNeeds(g.state, r, { night: true });
  assert.equal(startTrip(g, r.id, { night: true }).ok, true);
  assert.equal(g.state.trip.night, true);
  const lost = g.state.trip.days === planned.days + 1;
  assert.ok(lost || g.state.trip.days === planned.days);
  const water = g.state.water;
  assert.equal(advance(g).status, 'arrived');
  if (!lost) assert.equal(water - g.state.water, planned.water);
  assert.equal(g.state.stats.nightTrips, 1);
});

test('sin luna y sin ayuda, perderse pasa seguido; con luna llena casi nunca', () => {
  let darkLost = 0;
  let fullLost = 0;
  const { g: base } = gameWithLandRoute();
  for (let i = 0; i < 120; i++) {
    for (const phase of [0, 14]) {
      const g = testGame({}, base.state.seed);
      const r = routeWith(g, ['arena', 'piedra']);
      g.state.rng = seedState(`perderse-${i}-${phase}`);
      setPhase(g, phase);
      const planned = tripNeeds(g.state, r, { night: true }).days;
      startTrip(g, r.id, { night: true });
      if (g.state.trip.days > planned) phase === 0 ? darkLost++ : fullLost++;
    }
  }
  assert.ok(darkLost > 25, `sin luna se perdieron ${darkLost}/120`);
  assert.ok(fullLost < 18, `con luna llena se perdieron ${fullLost}/120`);
});

test('no se puede salir de noche por el río, el mar o la montaña', () => {
  for (let i = 0; i < 60; i++) {
    const g = testGame({}, `agua-${i}`);
    const r = routeWith(g, ['rio', 'mar', 'montana']);
    if (!r) continue;
    const res = startTrip(g, r.id, { night: true });
    assert.equal(res.ok, false);
    assert.match(res.error, /noche/);
    return;
  }
  assert.fail('no encontré una ruta de río, mar o montaña');
});

test('un viaje de noche se guarda y se carga igual', () => {
  const { g, r } = gameWithLandRoute();
  startTrip(g, r.id, { night: true });
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.equal(res.game.state.trip.night, true);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.trip.night = 'sí';
  assert.equal(validateState(bad).ok, false);
});
