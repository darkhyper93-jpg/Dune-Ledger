/** Pruebas del aviso antes de descansar sin comida o sin agua. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restRisk, dailyRation } from '../../js/game/travel.js';
import { testGame } from './helpers.js';

test('con provisiones para el día no hay aviso', () => {
  const g = testGame({ food: 20, water: 20 });
  assert.equal(restRisk(g.state), null);
});

test('sin agua avisa que los animales sufren y se pierde carga', () => {
  const g = testGame({ food: 20, water: 0 });
  const r = restRisk(g.state);
  assert.match(r, /agua/);
  assert.match(r, /salud/);
  assert.match(r, /carga/);
});

test('sin comida avisa del hambre', () => {
  const g = testGame({ food: dailyRation(testGame().state, 'food') - 1, water: 20 });
  const r = restRisk(g.state);
  assert.match(r, /comida/);
  assert.doesNotMatch(r, /agua/);
});
