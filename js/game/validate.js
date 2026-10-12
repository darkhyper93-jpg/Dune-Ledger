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
import { MODES, FREE_DAYS, lastDay } from './modes.js';
import { migrate } from './migrate.js';
import { LOG_LIMIT } from './knowledge.js';
import { UNDO_LIMIT } from './actions.js';
import { cargoUsed, capacity } from './caravan.js';
import { ZONES, REP_LIMIT } from './reputation.js';
import { NEWS_BY_ID } from '../data/news.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { CITY_TYPES_BY_ID } from '../data/cities.js';
import { ROLES, TRAITS } from '../data/crew.js';
import { MAX_CREW } from './crew.js';
import { MERCHANTS_BY_ID } from '../data/merchants.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { cleanUpgrades } from './perks.js';
import { startingResources } from './start.js';
import { debtPlan } from './debt.js';
import { initialStats } from './stats.js';
import { CODEX } from './profile.js';
import { ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { SaveError, need, isObj, int, num, str, record, chroniclePart, rivalPart, gearPart, historyPart, betPart, investPart } from './validate-parts.js';

const LOG_KINDS = ['info', 'trade', 'travel', 'debt', 'bad', 'good'];
const END_REASONS = ['fin', 'retiro', 'deuda'];
// Los demás topes de días usan FREE_DAYS (el modo libre no tiene límite);
// el día actual se controla contra el último día del modo.

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
    bestSale = { goodId: b.goodId, qty: int(b.qty, 0, 1e6, 'mejor venta'), profit: num(b.profit, -1e7, 1e7, 'mejor venta'), cityId: b.cityId, day: int(b.day, 1, FREE_DAYS, 'mejor venta') };
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
    sold: record(v.sold, isGoodId, (x, w) => int(x, 0, 1e6, w), 'vendido'),
    // Contadores nuevos que una partida vieja no tiene arrancan en 0.
    ...Object.fromEntries(COUNTERS.map((k) => [k, int(v[k] ?? 0, 0, 1e6, k)])),
  };
}

/** Contadores enteros de las estadísticas (ver js/game/stats.js). */
const COUNTERS = Object.keys(initialStats()).filter((k) => typeof initialStats()[k] === 'number' && !['trips', 'earned', 'spent'].includes(k));

/** Valida lo visto en la temporada (códice). */
function seenPart(v) {
  need(isObj(v), 'visto');
  return Object.fromEntries(Object.entries(CODEX).map(([section, valid]) => [section,
    record(v[section], (k) => Object.hasOwn(valid, k), (x, w) => { need(x === true, w); return true; }, `visto ${section}`)]));
}

/** Salud de los camellos: un número de 1 a 100 por camello. */
function camelHpPart(v, camels) {
  need(Array.isArray(v) && v.length === camels, 'salud de los camellos');
  return v.map((hp) => int(hp, 1, 100, 'salud de un camello'));
}

/** Valida lo que cambia una acción de mercado (también lo usa el deshacer). */
function marketPart(v, map, cityId) {
  return {
    gold: int(v.gold, 0, 1e8, 'oro'),
    food: int(v.food, 0, RULES.provisionCap + 100, 'comida'),
    water: int(v.water, 0, RULES.provisionCap + 100, 'agua'),
    camels: int(v.camels, 1, RULES.maxCamels, 'camellos'),
    camelHp: camelHpPart(v.camelHp, v.camels),
    cargo: goodsRecord(v.cargo, 0, 1e5, 'carga', true),
    freshness: record(v.freshness, (k) => k === 'datiles', (x, w) => num(x, 0, 1, w), 'frescura'),
    costBasis: goodsRecord(v.costBasis, 0, 1e5, 'costo'),
    stats: stats(v.stats, map),
    stockRow: cityId === undefined ? undefined : goodsRecord(v.stock, 0, 100, 'stock'),
  };
}

/**
 * Valida y limpia una partida. Devuelve el juego listo ({ map, state }).
 * @param {unknown} input objeto leído del almacenamiento
 * @returns {{ok:true, game:{map:object,state:object}} | {ok:false, error:string}}
 */
