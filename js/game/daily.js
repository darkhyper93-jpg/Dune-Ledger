/**
 * Desafío diario: todos juegan el mismo mapa ese día (semilla de la fecha),
 * en el Desierto, en Normal, con el Aprendiz y sin mejoras. Al terminar se
 * comparte un código de puntaje con suma de control, por ejemplo
 * `DL-2026-10-11-4870-a3f`, que no se puede inventar a mano.
 */

import { hashString } from '../core/rng.js';
import { createSeason } from './season.js';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Fecha del desafío: el día local del dispositivo, como AAAA-MM-DD.
 * @param {Date} [now]
 */
export function dailyDate(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Crea la partida del desafío de una fecha.
 * @param {string} date AAAA-MM-DD
 * @param {{events?:boolean, eventRate?:number}} [opts] opciones de prueba
 */
export function createDaily(date, opts = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Fecha inválida: ${date}`);
  return createSeason({ seed: `diario-${date}`, mode: 'diario', daily: date, region: 'desierto', difficulty: 'normal', merchant: 'aprendiz', upgrades: {}, ...opts });
}

/** Suma de control de 3 letras para una fecha y un puntaje. */
function checksum(date, score) {
  return (hashString(`${date}|${score}`, 1104).toString(36) + '000').slice(0, 3);
}

/**
 * Código de puntaje para compartir. Los puntajes negativos van como 0.
 * @param {string} date
 * @param {number} score
 */
export function scoreCode(date, score) {
  const s = Math.max(0, Math.round(score));
  return `DL-${date}-${s}-${checksum(date, s)}`;
}

/**
 * Lee un código de puntaje de otro jugador y comprueba que no esté tocado.
 * @param {string} code
 * @returns {{ok:true, date:string, score:number}|{ok:false, error:string}}
 */
export function readScoreCode(code) {
  const m = /^DL-(\d{4}-\d{2}-\d{2})-(\d{1,9})-([0-9a-z]{3})$/.exec(String(code).trim());
  if (!m) return { ok: false, error: 'Eso no es un código de puntaje de Dune Ledger.' };
  const [, date, digits, sum] = m;
  const score = Number(digits);
  if (String(score) !== digits || checksum(date, score) !== sum) return { ok: false, error: 'El código fue modificado o está mal copiado.' };
  return { ok: true, date, score };
}
