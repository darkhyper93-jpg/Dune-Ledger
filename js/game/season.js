/**
 * Una temporada de Dune Ledger: creación, paso del tiempo, cierre y puntaje.
 *
 * Una partida en curso es un objeto `game = { map, state }`. El mapa se
 * regenera siempre desde la semilla (no se guarda); `state` es todo lo que
 * cambia y es lo único que se guarda. Este módulo no toca el DOM, así que
 * una temporada entera se puede jugar en Node (pruebas y bots).
 */

import { getDifficulty } from '../data/rules.js';
import { getRegion } from '../data/regions.js';
import { ACTIVE_GOODS } from '../data/goods.js';
import { Rng } from '../core/rng.js';
import { generateMap } from './map-gen.js';
import { initialStock } from './market.js';
import { createDebt, totalOwed, nextInstallment } from './debt.js';
import { addLog, discoverAround, snapshotPrices } from './knowledge.js';
import { passDay, dailyRation } from './travel.js';
import { finishSeason } from './finish.js';
import { startTrip, advanceTrip, chooseOption } from './trip.js';
import { optionState } from './events.js';
import { initialRep } from './reputation.js';
import { initialNews } from './news.js';
import { initialContracts, refreshOffers } from './contracts.js';
import { initialHire, refreshHires } from './crew.js';
import { getMerchant, cleanUpgrades } from './perks.js';
import { startingResources, applyStartPerks } from './start.js';
import { initialStats, initialSeen, see, bump, notePeaks } from './stats.js';
import { lastDay, isFree, MODES } from './modes.js';
import { createRival } from './rival.js';
import { createChronicle } from './chronicle.js';
import { recordDay } from './history.js';
import { pickClimate } from './climate.js';

export { cargoValueHere, currentScore, sealsFor, finishSeason } from './finish.js';
export { startTrip, chooseOption } from './trip.js';
export { lastDay } from './modes.js';

/** Versión del formato de la partida guardada. */
export const STATE_VERSION = 5;

/**
 * Crea una temporada nueva.
 * `events` y `eventRate` son opciones del juego (no se guardan): sirven
 * para pruebas que necesitan viajes sin sorpresas o con muchos eventos.
 * `merchant` y `upgrades` son el mercader elegido y las mejoras del Gremio;
 * `region` decide el mapa, la montura, los bienes y los eventos. `mode` es
 * 'temporada', 'diario' (con `daily`, la fecha AAAA-MM-DD) o 'libre'.
 * @param {{seed:string, mode?:string, daily?:string|null, region?:string, difficulty?:string, merchant?:string, upgrades?:Record<string,number>, events?:boolean, eventRate?:number}} opts
 * @returns {{map:object,state:object,options:object}}
 */
export function createSeason({ seed, mode = 'temporada', daily = null, region = 'desierto', difficulty = 'normal', merchant = 'aprendiz', upgrades = {}, events = true, eventRate }) {
  getDifficulty(difficulty);
  getMerchant(merchant);
  getRegion(region);
  if (!MODES.includes(mode)) throw new Error(`Modo desconocido: ${mode}`);
  const perks = { merchant, region, upgrades: cleanUpgrades(upgrades) };
  const s = startingResources(perks);
  const map = generateMap(seed, region);
  const rng = new Rng(`season:${seed}`);
  const starts = map.cities.filter((c) => c.type !== 'capital');
  const start = rng.pick(starts);
  const news = initialNews(rng);
  const state = {
    v: STATE_VERSION,
    seed: String(seed),
    mode,
    daily: mode === 'diario' ? daily : null,
    region,
    difficulty,
    merchant,
    upgrades: perks.upgrades,
    day: 1,
    rng: rng.getState(),
    location: start.id,
    lastFrom: null,
    gold: s.gold,
    food: s.food,
    water: s.water,
    camels: s.camels,
    camelHp: Array.from({ length: s.camels }, () => 100),
    cargo: Object.fromEntries(ACTIVE_GOODS.map((id) => [id, 0])),
    freshness: { datiles: 1 },
    costBasis: Object.fromEntries(ACTIVE_GOODS.map((id) => [id, 0])),
    stock: initialStock(map, ACTIVE_GOODS),
    known: {},
    knownRoutes: {},
    visited: {},
    prices: {},
    debt: mode === 'libre' ? { installments: [], strikes: 0 } : createDebt(difficulty, { mult: s.debtMult, delays: s.delays }),
    loan: 0,
    deposit: 0,
    rep: initialRep(),
    news,
    trip: null,
    contracts: initialContracts(),
    crew: [],
    hire: initialHire(),
    log: [],
    undo: [],
    stats: initialStats(),
    seen: initialSeen(),
    rival: null,
    chronicle: createChronicle(),
    gear: {},
    history: [],
    bet: null,
    invest: {},
    climate: pickClimate(String(seed)),
    over: null,
  };
  state.rival = createRival(map, state.seed, start.id);
  recordDay(state);
  const game = { map, state, options: { events, eventRate } };
  discoverAround(game, start.id);
  applyStartPerks(game);
  snapshotPrices(game, start.id);
  refreshOffers(game, start.id);
  refreshHires(game, start.id);
  see(state, 'cityTypes', start.type);
  notePeaks(state);
  addLog(state, mode === 'libre'
    ? `Empieza el modo libre en ${start.name}. Sin deuda ni apuro: probá rutas y aprendé los precios.`
    : `Empieza la temporada en ${start.name}. Le debés ${totalOwed(state.debt)} de oro al Gremio.`, 'info');
  return game;
}

