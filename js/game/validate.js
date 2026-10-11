/**
 * Validación de una partida guardada.
 *
 * Nunca se confía en lo que viene del almacenamiento: se arma un objeto
 * nuevo copiando sólo los campos conocidos, comprobando tipos, rangos e
 * ids contra el mapa (que se regenera desde la semilla). Si algo no
 * cierra, se rechaza la partida entera.
 */

import { RULES, DIFFICULTIES } from '../data/rules.js';
import { ACTIVE_GOODS, isGoodId } from '../data/goods.js';
import { generateMap } from './map-gen.js';
import { STATE_VERSION } from './season.js';
import { LOG_LIMIT } from './knowledge.js';
import { UNDO_LIMIT } from './actions.js';
import { cargoUsed, capacity } from './caravan.js';
import { ZONES, REP_LIMIT } from './reputation.js';
import { NEWS_BY_ID } from '../data/news.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { CITY_TYPES_BY_ID } from '../data/cities.js';

const LOG_KINDS = ['info', 'trade', 'travel', 'debt', 'bad', 'good'];
const END_REASONS = ['fin', 'retiro', 'deuda'];

/** Error de validación con un mensaje que dice qué campo falló. */
class SaveError extends Error {}

/** Lanza un SaveError si la condición no se cumple. */
function need(cond, what) {
  if (!cond) throw new SaveError(`Partida inválida: ${what}`);
}

/** Objeto plano (no arreglo, no null). */
function isObj(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Entero dentro de un rango. */
function int(v, lo, hi, what) {
  need(Number.isInteger(v) && v >= lo && v <= hi, what);
  return v;
}

/** Número finito dentro de un rango. */
function num(v, lo, hi, what) {
  need(typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi, what);
  return v;
}

/** Texto con largo máximo. */
function str(v, max, what) {
  need(typeof v === 'string' && v.length <= max, what);
  return v;
}

/**
 * Recorre un objeto con claves que deben cumplir `keyOk`, validando cada valor.
 * Devuelve un objeto nuevo sin prototipo raro.
 */
function record(v, keyOk, valueFn, what) {
  need(isObj(v), what);
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    need(keyOk(k), `${what} (${k})`);
    out[k] = valueFn(val, `${what}.${k}`);
  }
  return out;
}

/** Mapa de bien → número, con todos los bienes activos presentes. */
function goodsRecord(v, lo, hi, what, intOnly = false) {
  const out = record(v, (k) => ACTIVE_GOODS.includes(k), (x, w) => (intOnly ? int(x, lo, hi, w) : num(x, lo, hi, w)), what);
  for (const id of ACTIVE_GOODS) need(Object.hasOwn(out, id), `${what} falta ${id}`);
  return out;
}

/** Valida las estadísticas de la temporada. */
function stats(v, map) {
  need(isObj(v), 'stats');
  let bestSale = null;
  if (v.bestSale !== null) {
    const b = v.bestSale;
    need(isObj(b) && isGoodId(b.goodId) && Object.hasOwn(map.cityById, b.cityId), 'mejor venta');
    bestSale = { goodId: b.goodId, qty: int(b.qty, 0, 1e6, 'mejor venta'), profit: num(b.profit, -1e7, 1e7, 'mejor venta'), cityId: b.cityId, day: int(b.day, 1, RULES.seasonDays, 'mejor venta') };
  }
  const routeKey = (k) => {
    const [a, b] = k.split('>');
    return Object.hasOwn(map.cityById, a ?? '') && Object.hasOwn(map.cityById, b ?? '');
  };
  return {
    trips: int(v.trips, 0, 1000, 'viajes'),
    bestSale,
    routeProfit: record(v.routeProfit, routeKey, (x, w) => num(x, -1e7, 1e7, w), 'ganancia por ruta'),
    earned: num(v.earned, -1e8, 1e8, 'ganado'),
    spent: num(v.spent, 0, 1e8, 'gastado'),
  };
}

/** Valida lo que cambia una acción de mercado (también lo usa el deshacer). */
function marketPart(v, map, cityId) {
  return {
    gold: int(v.gold, 0, 1e8, 'oro'),
    food: int(v.food, 0, RULES.provisionCap, 'comida'),
    water: int(v.water, 0, RULES.provisionCap, 'agua'),
    camels: int(v.camels, 1, RULES.maxCamels, 'camellos'),
    cargo: goodsRecord(v.cargo, 0, 1e5, 'carga', true),
    freshness: record(v.freshness, (k) => k === 'datiles', (x, w) => num(x, 0, 1, w), 'frescura'),
    costBasis: goodsRecord(v.costBasis, 0, 1e5, 'costo'),
    stats: stats(v.stats, map),
    stockRow: cityId === undefined ? undefined : goodsRecord(v.stock, 0, 100, 'stock'),
  };
}

/**
 * Valida y limpia una partida. Devuelve el juego listo ({ map, state }).
 * @param {unknown} raw objeto leído del almacenamiento
 * @returns {{ok:true, game:{map:object,state:object}} | {ok:false, error:string}}
 */
