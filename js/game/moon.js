/**
 * La luna y la marcha nocturna.
 *
 * La luna da una vuelta cada 28 días; cada temporada arranca en otra fase
 * (sale de la semilla). Al salir por arena o piedra se puede marchar de
 * noche: se gasta menos agua porque no pega el sol, pero los camellos
 * tropiezan en la oscuridad y la caravana se puede perder (un día más).
 * Con luna llena se ve el camino; sin luna es fácil perderse, aunque los
 * bandidos tampoco te ven. El guía y el astrolabio ayudan a orientarse.
 */

import { hashString } from '../core/rng.js';
import { hasGear } from './gear.js';

/** Días de una vuelta de la luna. */
export const MOON_CYCLE = 28;
/** Parte del agua que se gasta marchando de noche (la mitad). */
export const NIGHT_WATER = 0.5;
/** Cansancio extra de los camellos por noche de marcha (tropiezan). */
export const NIGHT_FATIGUE = 1;
/** Chance de perderse con luna llena y sin luna (sin ayuda). */
const LOST_FULL = 0.05;
const LOST_DARK = 0.4;
/** Terrenos donde se puede marchar de noche. */
const NIGHT_TERRAINS = ['arena', 'piedra'];

/** Nombres de las ocho fases, de luna nueva a menguante. */
const NAMES = ['Luna nueva', 'Creciente', 'Cuarto creciente', 'Gibosa creciente', 'Luna llena', 'Gibosa menguante', 'Cuarto menguante', 'Menguante'];

/**
 * Fase de la luna en un día (0 = luna nueva, 14 = luna llena).
 * @param {{seed:string, day:number}} state
 * @param {number} [day]
 */
export function moonPhase(state, day = state.day) {
  return (day + (hashString(`luna:${state.seed}`) % MOON_CYCLE)) % MOON_CYCLE;
}

/**
 * Cuánto ilumina la luna en una fase (0 sin luna, 1 llena).
 * @param {number} phase
 */
export function moonLight(phase) {
  return Math.round(((1 - Math.cos((2 * Math.PI * phase) / MOON_CYCLE)) / 2) * 1000) / 1000;
}

/**
 * Nombre de una fase.
 * @param {number} phase
 */
export function moonName(phase) {
  return NAMES[Math.round(phase / (MOON_CYCLE / NAMES.length)) % NAMES.length];
}

/**
 * Dice si por esta ruta se puede marchar de noche (no por río, mar ni montaña).
 * @param {{terrain:string}} route
 */
export function canNightMarch(route) {
  return NIGHT_TERRAINS.includes(route.terrain);
}

/**
 * Chance de perderse en una marcha nocturna que sale hoy.
 * @param {object} state
 */
export function lostChance(state) {
  const light = moonLight(moonPhase(state));
  let p = LOST_FULL + (LOST_DARK - LOST_FULL) * (1 - light);
  if (state.crew.some((m) => m.role === 'guia')) p /= 2;
  if (hasGear(state, 'astrolabio')) p /= 2;
  return p;
}

/**
 * Cuántos bandidos hay de noche, comparado con el día: sin luna no te ven.
 * @param {object} state
 */
export function nightBanditMult(state) {
  return 0.35 + 0.65 * moonLight(moonPhase(state));
}
