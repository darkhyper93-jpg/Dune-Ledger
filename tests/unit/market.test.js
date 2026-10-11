/** Pruebas del mercado: fórmula, topes, stock y cotizaciones. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOODS, ACTIVE_GOODS, getGood } from '../../js/data/goods.js';
import { CITY_TYPES } from '../../js/data/cities.js';
import { RULES } from '../../js/data/rules.js';
import { cityMod, priceNoise, rawSellPrice, sellPriceAt, buyPriceAt, quote, recoverStock } from '../../js/game/market.js';
import { testGame } from './helpers.js';

test('modCiudad: 0.6 si produce, 1.6 si consume, 1 si nada', () => {
  assert.equal(cityMod('minera', 'sal'), 0.6);
  assert.equal(cityMod('puerto', 'sal'), 1.6);
  assert.equal(cityMod('oasis', 'sal'), 1);
});

test('el ruido es fijo por semilla y está entre 0.9 y 1.1', () => {
  const n = priceNoise('s', 'c1', 'te');
  assert.equal(n, priceNoise('s', 'c1', 'te'));
  for (let i = 0; i < 200; i++) {
    const x = priceNoise(`s${i}`, 'c1', 'te');
    assert.ok(x >= 0.9 && x <= 1.1);
  }
});

test('la fórmula sigue base × mod × ruido × (1.5 − stock/100)', () => {
  const city = { id: 'c1', type: 'puerto' };
  const expected = 18 * 0.6 * priceNoise('s', 'c1', 'te') * (1.5 - 30 / 100);
  assert.ok(Math.abs(rawSellPrice({ seed: 's', city, goodId: 'te', stock: 30 }) - expected) < 1e-9);
});

test('ningún precio sale del 20%–300% del base, en ningún stock ni ciudad', () => {
  for (const g of GOODS) {
    for (const t of CITY_TYPES) {
      for (let stock = 0; stock <= 100; stock += 5) {
        for (const seed of ['a', 'b', 'c']) {
          const city = { id: 'c0', type: t.id };
          for (const p of [sellPriceAt(seed, city, g.id, stock), buyPriceAt(seed, city, g.id, stock)]) {
            assert.ok(Number.isFinite(p) && p > 0, `${g.id} ${p}`);
            assert.ok(p >= g.base * 0.2 - 1e-9 && p <= g.base * 3 + 1e-9, `${g.id} en ${t.id}: ${p}`);
          }
        }
      }
    }
  }
});

test('comprar cuesta 10% más que vender', () => {
  const city = { id: 'c2', type: 'oasis' };
  const sell = rawSellPrice({ seed: 'z', city, goodId: 'incienso', stock: 50 });
  assert.ok(Math.abs(buyPriceAt('z', city, 'incienso', 50) - Math.round(sell * 1.1 * 10) / 10) < 1e-9);
});

test('cada unidad comprada sale igual o más cara y cada vendida paga igual o menos', () => {
  const game = testGame();
  const loc = game.state.location;
  for (const id of ACTIVE_GOODS) {
    const b = quote(game, loc, id, 30, 'buy');
    const s = quote(game, loc, id, 30, 'sell');
    for (let i = 1; i < 30; i++) {
      assert.ok(b.prices[i] >= b.prices[i - 1]);
      assert.ok(s.prices[i] <= s.prices[i - 1]);
    }
    assert.ok(b.prices[29] > b.prices[0], `${id} no sube al comprar`);
    const expected = Math.max(0, 50 - 30 * getGood(id).stockStep * RULES.market.stockImpact);
    assert.ok(Math.abs(b.stockAfter - expected) < 1e-6);
  }
});

test('quote no cambia el estado', () => {
  const game = testGame();
  const before = JSON.stringify(game.state);
  quote(game, game.state.location, 'te', 10, 'buy');
  assert.equal(JSON.stringify(game.state), before);
});

test('el stock vuelve hacia 50 un poco cada día', () => {
  const stock = { c0: { te: 10, sal: 90 } };
  recoverStock(stock);
  const r = RULES.market.stockRecovery;
  assert.ok(Math.abs(stock.c0.te - (10 + 40 * r)) < 1e-9);
  assert.ok(Math.abs(stock.c0.sal - (90 - 40 * r)) < 1e-9);
  for (let i = 0; i < 500; i++) recoverStock(stock);
  assert.ok(Math.abs(stock.c0.te - 50) < 0.01);
});

test('los dátiles viejos valen menos', () => {
  const game = testGame();
  const loc = game.state.location;
  const fresh = quote(game, loc, 'datiles', 5, 'sell').total;
  game.state.freshness.datiles = 0.5;
  const old = quote(game, loc, 'datiles', 5, 'sell').total;
  assert.ok(old < fresh);
});
