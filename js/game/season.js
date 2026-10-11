/**
 * Una temporada de Dune Ledger: creación, paso del tiempo, cierre y puntaje.
 *
 * Una partida en curso es un objeto `game = { map, state }`. El mapa se
 * regenera siempre desde la semilla (no se guarda); `state` es todo lo que
 * cambia y es lo único que se guarda. Este módulo no toca el DOM, así que
 * una temporada entera se puede jugar en Node (pruebas y bots).
 */

import { RULES, getDifficulty } from '../data/rules.js';
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

export { cargoValueHere, currentScore, sealsFor, finishSeason } from './finish.js';
export { startTrip, chooseOption } from './trip.js';

/** Versión del formato de la partida guardada. */
export const STATE_VERSION = 2;

/**
 * Crea una temporada nueva.
 * `events` y `eventRate` son opciones del juego (no se guardan): sirven
 * para pruebas que necesitan viajes sin sorpresas o con muchos eventos.
 * @param {{seed:string, difficulty?:string, events?:boolean, eventRate?:number}} opts
 * @returns {{map:object,state:object,options:object}}
 */
export function createSeason({ seed, difficulty = 'normal', events = true, eventRate }) {
  getDifficulty(difficulty);
  const map = generateMap(seed);
  const rng = new Rng(`season:${seed}`);
  const starts = map.cities.filter((c) => c.type !== 'capital');
  const start = rng.pick(starts);
  const news = initialNews(rng);
  const s = RULES.start;
  const state = {
    v: STATE_VERSION,
    seed: String(seed),
    difficulty,
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
    debt: createDebt(difficulty),
    rep: initialRep(),
    news,
    trip: null,
    contracts: initialContracts(),
    crew: [],
    hire: initialHire(),
    log: [],
    undo: [],
    stats: { trips: 0, bestSale: null, routeProfit: {}, earned: 0, spent: 0 },
    over: null,
  };
  const game = { map, state, options: { events, eventRate } };
  discoverAround(game, start.id);
  snapshotPrices(game, start.id);
  refreshOffers(game, start.id);
  refreshHires(game, start.id);
  addLog(state, `Empieza la temporada en ${start.name}. Le debés ${totalOwed(state.debt)} de oro al Gremio.`, 'info');
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
  if (state.day >= RULES.seasonDays) return { ok: false, error: 'Es el último día de la temporada.' };
  const res = passDay(game, { food: dailyRation(state, 'food'), water: dailyRation(state) }, `en ${map.cityById[state.location].name}`, { rest: true });
  state.undo = [];
  if (res.lost) {
    finishSeason(game, 'deuda');
    return { ok: true };
  }
  snapshotPrices(game, state.location);
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
  return !state.over && !state.trip && (state.day >= RULES.seasonDays || totalOwed(state.debt) === 0);
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
