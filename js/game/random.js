/**
 * Azar de la temporada: el generador vive dentro del estado (state.rng)
 * para que guardar y cargar continúe exactamente la misma secuencia.
 */

import { Rng } from '../core/rng.js';

/**
 * Usa el generador de la temporada y guarda su nuevo estado.
 * @template T
 * @param {object} state
 * @param {(rng:Rng)=>T} fn
 * @returns {T}
 */
export function withRng(state, fn) {
  const rng = new Rng(state.rng);
  const out = fn(rng);
  state.rng = rng.getState();
  return out;
}
