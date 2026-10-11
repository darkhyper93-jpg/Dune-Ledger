/**
 * El viaje día por día. Salir no resuelve todo de golpe: el viaje avanza
 * hasta que pasa algo en el camino (un evento) y espera a que el jugador
 * elija una opción. Todo queda en `state.trip`, así se puede cerrar la
 * app en medio de una tormenta y seguir después.
 */

import { getGood } from '../data/goods.js';
import { canTravel, dailyRation, waterUntil, passDay } from './travel.js';
import { rollEvent, resolveOption } from './events.js';
import { otherEnd } from './map-gen.js';
import { addLog, discoverAround, snapshotPrices } from './knowledge.js';
import { withRng } from './random.js';
import { plural } from '../core/text.js';
import { refreshOffers } from './contracts.js';
import { guideDays, scoutLevel, refreshHires, crewArrive } from './crew.js';
import { RULES } from '../data/rules.js';
import { bump, see, notePeaks } from './stats.js';

/** Probabilidad por día de que se rompa cada cerámica en la montaña. */
export const MOUNTAIN_BREAK = 0.04;

/**
 * Sale de viaje por una ruta (todavía no pasa ningún día).
 * @param {object} game
 * @param {string} routeId
 * @returns {{ok:boolean, error?:string}}
 */
export function startTrip(game, routeId) {
  const check = canTravel(game, routeId);
  if (!check.ok) return check;
  const { map, state } = game;
  const route = map.routeById[routeId];
  const from = state.location;
  const to = otherEnd(route, from);
  let days = guideDays(state, route.days);
  if (route.danger !== 'bajo') bump(state, 'riskyTrips');
  if (route.danger === 'alto') bump(state, 'highTrips');
  state.trip = { routeId, from, to, done: 0, days, rolled: 0, event: null };
  state.undo = [];
  addLog(state, `Saliste de ${map.cityById[from].name} rumbo a ${map.cityById[to].name} (${plural(days, 'día', 'días')}).`, 'travel');
  const sleeper = state.crew.find((m) => m.trait === 'dormilon');
  if (sleeper && state.day + days + 1 <= RULES.seasonDays && withRng(state, (rng) => rng.chance(0.1))) {
    days += 1;
    state.trip.days = days;
    addLog(state, `${sleeper.name} se quedó dormido: salieron tarde y el viaje dura un día más.`, 'bad');
  }
  return { ok: true };
}

/**
 * En la montaña, la cerámica se puede romper con los golpes.
 */
function mountainBreaks(state, rng) {
  let broken = 0;
  for (let i = 0; i < state.cargo.ceramica; i++) if (rng.chance(MOUNTAIN_BREAK)) broken++;
  if (broken > 0) {
    state.cargo.ceramica -= broken;
    addLog(state, `Se rompieron ${broken} de ${getGood('ceramica').name} en la montaña.`, 'bad');
  }
}

/**
 * Llega a destino: se descubren las vecinas y se anotan los precios.
 */
function arrive(game) {
  const { state, map } = game;
  const { from, to, days } = state.trip;
  state.trip = null;
  state.location = to;
  state.lastFrom = from;
  state.stats.trips += 1;
  discoverAround(game, to);
  snapshotPrices(game, to);
  if (scoutLevel(state)) {
    for (const r of map.routesByCity[to]) snapshotPrices(game, otherEnd(r, to));
  }
  refreshOffers(game, to);
  refreshHires(game, to);
  crewArrive(game);
  see(state, 'cityTypes', map.cityById[to].type);
  notePeaks(state);
  addLog(state, `Llegaste a ${map.cityById[to].name}.`, 'travel');
  return { status: 'arrived', from, to, days };
}

/**
 * Avanza el viaje en curso hasta el próximo evento o la llegada.
 * @param {object} game
 * @returns {{status:'none'|'event'|'arrived'|'lost', from?:string, to?:string, days?:number}}
 */
export function advanceTrip(game) {
  const { state, map } = game;
  const trip = state.trip;
  if (!trip) return { status: 'none' };
  if (trip.event) return { status: 'event', from: trip.from };
  const route = map.routeById[trip.routeId];
  while (trip.done < trip.days) {
    const k = trip.done + 1;
    if (trip.rolled < k) {
      trip.rolled = k;
      if (game.options?.events !== false) {
        const ev = withRng(state, (rng) => rollEvent(game, route, rng));
        if (ev) {
          trip.event = ev;
          return { status: 'event', from: trip.from };
        }
      }
    }
    const use = { food: dailyRation(state, 'food'), water: waterUntil(state, route.terrain, k) - waterUntil(state, route.terrain, k - 1) };
    const res = passDay(game, use, 'en el camino', { terrain: route.terrain });
    trip.done = k;
    if (route.terrain === 'montana' && state.cargo.ceramica > 0) withRng(state, (rng) => mountainBreaks(state, rng));
    if (res.lost) {
      state.trip = null;
      return { status: 'lost', from: trip.from };
    }
  }
  return arrive(game);
}

/**
 * Elige una opción del evento que frenó el viaje.
 * @param {object} game
 * @param {number} idx
 */
export function chooseOption(game, idx) {
  if (!game.state.trip?.event) return { ok: false, error: 'No hay ningún evento.' };
  return withRng(game.state, (rng) => resolveOption(game, idx, rng));
}
