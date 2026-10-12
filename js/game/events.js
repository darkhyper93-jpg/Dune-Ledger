/**
 * Motor de eventos de viaje: cuándo sale un evento, qué opciones se pueden
 * elegir (con su probabilidad visible) y qué pasa al elegir una.
 * Las cartas en sí están en js/data/events.js.
 */

import { EVENTS, EVENTS_BY_ID } from '../data/events.js';
import { getDifficulty } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { cargoFree, provisionCap } from './caravan.js';
import { hasPerk, upgradeValue, regionOf, regionId } from './perks.js';
import { tireCamels, healCamels } from './camels.js';
import { hasGear } from './gear.js';
import { worthNow } from './history.js';
import { climateOf } from './climate.js';
import { rivalWorth } from './rival.js';
import { fightBonus, stormBonus, scoutLevel, changeMorale } from './crew.js';
import { changeRep } from './reputation.js';
import { addLog, snapshotPrices } from './knowledge.js';
import { fmt, plural } from '../core/text.js';
import { lastDay } from './modes.js';
import { nightBanditMult } from './moon.js';

/** Probabilidad base de evento por día de viaje (≈ uno cada 3 o 4 días). */
export const EVENT_RATE = 0.33;
/** Cómo cambia esa probabilidad según el peligro de la ruta. */
export const DANGER_RATE = { bajo: 0.4, medio: 1.2, alto: 1.8 };
/** Reputación desde la que los bandidos de la zona a veces te dejan pasar. */
export const FRIENDLY_REP = 40;

/** Ruta y zona de destino del viaje en curso. */
function tripInfo(game) {
  const trip = game.state.trip;
  return { route: game.map.routeById[trip.routeId], zone: game.map.cityById[trip.to].zone };
}

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/**
 * Funciones de probabilidad que usan las opciones con `chance: 'nombre'`.
 * Reciben el juego (con un viaje en curso) y devuelven un número de 0 a 1.
 */
export const CHANCES = {
  /** Pelear: mejor con armas en la carga y con guardias (y valientes). */
  fight: (game) => clamp(0.45 + Math.min(0.3, game.state.cargo.armas * 0.08) + fightBonus(game.state) + (hasPerk(game.state, 'capitana') ? 0.2 : 0), 0.05, 0.95),
  /** Huir: más difícil en rutas de peligro alto. */
  flee: (game) => (tripInfo(game).route.danger === 'alto' ? 0.45 : 0.6) + (hasGear(game.state, 'brujula') ? 0.12 : 0),
  /** Cavar en un oasis seco. */
  dig: () => 0.55,
  /** Seguir en una tormenta de arena. */
  storm: (game) => clamp(0.6 + stormBonus(game.state) + (hasGear(game.state, 'lampara') ? 0.12 : 0), 0, 0.95),
  /** Mandar al explorador a las ruinas. */
  scout: (game) => (scoutLevel(game.state) >= 3 ? 0.95 : 0.85),
  /** Sobornar: depende de tu reputación en la zona. */
  bribe: (game) => clamp(0.7 + game.state.rep[tripInfo(game).zone] / 400, 0.3, 0.95),
};

/** Reemplaza "$clave" por valores de setup ("-$clave" da el negativo). */
function val(v, params) {
  if (typeof v !== 'string') return v;
  if (v.startsWith('-$')) return -params[v.slice(2)];
  if (v.startsWith('$')) return params[v.slice(1)];
  return v;
}

/**
 * Completa un texto con los valores del evento.
 * @param {string} text
 * @param {object} params
 */
export function fillText(text, params) {
  return text.replace(/\$(\w+)/g, (_, k) => (typeof params[k] === 'number' ? fmt(params[k]) : String(params[k] ?? '')));
}

/**
 * Definición de un evento por id.
 * @param {string} id
 */
export function eventDef(id) {
  if (!Object.hasOwn(EVENTS_BY_ID, id)) throw new Error(`Evento desconocido: ${id}`);
  return EVENTS_BY_ID[id];
}