export function validateState(raw) {
  try {
    need(isObj(raw), 'no es un objeto');
    need(raw.v === STATE_VERSION, 'versión');
    const seed = str(raw.seed, 64, 'semilla');
    need(seed.length > 0, 'semilla vacía');
    need(typeof raw.difficulty === 'string' && Object.hasOwn(DIFFICULTIES, raw.difficulty), 'dificultad');
    const map = generateMap(seed);
    const cityOk = (k) => Object.hasOwn(map.cityById, k);
    const routeOk = (k) => Object.hasOwn(map.routeById, k);
    need(cityOk(raw.location), 'ubicación');
    need(raw.lastFrom === null || cityOk(raw.lastFrom), 'ciudad anterior');
    need(Array.isArray(raw.rng) && raw.rng.length === 4, 'azar');

    const base = marketPart(raw, map);
    const state = {
      v: STATE_VERSION,
      seed,
      difficulty: raw.difficulty,
      day: int(raw.day, 1, RULES.seasonDays, 'día'),
      rng: raw.rng.map((n) => int(n, 0, 4294967295, 'azar')),
      location: raw.location,
      lastFrom: raw.lastFrom,
      gold: base.gold,
      food: base.food,
      water: base.water,
      camels: base.camels,
      cargo: base.cargo,
      freshness: base.freshness,
      costBasis: base.costBasis,
      stock: record(raw.stock, cityOk, (row, w) => goodsRecord(row, 0, 100, w), 'stock'),
      known: record(raw.known, cityOk, (x, w) => { need(x === true, w); return true; }, 'conocidas'),
      knownRoutes: record(raw.knownRoutes, routeOk, (x, w) => { need(x === true, w); return true; }, 'rutas'),
      visited: record(raw.visited, cityOk, (x, w) => { need(x === true, w); return true; }, 'visitadas'),
      prices: record(raw.prices, cityOk, (p, w) => {
        need(isObj(p), w);
        return { day: int(p.day, 1, RULES.seasonDays, w), sell: goodsRecord(p.sell, 0, 1e5, w), buy: goodsRecord(p.buy, 0, 1e5, w) };
      }, 'precios'),
      debt: debtPart(raw.debt, raw.difficulty),
      rep: repPart(raw.rep),
      news: newsPart(raw.news),
      trip: tripPart(raw.trip, map, raw.location),
      contracts: contractsPart(raw.contracts, map),
      log: logPart(raw.log),
      undo: undoPart(raw.undo, map, raw.location),
      stats: base.stats,
      over: overPart(raw.over),
    };
    for (const c of map.cities) need(Object.hasOwn(state.stock, c.id), `stock falta ${c.id}`);
    need(state.visited[state.location] === true, 'la ciudad actual no figura visitada');
    need(cargoUsed(state) <= capacity(state), 'carga mayor que la capacidad');
    return { ok: true, game: { map, state } };
  } catch (e) {
    if (e instanceof SaveError) return { ok: false, error: e.message };
    return { ok: false, error: `Partida inválida: ${e.message}` };
  }
}

/** Valida la deuda contra las cuotas de la dificultad. */
function debtPart(v, difficulty) {
  need(isObj(v) && Array.isArray(v.installments), 'deuda');
  const plan = DIFFICULTIES[difficulty].installments;
  need(v.installments.length === plan.length, 'cuotas');
  return {
    installments: v.installments.map((inst, i) => {
      need(isObj(inst) && inst.day === plan[i].day, 'cuota');
      const amount = int(inst.amount, 0, 1e7, 'cuota');
      return { day: inst.day, amount, paid: int(inst.paid, 0, amount, 'cuota pagada') };
    }),
    strikes: int(v.strikes, 0, RULES.debt.maxStrikes, 'faltas'),
  };
}

/** Valida la reputación: una entrada entera por zona, entre −100 y 100. */
function repPart(v) {
  const ids = ZONES.map((z) => z.id);
  const out = record(v, (k) => ids.includes(k), (x, w) => int(x, -REP_LIMIT, REP_LIMIT, w), 'reputación');
  for (const id of ids) need(Object.hasOwn(out, id), `reputación falta ${id}`);
  return out;
}

/** Valida las noticias y rumores. */
function newsPart(v) {
  need(isObj(v) && Array.isArray(v.items) && v.items.length <= 20, 'noticias');
  const zoneIds = ZONES.map((z) => z.id);
  return {
    next: int(v.next, 1, RULES.seasonDays + 20, 'próxima noticia'),
    items: v.items.map((n) => {
      need(isObj(n) && typeof n.tpl === 'string' && Object.hasOwn(NEWS_BY_ID, n.tpl), 'noticia');
      need(Array.isArray(n.goods) && n.goods.length > 0 && n.goods.every((g) => ACTIVE_GOODS.includes(g)), 'bienes de la noticia');
      need(n.mult === 2 || n.mult === 0.5, 'efecto de la noticia');
      need((n.zone === null && Object.hasOwn(CITY_TYPES_BY_ID, n.cityType ?? '')) || (n.cityType === null && zoneIds.includes(n.zone)), 'alcance de la noticia');
      need(typeof n.real === 'boolean', 'noticia');
      const rumorDay = int(n.rumorDay, 1, RULES.seasonDays, 'noticia');
      const startDay = int(n.startDay, rumorDay, RULES.seasonDays + 10, 'noticia');
      return { tpl: n.tpl, goods: n.goods.slice(), mult: n.mult, cityType: n.cityType, zone: n.zone, rumorDay, startDay, endDay: int(n.endDay, startDay, RULES.seasonDays + 30, 'noticia'), real: n.real };
    }),
  };
}

