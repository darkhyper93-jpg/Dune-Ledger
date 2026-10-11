/**
 * Contratos: encargos de la taberna y del Gremio del tipo "llevá 10 de té
 * a Kharsa antes del día 24 por 400 de oro". Pagan más que el mercado pero
 * tienen fecha; si se vencen, baja la reputación en la zona de destino.
 */

import { ACTIVE_GOODS, getGood, isTradedIn, inRegion } from '../data/goods.js';
import { RULES } from '../data/rules.js';
import { cityMod, sellPriceAt } from './market.js';
import { travelDays } from './map-gen.js';
import { canPayHere } from './debt.js';
import { changeRep } from './reputation.js';
import { addLog } from './knowledge.js';
import { withRng } from './random.js';
import { fmt } from '../core/text.js';
import { upgradeValue, regionId } from './perks.js';

/** Contratos activos como máximo. */
export const MAX_ACTIVE = 3;
/** Reputación que se gana al cumplir y se pierde al fallar. */
export const DONE_REP = 10;
export const FAIL_REP = 15;
/** Cada cuántos días se renuevan las ofertas de una ciudad. */
export const OFFER_TTL = 7;

/** Estado inicial de los contratos. */
export function initialContracts() {
  return { offers: {}, active: [], nextId: 1 };
}

/**
 * Ofertas disponibles en la ciudad actual.
 * @param {object} game
 */
export function offersHere(game) {
  return game.state.contracts.offers[game.state.location]?.list ?? [];
}

/**
 * Arma una oferta al azar desde una ciudad, o null si no encuentra una buena.
 */
function makeOffer(game, city, days, rng, source, taken) {
  const { state, map } = game;
  const goods = ACTIVE_GOODS.filter((g) => isTradedIn(g, city.type) && inRegion(g, regionId(state)) && cityMod(city.type, g) <= 1);
  for (let tries = 0; tries < 20; tries++) {
    const goodId = rng.pick(goods);
    const dests = map.cities.filter((c) => c.id !== city.id && isTradedIn(goodId, c.type) && cityMod(c.type, goodId) >= 1
      && days[c.id] <= 8 && state.day + days[c.id] + 2 <= RULES.seasonDays && !taken.has(`${goodId}>${c.id}`));
    if (!dests.length) continue;
    const dest = rng.pick(dests);
    const w = getGood(goodId).weight;
    const qty = w > 0 ? Math.max(3, Math.round(rng.range(12, 26) / w)) : rng.int(2, 4);
    const market = sellPriceAt(state.seed, dest, goodId, RULES.market.stockNormal) * qty;
    const bonus = source === 'gremio' ? 1.6 : rng.range(1.3, 1.45);
    const deadline = Math.min(RULES.seasonDays, state.day + Math.ceil(days[dest.id] * 1.5) + rng.int(3, 6));
    taken.add(`${goodId}>${dest.id}`);
    return { id: `k${state.contracts.nextId++}`, goodId, qty, from: city.id, to: dest.id, deadline: Math.max(deadline, state.day + days[dest.id] + 2), reward: Math.round((market * bonus + 15) * (1 + upgradeValue(state, 'contactos'))), source };
  }
  return null;
}

/**
 * Renueva las ofertas de una ciudad si no tiene o si son viejas.
 * Se llama al llegar a una ciudad y al empezar la temporada.
 * @param {object} game
 * @param {string} cityId
 */
export function refreshOffers(game, cityId) {
  const { state, map } = game;
  const current = state.contracts.offers[cityId];
  if (current && state.day - current.day < OFFER_TTL) return;
  const city = map.cityById[cityId];
  const days = travelDays(map, cityId);
  const taken = new Set();
  const list = [];
  withRng(state, (rng) => {
    for (const source of canPayHere(city) ? ['taberna', 'taberna', 'gremio'] : ['taberna', 'taberna']) {
      const offer = makeOffer(game, city, days, rng, source, taken);
      if (offer) list.push(offer);
    }
  });
  state.contracts.offers[cityId] = { day: state.day, list };
}

/**
 * Acepta una oferta de la ciudad actual.
 * @param {object} game
 * @param {string} id
 */
export function acceptContract(game, id) {
  const { state, map } = game;
  if (state.over || state.trip) return { ok: false, error: 'Ahora no se puede.' };
  const offers = offersHere(game);
  const offer = offers.find((k) => k.id === id);
  if (!offer) return { ok: false, error: 'Ese contrato ya no está.' };
  if (state.contracts.active.length >= MAX_ACTIVE) return { ok: false, error: `Podés tener hasta ${MAX_ACTIVE} contratos.` };
  offers.splice(offers.indexOf(offer), 1);
  state.contracts.active.push(offer);
  state.known[offer.to] = true;
  addLog(state, `Aceptaste llevar ${offer.qty} de ${getGood(offer.goodId).name} a ${map.cityById[offer.to].name} antes del día ${offer.deadline} por ${fmt(offer.reward)}.`, 'info');
  return { ok: true };
}

/**
 * Entrega un contrato en su ciudad de destino.
 * @param {object} game
 * @param {string} id
 */
export function deliverContract(game, id) {
  const { state, map } = game;
  const k = state.contracts.active.find((c) => c.id === id);
  if (!k || state.over || state.trip) return { ok: false, error: 'No se puede entregar.' };
  if (state.location !== k.to) return { ok: false, error: `Se entrega en ${map.cityById[k.to].name}.` };
  if (state.cargo[k.goodId] < k.qty) return { ok: false, error: `Necesitás ${k.qty} de ${getGood(k.goodId).name}.` };
  state.cargo[k.goodId] -= k.qty;
  const profit = Math.round(k.reward - state.costBasis[k.goodId] * k.qty);
  if (state.cargo[k.goodId] === 0) state.costBasis[k.goodId] = 0;
  state.gold += k.reward;
  state.stats.earned += profit;
  state.stats.contractsDone += 1;
  state.contracts.active.splice(state.contracts.active.indexOf(k), 1);
  changeRep(state, map.cityById[k.to].zone, DONE_REP);
  state.undo = [];
  addLog(state, `¡Contrato cumplido! Entregaste ${k.qty} de ${getGood(k.goodId).name} y cobraste ${fmt(k.reward)}.`, 'good');
  return { ok: true, total: k.reward, profit };
}

/**
 * Paso diario: los contratos vencidos se pierden y bajan la reputación.
 * @param {object} game
 */
export function tickContracts(game) {
  const { state, map } = game;
  for (const k of state.contracts.active.slice()) {
    if (state.day <= k.deadline) continue;
    state.contracts.active.splice(state.contracts.active.indexOf(k), 1);
    changeRep(state, map.cityById[k.to].zone, -FAIL_REP);
    addLog(state, `Se venció el contrato de ${getGood(k.goodId).name} para ${map.cityById[k.to].name}: el Gremio no olvida.`, 'bad');
  }
}
