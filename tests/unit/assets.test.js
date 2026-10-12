/** Pruebas de los animales como bienes: cuentan en el patrimonio y en el puntaje. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animalsValue, ANIMAL_VALUE } from '../../js/game/caravan.js';
import { currentScore } from '../../js/game/finish.js';
import { worthNow } from '../../js/game/history.js';
import { buyCamel } from '../../js/game/actions.js';
import { testGame } from './helpers.js';

test('cada animal vale lo que te darían por venderlo, según su salud', () => {
  const g = testGame();
  assert.equal(g.state.camels, 2);
  assert.equal(animalsValue(g.state), 2 * ANIMAL_VALUE);
  g.state.camelHp = [100, 0];
  assert.equal(animalsValue(g.state), ANIMAL_VALUE + Math.round(ANIMAL_VALUE * 0.4));
});

test('comprar un camello no es oro tirado: suma al patrimonio y al puntaje', () => {
  const g = testGame({ gold: 1000 });
  const before = currentScore(g);
  const worth = worthNow(g.state);
  const res = buyCamel(g);
  assert.ok(res.ok);
  assert.equal(currentScore(g), before - res.total + ANIMAL_VALUE);
  assert.equal(worthNow(g.state), worth - res.total + ANIMAL_VALUE);
});
