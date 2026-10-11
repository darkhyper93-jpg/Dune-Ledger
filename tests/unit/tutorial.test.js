/** Pruebas del tutorial de la primera temporada: un consejo por vez, según lo que ya hiciste. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL, tutorialTip } from '../../js/game/tutorial.js';
import { buy, sell } from '../../js/game/actions.js';
import { travel } from '../../js/game/season.js';
import { testGame } from './helpers.js';

const cheapest = (g) => {
  const prices = g.state.prices[g.state.location].buy;
  return Object.keys(prices).filter((id) => g.state.cargo[id] !== undefined && id !== 'jade').sort((a, b) => prices[a] - prices[b])[0];
};

test('los consejos tienen texto y un id único', () => {
  assert.ok(TUTORIAL.length >= 4);
  assert.equal(new Set(TUTORIAL.map((t) => t.id)).size, TUTORIAL.length);
  for (const t of TUTORIAL) assert.ok(t.text.length > 20 && t.screens.length > 0);
});

test('el tutorial avanza a medida que jugás: comprar, viajar, vender y la deuda', () => {
  const g = testGame({ gold: 600 });
  assert.equal(tutorialTip(g.state, 'city').id, 'comprar');
  // En el mapa todavía no toca ningún consejo (primero hay que comprar).
  assert.equal(tutorialTip(g.state, 'map'), null);
  assert.ok(buy(g, cheapest(g), 3).ok);
  assert.equal(tutorialTip(g.state, 'city').id, 'viajar');
  assert.equal(tutorialTip(g.state, 'map').id, 'ruta');
  const route = g.map.routesByCity[g.state.location][0];
  assert.ok(travel(g, route.id).ok);
  assert.equal(tutorialTip(g.state, 'city').id, 'vender');
  const good = Object.keys(g.state.cargo).find((id) => g.state.cargo[id] > 0);
  assert.ok(sell(g, good, 1).ok);
  const last = tutorialTip(g.state, 'city');
  assert.equal(last.id, 'deuda');
  assert.equal(last.final, true);
});

test('sin partida o con la partida terminada no hay consejos', () => {
  const g = testGame();
  g.state.over = { reason: 'fin' };
  assert.equal(tutorialTip(g.state, 'city'), null);
  assert.equal(tutorialTip(null, 'city'), null);
});
