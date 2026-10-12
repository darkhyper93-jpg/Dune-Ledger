/** Pruebas de la Gran Feria: se anuncia el día 40 y paga mucho más al final. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickFair, fairMult, FAIR_ANNOUNCE, FAIR_START, FAIR_MULT } from '../../js/game/fair.js';
import { marketMult, sellPriceAt, cityMod } from '../../js/game/market.js';
import { getGood } from '../../js/data/goods.js';
import { createSeason } from '../../js/game/season.js';
import { validateState } from '../../js/game/validate.js';
import { testGame } from './helpers.js';

test('se anuncia el día 40, una sola vez, con una ciudad que compra ese bien', () => {
  const g = testGame();
  g.state.day = FAIR_ANNOUNCE - 1;
  tickFair(g);
  assert.equal(g.state.fair, null);
  g.state.day = FAIR_ANNOUNCE;
  tickFair(g);
  const f = g.state.fair;
  assert.ok(f && g.map.cityById[f.cityId]);
  assert.ok(cityMod(g.map.cityById[f.cityId].type, f.goodId) >= 1, 'la ciudad no produce el bien de la feria');
  assert.equal(f.start, FAIR_START);
  assert.match(g.state.log.at(-1).text, /Gran Feria/);
  const same = { ...f };
  g.state.day += 1;
  tickFair(g);
  assert.deepEqual(g.state.fair, same);
});

test('durante la feria el bien vale más en esa ciudad (y el precio sigue con su tope)', () => {
  const g = testGame();
  g.state.day = FAIR_ANNOUNCE;
  tickFair(g);
  const { cityId, goodId } = g.state.fair;
  const city = g.map.cityById[cityId];
  assert.equal(fairMult(g.state, cityId, goodId), 1, 'antes de empezar no cambia nada');
  const normal = marketMult(g, cityId, goodId);
  g.state.day = FAIR_START;
  assert.equal(fairMult(g.state, cityId, goodId), FAIR_MULT);
  assert.ok(Math.abs(marketMult(g, cityId, goodId) - normal * FAIR_MULT) < 1e-9);
  const other = g.map.cities.find((c) => c.id !== cityId).id;
  assert.equal(fairMult(g.state, other, goodId), 1);
  const price = sellPriceAt(g.state.seed, city, goodId, 50, marketMult(g, cityId, goodId));
  assert.ok(price <= 3 * getGood(goodId).base + 1e-9);
});

test('no hay feria en el modo libre', () => {
  const g = createSeason({ seed: 'feria-libre', mode: 'libre', events: false });
  g.state.day = FAIR_ANNOUNCE;
  tickFair(g);
  assert.equal(g.state.fair, null);
});

test('la feria se guarda y se carga', () => {
  const g = testGame();
  g.state.day = FAIR_ANNOUNCE;
  tickFair(g);
  const res = validateState(JSON.parse(JSON.stringify(g.state)));
  assert.ok(res.ok, res.error);
  assert.deepEqual(res.game.state.fair, g.state.fair);
  const bad = JSON.parse(JSON.stringify(g.state));
  bad.fair.cityId = 'no-existe';
  assert.equal(validateState(bad).ok, false);
  const old = JSON.parse(JSON.stringify(g.state));
  delete old.fair;
  assert.equal(validateState(old).game.state.fair, null);
});
