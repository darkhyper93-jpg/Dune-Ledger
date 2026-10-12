/**
 * Acciones del jugador dentro de una ciudad: comprar y vender bienes,
 * provisiones y camellos, pagar al Gremio y deshacer.
 *
 * Cada acción devuelve { ok, error? } y no toca el DOM. Las compras y
 * ventas se pueden deshacer mientras sigas en la ciudad: se guarda una
 * foto exacta de lo que cambia (oro, carga, stock…) antes de aplicarlas.
 */

import { RULES } from '../data/rules.js';
import { getGood, ACTIVE_GOODS } from '../data/goods.js';
import { canTrade } from './perks.js';
import { see, notePeaks } from './stats.js';
import { quote } from './market.js';
import { cargoFree, camelPrice, camelResale, provisionPrices, provisionCap, perMount, mountName } from './caravan.js';
import { addLog, snapshotPrices } from './knowledge.js';
import { payDebt, canPayHere, totalOwed } from './debt.js';

/** Cuántas acciones se pueden deshacer como máximo. */
export const UNDO_LIMIT = 30;

/**
 * Error estándar de acción.
 * @param {string} error
 */
function fail(error) {
  return { ok: false, error };
}

/**
 * Valida que la partida siga y que la cantidad sea un entero positivo.
 */
function checkBasics(state, qty) {
  if (state.over) return 'La temporada terminó.';
  if (state.trip) return 'Estás viajando.';
  if (!Number.isInteger(qty) || qty <= 0) return 'Cantidad inválida.';
  return null;
}

/**
 * Guarda una foto de lo que puede cambiar una acción de mercado.
 */
function pushUndo(state, label) {
  state.undo.push({
    label,
    gold: state.gold,
    food: state.food,
    water: state.water,
    camels: state.camels,
    camelHp: state.camelHp.slice(),
    cargo: { ...state.cargo },
    freshness: { ...state.freshness },
    costBasis: { ...state.costBasis },
    stock: { ...state.stock[state.location] },
    stats: JSON.parse(JSON.stringify(state.stats)),
    logLen: state.log.length,
  });
  if (state.undo.length > UNDO_LIMIT) state.undo.shift();
}

/**
 * Deshace la última compra o venta hecha en esta ciudad, exacto.
 * @param {object} game
 */
export function undo(game) {
  const { state } = game;
  const snap = state.undo.pop();
  if (!snap || state.over || state.trip) return fail('No hay nada para deshacer.');
  Object.assign(state, {
    gold: snap.gold, food: snap.food, water: snap.water, camels: snap.camels, camelHp: snap.camelHp,
    cargo: snap.cargo, freshness: snap.freshness, costBasis: snap.costBasis, stats: snap.stats,
  });
  state.stock[state.location] = snap.stock;
  state.log.length = Math.min(state.log.length, snap.logLen);
  snapshotPrices(game, state.location);
  return { ok: true, label: snap.label };
}

/**
 * Cuántas unidades de un bien se pueden comprar con el oro y la carga libre.
 * @param {object} game
 * @param {string} goodId
 */
export function maxBuy(game, goodId) {
  const { state } = game;
  const good = getGood(goodId);
  const bySpace = good.weight > 0 ? Math.floor(cargoFree(state) / good.weight) : 999;
  const limit = Math.min(bySpace, 999);
  const q = quote(game, state.location, goodId, limit, 'buy');
  let spent = 0;
  let n = 0;
  while (n < q.prices.length && spent + q.prices[n] <= state.gold) spent += q.prices[n++];
  return n;
}

/**
 * Compra unidades de un bien en la ciudad actual.
 * @param {object} game
 * @param {string} goodId
 * @param {number} qty
 */
export function buy(game, goodId, qty) {
  const { state, map } = game;
  const err = checkBasics(state, qty);
  if (err) return fail(err);
  if (!ACTIVE_GOODS.includes(goodId)) return fail('Ese bien no se vende acá.');
  if (!canTrade(state, goodId, map.cityById[state.location].type)) return fail(`${getGood(goodId).name}: prohibido en esta ciudad.`);
  const good = getGood(goodId);
  if (qty * good.weight > cargoFree(state)) return fail('No te entra en la carga.');
  const q = quote(game, state.location, goodId, qty, 'buy');
  if (q.total > state.gold) return fail('No te alcanza el oro.');
  pushUndo(state, `compra de ${good.name}`);
  const had = state.cargo[goodId];
  state.costBasis[goodId] = (state.costBasis[goodId] * had + q.total) / (had + qty);
  if (good.decay) state.freshness[goodId] = ((state.freshness[goodId] ?? 1) * had + qty) / (had + qty);
  state.cargo[goodId] = had + qty;
  state.gold -= q.total;
  state.stock[state.location][goodId] = q.stockAfter;
  state.stats.spent += q.total;
  see(state, 'goods', goodId);
  snapshotPrices(game, state.location);
  addLog(state, `Compraste ${qty} de ${good.name} por ${q.total} en ${map.cityById[state.location].name}.`, 'trade');
  return { ok: true, total: q.total };
}

/**
 * Vende unidades de un bien en la ciudad actual y anota la ganancia.
 * @param {object} game
 * @param {string} goodId
 * @param {number} qty
 */
