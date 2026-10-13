/** Pruebas del mapa del tesoro: tres pedazos, un rumor y una ruta para cavar. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTreasure, treasureArrive, treasureClue, buyRumor, treasureDue, RUMOR_PRICE, TREASURE_PIECES,
} from '../../js/game/treasure.js';
import { createSeason, travel } from '../../js/game/season.js';
import { startTrip, advanceTrip, chooseOption } from '../../js/game/trip.js';
import { validateState } from '../../js/game/validate.js';
import { testGame } from './helpers.js';

/** Juego con eventos prendidos pero sin eventos al azar (sólo el del tesoro). */
function quietGame(seed = 'tesoro') {
  const g = createSeason({ seed, eventRate: 0 });
  g.state.climate = 'templado';
  return g;
}

/** Da por encontrados todos los pedazos. */
function findAll(g) {
  for (const id of g.state.treasure.pieces) {
    g.state.location = id;
    treasureArrive(g);
  }
}

test('cada temporada esconde 3 pedazos en ciudades distintas (no en la de salida) y una ruta', () => {
  const g = testGame();
  const t = g.state.treasure;
  assert.equal(t.pieces.length, TREASURE_PIECES);
  assert.equal(new Set(t.pieces).size, TREASURE_PIECES);
  for (const id of t.pieces) {
    assert.ok(g.map.cityById[id], id);
    assert.notEqual(id, g.state.location);
  }
  assert.ok(g.map.routeById[t.route]);
  assert.ok(t.gold >= 200 && t.gold <= 400, `oro ${t.gold}`);
  assert.deepEqual(t.found, []);
  assert.equal(t.dug, false);
});

test('es igual con la misma semilla y no cambia el azar del resto de la temporada', () => {
  const a = createTreasure(testGame().map, 'x', 'c0');
  const b = createTreasure(testGame().map, 'x', 'c0');
  assert.deepEqual(a, b);
  const g1 = createSeason({ seed: 'misma' });
  const g2 = createSeason({ seed: 'misma' });
  assert.deepEqual(g1.state.rng, g2.state.rng);
});

test('al llegar a una ciudad con un pedazo, lo encontrás (una sola vez)', () => {
  const g = testGame();
  const [first] = g.state.treasure.pieces;
  g.state.location = first;
  assert.equal(treasureArrive(g), true);
  assert.deepEqual(g.state.treasure.found, [first]);
  assert.match(g.state.log.at(-1).text, /pedazo/);
  assert.equal(treasureArrive(g), false);
  assert.deepEqual(g.state.treasure.found, [first]);
});

test('cada pedazo dice más: la zona, una punta y al final la ruta exacta', () => {
  const g = testGame();
  const t = g.state.treasure;
  const route = g.map.routeById[t.route];
  assert.equal(treasureClue(g).level, 0);
  g.state.location = t.pieces[0];
  treasureArrive(g);
  assert.match(treasureClue(g).text, /zona/);
  g.state.location = t.pieces[1];
  treasureArrive(g);
  assert.equal(treasureClue(g).cityId, route.a);
  assert.equal(g.state.known[route.a], true, 'la punta aparece en el mapa');
  assert.match(treasureClue(g).text, new RegExp(g.map.cityById[route.a].name));
  g.state.location = t.pieces[2];
  treasureArrive(g);
  const clue = treasureClue(g);
  assert.equal(clue.routeId, route.id);
  assert.equal(g.state.knownRoutes[route.id], true, 'la ruta aparece en el mapa');
  assert.equal(g.state.known[route.a] && g.state.known[route.b], true);
});

test('el rumor cuesta oro y marca la ciudad más cercana con un pedazo', () => {
  const g = testGame();
  const gold = g.state.gold;
  const res = buyRumor(g);
  assert.equal(res.ok, true);
  assert.equal(g.state.gold, gold - RUMOR_PRICE);
  assert.ok(g.state.treasure.pieces.includes(res.cityId));
  assert.equal(g.state.treasure.hint, res.cityId);
  assert.equal(g.state.known[res.cityId], true, 'la ciudad aparece en el mapa');
  assert.equal(buyRumor(g).ok, false, 'no se vende otro rumor hasta encontrar ese pedazo');
  g.state.location = res.cityId;
  treasureArrive(g);
  assert.equal(g.state.treasure.hint, null);
});

test('sin oro, sin pedazos por buscar o viajando, no hay rumor', () => {
  const g = testGame({ gold: RUMOR_PRICE - 1 });
  assert.equal(buyRumor(g).ok, false);
  const h = testGame();
  findAll(h);
  assert.equal(buyRumor(h).ok, false);
  const old = testGame({ treasure: null });
  assert.equal(buyRumor(old).ok, false);
});

test('con los 3 pedazos, al pasar por la ruta del mapa se puede cavar (un día más, oro)', () => {
  const g = quietGame();
  findAll(g);
  const t = g.state.treasure;
  const route = g.map.routeById[t.route];
  g.state.location = route.a;
  g.state.visited[route.a] = true;
  const gold = g.state.gold;
  assert.equal(startTrip(g, route.id).ok, true);
  const days = g.state.trip.days;
  assert.equal(advanceTrip(g).status, 'event');
  assert.equal(g.state.trip.event.id, 'tesoro');
  assert.equal(chooseOption(g, 0).ok, true);
  assert.equal(g.state.trip.days, days + 1);
  assert.equal(g.state.treasure.dug, true);
  assert.equal(g.state.stats.mapTreasures, 1);
  assert.equal(advanceTrip(g).status, 'arrived');
  assert.ok(g.state.gold >= gold + t.gold - 50, 'cobró el tesoro (menos sueldos)');
  assert.equal(treasureDue(g, route, 1), false, 'no se cava dos veces');
});

test('seguir de largo deja el tesoro para otro viaje', () => {
  const g = quietGame();
  findAll(g);
  const route = g.map.routeById[g.state.treasure.route];
  g.state.location = route.a;
  g.state.visited[route.a] = true;
  const res = travel(g, route.id, () => 1);
  assert.equal(res.arrived, true);
  assert.equal(res.events, 1);
  assert.equal(g.state.treasure.dug, false);
  assert.equal(treasureDue(g, route, 1), true);
});

test('sin todos los pedazos, o por otra ruta, no aparece', () => {
  const g = quietGame();
  const route = g.map.routeById[g.state.treasure.route];
  assert.equal(treasureDue(g, route, 1), false);
  findAll(g);
  const other = g.map.routes.find((r) => r.id !== route.id);
  assert.equal(treasureDue(g, other, 1), false);
  assert.equal(treasureDue(g, route, 2), false, 'sólo el primer día de viaje');
});

test('se guarda y se valida; una partida vieja sin tesoro sigue andando', () => {
  const g = testGame();
  g.state.location = g.state.treasure.pieces[0];
  g.state.visited[g.state.location] = true;
  treasureArrive(g);
  const back = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.equal(back.ok, true, back.error);
  assert.deepEqual(back.game.state.treasure, g.state.treasure);
  const raw = JSON.parse(JSON.stringify(g.state));
  delete raw.treasure;
  const old = validateState(raw);
  assert.equal(old.ok, true, old.error);
  assert.equal(old.game.state.treasure, null);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.treasure.pieces = ['no-existe', 'c1', 'c2'];
  assert.equal(validateState(bad).ok, false);
});

