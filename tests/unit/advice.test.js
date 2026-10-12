/** Pruebas de "Lo que conviene": cuántas unidades comprar para un destino conocido. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { worthBuying, expectedSellAt } from '../../js/game/advice.js';
import { maxBuy } from '../../js/game/actions.js';
import { quote } from '../../js/game/market.js';
import { ACTIVE_GOODS } from '../../js/data/goods.js';
import { canTrade } from '../../js/game/perks.js';
import { testGame } from './helpers.js';

/** Temporada con un precio de venta conocido en otra ciudad. */
function withKnownPrice(price, patch = { gold: 5000 }) {
  const g = testGame(patch);
  const type = g.map.cityById[g.state.location].type;
  const goodId = ACTIVE_GOODS.find((id) => canTrade(g.state, id, type) && id !== 'perlas');
  const other = g.map.cities.find((c) => c.id !== g.state.location);
  g.state.prices[other.id] = { day: g.state.day, sell: { [goodId]: price }, buy: {} };
  return { g, goodId, other };
}

test('sin un precio conocido en otra ciudad no hay consejo', () => {
  const g = testGame({ gold: 5000 });
  for (const id of Object.keys(g.state.prices)) if (id !== g.state.location) delete g.state.prices[id];
  assert.equal(worthBuying(g, ACTIVE_GOODS[0]), null);
});

test('si allá se paga menos que acá, no conviene comprar nada', () => {
  const { g, goodId } = withKnownPrice(0.5);
  assert.equal(worthBuying(g, goodId).qty, 0);
});

test('compra hasta que la unidad siguiente ya no deja ganancia', () => {
  const probe = withKnownPrice(1);
  const first = quote(probe.g, probe.g.state.location, probe.goodId, 1, 'buy').prices[0];
  const { g, goodId, other } = withKnownPrice(Math.round(first * 1.4));
  const adv = worthBuying(g, goodId);
  assert.equal(adv.cityId, other.id);
  assert.ok(adv.qty > 0 && adv.qty <= maxBuy(g, goodId));
  const buys = quote(g, g.state.location, goodId, maxBuy(g, goodId), 'buy').prices;
  // La última unidad que aconseja deja ganancia; la siguiente (si se puede) no.
  assert.ok(expectedSellAt(g, adv, goodId, adv.qty - 1) > buys[adv.qty - 1]);
  if (adv.qty < buys.length) assert.ok(expectedSellAt(g, adv, goodId, adv.qty) <= buys[adv.qty]);
});
