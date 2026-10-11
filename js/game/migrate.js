/**
 * Migraciones de partidas guardadas con versiones viejas del juego, para
 * que actualizar no te haga perder la temporada en curso. Sólo agregan lo
 * que falta; después todo se valida igual que una partida nueva.
 */

import { RULES } from '../data/rules.js';

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Versión 2 → 3 (llegan las regiones): se jugaba en el Desierto y no
 * existía el jade. Lo de deshacer se descarta.
 * @param {Record<string, any>} raw
 */
function toV3(raw) {
  const withJade = (row, value) => (isObj(row) ? { ...row, jade: value } : row);
  const out = { ...raw, v: 3, region: 'desierto', undo: [] };
  out.cargo = withJade(raw.cargo, 0);
  out.costBasis = withJade(raw.costBasis, 0);
  if (isObj(raw.stock)) out.stock = Object.fromEntries(Object.entries(raw.stock).map(([k, row]) => [k, withJade(row, RULES.market.stockNormal)]));
  if (isObj(raw.prices)) {
    out.prices = Object.fromEntries(Object.entries(raw.prices).map(([k, p]) => [k, isObj(p) ? { ...p, sell: withJade(p.sell, 0), buy: withJade(p.buy, 0) } : p]));
  }
  return out;
}

/**
 * Versión 3 → 4 (llegan los modos): era una temporada normal.
 * @param {Record<string, any>} raw
 */
function toV4(raw) {
  return { ...raw, v: 4, mode: 'temporada', daily: null };
}

/**
 * Versión 4 → 5 (llega la caravana rival): las partidas empezadas siguen sin rival.
 * @param {Record<string, any>} raw
 */
function toV5(raw) {
  return { ...raw, v: 5, rival: null };
}

/**
 * Lleva una partida leída a la versión actual (si es de una conocida).
 * @param {Record<string, any>} raw
 * @returns {Record<string, any>}
 */
export function migrate(raw) {
  let out = raw;
  if (out.v === 2) out = toV3(out);
  if (out.v === 3) out = toV4(out);
  if (out.v === 4) out = toV5(out);
  return out;
}