/**
 * Crea una instancia de evento (con sus valores calculados).
 * @param {object} game
 * @param {string} id
 * @param {import('../core/rng.js').Rng} rng
 * @returns {{id:string, params:object}}
 */
export function createEvent(game, id, rng) {
  const def = eventDef(id);
  return { id, params: def.setup ? def.setup(game, rng) : {} };
}

/**
 * Dice si un evento puede salir en una ruta: peligro, terreno y región.
 * @param {object} game
 * @param {{danger:string, terrain:string}} route
 * @param {object} def evento de js/data/events.js
 */
export function eventAllowed(game, route, def) {
  const w = def.when ?? {};
  if (w.danger && !w.danger.includes(route.danger)) return false;
  if (w.terrain && !w.terrain.includes(route.terrain)) return false;
  if (w.region && !w.region.includes(regionId(game.state))) return false;
  if (w.notTerrain && w.notTerrain.includes(route.terrain)) return false;
  if (w.rivalBehind && !rivalBehind(game.state)) return false;
  return true;
}

/**
 * Chance de que pase algo en un día de viaje por esta ruta.
 * @param {object} game
 * @param {{danger:string}} route
 */
export function eventChance(game, route) {
  const diff = getDifficulty(game.state.difficulty);
  return (game.options?.eventRate ?? EVENT_RATE) * DANGER_RATE[route.danger] * (diff.eventRate ?? 1);
}

/**
 * Peso de cada evento posible en esta ruta: el de la carta, el de la
 * región y la dificultad (más bandidos y piratas en Difícil).
 * @param {object} game
 * @param {{danger:string, terrain:string}} route
 * @returns {Record<string, number>}
 */
export function eventWeights(game, route) {
  const weights = {};
  const regional = regionOf(game.state).eventWeights ?? {};
  const bandits = getDifficulty(game.state.difficulty).bandits ?? 1;
  for (const e of EVENTS) {
    if (e.weight <= 0 || !eventAllowed(game, route, e)) continue;
    let w = e.weight * (regional[e.id] ?? 1) * (climateOf(game.state).events?.[e.id] ?? 1);
    if (e.id === 'bandidos') {
      if (route.danger === 'alto') w *= 3;
      w *= 1 + Math.min(2, game.state.cargo.perlas / 5); // las perlas atraen bandidos
    }
    if (e.id === 'bandidos' || e.id === 'piratas') w *= bandits;
    // De noche y sin luna los bandidos no te ven.
    if (e.id === 'bandidos' && game.state.trip?.night) w *= nightBanditMult(game.state);
    weights[e.id] = w;
  }
  return weights;
}

/**
 * Kasim va muy atrás (le sacás la mitad más y 400 de oro): manda matones.
 * @param {object} state
 */
export function rivalBehind(state) {
  const theirs = rivalWorth(state);
  if (theirs === null) return false;
  const mine = worthNow(state);
  return mine > theirs * 1.5 && mine > theirs + 400;
}

/**
 * Decide si hoy pasa algo en el camino y qué.
 * @param {object} game
 * @param {{danger:string, terrain:string}} route
 * @param {import('../core/rng.js').Rng} rng
 * @returns {{id:string, params:object}|null}
 */
export function rollEvent(game, route, rng) {
  if (!rng.chance(eventChance(game, route))) return null;
  let id = rng.weighted(eventWeights(game, route));
  if (id === 'bandidos' && game.state.rep[tripInfo(game).zone] >= FRIENDLY_REP && rng.chance(0.4)) id = 'bandidos-amigos';
  return createEvent(game, id, rng);
}

/**
 * Estado de una opción del evento en curso: si se puede elegir, por qué
 * no, y su probabilidad de salir bien (null si no depende de la suerte).
 * @param {object} game
 * @param {number} idx
 * @returns {{available:boolean, reason:string|null, chance:number|null, label:string}}
 */
