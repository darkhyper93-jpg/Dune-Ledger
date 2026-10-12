/**
 * Piezas básicas para validar partidas guardadas: errores con el campo que
 * falló, números y textos dentro de rango, registros sin claves raras, y
 * las partes chicas del estado (crónica y caravana rival). Las usa
 * validate.js.
 */

import { isGoodId } from '../data/goods.js';
import { GEAR_BY_ID } from '../data/gear.js';

/** Error de validación con un mensaje que dice qué campo falló. */
export class SaveError extends Error {}

/** Lanza un SaveError si la condición no se cumple. */
export function need(cond, what) {
  if (!cond) throw new SaveError(`Partida inválida: ${what}`);
}

/** Objeto plano (no arreglo, no null). */
export function isObj(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Entero dentro de un rango. */
export function int(v, lo, hi, what) {
  need(Number.isInteger(v) && v >= lo && v <= hi, what);
  return v;
}

/** Número finito dentro de un rango. */
export function num(v, lo, hi, what) {
  need(typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi, what);
  return v;
}

/** Texto con largo máximo. */
export function str(v, max, what) {
  need(typeof v === 'string' && v.length <= max, what);
  return v;
}

/**
 * Recorre un objeto con claves que deben cumplir `keyOk`, validando cada valor.
 * Devuelve un objeto nuevo sin prototipo raro.
 */
export function record(v, keyOk, valueFn, what) {
  need(isObj(v), what);
  const out = {};
  for (const [k, val] of Object.entries(v)) {
    need(keyOk(k), `${what} (${k})`);
    out[k] = valueFn(val, `${what}.${k}`);
  }
  return out;
}

/** Valida el avance de la crónica (las partidas viejas arrancan de cero). */
export function chroniclePart(v) {
  if (v === undefined) return { step: 0, perk: null };
  need(isObj(v) && (v.perk === null || v.perk === 'exento'), 'crónica');
  return { step: int(v.step, 0, 3, 'crónica'), perk: v.perk };
}

/** Valida la caravana rival (puede no haber, en partidas viejas). */
export function rivalPart(v, cityOk) {
  if (v === null || v === undefined) return null;
  need(isObj(v) && cityOk(v.at) && (v.to === null || cityOk(v.to)), 'rival');
  need(v.cargo === null || (isObj(v.cargo) && isGoodId(v.cargo.goodId)), 'carga del rival');
  return {
    at: v.at, to: v.to,
    left: int(v.left, 0, 30, 'rival'), days: int(v.days, 0, 30, 'rival'), wait: int(v.wait, 0, 10, 'rival'),
    gold: int(v.gold, 0, 1e8, 'oro del rival'),
    cargo: v.cargo === null ? null : { goodId: v.cargo.goodId, qty: int(v.cargo.qty, 1, 999, 'rival'), cost: int(v.cargo.cost, 0, 1e8, 'rival') },
  };
}


/** Valida el equipo comprado (las partidas viejas no tienen). */
export function gearPart(v) {
  if (v === undefined) return {};
  return record(v, (k) => Object.hasOwn(GEAR_BY_ID, k), (x, w) => { need(x === true, w); return true; }, 'equipo');
}

/** Valida el registro día a día del gráfico (las partidas viejas no tienen). */
export function historyPart(v) {
  if (v === undefined) return [];
  need(Array.isArray(v) && v.length <= 120, 'registro');
  return v.map((e) => {
    need(isObj(e), 'registro');
    return {
      day: int(e.day, 1, 999, 'registro'),
      me: int(e.me, -1e8, 1e8, 'registro'),
      rival: e.rival === null ? null : int(e.rival, 0, 1e8, 'registro'),
    };
  });
}

/** Valida la apuesta de carrera contra Kasim (puede no haber). */
export function betPart(v, cityOk) {
  if (v === undefined || v === null) return null;
  need(isObj(v) && cityOk(v.to), 'apuesta');
  return { to: v.to, stake: int(v.stake, 1, 1000, 'apuesta'), rivalDay: int(v.rivalDay, 1, 999, 'apuesta') };
}

/** Valida las inversiones en ciudades (nivel 1 a 3 por ciudad). */
export function investPart(v, cityOk) {
  if (v === undefined) return {};
  return record(v, cityOk, (x, w) => int(x, 1, 3, w), 'inversiones');
}
