/**
 * El mercado: precios, stock, compras y ventas.
 *
 * Fórmula del precio de venta de un bien en una ciudad:
 *   precio = base × modCiudad × ruido × (1.5 − stock / 100)
 * Comprar cuesta un 10% más. Los precios por unidad van con décimos y el
 * total de una operación se redondea a oro entero. Cada unidad comprada baja el stock (y sube
 * el precio de la siguiente); cada unidad vendida lo sube. Todo precio
 * queda entre el 20% y el 300% del base. Nada de esto toca el DOM.
 */

import { getGood } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { RULES } from '../data/rules.js';
import { hashUnit } from '../core/rng.js';

const M = RULES.market;

/**
 * Modificador de ciudad para un bien: barato si lo produce, caro si lo consume.
 * @param {string} cityType id del tipo de ciudad
 * @param {string} goodId
 * @returns {number}
 */
export function cityMod(cityType, goodId) {
  const good = getGood(goodId);
  getCityType(cityType);
  if (good.produces.includes(cityType)) return M.modProduces;
  if (good.consumes.includes(cityType)) return M.modConsumes;
  return 1;
}

/**
 * Ruido fijo de precio para una ciudad y un bien, decidido por la semilla.
 * @param {string} seed semilla de la temporada
 * @param {string} cityId
 * @param {string} goodId
 * @returns {number} entre noiseMin y noiseMax
 */
export function priceNoise(seed, cityId, goodId) {
  return M.noiseMin + hashUnit(`${seed}|${cityId}|${goodId}`) * (M.noiseMax - M.noiseMin);
}

/**
 * Redondea un precio unitario a décimos (los bienes baratos necesitan
 * decimales para que se note cómo se mueve el precio con el stock).
 * @param {number} x
 */
export function roundPrice(x) {
  return Math.round(x * 10) / 10;
}

/**
 * Limita un precio a los topes del bien (20%–300% del base) y lo redondea a décimos.
 * @param {number} raw precio sin redondear
 * @param {number} base precio base del bien
 * @returns {number}
 */
export function clampPrice(raw, base) {
  const lo = Math.ceil(base * M.minFactor * 10) / 10;
  const hi = Math.floor(base * M.maxFactor * 10) / 10;
  return Math.min(hi, Math.max(lo, roundPrice(raw)));
}

/**
 * Precio de venta (sin redondear ni limitar) con un stock dado.
 * @param {{seed:string,city:{id:string,type:string},goodId:string,stock:number}} p
 * @returns {number}
 */
export function rawSellPrice({ seed, city, goodId, stock }) {
  const good = getGood(goodId);
  const s = Math.min(M.stockMax, Math.max(M.stockMin, stock));
  return good.base * cityMod(city.type, goodId) * priceNoise(seed, city.id, goodId) * (1.5 - s / 100);
}

/**
 * Precio de venta de una unidad (a décimos) en una ciudad con un stock dado.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 * @param {string} goodId
 * @param {number} stock
 */
export function sellPriceAt(seed, city, goodId, stock) {
  return clampPrice(rawSellPrice({ seed, city, goodId, stock }), getGood(goodId).base);
}

/**
 * Precio de compra de una unidad (a décimos): venta + 10%.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 * @param {string} goodId
 * @param {number} stock
 */
export function buyPriceAt(seed, city, goodId, stock) {
  return clampPrice(rawSellPrice({ seed, city, goodId, stock }) * M.buyMarkup, getGood(goodId).base);
}

/**
 * Mueve un valor de stock dentro de 0..100.
 * @param {number} stock
 * @param {number} delta
 */
function moveStock(stock, delta) {
  return Math.min(M.stockMax, Math.max(M.stockMin, stock + delta));
}

/**
 * Cotiza una compra o venta unidad por unidad, sin cambiar nada.
 * Así la pantalla puede mostrar cómo sube el precio al inundar un mercado.
 * @param {object} game { map, state }
 * @param {string} cityId
 * @param {string} goodId
 * @param {number} qty unidades
 * @param {'buy'|'sell'} side
 * @returns {{prices:number[], total:number, stockAfter:number}}
 */
export function quote(game, cityId, goodId, qty, side) {
  const { map, state } = game;
  const city = map.cityById[cityId];
  const good = getGood(goodId);
  let stock = state.stock[cityId][goodId];
  const fresh = side === 'sell' && good.decay ? (state.freshness[goodId] ?? 1) : 1;
  const prices = [];
  for (let i = 0; i < qty; i++) {
    if (side === 'buy') {
      prices.push(buyPriceAt(state.seed, city, goodId, stock));
      stock = moveStock(stock, -good.stockStep * M.stockImpact);
    } else {
      prices.push(Math.max(0.1, roundPrice(sellPriceAt(state.seed, city, goodId, stock) * fresh)));
      stock = moveStock(stock, good.stockStep * M.stockImpact);
    }
  }
  // El oro es entero: el total se redondea una sola vez, al final.
  return { prices, total: Math.round(prices.reduce((a, b) => a + b, 0)), stockAfter: stock };
}

/**
 * Precios de venta y compra de todos los bienes en una ciudad, ahora.
 * @param {object} game
 * @param {string} cityId
 * @param {string[]} goodIds
 * @returns {{sell:Record<string,number>, buy:Record<string,number>}}
 */
export function cityPrices(game, cityId, goodIds) {
  const { map, state } = game;
  const city = map.cityById[cityId];
  const sell = {};
  const buy = {};
  for (const id of goodIds) {
    const stock = state.stock[cityId][id];
    sell[id] = sellPriceAt(state.seed, city, id, stock);
    buy[id] = buyPriceAt(state.seed, city, id, stock);
  }
  return { sell, buy };
}

/**
 * Stock inicial de todos los mercados: normal (50) en todos lados.
 * @param {object} map
 * @param {string[]} goodIds
 * @returns {Record<string, Record<string, number>>}
 */
export function initialStock(map, goodIds) {
  const stock = {};
  for (const city of map.cities) {
    stock[city.id] = {};
    for (const id of goodIds) stock[city.id][id] = M.stockNormal;
  }
  return stock;
}

/**
 * Pasa un día en todos los mercados: cada stock vuelve un 5% hacia lo normal.
 * @param {Record<string, Record<string, number>>} stock se modifica en el lugar
 */
export function recoverStock(stock) {
  for (const cityId of Object.keys(stock)) {
    const row = stock[cityId];
    for (const goodId of Object.keys(row)) {
      row[goodId] += (M.stockNormal - row[goodId]) * M.stockRecovery;
    }
  }
}
