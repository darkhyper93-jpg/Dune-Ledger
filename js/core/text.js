/**
 * Ayudas de texto en castellano: plurales y números con separador de miles.
 * No dependen del DOM, así las usa también la simulación (diario).
 */

/**
 * "1 día", "3 días".
 * @param {number} n
 * @param {string} one singular
 * @param {string} many plural
 */
export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Formatea un número entero con punto de miles: 1500 → "1.500".
 * @param {number} n
 */
export function fmt(n) {
  const sign = n < 0 ? '−' : '';
  return sign + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
