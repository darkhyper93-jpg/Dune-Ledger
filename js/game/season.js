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
import { initialStock, quote } from './market.js';
import { createDebt, totalOwed, settleInstallment, nextInstallment } from './debt.js';
import { addLog, discoverAround, snapshotPrices } from './knowledge.js';
import { travel as travelRoute, passDay, dailyRation } from './travel.js';

/** Versión del formato de la partida guardada. */
export const STATE_VERSION = 1;

/**
 * Crea una temporada nueva.
 * @param {{seed:string, difficulty?:string}} opts
 * @returns {{map:object,state:object}}
 */
export function createSeason({ seed, difficulty = 'normal' }) {
  getDifficulty(difficulty);
  const map = generateMap(seed);
  const rng = new Rng(`season:${seed}`);
  const starts = map.cities.filter((c) => c.type !== 'capital');
  const start = rng.pick(starts);
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
    cargo: Object.fromEntries(ACTIVE_GOODS.map((id) => [id, 0])),
    freshness: { datiles: 1 },
    costBasis: Object.fromEntries(ACTIVE_GOODS.map((id) => [id, 0])),
    stock: initialStock(map, ACTIVE_GOODS),
    known: {},
    knownRoutes: {},
    visited: {},
    prices: {},
    debt: createDebt(difficulty),
    log: [],
    undo: [],
    stats: { trips: 0, bestSale: null, routeProfit: {}, earned: 0, spent: 0 },
    over: null,
  };
  const game = { map, state };
  discoverAround(game, start.id);
  snapshotPrices(game, start.id);
  addLog(state, `Empieza la temporada en ${start.name}. Le debés ${totalOwed(state.debt)} de oro al Gremio.`, 'info');
  return game;
}

/**
 * Valor de la carga si la vendieras toda acá, unidad por unidad.
 * @param {object} game
 * @returns {number}
 */
export function cargoValueHere(game) {
  const { state } = game;
  let total = 0;
  for (const [id, qty] of Object.entries(state.cargo)) {
    if (qty > 0) total += quote(game, state.location, id, qty, 'sell').total;
  }
  return total;
}

/**
 * Puntaje actual: oro + valor de la carga acá − deuda que queda.
 * @param {object} game
 */
export function currentScore(game) {
  return game.state.gold + cargoValueHere(game) - totalOwed(game.state.debt);
}

/**
 * Sellos que da un puntaje según la dificultad.
 * @param {number} score
 * @param {string} difficulty
 */
export function sealsFor(score, difficulty) {
  return Math.floor((Math.max(0, score) / 100) * getDifficulty(difficulty).sealMult);
}

/**
 * Cierra la temporada y calcula el resumen final.
 * @param {object} game
 * @param {'fin'|'retiro'|'deuda'} reason
 */
export function finishSeason(game, reason) {
  const { state } = game;
  if (state.over) return state.over;
  // Al cierre, el Gremio cobra lo que quede (con el cobrador, si hace falta).
  let lostByDebt = reason === 'deuda';
  if (!lostByDebt) {
    for (const inst of state.debt.installments) {
      if (inst.amount - inst.paid > 0) {
        const res = settleInstallment(state, inst);
        if (res.kind === 'collected') addLog(state, `El Gremio cobró la cuota del día ${inst.day} con ${res.fee} de comisión.`, 'debt');
        if (res.lost) lostByDebt = true;
      }
    }
  }
  const owed = totalOwed(state.debt);
  const score = currentScore(game);
  const won = !lostByDebt && owed === 0;
  state.over = {
    reason: lostByDebt ? 'deuda' : reason,
    won,
    score,
    seals: sealsFor(score, state.difficulty),
    day: state.day,
    gold: state.gold,
    owed,
    /** Si ya se sumó al perfil (sellos, récords). Lo marca la interfaz. */
    recorded: false,
  };
  state.undo = [];
  addLog(state, won ? '¡Pagaste toda la deuda! Temporada ganada.' : 'Terminó la temporada sin saldar la deuda.', won ? 'good' : 'bad');
  return state.over;
}

/**
 * Viaja por una ruta y, si en el camino se pierde por deuda, cierra la temporada.
 * @param {object} game
 * @param {string} routeId
 */
export function travel(game, routeId) {
  const res = travelRoute(game, routeId);
  if (res.lost) finishSeason(game, 'deuda');
  return res;
}

/**
 * Descansa un día en la ciudad: los mercados se recuperan un poco.
 * @param {object} game
 * @returns {{ok:boolean,error?:string}}
 */
export function rest(game) {
  const { state, map } = game;
  if (state.over) return { ok: false, error: 'La temporada terminó.' };
  if (state.day >= RULES.seasonDays) return { ok: false, error: 'Es el último día de la temporada.' };
  const ration = dailyRation(state);
  const res = passDay(game, { food: ration, water: ration }, `en ${map.cityById[state.location].name}`);
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
  return !state.over && (state.day >= RULES.seasonDays || totalOwed(state.debt) === 0);
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