/** Valida el viaje en curso (o null) y su evento pendiente. */
function tripPart(v, map, location) {
  if (v === null || v === undefined) return null;
  need(isObj(v) && typeof v.routeId === 'string' && Object.hasOwn(map.routeById, v.routeId), 'viaje');
  const r = map.routeById[v.routeId];
  need(v.from === location && (r.a === v.from || r.b === v.from) && v.to === (r.a === v.from ? r.b : r.a), 'extremos del viaje');
  const days = int(v.days, 1, 20, 'días del viaje');
  const trip = { routeId: v.routeId, from: v.from, to: v.to, done: int(v.done, 0, days, 'viaje'), days, rolled: int(v.rolled, 0, days, 'viaje'), event: null };
  if (v.event !== null) {
    need(isObj(v.event) && typeof v.event.id === 'string' && Object.hasOwn(EVENTS_BY_ID, v.event.id), 'evento');
    trip.event = { id: v.event.id, params: record(v.event.params, (k) => /^\w{1,20}$/.test(k), (x, w) => {
      need(x === null || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= 1e7) || (typeof x === 'string' && x.length <= 120), w);
      return x;
    }, 'evento') };
    need(Object.keys(trip.event.params).length <= 12, 'evento');
  }
  return trip;
}

/** Valida un contrato. */
function contract(k, map) {
  const cityOk = (id) => typeof id === 'string' && Object.hasOwn(map.cityById, id);
  need(isObj(k) && typeof k.id === 'string' && /^k\d{1,6}$/.test(k.id) && isGoodId(k.goodId) && cityOk(k.from) && cityOk(k.to) && k.from !== k.to, 'contrato');
  need(k.source === 'taberna' || k.source === 'gremio', 'contrato');
  return { id: k.id, goodId: k.goodId, qty: int(k.qty, 1, 999, 'contrato'), from: k.from, to: k.to, deadline: int(k.deadline, 1, RULES.seasonDays, 'contrato'), reward: int(k.reward, 0, 1e6, 'contrato'), source: k.source };
}

/** Valida ofertas y contratos activos. */
function contractsPart(v, map) {
  need(isObj(v) && Array.isArray(v.active) && v.active.length <= 3, 'contratos');
  return {
    offers: record(v.offers, (k) => Object.hasOwn(map.cityById, k), (o, w) => {
      need(isObj(o) && Array.isArray(o.list) && o.list.length <= 3, w);
      return { day: int(o.day, 1, RULES.seasonDays, w), list: o.list.map((k) => contract(k, map)) };
    }, 'ofertas'),
    active: v.active.map((k) => contract(k, map)),
    nextId: int(v.nextId, 1, 1e6, 'contratos'),
  };
}

/** Valida el diario. */
function logPart(v) {
  need(Array.isArray(v) && v.length <= LOG_LIMIT, 'diario');
  return v.map((e) => {
    need(isObj(e) && LOG_KINDS.includes(e.kind), 'entrada del diario');
    return { day: int(e.day, 1, RULES.seasonDays, 'diario'), text: str(e.text, 300, 'diario'), kind: e.kind };
  });
}

/** Valida las fotos para deshacer. */
function undoPart(v, map, cityId) {
  need(Array.isArray(v) && v.length <= UNDO_LIMIT, 'deshacer');
  return v.map((snap) => {
    need(isObj(snap), 'deshacer');
    const p = marketPart(snap, map, cityId);
    return {
      label: str(snap.label, 80, 'deshacer'),
      gold: p.gold, food: p.food, water: p.water, camels: p.camels,
      cargo: p.cargo, freshness: p.freshness, costBasis: p.costBasis,
      stock: p.stockRow, stats: p.stats,
      logLen: int(snap.logLen, 0, LOG_LIMIT, 'deshacer'),
    };
  });
}

/** Valida el resultado final, si la temporada terminó. */
function overPart(v) {
  if (v === null) return null;
  need(isObj(v) && END_REASONS.includes(v.reason) && typeof v.won === 'boolean', 'final');
  return {
    reason: v.reason,
    won: v.won,
    score: num(v.score, -1e8, 1e8, 'puntaje'),
    seals: int(v.seals, 0, 1e6, 'sellos'),
    day: int(v.day, 1, RULES.seasonDays, 'final'),
    gold: int(v.gold, 0, 1e8, 'final'),
    owed: int(v.owed, 0, 1e8, 'final'),
    recorded: v.recorded === true,
  };
}