export function optionState(game, idx) {
  const { state } = game;
  const ev = state.trip?.event;
  const opt = ev ? eventDef(ev.id).options[idx] : null;
  if (!opt) return { available: false, reason: 'No hay evento.', chance: null, label: '' };
  const p = ev.params;
  const label = fillText(opt.label, p);
  let reason = null;
  if (opt.cost?.gold !== undefined && state.gold < val(opt.cost.gold, p)) reason = 'No te alcanza el oro.';
  if (opt.needs && (state.food < (opt.needs.food ?? 0) || state.water < (opt.needs.water ?? 0))) reason = 'No te alcanzan las provisiones.';
  if (opt.requires && (p[opt.requires] === null || p[opt.requires] === undefined)) reason = 'No tenés qué ofrecer.';
  if (opt.role && !state.crew.some((m) => m.role === opt.role)) reason = 'No tenés a nadie para eso.';
  if (opt.space && getGood(p.good).weight * p.qty > cargoFree(state)) reason = 'No te entra en la carga.';
  if (opt.spareDays && state.day + (state.trip.days - state.trip.done) + opt.spareDays > lastDay(state)) reason = 'No te da el tiempo.';
  let chance = null;
  if (opt.chance !== undefined) chance = typeof opt.chance === 'number' ? opt.chance : CHANCES[opt.chance](game);
  if (chance !== null && hasGear(state, 'amuleto')) chance = Math.min(0.95, chance + 0.04);
  return { available: reason === null, reason, chance, label };
}

/**
 * Aplica los efectos de una opción y devuelve las líneas de lo que cambió.
 */
function applyEffects(game, eff, params, rng) {
  const { state, map } = game;
  const lines = [];
  const cap = provisionCap(state);
  if (eff.gold) {
    const g = val(eff.gold, params);
    const before = state.gold;
    state.gold = Math.max(0, state.gold + g);
    if (state.gold !== before) lines.push(`${g > 0 ? '+' : '−'}${fmt(Math.abs(state.gold - before))} de oro`);
  }
  for (const k of ['food', 'water']) {
    if (!eff[k]) continue;
    state[k] = clamp(state[k] + eff[k], 0, cap);
    lines.push(`${eff[k] > 0 ? '+' : '−'}${Math.abs(eff[k])} de ${k === 'food' ? 'comida' : 'agua'}`);
  }
  if (eff.loot) {
    const n = rng.int(eff.loot[0], eff.loot[1]);
    state.gold += n;
    lines.push(`+${fmt(n)} de oro`);
  }
  const insured = (1 - upgradeValue(state, 'seguro')) * (hasGear(state, 'cofre') ? 0.6 : 1);
  if (eff.cargoPct) lines.push(...loseCargo(state, null, eff.cargoPct * insured));
  if (eff.breakFragile) lines.push(...loseCargo(state, 'ceramica', eff.breakFragile * insured));
  if (eff.give) {
    const good = val(eff.give.good, params);
    const w = getGood(good).weight;
    const qty = Math.min(val(eff.give.qty, params), w > 0 ? Math.floor(cargoFree(state) / w) : 999);
    if (qty > 0) {
      const had = state.cargo[good];
      const unit = params.price ? params.price / params.qty : 0;
      state.costBasis[good] = (state.costBasis[good] * had + unit * qty) / (had + qty);
      state.cargo[good] = had + qty;
      lines.push(`+${qty} de ${getGood(good).name}`);
    }
  }
  if (eff.takeAll) {
    const good = val(eff.takeAll, params);
    if (state.cargo[good] > 0) lines.push(`−${state.cargo[good]} de ${getGood(good).name}`);
    state.cargo[good] = 0;
    state.costBasis[good] = 0;
  }
  if (eff.inspect) {
    if (state.cargo.armas > 0 && hasPerk(state, 'contrabandista') && rng.chance(0.5)) {
      lines.push('Revisaron, pero no encontraron tus armas');
      state.stats.smuggled += 1;
    } else if (state.cargo.armas > 0) {
      const fine = Math.min(state.gold, params.fine ?? 30);
      lines.push(`Te confiscaron ${state.cargo.armas} de Armas y te multaron con ${fmt(fine)}`);
      state.cargo.armas = 0;
      state.costBasis.armas = 0;
      state.gold -= fine;
    } else {
      lines.push('Revisaron todo: estaba en orden');
    }
  }
  if (eff.camelHp) {
    lines.push(`Los ${regionOf(state).mount.many} pierden ${Math.abs(eff.camelHp)} de salud`);
    lines.push(...tireCamels(state, -eff.camelHp));
  }
  if (eff.heal) {
    healCamels(state, eff.heal);
    lines.push(`Los ${regionOf(state).mount.many} recuperan ${eff.heal} de salud`);
  }
  if (eff.morale && state.crew.length) {
    changeMorale(state, eff.morale);
    lines.push(`${eff.morale > 0 ? '+' : '−'}${Math.abs(eff.morale)} de moral`);
  }
  if (eff.delay) {
    state.trip.days += eff.delay;
    lines.push(`+${plural(eff.delay, 'día', 'días')} de viaje`);
  }
  if (eff.rep) {
    changeRep(state, map.cityById[state.trip.to].zone, eff.rep);
    lines.push(`${eff.rep > 0 ? '+' : '−'}${Math.abs(eff.rep)} de reputación`);
  }
  if (eff.reveal) {
    const unseen = map.cities.filter((c) => !state.visited[c.id] && !state.prices[c.id]);
    if (unseen.length) {
      const c = rng.pick(unseen);
      state.known[c.id] = true;
      snapshotPrices(game, c.id);
      lines.push(`Ahora sabés los precios de ${c.name}`);
    }
  }
  return lines;
}

