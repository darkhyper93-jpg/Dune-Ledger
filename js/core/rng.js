/**
 * Azar con semilla para Dune Ledger.
 *
 * Todo lo aleatorio de la simulación pasa por acá: la misma semilla da
 * el mismo mapa, los mismos precios y los mismos viajes. El estado del
 * generador es un arreglo de 4 enteros de 32 bits, así se puede guardar
 * en la partida y seguir exactamente donde quedó.
 */

/**
 * Convierte un texto en un entero de 32 bits sin signo (hash cyrb53 recortado).
 * Se usa para sembrar el generador y para el "ruido" fijo de precios.
 * @param {string} text texto cualquiera (semilla, id de ciudad, etc.)
 * @param {number} [salt=0] valor extra para obtener hashes distintos del mismo texto
 * @returns {number} entero entre 0 y 2^32 - 1
 */
export function hashString(text, salt = 0) {
  let h1 = 0xdeadbeef ^ salt;
  let h2 = 0x41c6ce57 ^ salt;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/**
 * Número fijo entre 0 y 1 a partir de un texto: no consume el generador.
 * Sirve para valores que deben ser siempre iguales para una semilla
 * (por ejemplo, el ruido de precio de cada ciudad y bien).
 * @param {string} text
 * @returns {number} número en [0, 1)
 */
export function hashUnit(text) {
  return hashString(text, 7) / 4294967296;
}

/**
 * Crea el estado inicial del generador a partir de una semilla de texto.
 * @param {string} seed
 * @returns {number[]} cuatro enteros de 32 bits
 */
export function seedState(seed) {
  const s = String(seed);
  const state = [hashString(s, 1), hashString(s, 2), hashString(s, 3), hashString(s, 4)];
  // sfc32 no tolera un estado todo en cero.
  if (state.every((n) => n === 0)) state[0] = 1;
  return state;
}

/**
 * Generador sfc32 con helpers. Su estado vive en un arreglo que se puede
 * guardar y restaurar (ver `getState`).
 */
export class Rng {
  /**
   * @param {string|number[]} seedOrState semilla de texto o estado guardado
   */
  constructor(seedOrState) {
    this.s = Array.isArray(seedOrState) ? seedOrState.map((n) => n >>> 0) : seedState(seedOrState);
  }

  /** Devuelve una copia del estado interno, para guardarlo. */
  getState() {
    return this.s.map((n) => n >>> 0);
  }

  /**
   * Siguiente número en [0, 1).
   * @returns {number}
   */
  next() {
    const s = this.s;
    s[0] >>>= 0; s[1] >>>= 0; s[2] >>>= 0; s[3] >>>= 0;
    const t = (s[0] + s[1] | 0) + s[3] | 0;
    s[3] = s[3] + 1 | 0;
    s[0] = s[1] ^ (s[1] >>> 9);
    s[1] = s[2] + (s[2] << 3) | 0;
    s[2] = (s[2] << 21) | (s[2] >>> 11);
    s[2] = s[2] + t | 0;
    return (t >>> 0) / 4294967296;
  }

  /**
   * Entero entre min y max, ambos incluidos.
   * @param {number} min
   * @param {number} max
   */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /**
   * Número decimal entre min y max.
   * @param {number} min
   * @param {number} max
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Verdadero con probabilidad p.
   * @param {number} p entre 0 y 1
   */
  chance(p) {
    return this.next() < p;
  }

  /**
   * Elige un elemento al azar de una lista no vacía.
   * @template T
   * @param {T[]} list
   * @returns {T}
   */
  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /**
   * Elige una clave según pesos: { arena: 3, rio: 1 } sale "arena" 3 de cada 4 veces.
   * @param {Record<string, number>} weights
   * @returns {string}
   */
  weighted(weights) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.next() * total;
    for (const [key, w] of entries) {
      roll -= w;
      if (roll < 0) return key;
    }
    return entries[entries.length - 1][0];
  }

  /**
   * Mezcla una copia de la lista (Fisher-Yates).
   * @template T
   * @param {T[]} list
   * @returns {T[]}
   */
  shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
