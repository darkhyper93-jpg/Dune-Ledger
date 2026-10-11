/** Pruebas de viajes: consumo, terreno, faltantes, niebla y fin de temporada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tripNeeds, dailyRation, canTravel, SHORTAGE_LOSS } from '../../js/game/travel.js';
import { travel, rest } from '../../js/game/season.js';
import { otherEnd } from '../../js/game/map-gen.js';
import { testGame } from './helpers.js';

test('se gasta 1 de comida y agua por cada 2 seres, redondeando hacia arriba', () => {
  const g = testGame({ camels: 2 });
  assert.equal(dailyRation(g.state), 2); // 1 persona + 2 camellos = 3 → 2
  g.state.camels = 3;
  assert.equal(dailyRation(g.state), 2); // 4 → 2
  g.state.camels = 4;
  assert.equal(dailyRation(g.state), 3); // 5 → 3
});

test('la arena gasta más agua y el río casi nada', () => {
  const g = testGame({ camels: 3 });
  const arena = tripNeeds(g.state, { days: 2, terrain: 'arena' });
  const rio = tripNeeds(g.state, { days: 2, terrain: 'rio' });
  const piedra = tripNeeds(g.state, { days: 2, terrain: 'piedra' });
  assert.equal(piedra.water, 4);
  assert.equal(arena.water, 6);
  assert.equal(rio.water, 1);
  assert.equal(arena.food, 4);
});

test('viajar gasta exactamente lo anunciado y avanza los días', () => {
  const g = testGame({ food: 50, water: 50 });
  const route = g.map.routesByCity[g.state.location][0];
  const need = tripNeeds(g.state, route);
  const res = travel(g, route.id);
  assert.ok(res.ok && res.arrived);
  assert.equal(g.state.day, 1 + route.days);
  assert.equal(g.state.food, 50 - need.food);
  assert.equal(g.state.water, 50 - need.water);
});

test('al llegar se descubren las vecinas y se anotan los precios', () => {
  const g = testGame({ food: 50, water: 50 });
  const route = g.map.routesByCity[g.state.location][0];
  const to = otherEnd(route, g.state.location);
  travel(g, route.id);
  assert.equal(g.state.location, to);
  assert.equal(g.state.prices[to].day, g.state.day);
  for (const r of g.map.routesByCity[to]) assert.ok(g.state.known[otherEnd(r, to)]);
});

test('sin agua se deja carga en el camino', () => {
  const g = testGame({ food: 50, water: 0 });
  g.state.cargo.te = 20;
  const route = g.map.routesByCity[g.state.location][0];
  travel(g, route.id);
  let expected = 20;
  for (let i = 0; i < route.days; i++) expected -= Math.ceil(expected * SHORTAGE_LOSS);
  assert.equal(g.state.cargo.te, expected);
  assert.ok(g.state.log.some((l) => l.text.includes('Sin agua')));
});

test('no se puede viajar a una ciudad que no es vecina ni pasar del día 60', () => {
  const g = testGame();
  const far = g.map.routes.find((r) => r.a !== g.state.location && r.b !== g.state.location);
  assert.equal(canTravel(g, far.id).ok, false);
  assert.equal(canTravel(g, 'no-existe').ok, false);
  const near = g.map.routesByCity[g.state.location][0];
  g.state.day = 60;
  assert.equal(canTravel(g, near.id).ok, false);
});

test('descansar avanza un día y recupera los mercados', () => {
  const g = testGame({ food: 50, water: 50 });
  g.state.stock[g.state.location].te = 0;
  rest(g);
  assert.equal(g.state.day, 2);
  assert.ok(g.state.stock[g.state.location].te > 0);
});
