/**
 * Modos de juego: la temporada normal, el desafío diario (mismo mapa para
 * todos) y el modo libre (sin deuda ni límite de días, para aprender).
 */

import { RULES } from '../data/rules.js';

/** Modos válidos. */
export const MODES = ['temporada', 'diario', 'libre'];

/** Último día posible del modo libre (en la práctica, sin límite). */
export const FREE_DAYS = 999;

/**
 * Último día de la partida: 60, o casi infinito en el modo libre.
 * @param {{mode?:string}} state
 */
export function lastDay(state) {
  return state.mode === 'libre' ? FREE_DAYS : RULES.seasonDays;
}

/**
 * Dice si la partida es del modo libre.
 * @param {{mode?:string}} state
 */
export function isFree(state) {
  return state.mode === 'libre';
}