export function validateState(input) {
  try {
    need(isObj(input), 'no es un objeto');
    const raw = migrate(input);
    need(raw.v === STATE_VERSION, 'versión');
    need(MODES.includes(raw.mode), 'modo');
    need(raw.mode === 'diario' ? typeof raw.daily === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily) : raw.daily === null, 'fecha del desafío');
    const seed = str(raw.seed, 64, 'semilla');
    need(seed.length > 0, 'semilla vacía');
    need(typeof raw.difficulty === 'string' && Object.hasOwn(DIFFICULTIES, raw.difficulty), 'dificultad');
    need(typeof raw.region === 'string' && Object.hasOwn(REGIONS_BY_ID, raw.region), 'región');
    const map = generateMap(seed, raw.region);
    const cityOk = (k) => Object.hasOwn(map.cityById, k);
    const routeOk = (k) => Object.hasOwn(map.routeById, k);
    need(cityOk(raw.location), 'ubicación');
    need(raw.lastFrom === null || cityOk(raw.lastFrom), 'ciudad anterior');
    need(Array.isArray(raw.rng) && raw.rng.length === 4, 'azar');
    need(typeof raw.merchant === 'string' && Object.hasOwn(MERCHANTS_BY_ID, raw.merchant), 'mercader');
    need(isObj(raw.upgrades), 'mejoras');
    const perks = { merchant: raw.merchant, region: raw.region, upgrades: cleanUpgrades(raw.upgrades) };
    need(Object.keys(perks.upgrades).length === Object.keys(raw.upgrades).length, 'mejoras');

    const base = marketPart(raw, map);
    const state = {
      v: STATE_VERSION,
      seed,
      mode: raw.mode,
      daily: raw.daily,
      region: raw.region,
      difficulty: raw.difficulty,
      day: int(raw.day, 1, lastDay(raw), 'día'),
      rng: raw.rng.map((n) => int(n, 0, 4294967295, 'azar')),
      location: raw.location,
      lastFrom: raw.lastFrom,
      gold: base.gold,
      food: base.food,
      water: base.water,
      camels: base.camels,
      camelHp: base.camelHp,
      cargo: base.cargo,
      freshness: base.freshness,
      costBasis: base.costBasis,
      stock: record(raw.stock, cityOk, (row, w) => goodsRecord(row, 0, 100, w), 'stock'),
      known: record(raw.known, cityOk, (x, w) => { need(x === true, w); return true; }, 'conocidas'),
      knownRoutes: record(raw.knownRoutes, routeOk, (x, w) => { need(x === true, w); return true; }, 'rutas'),
      visited: record(raw.visited, cityOk, (x, w) => { need(x === true, w); return true; }, 'visitadas'),
      prices: record(raw.prices, cityOk, (p, w) => {
        need(isObj(p), w);
        return { day: int(p.day, 1, FREE_DAYS, w), sell: goodsRecord(p.sell, 0, 1e5, w), buy: goodsRecord(p.buy, 0, 1e5, w) };
      }, 'precios'),
      merchant: perks.merchant,
      upgrades: perks.upgrades,
      debt: debtPart(raw.debt, raw.difficulty, perks, raw.mode),
      loan: int(raw.loan, 0, 1e6, 'préstamo'),
      deposit: int(raw.deposit, 0, 1e8, 'depósito'),
      rep: repPart(raw.rep),
      news: newsPart(raw.news),
      trip: tripPart(raw.trip, map, raw.location),
      contracts: contractsPart(raw.contracts, map),
      crew: crewList(raw.crew, MAX_CREW, 'tripulación'),
      hire: hirePart(raw.hire, map),
      log: logPart(raw.log),
      undo: undoPart(raw.undo, map, raw.location),
      stats: base.stats,
      seen: seenPart(raw.seen),
      rival: rivalPart(raw.rival, cityOk),
      chronicle: chroniclePart(raw.chronicle),
      gear: gearPart(raw.gear),
      history: historyPart(raw.history),
      bet: betPart(raw.bet, cityOk),
      invest: investPart(raw.invest, cityOk),
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

/** Valida la deuda contra las cuotas de la dificultad (sin cuotas en el modo libre). */
function debtPart(v, difficulty, perks, mode) {
  need(isObj(v) && Array.isArray(v.installments), 'deuda');
  const s = startingResources(perks);
  const plan = mode === 'libre' ? [] : debtPlan(difficulty, { mult: s.debtMult, delays: s.delays });
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
    next: int(v.next, 1, FREE_DAYS + 20, 'próxima noticia'),
    items: v.items.map((n) => {
      need(isObj(n) && typeof n.tpl === 'string' && Object.hasOwn(NEWS_BY_ID, n.tpl), 'noticia');
      need(Array.isArray(n.goods) && n.goods.length > 0 && n.goods.every((g) => ACTIVE_GOODS.includes(g)), 'bienes de la noticia');
      need(n.mult === 2 || n.mult === 0.5, 'efecto de la noticia');
      need((n.zone === null && Object.hasOwn(CITY_TYPES_BY_ID, n.cityType ?? '')) || (n.cityType === null && zoneIds.includes(n.zone)), 'alcance de la noticia');
      need(typeof n.real === 'boolean', 'noticia');
      const rumorDay = int(n.rumorDay, 1, FREE_DAYS, 'noticia');
      const startDay = int(n.startDay, rumorDay, FREE_DAYS + 10, 'noticia');
      return { tpl: n.tpl, goods: n.goods.slice(), mult: n.mult, cityType: n.cityType, zone: n.zone, rumorDay, startDay, endDay: int(n.endDay, startDay, FREE_DAYS + 30, 'noticia'), real: n.real };
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
  return { id: k.id, goodId: k.goodId, qty: int(k.qty, 1, 999, 'contrato'), from: k.from, to: k.to, deadline: int(k.deadline, 1, FREE_DAYS, 'contrato'), reward: int(k.reward, 0, 1e6, 'contrato'), source: k.source };
}

/** Valida ofertas y contratos activos. */
function contractsPart(v, map) {
  need(isObj(v) && Array.isArray(v.active) && v.active.length <= 3, 'contratos');
  return {
    offers: record(v.offers, (k) => Object.hasOwn(map.cityById, k), (o, w) => {
      need(isObj(o) && Array.isArray(o.list) && o.list.length <= 3, w);
      return { day: int(o.day, 1, FREE_DAYS, w), list: o.list.map((k) => contract(k, map)) };
    }, 'ofertas'),
    active: v.active.map((k) => contract(k, map)),
    nextId: int(v.nextId, 1, 1e6, 'contratos'),
  };
}

/** Valida una lista de tripulantes (o candidatos). */
function crewList(v, max, what) {
  need(Array.isArray(v) && v.length <= max, what);
  return v.map((m) => {
    need(isObj(m) && typeof m.id === 'string' && /^t\d{1,6}$/.test(m.id), what);
    need(Object.hasOwn(ROLES, m.role) && Object.hasOwn(TRAITS, m.trait), what);
    return { id: m.id, name: str(m.name, 30, what), role: m.role, trait: m.trait, xp: int(m.xp, 0, 999, what), morale: int(m.morale, 0, 100, what), wage: int(m.wage, 1, 1000, what) };
  });
}

/** Valida los candidatos de cada taberna. */
function hirePart(v, map) {
  need(isObj(v), 'contrataciones');
  return {
    offers: record(v.offers, (k) => Object.hasOwn(map.cityById, k), (o, w) => {
      need(isObj(o), w);
      return { day: int(o.day, 1, FREE_DAYS, w), list: crewList(o.list, 3, w) };
    }, 'contrataciones'),
    nextId: int(v.nextId, 1, 1e6, 'contrataciones'),
  };
}

/** Valida el diario. */
function logPart(v) {
  need(Array.isArray(v) && v.length <= LOG_LIMIT, 'diario');
  return v.map((e) => {
    need(isObj(e) && LOG_KINDS.includes(e.kind), 'entrada del diario');
    return { day: int(e.day, 1, FREE_DAYS, 'diario'), text: str(e.text, 300, 'diario'), kind: e.kind };
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
      gold: p.gold, food: p.food, water: p.water, camels: p.camels, camelHp: p.camelHp,
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
    day: int(v.day, 1, FREE_DAYS, 'final'),
    gold: int(v.gold, 0, 1e8, 'final'),
    owed: int(v.owed, 0, 1e8, 'final'),
    recorded: v.recorded === true,
    newAchievements: Array.isArray(v.newAchievements) ? v.newAchievements.filter((id) => typeof id === 'string' && Object.hasOwn(ACHIEVEMENTS_BY_ID, id)) : [],
    official: typeof v.official === 'boolean' ? v.official : null,
    rivalGold: v.rivalGold === null || v.rivalGold === undefined ? null : int(v.rivalGold, 0, 1e8, 'rival'),
    unlocked: Array.isArray(v.unlocked) ? v.unlocked.filter((id) => id === 'pesadilla' || (typeof id === 'string' && Object.hasOwn(REGIONS_BY_ID, id))) : [],
  };
}
