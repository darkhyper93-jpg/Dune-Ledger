/**
 * Prueba de "ruta en bucle": compra el mismo bien en A, lo vende en B y
 * vuelve, una y otra vez, con una caravana grande. El stock tiene que ir
 * agotando el negocio.
 */
import { createSeason, travel } from '../../js/game/season.js';
import { buy, sell, maxBuy } from '../../js/game/actions.js';
import { quote } from '../../js/game/market.js';
import { provisionPrices } from '../../js/game/caravan.js';
import { ACTIVE_GOODS, getGood, isTradedIn } from '../../js/data/goods.js';
import { buyPriceAt, sellPriceAt } from '../../js/game/market.js';

/**
 * Busca el par (ruta, bien) con mejor margen a stock normal en el mapa.
 */
export function bestLoop(game) {
  const { map, state } = game;
  let best = null;
  for (const r of map.routes) {
    for (const [a, b] of [[r.a, r.b], [r.b, r.a]]) {
      for (const g of ACTIVE_GOODS) {
        if (!isTradedIn(g, map.cityById[a].type) || !isTradedIn(g, map.cityById[b].type)) continue;
        const m = sellPriceAt(state.seed, map.cityById[b], g, 50) / buyPriceAt(state.seed, map.cityById[a], g, 50);
        if (!best || m > best.margin) best = { route: r, from: a, to: b, goodId: g, margin: m };
      }
    }
  }
  return best;
}

/**
 * Cantidad que más ganancia da, mirando los precios reales de compra acá y
 * de venta en destino (un jugador que adivina perfecto el mercado).
 */
function bestQty(game, loop, max) {
  const good = getGood(loop.goodId);
  const keep = good.decay ? (1 - good.decay) ** loop.route.days : 1;
  let best = 0;
  let bestGain = 0;
  for (let q = 1; q <= max; q++) {
    const gain = quote(game, loop.to, loop.goodId, q, 'sell').total * keep - quote(game, loop.from, loop.goodId, q, 'buy').total;
    if (gain > bestGain) {
      bestGain = gain;
      best = q;
    }
  }
  return best;
}

/**
 * Repite el bucle `times` veces y devuelve la ganancia neta de cada viaje
 * (proporción sobre lo invertido, descontando comida y agua de ida y vuelta).
 * @param {string} seed
 * @param {number} times
 * @param {number} camels tamaño de la caravana
 */
export function runLoop(seed, times = 10, camels = 5) {
  // Sin eventos: esta prueba mide sólo cómo el stock agota el negocio.
  const game = createSeason({ seed, events: false });
  const { state } = game;
  const loop = bestLoop(game);
  Object.assign(state, { location: loop.from, camels, camelHp: Array(camels).fill(100), gold: 100000, food: 200, water: 200 });
  const prov = provisionPrices(game.map.cityById[loop.from]);
  state.debt.installments.forEach((i) => { i.paid = i.amount; });
  // Sin noticias de mercado: sólo cuenta cómo se agota el stock.
  state.news = { next: 999, items: [] };
  const profits = [];
  for (let k = 0; k < times; k++) {
    state.day = 2; // que la temporada no termine durante la prueba
    state.news.next = 999;
    state.food = 200;
    state.water = 200;
    state.camelHp = Array(camels).fill(100);
    const qty = bestQty(game, loop, maxBuy(game, loop.goodId));
    if (qty === 0) {
      profits.push(0);
      travel(game, loop.route.id);
      travel(game, loop.route.id);
      continue;
    }
    const cost = buy(game, loop.goodId, qty).total;
    travel(game, loop.route.id);
    const income = sell(game, loop.goodId, qty).total;
    travel(game, loop.route.id);
    // La ganancia del viaje descuenta la comida y el agua de ida y vuelta.
    const supplies = (200 - state.food) * prov.food + (200 - state.water) * prov.water;
    profits.push((income - cost - supplies) / cost);
  }
  return { loop, profits };
}
