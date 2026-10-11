/**
 * Jugadores automáticos para medir el balance en Node.
 *
 * Juegan con las mismas acciones que una persona (js/game/), sólo con lo
 * que la caravana sabe (precios vistos, ciudades descubiertas), y viven
 * los mismos viajes, cuotas y embargos.
 *  - greedy (codicioso): siempre va por el negocio de más ganancia por día que conoce.
 *  - random (aleatorio): compra y viaja al azar, pero carga las provisiones del viaje.
 */

import { Rng } from '../../js/core/rng.js';
import { RULES } from '../../js/data/rules.js';
import { getGood, ACTIVE_GOODS } from '../../js/data/goods.js';
import { createSeason, travel, rest, finishSeason, canFinish } from '../../js/game/season.js';
import { buy, sell, buyProvision, buyCamel, payGuild, maxBuy } from '../../js/game/actions.js';
import { buyPriceAt } from '../../js/game/market.js';
import { tripNeeds, canTravel } from '../../js/game/travel.js';
import { cargoFree, camelPrice, provisionPrices } from '../../js/game/caravan.js';
import { canPayHere, nextInstallment, owedOn, totalOwed } from '../../js/game/debt.js';
import { otherEnd } from '../../js/game/map-gen.js';

/**
 * Vende toda la carga en la ciudad actual.
 */
function sellAll(game) {
  for (const id of ACTIVE_GOODS) {
    const qty = game.state.cargo[id];
    if (qty > 0) sell(game, id, qty);
  }
}

/**
 * Compra la comida y el agua que hacen falta para una ruta, más un margen.
 * @returns {boolean} si alcanzó el oro
 */
function stockUp(game, route, extraDays = 1) {
  const { state, map } = game;
  const need = tripNeeds(state, { ...route, days: route.days + extraDays });
  const prices = provisionPrices(map.cityById[state.location]);
  for (const kind of ['food', 'water']) {
    let missing = Math.min(need[kind] - state[kind], RULES.provisionCap - state[kind]);
    if (kind === 'water' && prices.water === 0) missing = RULES.provisionCap - state.water;
    if (missing > 0) {
      const affordable = prices[kind] === 0 ? missing : Math.min(missing, Math.floor(state.gold / prices[kind]));
      if (affordable > 0) buyProvision(game, kind, affordable);
    }
  }
  const after = tripNeeds(state, route);
  return after.enoughFood && after.enoughWater;
}

/**
 * Costo en oro de las provisiones de una ruta (sin contar lo que ya hay).
 */
function provisionCost(game, route) {
  const { state, map } = game;
  const need = tripNeeds(state, { ...route, days: route.days + 1 });
  const p = provisionPrices(map.cityById[state.location]);
  return Math.max(0, need.food - state.food) * p.food + Math.max(0, need.water - state.water) * p.water;
}

/**
 * Precio de venta que el bot espera en un destino para la unidad k:
 * el último precio visto, bajando a medida que vende. Si nunca vio la
 * ciudad, supone el precio base.
 */
function expectedSell(game, destId, goodId, k) {
  const info = game.state.prices[destId];
  const good = getGood(goodId);
  const p0 = info ? info.sell[goodId] : good.base;
  return p0 * Math.max(0.3, 1 - (k * good.stockStep * RULES.market.stockImpact) / 100);
}

/**
 * Arma el mejor cargamento para un destino: va sumando de a una la unidad
 * con más ganancia esperada por lugar de carga, mientras convenga.
 * @returns {{profit:number, buys:Record<string,number>}}
 */
function planCargo(game, destId, budget) {
  const { state, map } = game;
  const city = map.cityById[state.location];
  const stock = { ...state.stock[state.location] };
  const bought = Object.fromEntries(ACTIVE_GOODS.map((id) => [id, 0]));
  let space = cargoFree(state);
  let profit = 0;
  for (let guard = 0; guard < 400; guard++) {
    let best = null;
    for (const id of ACTIVE_GOODS) {
      const good = getGood(id);
      if (good.weight > space) continue;
      const price = buyPriceAt(state.seed, city, id, stock[id]);
      if (price > budget) continue;
      const gain = expectedSell(game, destId, id, bought[id]) - price;
      const score = gain / Math.max(1, good.weight);
      if (gain > price * 0.08 && (!best || score > best.score)) best = { id, price, gain, score };
    }
    if (!best) break;
    const good = getGood(best.id);
    bought[best.id] += 1;
    stock[best.id] = Math.max(0, stock[best.id] - good.stockStep * RULES.market.stockImpact);
    space -= good.weight;
    budget -= best.price;
    profit += best.gain;
  }
  return { profit, buys: bought };
}

/**
 * Oro que conviene no gastar: la próxima cuota (con la comisión del
 * cobrador) si vence antes de volver a tener oro.
 */