export function sell(game, goodId, qty) {
  const { state, map } = game;
  const err = checkBasics(state, qty);
  if (err) return fail(err);
  if (!ACTIVE_GOODS.includes(goodId)) return fail('Ese bien no se compra acá.');
  if (!canTrade(state, goodId, map.cityById[state.location].type)) return fail(`${getGood(goodId).name}: prohibido en esta ciudad.`);
  const good = getGood(goodId);
  if (qty > state.cargo[goodId]) return fail('No tenés tanto.');
  const q = quote(game, state.location, goodId, qty, 'sell');
  pushUndo(state, `venta de ${good.name}`);
  const profit = Math.round(q.total - state.costBasis[goodId] * qty);
  state.cargo[goodId] -= qty;
  if (state.cargo[goodId] === 0) {
    state.costBasis[goodId] = 0;
    if (good.decay) state.freshness[goodId] = 1;
  }
  state.gold += q.total;
  state.stock[state.location][goodId] = q.stockAfter;
  recordSale(state, goodId, qty, profit);
  snapshotPrices(game, state.location);
  const sign = profit >= 0 ? `ganaste ${profit}` : `perdiste ${-profit}`;
  addLog(state, `Vendiste ${qty} de ${good.name} por ${q.total} en ${map.cityById[state.location].name} (${sign}).`, 'trade');
  return { ok: true, total: q.total, profit };
}

/**
 * Anota estadísticas de una venta para el resumen final.
 */
function recordSale(state, goodId, qty, profit) {
  const st = state.stats;
  st.earned += profit;
  st.sold[goodId] = (st.sold[goodId] ?? 0) + qty;
  see(state, 'goods', goodId);
  if (!st.bestSale || profit > st.bestSale.profit) {
    st.bestSale = { goodId, qty, profit, cityId: state.location, day: state.day };
  }
  if (state.lastFrom) {
    const key = `${state.lastFrom}>${state.location}`;
    st.routeProfit[key] = (st.routeProfit[key] ?? 0) + profit;
  }
}

/**
 * Compra comida o agua en la ciudad actual.
 * @param {object} game
 * @param {'food'|'water'} kind
 * @param {number} qty
 */
export function buyProvision(game, kind, qty) {
  const { state, map } = game;
  const err = checkBasics(state, qty);
  if (err) return fail(err);
  if (kind !== 'food' && kind !== 'water') return fail('Provisión desconocida.');
  if (state[kind] + qty > provisionCap(state)) return fail(`Podés llevar hasta ${provisionCap(state)}.`);
  const cost = provisionPrices(map.cityById[state.location], state)[kind] * qty;
  if (cost > state.gold) return fail('No te alcanza el oro.');
  pushUndo(state, kind === 'food' ? 'compra de comida' : 'compra de agua');
  state.gold -= cost;
  state[kind] += qty;
  addLog(state, `Cargaste ${qty} de ${kind === 'food' ? 'comida' : 'agua'} por ${cost}.`, 'trade');
  return { ok: true, total: cost };
}

/**
 * Compra un camello en la ciudad actual.
 * @param {object} game
 */
export function buyCamel(game) {
  const { state, map } = game;
  if (state.over || state.trip) return fail('Ahora no se puede.');
  if (state.camels >= RULES.maxCamels) return fail(`Ya tenés ${RULES.maxCamels} ${mountName(state, 2)}.`);
  const price = camelPrice(state.seed, map.cityById[state.location]);
  if (price > state.gold) return fail('No te alcanza el oro.');
  pushUndo(state, `compra de ${mountName(state)}`);
  state.gold -= price;
  state.camels += 1;
  state.camelHp.push(100);
  notePeaks(state);
  addLog(state, `Compraste un ${mountName(state)} por ${price}.`, 'trade');
  return { ok: true, total: price };
}

/**
 * Vende el camello más cansado (si la carga entra en los demás).
 * @param {object} game
 */
export function sellCamel(game) {
  const { state, map } = game;
  if (state.over || state.trip) return fail('Ahora no se puede.');
  if (state.camels <= 1) return fail('Necesitás al menos un camello.');
  if (cargoFree(state) < perMount(state)) return fail(`Primero liberá carga: no entraría en los demás ${mountName(state, 2)}.`);
  const weakest = state.camelHp.indexOf(Math.min(...state.camelHp));
  const price = camelResale(state.seed, map.cityById[state.location], state.camelHp[weakest]);
  pushUndo(state, `venta de ${mountName(state)}`);
  state.gold += price;
  state.camels -= 1;
  state.camelHp.splice(weakest, 1);
  addLog(state, `Vendiste un ${mountName(state)} por ${price}.`, 'trade');
  return { ok: true, total: price };
}

/**
 * Paga (o adelanta) deuda al Gremio en la Capital o en un Puesto.
 * No se puede deshacer.
 * @param {object} game
 * @param {number} amount
 */
export function payGuild(game, amount) {
  const { state, map } = game;
  const err = checkBasics(state, Math.floor(amount));
  if (err) return fail(err);
  if (!canPayHere(map.cityById[state.location])) return fail('Acá no hay oficina del Gremio.');
  if (totalOwed(state.debt) === 0) return fail('No debés nada.');
  const paid = payDebt(state, amount);
  if (paid <= 0) return fail('No tenés oro para pagar.');
  state.undo = [];
  addLog(state, `Pagaste ${paid} al Gremio. Quedan ${totalOwed(state.debt)}.`, 'debt');
  return { ok: true, total: paid };
}
