/**
 * Ayudas compartidas por las pruebas unitarias.
 */
import { createSeason } from '../../js/game/season.js';

/**
 * Crea una temporada de prueba con valores cómodos para testear.
 * Sin eventos de viaje, para que los resultados sean exactos.
 * @param {object} [patch] campos del estado a pisar
 * @param {string} [seed]
 */
export function testGame(patch = {}, seed = 'prueba') {
  const game = createSeason({ seed, events: false });
  Object.assign(game.state, patch);
  return game;
}

/** Almacenamiento en memoria que imita localStorage. */
export class MemoryStorage {
  constructor() {
    this.data = new Map();
  }
  getItem(k) {
    return this.data.has(k) ? this.data.get(k) : null;
  }
  setItem(k, v) {
    this.data.set(k, String(v));
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