function reserveFor(game, arrivalDay) {
  const inst = nextInstallment(game.state.debt);
  if (!inst || inst.day >= RULES.seasonDays) return 0;
  return arrivalDay > inst.day ? Math.ceil(owedOn(inst) * (1 + RULES.debt.collectorFee)) : 0;
}

/**
 * Un turno del bot codicioso en la ciudad actual: vende, paga, mejora la
 * caravana, elige el mejor negocio conocido y viaja.
 */
function greedyTurn(game) {
  const { state, map } = game;
  sellAll(game);
  const here = map.cityById[state.location];
  const inst = nextInstallment(state.debt);
  if (inst && canPayHere(here)) {
    const keep = inst.day - state.day > 12 ? 150 : 0;
    if (state.gold - keep > 0) payGuild(game, Math.min(owedOn(inst), state.gold - keep));
  }
  const debtLeft = totalOwed(state.debt);
  const cp = camelPrice(state.seed, here);
  if (state.camels < RULES.maxCamels && state.day < 42 && state.gold > cp + 250 + debtLeft * 0.25) buyCamel(game);

  let best = null;
  for (const route of map.routesByCity[state.location]) {
    if (!canTravel(game, route.id).ok) continue;
    const dest = otherEnd(route, state.location);
    const budget = state.gold - provisionCost(game, route) - reserveFor(game, state.day + route.days);
    const plan = planCargo(game, dest, Math.max(0, budget));
    const explore = state.prices[dest] ? 0 : 15;
    const value = (plan.profit + explore) / route.days;
    if (!best || value > best.value) best = { route, plan, value };
  }
  if (!best) return finishOrRest(game);
  if (!stockUp(game, best.route)) return finishOrRest(game);
  for (const [id, qty] of Object.entries(best.plan.buys)) {
    if (qty > 0) {
      const n = Math.min(qty, maxBuy(game, id));
      if (n > 0) buy(game, id, n);
    }
  }
  travel(game, best.route.id);
}

/**
 * Cuando ya no se puede viajar: cierra si se puede o descansa.
 */
function finishOrRest(game) {
  sellAll(game);
  if (canFinish(game)) finishSeason(game, 'fin');
  else if (!rest(game).ok) finishSeason(game, 'fin');
}

/**
 * Un turno del bot aleatorio: vende y compra al azar y viaja a una vecina al azar.
 */
function randomTurn(game, rng) {
  const { state, map } = game;
  for (const id of ACTIVE_GOODS) if (state.cargo[id] > 0 && rng.chance(0.6)) sell(game, id, state.cargo[id]);
  if (canPayHere(map.cityById[state.location]) && rng.chance(0.5)) payGuild(game, rng.int(0, state.gold));
  const routes = map.routesByCity[state.location].filter((r) => canTravel(game, r.id).ok);
  if (!routes.length) return finishOrRest(game);
  const route = rng.pick(routes);
  stockUp(game, route, 0);
  for (let i = 0; i < 3; i++) {
    const id = rng.pick(ACTIVE_GOODS);
    const n = rng.int(0, maxBuy(game, id));
    if (n > 0) buy(game, id, n);
  }
  travel(game, route.id);
}

/**
 * Juega una temporada completa con un bot.
 * @param {'greedy'|'random'} kind
 * @param {string} seed
 * @param {{difficulty?:string, onTurn?:Function}} [opts] onTurn se llama después de cada turno
 * @returns {{won:boolean, score:number, game:object}}
 */
export function playSeason(kind, seed, opts = {}) {
  const game = createSeason({ seed, difficulty: opts.difficulty ?? 'normal' });
  const rng = new Rng(`bot:${kind}:${seed}`);
  for (let turn = 0; turn < 500 && !game.state.over; turn++) {
    if (kind === 'greedy') greedyTurn(game);
    else randomTurn(game, rng);
    if (opts.onTurn) opts.onTurn(game);
  }
  if (!game.state.over) finishSeason(game, 'fin');
  return { won: game.state.over.won, score: game.state.over.score, game };
}

/**
 * Juega muchas temporadas y devuelve la tasa de victorias y estadísticas.
 * @param {'greedy'|'random'} kind
 * @param {number} n
 * @param {string} [prefix='sim']
 */
export function runMany(kind, n, prefix = 'sim') {
  let wins = 0;
  const scores = [];
  const trips = [];
  for (let i = 0; i < n; i++) {
    const r = playSeason(kind, `${prefix}-${i}`);
    if (r.won) wins++;
    scores.push(r.score);
    trips.push(r.game.state.stats.trips);
  }
  scores.sort((a, b) => a - b);
  trips.sort((a, b) => a - b);
  return {
    winRate: wins / n,
    medianScore: scores[Math.floor(n / 2)],
    medianTrips: trips[Math.floor(n / 2)],
  };
}
