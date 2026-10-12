/**
 * "Lo que conviene": cuántas unidades de un bien vale la pena comprar acá
 * para venderlas en la ciudad donde lo viste más caro. Cada unidad que
 * comprás sale un poco más cara y cada una que vendés allá rinde un poco
 * menos (el mercado se llena), así que hay un punto en que la siguiente ya
 * no deja ganancia. Es la mecánica central del juego, puesta en un número.
 */

import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { bestKnownSell } from './knowledge.js';
import { maxBuy } from './actions.js';
import { quote } from './market.js';

/**
 * Precio que se espera cobrar por la unidad k (desde 0) en el destino: el
 * último precio visto, bajando a medida que se vende.
 * @param {object} game
 * @param {{price:number}} best mejor precio conocido
 * @param {string} goodId
 * @param {number} k
 */
export function expectedSellAt(game, best, goodId, k) {
  const good = getGood(goodId);
  return best.price * Math.max(0.3, 1 - (k * good.stockStep * RULES.market.stockImpact) / 100);
}

/**
 * Cuántas comprar para el mejor destino conocido, o null si no conocés
 * precios de este bien en otra ciudad.
 * @param {object} game
 * @param {string} goodId
 * @returns {{qty:number, cityId:string, price:number, day:number, profit:number}|null}
 */
export function worthBuying(game, goodId) {
  const best = bestKnownSell(game, goodId);
  if (!best) return null;
  const max = maxBuy(game, goodId);
  const buys = max > 0 ? quote(game, game.state.location, goodId, max, 'buy').prices : [];
  let qty = 0;
  let profit = 0;
  while (qty < buys.length) {
    const gain = expectedSellAt(game, best, goodId, qty) - buys[qty];
    if (gain <= 0) break;
    profit += gain;
    qty += 1;
  }
  return { qty, cityId: best.cityId, price: best.price, day: best.day, profit: Math.round(profit) };
}
