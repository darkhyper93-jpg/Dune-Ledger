/** Pruebas de la geometría del mapa: el círculo de días no tapa nombres. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeSpot } from '../../js/render/map.js';

test('el círculo de días va al medio si está libre', () => {
  const spot = badgeSpot({ x: 0, y: 0 }, { x: 40, y: 0 }, [], [], 2.6);
  assert.deepEqual(spot, { x: 20, y: 0 });
});

test('si el medio pisa un nombre, el círculo se corre por la ruta', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 0, y: 40 };
  // Un nombre justo en el medio de la ruta.
  const box = { x0: -6, x1: 6, y0: 18, y1: 22 };
  const spot = badgeSpot(a, b, [box], [], 2.6);
  assert.equal(spot.x, 0);
  assert.ok(spot.y + 2.6 < box.y0 || spot.y - 2.6 > box.y1, `quedó en ${spot.y}`);
});
