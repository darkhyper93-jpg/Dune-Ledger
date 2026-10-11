/** Pruebas del generador de mapas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, bestNeighborMargin, otherEnd, MIN_ROUTE_MARGIN } from '../../js/game/map-gen.js';
import { isTerrain, isDanger } from '../../js/data/routes.js';

const SEEDS = Array.from({ length: 60 }, (_, i) => `mapa-${i}`);

/** Ciudades alcanzables desde la primera. */
function reachable(map) {
  const seen = new Set([map.cities[0].id]);
  const queue = [map.cities[0].id];
  while (queue.length) {
    const id = queue.shift();
    for (const r of map.routesByCity[id]) {
      const nb = otherEnd(r, id);
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  return seen.size;
}

test('la misma semilla da el mismo mapa', () => {
  const a = generateMap('igual');
  const b = generateMap('igual');
  assert.deepEqual(a.cities, b.cities);
  assert.deepEqual(a.routes, b.routes);
});

test('12 a 16 ciudades, 2 a 4 rutas cada una, y todas alcanzables', () => {
  for (const seed of SEEDS) {
    const map = generateMap(seed);
    assert.ok(map.cities.length >= 12 && map.cities.length <= 16, seed);
    for (const c of map.cities) {
      const d = map.routesByCity[c.id].length;
      assert.ok(d >= 2 && d <= 4, `${seed}: ${c.name} tiene ${d} rutas`);
    }
    assert.equal(reachable(map), map.cities.length, seed);
  }
});

test('una sola capital, al menos un puesto del Gremio y tipos mínimos', () => {
  for (const seed of SEEDS) {
    const map = generateMap(seed);
    const count = (t) => map.cities.filter((c) => c.type === t).length;
    assert.equal(count('capital'), 1);
    assert.ok(count('puerto') >= 2 && count('oasis') >= 2 && count('minera') >= 2 && count('aldea') >= 2 && count('santa') >= 1);
    assert.ok(map.cities.some((c) => c.guildPost));
    assert.ok(!map.cities.find((c) => c.type === 'capital').guildPost);
  }
});

test('las rutas duran 1 a 5 días y tienen terreno y peligro válidos', () => {
  for (const seed of SEEDS) {
    for (const r of generateMap(seed).routes) {
      assert.ok(Number.isInteger(r.days) && r.days >= 1 && r.days <= 5);
      assert.ok(isTerrain(r.terrain) && isDanger(r.danger));
    }
  }
});

test('regla 2: desde cada ciudad hay un negocio razonable con una vecina', () => {
  for (const seed of SEEDS) {
    const map = generateMap(seed);
    for (const c of map.cities) assert.ok(bestNeighborMargin(map, seed, c.id) >= MIN_ROUTE_MARGIN, `${seed} ${c.name}`);
  }
});

test('los nombres de ciudad no se repiten', () => {
  for (const seed of SEEDS) {
    const names = generateMap(seed).cities.map((c) => c.name);
    assert.equal(new Set(names).size, names.length);
  }
});
