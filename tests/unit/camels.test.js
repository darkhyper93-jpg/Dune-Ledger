/** Pruebas de la salud de los camellos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tireCamels, healCamels, avgHealth, FATIGUE_PER_DAY, THIRST_HP, REST_HP } from '../../js/game/camels.js';
import { buyCamel, sellCamel, buy } from '../../js/game/actions.js';
import { rest, travel } from '../../js/game/season.js';
import { cargoUsed, capacity, camelResale, camelPrice } from '../../js/game/caravan.js';
import { TERRAINS } from '../../js/data/routes.js';
import { testGame } from './helpers.js';

test('se empieza con 2 camellos sanos', () => {
  const g = testGame();
  assert.deepEqual(g.state.camelHp, [100, 100]);
  assert.equal(avgHealth(g.state), 100);
});

test('un camello comprado llega sano y al vender se va el más cansado', () => {
  const g = testGame({ gold: 1000 });
  g.state.camelHp = [40, 90];
  buyCamel(g);
  assert.deepEqual(g.state.camelHp, [40, 90, 100]);
  sellCamel(g);
  assert.deepEqual(g.state.camelHp.slice().sort((a, b) => a - b), [90, 100]);
});

test('un camello cansado vale menos al venderlo', () => {
  const g = testGame();
  const city = g.map.cityById[g.state.location];
  assert.ok(camelResale(g.state.seed, city, 50) < camelResale(g.state.seed, city, 100));
  assert.ok(camelResale(g.state.seed, city, 100) <= camelPrice(g.state.seed, city));
});

test('viajar cansa a los camellos según el terreno', () => {
  const g = testGame({ food: 200, water: 200 });
  const route = g.map.routesByCity[g.state.location][0];
  travel(g, route.id);
  const expected = 100 - Math.round(FATIGUE_PER_DAY * TERRAINS[route.terrain].fatigue) * route.days;
  assert.deepEqual(g.state.camelHp, [expected, expected]);
});

test('sin agua los camellos se cansan mucho más', () => {
  const g = testGame({ food: 200, water: 0 });
  const route = g.map.routesByCity[g.state.location][0];
  travel(g, route.id);
  const perDay = Math.round(FATIGUE_PER_DAY * TERRAINS[route.terrain].fatigue) + THIRST_HP;
  assert.equal(g.state.camelHp[0], 100 - perDay * route.days);
});

test('descansar en la ciudad los recupera', () => {
  const g = testGame({ food: 200, water: 200 });
  g.state.camelHp = [50, 95];
  rest(g);
  assert.deepEqual(g.state.camelHp, [50 + REST_HP, 100]);
});

test('un camello sin salud muere y la carga que no entra se deja en el camino', () => {
  const g = testGame({ gold: 5000 });
  buy(g, 'sal', 20); // 40 de carga: llena los 2 camellos
  g.state.camelHp = [5, 100];
  const lines = tireCamels(g.state, 10);
  assert.equal(g.state.camels, 1);
  assert.deepEqual(g.state.camelHp, [90]);
  assert.ok(cargoUsed(g.state) <= capacity(g.state));
  assert.equal(g.state.cargo.sal, 10);
  assert.ok(lines.some((l) => /murió/i.test(l)));
});

test('el último camello nunca muere', () => {
  const g = testGame();
  g.state.camels = 1;
  g.state.camelHp = [10];
  tireCamels(g.state, 50);
  assert.equal(g.state.camels, 1);
  assert.equal(g.state.camelHp[0], 1);
});

test('curar no pasa de 100', () => {
  const g = testGame();
  g.state.camelHp = [99, 30];
  healCamels(g.state, 25);
  assert.deepEqual(g.state.camelHp, [100, 55]);
});
