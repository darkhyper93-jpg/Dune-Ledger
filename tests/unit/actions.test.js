/** Pruebas de las acciones en la ciudad: comprar, vender, deshacer, provisiones y camellos. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buy, sell, undo, maxBuy, buyProvision, buyCamel, sellCamel } from '../../js/game/actions.js';
import { quote } from '../../js/game/market.js';
import { cargoUsed, capacity, camelPrice } from '../../js/game/caravan.js';
import { travel } from '../../js/game/season.js';
import { testGame } from './helpers.js';

test('comprar cobra lo cotizado, carga y baja el stock', () => {
  const g = testGame();
  const loc = g.state.location;
  const q = quote(g, loc, 'te', 5, 'buy');
  const res = buy(g, 'te', 5);
  assert.ok(res.ok);
  assert.equal(g.state.gold, 300 - q.total);
  assert.equal(g.state.cargo.te, 5);
  assert.equal(g.state.stock[loc].te, q.stockAfter);
});

test('no se puede comprar sin oro, sin lugar o cantidades raras', () => {
  const g = testGame({ gold: 5 });
  assert.equal(buy(g, 'seda', 1).ok, false);
  g.state.gold = 100000;
  assert.equal(buy(g, 'sal', 21).ok, false); // 21 × 2 = 42 > 40
  assert.equal(buy(g, 'sal', 0).ok, false);
  assert.equal(buy(g, 'sal', 1.5).ok, false);
  assert.equal(buy(g, 'jade', 1).ok, false); // no existe (llega con las regiones)
  assert.equal(buy(g, '__proto__', 1).ok, false);
});

test('maxBuy respeta oro y carga', () => {
  const g = testGame({ gold: 100000 });
  assert.equal(maxBuy(g, 'sal'), 20);
  g.state.gold = 50;
  const n = maxBuy(g, 'te');
  assert.ok(quote(g, g.state.location, 'te', n, 'buy').total <= 50);
  assert.ok(quote(g, g.state.location, 'te', n + 1, 'buy').total > 50);
});

test('vender suma oro y anota la ganancia', () => {
  const g = testGame();
  buy(g, 'te', 4);
  const res = sell(g, 'te', 4);
  assert.ok(res.ok);
  assert.ok(res.profit < 0, 'vender donde compraste pierde');
  assert.equal(g.state.cargo.te, 0);
  assert.equal(sell(g, 'te', 1).ok, false);
});

test('deshacer vuelve exacto, stock incluido', () => {
  const g = testGame();
  const before = JSON.stringify({ ...g.state, prices: null, undo: null });
  buy(g, 'te', 3);
  buy(g, 'sal', 2);
  sell(g, 'sal', 1);
  undo(g);
  undo(g);
  undo(g);
  assert.equal(JSON.stringify({ ...g.state, prices: null, undo: null }), before);
  assert.equal(undo(g).ok, false);
});

test('al viajar ya no se puede deshacer', () => {
  const g = testGame({ food: 50, water: 50 });
  buy(g, 'te', 1);
  travel(g, g.map.routesByCity[g.state.location][0].id);
  assert.equal(undo(g).ok, false);
});

test('provisiones: cuestan según la ciudad y tienen tope', () => {
  const g = testGame({ gold: 1000 });
  const res = buyProvision(g, 'food', 10);
  assert.ok(res.ok);
  assert.equal(g.state.food, 30);
  assert.equal(buyProvision(g, 'food', 500).ok, false);
  assert.equal(buyProvision(g, 'oro', 1).ok, false);
});

test('camellos: comprar suma 20 de carga, vender exige lugar libre', () => {
  const g = testGame({ gold: 1000 });
  const price = camelPrice(g.state.seed, g.map.cityById[g.state.location]);
  assert.ok(price >= 80 && price <= 120);
  assert.ok(buyCamel(g).ok);
  assert.equal(capacity(g.state), 60);
  buy(g, 'sal', 25); // 50 de carga
  assert.equal(sellCamel(g).ok, false);
  sell(g, 'sal', 25);
  assert.ok(sellCamel(g).ok);
  assert.ok(cargoUsed(g.state) <= capacity(g.state));
});

test('nada funciona con la temporada terminada', () => {
  const g = testGame();
  g.state.over = { reason: 'fin' };
  assert.equal(buy(g, 'te', 1).ok, false);
  assert.equal(buyCamel(g).ok, false);
});
