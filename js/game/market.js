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
import { RULES, getDifficulty } from '../data/rules.js';
import { hashUnit } from '../core/rng.js';
import { repBuyFactor } from './reputation.js';
import { newsMult } from './news.js';
import { tradeBonus } from './crew.js';
import { hasPerk, upgradeValue, regionOf } from './perks.js';

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

/** Días que dura cada "semana" de precios volátiles. */
const SWING_DAYS = 5;

/**
 * Multiplicador de mercado de un bien en una ciudad hoy: las noticias y, en
 * Difícil y Pesadilla, un vaivén que cambia cada 5 días (fijo dentro de la
 * semana, para que descansar un día no sirva para "tirar el dado").
 * @param {object} game
 * @param {string} cityId
 * @param {string} goodId
 */
export function marketMult(game, cityId, goodId) {
  const { state } = game;
  const vol = getDifficulty(state.difficulty).volatility ?? 0;
  const news = newsMult(game, cityId, goodId);
  if (!vol) return news;
  const week = Math.floor((state.day - 1) / SWING_DAYS);
  return news * (1 + vol * (2 * hashUnit(`${state.seed}|vaiven|${cityId}|${goodId}|${week}`) - 1));
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
 * @param {{seed:string,city:{id:string,type:string},goodId:string,stock:number,mult?:number}} p
 *   mult: multiplicador por noticias de mercado
 * @returns {number}
 */
export function rawSellPrice({ seed, city, goodId, stock, mult = 1 }) {
  const good = getGood(goodId);
  const s = Math.min(M.stockMax, Math.max(M.stockMin, stock));
  return good.base * cityMod(city.type, goodId) * priceNoise(seed, city.id, goodId) * (1.5 - s / 100) * mult;
}

/**
 * Precio de venta de una unidad (a décimos) en una ciudad con un stock dado.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 * @param {string} goodId
 * @param {number} stock
 * @param {number} [mult=1] noticias de mercado
 * @param {number} [factor=1] contable
 */
export function sellPriceAt(seed, city, goodId, stock, mult = 1, factor = 1) {
  return clampPrice(rawSellPrice({ seed, city, goodId, stock, mult }) * factor, getGood(goodId).base);
}

/**
 * Precio de compra de una unidad (a décimos): venta + 10%, por el factor
 * de reputación de la zona.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 * @param {string} goodId
 * @param {number} stock
 * @param {number} [factor=1] reputación (ver reputation.js)
 * @param {number} [mult=1] noticias de mercado
 */
export function buyPriceAt(seed, city, goodId, stock, factor = 1, mult = 1) {
  return clampPrice(rawSellPrice({ seed, city, goodId, stock, mult }) * M.buyMarkup * factor, getGood(goodId).base);
}

/**
 * Factor de compra en una ciudad: reputación de su zona y contable.
 * @param {object} game
 * @param {string} cityId
 */
export function buyFactor(game, cityId) {
  return repBuyFactor(game.state.rep[game.map.cityById[cityId].zone]) * (1 - tradeBonus(game.state)) * (hasPerk(game.state, 'negociante') ? 0.92 : 1);
}

/**
 * Factor de venta: el contable vende un poco más caro; en el Reino del
 * Sultán se paga un impuesto.
 * @param {object} game
 */
export function sellFactor(game) {
  return (1 + tradeBonus(game.state) + upgradeValue(game.state, 'socio')) * (1 - (regionOf(game.state).salesTax ?? 0));
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
  const sf = sellFactor(game);
  const factor = buyFactor(game, cityId);
  const mult = marketMult(game, cityId, goodId);
  const prices = [];
  for (let i = 0; i < qty; i++) {
    if (side === 'buy') {
      prices.push(buyPriceAt(state.seed, city, goodId, stock, factor, mult));
      stock = moveStock(stock, -good.stockStep * M.stockImpact);
    } else {
      prices.push(Math.max(0.1, roundPrice(sellPriceAt(state.seed, city, goodId, stock, mult, sf) * fresh)));
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
  const factor = buyFactor(game, cityId);
  for (const id of goodIds) {
    const stock = state.stock[cityId][id];
    const mult = marketMult(game, cityId, id);
    sell[id] = sellPriceAt(state.seed, city, id, stock, mult, sellFactor(game));
    buy[id] = buyPriceAt(state.seed, city, id, stock, factor, mult);
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
 * Pasa un día en todos los mercados: cada stock vuelve un poco hacia lo normal.
 * @param {Record<string, Record<string, number>>} stock se modifica en el lugar
 * @param {number} [rate] parte que se recupera (más rápido para el Negociante)
 */
export function recoverStock(stock, rate = M.stockRecovery) {
  for (const cityId of Object.keys(stock)) {
    const row = stock[cityId];
    for (const goodId of Object.keys(row)) {
      row[goodId] += (M.stockNormal - row[goodId]) * rate;
    }
  }
}
