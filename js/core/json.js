/**
 * JSON seguro: rechaza claves peligrosas (__proto__, constructor,
 * prototype) que podrían contaminar objetos al cargar datos de afuera.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * JSON.parse que rechaza claves peligrosas. Lanza un error si las encuentra.
 * @param {string} text
 * @returns {unknown}
 */
export function safeParse(text) {
  return JSON.parse(text, (key, value) => {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`Clave no permitida: ${key}`);
    return value;
  });
}
