/**
 * El mapa del tesoro: cada temporada hay un tesoro enterrado en una ruta y
 * un mapa roto en tres pedazos escondidos en tres ciudades. Al llegar a
 * una de ellas encontrás su pedazo; cada uno dice más (la zona, una punta
 * de la ruta y, con los tres, la ruta exacta). En la Taberna se puede
 * comprar un rumor que dice dónde está el pedazo más cercano. Con el mapa
 * entero, al pasar por esa ruta podés parar a cavar: un día más de viaje a
 * cambio del oro.
 *
 * Todo sale de la semilla con su propio azar, así que sumar el tesoro no
 * cambia el resto de la temporada (mercados, eventos, Kasim).
 */

import { Rng } from '../core/rng.js';
import { otherEnd } from './map-gen.js';
import { zoneName } from './reputation.js';
import { addLog } from './knowledge.js';
import { bump } from './stats.js';
import { fmt } from '../core/text.js';

/** Pedazos en que está roto el mapa. */
export const TREASURE_PIECES = 3;
/** Lo que cuesta un rumor en la Taberna. */
export const RUMOR_PRICE = 25;

/**
 * Esconde el tesoro de una temporada nueva.
 * @param {object} map
 * @param {string} seed
 * @param {string} startId ciudad de salida (ahí no hay pedazo)
 * @returns {{pieces:string[], found:string[], route:string, gold:number, hint:string|null, dug:boolean}}
 */
export function createTreasure(map, seed, startId) {
  const rng = new Rng(`tesoro:${seed}`);
  const pieces = rng.shuffle(map.cities.filter((c) => c.id !== startId)).slice(0, TREASURE_PIECES).map((c) => c.id);
  // Una ruta que no salga de la ciudad de partida: hay que ir a buscarla.
  const far = map.routes.filter((r) => r.a !== startId && r.b !== startId);
  const route = rng.pick(far.length ? far : map.routes);
  return { pieces, found: [], route: route.id, gold: rng.int(22, 32) * 10, hint: null, dug: false };
}

/** Dice si ya juntaste el mapa entero. */
export function mapComplete(state) {
  return !!state.treasure && state.treasure.found.length >= TREASURE_PIECES;
}

/**
 * Lo que sabés del tesoro según los pedazos que tenés.
 * @param {{map:object, state:object}} game
 * @returns {{level:number, text:string, cityId:string|null, routeId:string|null}}
 */
export function treasureClue(game) {
  const t = game.state.treasure;
  const none = { level: 0, text: '', cityId: null, routeId: null };
  if (!t) return none;
  const route = game.map.routeById[t.route];
  const a = game.map.cityById[route.a];
  const b = game.map.cityById[route.b];
  const level = t.found.length;
  if (t.dug) return { level, text: `Ya desenterraste el tesoro entre ${a.name} y ${b.name}.`, cityId: null, routeId: null };
  if (level === 0) return { ...none, text: 'Dicen que hay un mapa roto en tres pedazos, escondidos en tres ciudades.' };
  if (level === 1) return { ...none, level, text: `El tesoro está enterrado en una ruta que sale de la zona ${zoneName(a.zone)}.` };
  if (level === 2) return { level, text: `Una punta de la ruta del tesoro es ${a.name}. Falta un pedazo para saber la otra.`, cityId: a.id, routeId: null };
  return { level, text: `El tesoro está en la ruta entre ${a.name} y ${b.name}. Al pasar por ahí, podés parar a cavar.`, cityId: null, routeId: route.id };
}

/** Con el mapa entero, la ruta y sus dos ciudades aparecen en tu mapa. */
function revealRoute(game) {
  const { state, map } = game;
  const route = map.routeById[state.treasure.route];
  state.knownRoutes[route.id] = true;
  state.known[route.a] = true;
  state.known[route.b] = true;
}

/**
 * Al llegar a una ciudad: si tiene un pedazo del mapa, lo encontrás.
 * @param {{map:object, state:object}} game
 * @returns {boolean} si encontraste un pedazo
 */
export function treasureArrive(game) {
  const { state, map } = game;
  const t = state.treasure;
  const here = state.location;
  if (!t || t.dug || !t.pieces.includes(here) || t.found.includes(here)) return false;
  t.found.push(here);
  if (t.hint === here) t.hint = null;
  const n = t.found.length;
  if (n >= TREASURE_PIECES) revealRoute(game);
  else if (n === 2) state.known[map.routeById[t.route].a] = true; // la punta que dice el mapa
  const clue = treasureClue(game).text;
  addLog(state, `En ${map.cityById[here].name} encontraste un pedazo del mapa del tesoro (${n} de ${TREASURE_PIECES}). ${clue}`, 'good');
  return true;
}

/**
 * Ciudad más cercana (en saltos de ruta) que todavía tiene un pedazo.
 * @param {{map:object, state:object}} game
 * @returns {string|null}
 */
function nearestPiece(game) {
  const { state, map } = game;
  const left = new Set(state.treasure.pieces.filter((id) => !state.treasure.found.includes(id)));
  const seen = new Set([state.location]);
  let frontier = [state.location];
  while (frontier.length) {
    const hit = frontier.find((id) => left.has(id));
    if (hit) return hit;
    const next = [];
    for (const id of frontier) {
      for (const r of map.routesByCity[id]) {
        const to = otherEnd(r, id);
        if (!seen.has(to)) {
          seen.add(to);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Compra en la Taberna un rumor: dónde está el pedazo más cercano.
 * @param {{map:object, state:object}} game
 * @returns {{ok:boolean, error?:string, cityId?:string}}
 */
export function buyRumor(game) {
  const { state, map } = game;
  const t = state.treasure;
  if (!t || t.dug || mapComplete(state)) return { ok: false, error: 'Ya no quedan pedazos por buscar.' };
  if (state.trip || state.over) return { ok: false, error: 'Ahora no se puede.' };
  if (t.hint) return { ok: false, error: `Ya sabés dónde buscar: en ${map.cityById[t.hint].name}.` };
  if (state.gold < RUMOR_PRICE) return { ok: false, error: `Te falta oro: el rumor cuesta ${fmt(RUMOR_PRICE)}.` };
  const cityId = nearestPiece(game);
  if (!cityId) return { ok: false, error: 'Nadie sabe nada.' };
  state.gold -= RUMOR_PRICE;
  t.hint = cityId;
  state.known[cityId] = true;
  state.undo = [];
  addLog(state, `Un viejo de la Taberna te contó que en ${map.cityById[cityId].name} hay un pedazo del mapa del tesoro (−${fmt(RUMOR_PRICE)} de oro).`, 'info');
  return { ok: true, cityId };
}

/**
 * Dice si en este día de viaje aparece el lugar del tesoro para cavar: con
 * el mapa entero, en su ruta, el primer día.
 * @param {{state:object}} game
 * @param {{id:string}} route
 * @param {number} k día del viaje (1 es el primero)
 */
export function treasureDue(game, route, k) {
  const t = game.state.treasure;
  return k === 1 && mapComplete(game.state) && !t.dug && route.id === t.route;
}

/**
 * Anota que cavaste y encontraste el tesoro (lo llama el evento).
 * @param {object} state
 */
export function markDug(state) {
  if (!state.treasure) return;
  state.treasure.dug = true;
  state.treasure.hint = null;
  bump(state, 'mapTreasures');
}