/** Primera opción que se puede elegir del evento en curso. */
export function firstAvailable(game) {
  for (let i = 0; i < 3; i++) if (optionState(game, i).available) return i;
  return -1;
}

/**
 * Sigue el viaje en curso hasta el próximo evento o la llegada. Si en el
 * camino se pierde la temporada por deuda, la cierra.
 * @param {object} game
 */
export function advance(game) {
  const res = advanceTrip(game);
  if (res.status === 'lost') finishSeason(game, 'deuda');
  return res;
}

/**
 * Viaja de punta a punta, resolviendo cada evento con `chooser` (bots y
 * pruebas; la interfaz usa startTrip / advance / chooseOption).
 * @param {object} game
 * @param {string} routeId
 * @param {(game:object)=>number} [chooser] devuelve el índice de la opción
 * @returns {{ok:boolean, error?:string, arrived?:boolean, lost?:boolean, days?:number, to?:string, events?:number}}
 */
export function travel(game, routeId, chooser = firstAvailable) {
  const start = startTrip(game, routeId);
  if (!start.ok) return start;
  const startDay = game.state.day;
  const to = game.state.trip.to;
  let events = 0;
  for (let guard = 0; guard < 50; guard++) {
    const res = advance(game);
    if (res.status === 'event') {
      events++;
      chooseOption(game, chooser(game));
      continue;
    }
    return { ok: true, arrived: res.status === 'arrived', lost: res.status === 'lost', days: game.state.day - startDay, to, events };
  }
  throw new Error('El viaje no termina');
}

/**
 * Descansa un día en la ciudad: los mercados se recuperan un poco.
 * @param {object} game
 * @returns {{ok:boolean,error?:string}}
 */
export function rest(game) {
  const { state, map } = game;
  if (state.over) return { ok: false, error: 'La temporada terminó.' };
  if (state.trip) return { ok: false, error: 'Estás viajando.' };
  if (state.day >= lastDay(state)) return { ok: false, error: 'Es el último día de la temporada.' };
  const res = passDay(game, { food: dailyRation(state, 'food'), water: dailyRation(state) }, `en ${map.cityById[state.location].name}`, { rest: true });
  state.undo = [];
  if (res.lost) {
    finishSeason(game, 'deuda');
    return { ok: true };
  }
  snapshotPrices(game, state.location);
  bump(state, 'restDays');
  addLog(state, `Descansaste un día en ${map.cityById[state.location].name}.`, 'info');
  return { ok: true };
}

/**
 * Dice si el jugador puede cerrar la temporada ahora: el último día, o
 * antes si ya pagó toda la deuda (retirarse).
 * @param {object} game
 */
export function canFinish(game) {
  const { state } = game;
  return !state.over && !state.trip && (state.day >= lastDay(state) || isFree(state) || (totalOwed(state.debt) === 0 && state.loan === 0));
}

/**
 * Resumen de la próxima cuota para la barra de arriba.
 * @param {object} state
 * @returns {{day:number,owed:number}|null}
 */
export function nextDue(state) {
  const inst = nextInstallment(state.debt);
  return inst ? { day: inst.day, owed: inst.amount - inst.paid } : null;
}