/**
 * Pierde una parte de un bien (o de toda la carga si goodId es null).
 */
function loseCargo(state, goodId, part) {
  const lines = [];
  for (const [id, qty] of Object.entries(state.cargo)) {
    if ((goodId && id !== goodId) || qty <= 0) continue;
    const n = Math.min(qty, Math.ceil(qty * part));
    state.cargo[id] = qty - n;
    lines.push(`−${n} de ${getGood(id).name}`);
  }
  return lines;
}

/**
 * Anota lo que pasó en un evento para el códice y los logros.
 */
function noteEvent(state, id, idx, success) {
  state.seen.events[id] = true;
  const stat = eventDef(id).options[idx].stat;
  if (stat && success !== false) state.stats[stat] = (state.stats[stat] ?? 0) + 1;
  if (id === 'bandidos' && idx === 1 && success) state.stats.fightsWon += 1;
  if (id === 'ruinas' && success) state.stats.treasures += 1;
  if (id === 'tormenta' && idx === 1 && success) state.stats.stormsBeaten += 1;
  if (id === 'viajero' && idx === 0) state.stats.helped += 1;
  if (id === 'control' && idx === 1 && success && state.cargo.armas > 0) state.stats.smuggled += 1;
}

/**
 * Elige una opción del evento en curso y aplica lo que pase.
 * @param {object} game
 * @param {number} idx
 * @param {import('../core/rng.js').Rng} rng
 * @returns {{ok:boolean, error?:string, success?:boolean|null, text?:string, lines?:string[]}}
 */
export function resolveOption(game, idx, rng) {
  const st = optionState(game, idx);
  if (!st.available) return { ok: false, error: st.reason };
  const ev = game.state.trip.event;
  const def = eventDef(ev.id);
  const opt = def.options[idx];
  const success = st.chance === null ? null : rng.next() < st.chance;
  const eff = success === null ? opt.effects : success ? opt.win : opt.lose;
  const lines = applyEffects(game, eff, ev.params, rng);
  game.state.trip.event = null;
  noteEvent(game.state, ev.id, idx, success);
  const text = fillText((success === false ? opt.loseText : opt.winText) ?? (lines.length ? 'Listo.' : 'Seguís tu camino.'), ev.params);
  addLog(game.state, `${fillText(def.text, ev.params).split('.')[0]}: ${st.label}. ${text}${lines.length ? ` (${lines.join(', ')})` : ''}`, success === false ? 'bad' : 'info');
  return { ok: true, success, text, lines };
}
