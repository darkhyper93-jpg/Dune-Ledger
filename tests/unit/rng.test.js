/** Pruebas del azar con semilla (js/core/rng.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng, hashString, hashUnit } from '../../js/core/rng.js';

test('la misma semilla da la misma secuencia', () => {
  const a = new Rng('dunas');
  const b = new Rng('dunas');
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
});

test('semillas distintas dan secuencias distintas', () => {
  assert.notEqual(new Rng('a').next(), new Rng('b').next());
});

test('el estado guardado continúa la secuencia exacta', () => {
  const a = new Rng('x');
  a.next();
  const b = new Rng(a.getState());
  assert.equal(a.next(), b.next());
});

test('int, range y pick quedan dentro de los límites', () => {
  const r = new Rng('limites');
  for (let i = 0; i < 1000; i++) {
    const n = r.int(3, 7);
    assert.ok(Number.isInteger(n) && n >= 3 && n <= 7);
    const x = r.range(0.9, 1.1);
    assert.ok(x >= 0.9 && x < 1.1);
    assert.ok(['a', 'b'].includes(r.pick(['a', 'b'])));
  }
});

test('weighted respeta los pesos aproximadamente', () => {
  const r = new Rng('pesos');
  let a = 0;
  for (let i = 0; i < 4000; i++) if (r.weighted({ a: 3, b: 1 }) === 'a') a++;
  assert.ok(a > 2800 && a < 3200, `salió ${a}`);
});

test('shuffle no pierde elementos', () => {
  const out = new Rng('mezcla').shuffle([1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test('hashString y hashUnit son estables', () => {
  assert.equal(hashString('hola'), hashString('hola'));
  const u = hashUnit('hola');
  assert.ok(u >= 0 && u < 1);
});
