/**
 * Motor de eventos de viaje: cuándo sale un evento, qué opciones se pueden
 * elegir (con su probabilidad visible) y qué pasa al elegir una.
 * Las cartas en sí están en js/data/events.js.
 */

import { EVENTS, EVENTS_BY_ID } from '../data/events.js';
import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { cargoFree } from './caravan.js';
import { changeRep } from './reputation.js';
import { addLog, snapshotPrices } from './knowledge.js';
import { fmt } from '../core/text.js';

/** Probabilidad base de evento por día de viaje (≈ uno cada 3 o 4 días). */
export const EVENT_RATE = 0.28;
/** Cómo cambia esa probabilidad según el peligro de la ruta. */
export const DANGER_RATE = { bajo: 0.7, medio: 1, alto: 1.35 };
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
  /** Pelear: mejor con armas en la carga (los guardias llegan en la etapa 3). */
  fight: (game) => clamp(0.45 + Math.min(0.3, game.state.cargo.armas * 0.08), 0.05, 0.95),
  /** Huir: más difícil en rutas de peligro alto. */
  flee: (game) => (tripInfo(game).route.danger === 'alto' ? 0.45 : 0.6),
  /** Cavar en un oasis seco. */
  dig: () => 0.55,
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
 * Decide si hoy pasa algo en el camino y qué.
 * @param {object} game
 * @param {{danger:string, terrain:string}} route
 * @param {import('../core/rng.js').Rng} rng
 * @returns {{id:string, params:object}|null}
 */
export function rollEvent(game, route, rng) {
  if (!rng.chance((game.options?.eventRate ?? EVENT_RATE) * DANGER_RATE[route.danger])) return null;
  const weights = {};
  for (const e of EVENTS) {
    if (e.weight <= 0) continue;
    if (e.when?.danger && !e.when.danger.includes(route.danger)) continue;
    if (e.when?.terrain && !e.when.terrain.includes(route.terrain)) continue;
    let w = e.weight;
    if (e.id === 'bandidos') {
      if (route.danger === 'alto') w *= 2;
      w *= 1 + Math.min(2, game.state.cargo.perlas / 5); // las perlas atraen bandidos
    }
    weights[e.id] = w;
  }
  let id = rng.weighted(weights);
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
  if (opt.space && getGood(p.good).weight * p.qty > cargoFree(state)) reason = 'No te entra en la carga.';
  if (opt.spareDays && state.day + (state.trip.days - state.trip.done) + opt.spareDays > RULES.seasonDays) reason = 'No te da el tiempo.';
  let chance = null;
  if (opt.chance !== undefined) chance = typeof opt.chance === 'number' ? opt.chance : CHANCES[opt.chance](game);
  return { available: reason === null, reason, chance, label };
}

/**
 * Aplica los efectos de una opción y devuelve las líneas de lo que cambió.
 */
function applyEffects(game, eff, params, rng) {
  const { state, map } = game;
  const lines = [];
  const cap = RULES.provisionCap;
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
  if (eff.cargoPct) lines.push(...loseCargo(state, null, eff.cargoPct));
  if (eff.breakFragile) lines.push(...loseCargo(state, 'ceramica', eff.breakFragile));
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
    if (state.cargo.armas > 0) {
      const fine = Math.min(state.gold, params.fine ?? 30);
      lines.push(`Te confiscaron ${state.cargo.armas} de Armas y te multaron con ${fmt(fine)}`);
      state.cargo.armas = 0;
      state.costBasis.armas = 0;
      state.gold -= fine;
    } else {
      lines.push('Revisaron todo: estaba en orden');
    }
  }
  if (eff.delay) {
    state.trip.days += eff.delay;
    lines.push(`+${eff.delay} día de viaje`);
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
  const text = (success === false ? opt.loseText : opt.winText) ?? (lines.length ? 'Listo.' : 'Seguís tu camino.');
  addLog(game.state, `${fillText(def.text, ev.params).split('.')[0]}: ${st.label}. ${text}${lines.length ? ` (${lines.join(', ')})` : ''}`, success === false ? 'bad' : 'info');
  return { ok: true, success, text, lines };
}
