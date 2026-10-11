/** Pruebas de los bienes de la etapa 2: los 12 activos y reglas especiales. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_GOODS, GOODS, isTradedIn } from '../../js/data/goods.js';
import { buy, sell } from '../../js/game/actions.js';
import { testGame } from './helpers.js';

test('se juegan los 12 bienes', () => {
  assert.equal(ACTIVE_GOODS.length, 12);
  assert.deepEqual([...ACTIVE_GOODS].sort(), GOODS.map((g) => g.id).sort());
});

test('las armas no se comercian en la ciudad santa', () => {
  assert.equal(isTradedIn('armas', 'santa'), false);
  assert.equal(isTradedIn('armas', 'aldea'), true);
  assert.equal(isTradedIn('libros', 'santa'), true);
});

test('comprar o vender armas en la ciudad santa falla', () => {
  const g = testGame({ gold: 5000 });
  const santa = g.map.cities.find((c) => c.type === 'santa');
  g.state.location = santa.id;
  g.state.visited[santa.id] = true;
  assert.equal(buy(g, 'armas', 1).ok, false);
  g.state.cargo.armas = 2;
  assert.equal(sell(g, 'armas', 1).ok, false);
  assert.equal(buy(g, 'libros', 1).ok, true);
});

test('las perlas no ocupan lugar', () => {
  const g = testGame({ gold: 100000 });
  const res = buy(g, 'perlas', 3);
  assert.ok(res.ok);
  assert.equal(g.state.cargo.perlas, 3);
});
