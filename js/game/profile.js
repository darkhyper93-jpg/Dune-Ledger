/**
 * El perfil permanente (lo que queda entre temporadas): sellos, mercaderes
 * comprados, mejoras del Gremio, logros y códice. También el código de
 * progreso: todo el perfil como texto para copiar y pegar, con una suma de
 * control para que no se pueda inventar a mano.
 */

import { MERCHANTS, MERCHANTS_BY_ID } from '../data/merchants.js';
import { UPGRADES, UPGRADES_BY_ID } from '../data/upgrades.js';
import { ACHIEVEMENTS, ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { GOODS_BY_ID } from '../data/goods.js';
import { CITY_TYPES_BY_ID } from '../data/cities.js';
import { EVENTS_BY_ID } from '../data/events.js';
import { ROLES, TRAITS } from '../data/crew.js';
import { REGIONS, REGIONS_BY_ID } from '../data/regions.js';
import { DIFFICULTIES } from '../data/rules.js';
import { hashString } from '../core/rng.js';
import { safeParse } from '../core/json.js';

/** Secciones del códice y qué ids valen en cada una. */
export const CODEX = {
  goods: GOODS_BY_ID,
  cityTypes: CITY_TYPES_BY_ID,
  events: EVENTS_BY_ID,
  roles: ROLES,
  traits: TRAITS,
};

/** Cuántas temporadas recuerda el historial del perfil. */
export const PROFILE_HISTORY = 12;

/** Consejos de una sola vez (ver js/ui/coach.js). */
export const HINT_IDS = ['kasim', 'cronica', 'bazar', 'invertir', 'clima'];

/** Perfil vacío: sólo el Aprendiz. */
export function defaultProfile() {
  return {
    seals: 0, totalSeals: 0, seasons: 0, wins: 0, bestScore: 0, tutorialDone: false,
    merchants: ['aprendiz'], upgrades: {}, achievements: {},
    regions: ['desierto'], wonIn: [], chronicles: [], hardWin: false, daily: null, hints: {}, history: [],
    codex: Object.fromEntries(Object.keys(CODEX).map((k) => [k, {}])),
  };
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const intIn = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;

/** Una entrada válida del historial de temporadas. */
function validEntry(e) {
  return isObj(e) && Object.hasOwn(REGIONS_BY_ID, e.region) && Object.hasOwn(DIFFICULTIES, e.difficulty)
    && ['temporada', 'diario', 'libre'].includes(e.mode) && Number.isInteger(e.score) && Math.abs(e.score) <= 1e8
    && typeof e.won === 'boolean' && (e.rivalGold === null || (Number.isInteger(e.rivalGold) && e.rivalGold >= 0))
    && Number.isInteger(e.day) && e.day >= 1 && e.day <= 999 && Object.keys(e).length === 7;
}

/**
 * Valida un perfil leído. Los números imposibles lo vuelven al de fábrica;
 * ids desconocidos (de una versión vieja o inventados) se descartan.
 * @param {unknown} raw
 */
export function validateProfile(raw) {
  const d = defaultProfile();
  if (!isObj(raw)) return d;
  if (!intIn(raw.seals, 1e7) || !intIn(raw.seasons, 1e6) || !intIn(raw.wins, 1e6) || !intIn(raw.bestScore, 1e8)) return d;
  if (raw.wins > raw.seasons || typeof raw.tutorialDone !== 'boolean') return d;
  const out = { ...d, seals: raw.seals, seasons: raw.seasons, wins: raw.wins, bestScore: raw.bestScore, tutorialDone: raw.tutorialDone };
  out.totalSeals = intIn(raw.totalSeals, 1e8) ? Math.max(raw.totalSeals, raw.seals) : raw.seals;
  if (Array.isArray(raw.merchants)) {
    out.merchants = ['aprendiz', ...raw.merchants.filter((id) => typeof id === 'string' && id !== 'aprendiz' && Object.hasOwn(MERCHANTS_BY_ID, id))];
    out.merchants = [...new Set(out.merchants)];
  }
  if (Array.isArray(raw.regions)) {
    const ok = new Set(raw.regions.filter((id) => typeof id === 'string' && Object.hasOwn(REGIONS_BY_ID, id)));
    out.regions = REGIONS.map((r) => r.id).filter((id) => id === 'desierto' || ok.has(id));
  }
  out.hardWin = raw.hardWin === true;
  if (Array.isArray(raw.history)) out.history = raw.history.filter(validEntry).slice(0, PROFILE_HISTORY).map((e) => ({ ...e }));
  if (isObj(raw.hints)) {
    for (const id of HINT_IDS) if (raw.hints[id] === true) out.hints[id] = true;
  }
  if (Array.isArray(raw.chronicles)) {
    const ok = new Set(raw.chronicles.filter((id) => typeof id === 'string' && Object.hasOwn(REGIONS_BY_ID, id)));
    out.chronicles = REGIONS.map((r) => r.id).filter((id) => ok.has(id));
  }
  if (Array.isArray(raw.wonIn)) {
    const ok = new Set(raw.wonIn.filter((id) => typeof id === 'string' && Object.hasOwn(REGIONS_BY_ID, id)));
    out.wonIn = REGIONS.map((r) => r.id).filter((id) => ok.has(id));
  }
  if (isObj(raw.daily) && typeof raw.daily.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.daily.date) && Number.isFinite(raw.daily.score)) {
    out.daily = { date: raw.daily.date, score: Math.round(raw.daily.score) };
  }
  if (isObj(raw.upgrades)) {
    for (const [id, lvl] of Object.entries(raw.upgrades)) {
      if (Object.hasOwn(UPGRADES_BY_ID, id) && Number.isInteger(lvl) && lvl > 0) out.upgrades[id] = Math.min(lvl, UPGRADES_BY_ID[id].costs.length);
    }
  }
  if (isObj(raw.achievements)) {
    for (const [id, v] of Object.entries(raw.achievements)) if (v === true && Object.hasOwn(ACHIEVEMENTS_BY_ID, id)) out.achievements[id] = true;
  }
  if (isObj(raw.codex)) {
    for (const [section, valid] of Object.entries(CODEX)) {
      const seen = raw.codex[section];
      if (!isObj(seen)) continue;
      for (const [id, v] of Object.entries(seen)) if (v === true && Object.hasOwn(valid, id)) out.codex[section][id] = true;
    }
  }
  return out;
}

/**
 * Dice si se puede comprar un mercader y, si no, por qué.
 * @param {object} profile
 * @param {object} merchant
 */
export function canBuyMerchant(profile, merchant) {
  if (profile.merchants.includes(merchant.id)) return { ok: false, error: 'Ya lo tenés.' };
  if (merchant.requires && !profile.achievements[merchant.requires]) {
    return { ok: false, error: `Primero conseguí el logro «${ACHIEVEMENTS_BY_ID[merchant.requires].name}».` };
  }
  if (profile.seals < merchant.cost) return { ok: false, error: `Te faltan ${merchant.cost - profile.seals} sellos.` };
  return { ok: true };
}

/**
 * Compra un mercader con sellos.
 * @param {object} profile se modifica
 * @param {string} id
 */
export function buyMerchant(profile, id) {
  const m = MERCHANTS_BY_ID[id];
  if (!m) return { ok: false, error: 'No existe.' };
  const can = canBuyMerchant(profile, m);
  if (!can.ok) return can;
  profile.seals -= m.cost;
  profile.merchants.push(id);
  return { ok: true };
}

/**
 * Compra el siguiente nivel de una mejora.
 * @param {object} profile se modifica
 * @param {string} id
 */
export function buyUpgrade(profile, id) {
  const up = UPGRADES_BY_ID[id];
  if (!up) return { ok: false, error: 'No existe.' };
  const lvl = profile.upgrades[id] ?? 0;
  if (lvl >= up.costs.length) return { ok: false, error: 'Ya está al máximo.' };
  if (profile.seals < up.costs[lvl]) return { ok: false, error: `Te faltan ${up.costs[lvl] - profile.seals} sellos.` };
  profile.seals -= up.costs[lvl];
  profile.upgrades[id] = lvl + 1;
  return { ok: true };
}

/**
 * Pasa al códice del perfil lo visto en una temporada.
 * @param {object} profile se modifica
 * @param {object} seen state.seen
 */
export function mergeSeen(profile, seen) {
  for (const section of Object.keys(CODEX)) {
    for (const id of Object.keys(seen[section] ?? {})) profile.codex[section][id] = true;
  }
}

/**
 * Suma una temporada terminada al perfil: sellos, récords, códice y
 * logros nuevos. Sólo cuenta una vez por temporada.
 * @param {object} profile se modifica
 * @param {{state:object, map:object}} game
 * @returns {{newAchievements:string[], unlocked:string[]}} unlocked: ids de región
 *   abiertas y 'pesadilla' si se habilitó
 */
export function recordSeason(profile, game) {
  const { state, map } = game;
  const over = state.over;
  if (!over || over.recorded) return { newAchievements: over?.newAchievements ?? [], unlocked: over?.unlocked ?? [] };
  // El modo libre no cuenta; el desafío cuenta sólo la primera vez del día.
  mergeSeen(profile, state.seen);
  profile.history = [{
    region: state.region ?? 'desierto', difficulty: state.difficulty, mode: state.mode ?? 'temporada',
    score: Math.round(over.score), won: over.won, rivalGold: over.rivalGold ?? null, day: over.day,
  }, ...profile.history].slice(0, PROFILE_HISTORY);
  const region = state.region ?? 'desierto';
  if ((state.chronicle?.step ?? 0) >= 3 && !profile.chronicles.includes(region)) {
    profile.chronicles = REGIONS.map((r) => r.id).filter((id) => id === region || profile.chronicles.includes(id));
  }
  if (state.mode === 'diario') {
    over.official = profile.daily?.date !== state.daily;
    if (over.official) profile.daily = { date: state.daily, score: over.score };
  }
  if (state.mode === 'libre' || over.official === false) {
    over.recorded = true;
    over.unlocked = [];
    return { newAchievements: [], unlocked: [] };
  }
  profile.seasons += 1;
  const unlocked = [];
  if (over.won) {
    profile.wins += 1;
    if (!profile.wonIn.includes(region)) profile.wonIn = REGIONS.map((r) => r.id).filter((id) => id === region || profile.wonIn.includes(id));
    unlocked.push(...unlockNext(profile, state));
  }
  profile.seals += over.seals;
  profile.totalSeals += over.seals;
  profile.bestScore = Math.max(profile.bestScore, Math.max(0, over.score));
  const ctx = { state, map, over, profile };
  const fresh = ACHIEVEMENTS.filter((a) => !profile.achievements[a.id] && a.check(ctx)).map((a) => a.id);
  for (const id of fresh) profile.achievements[id] = true;
  over.recorded = true;
  over.newAchievements = fresh;
  over.unlocked = unlocked;
  return { newAchievements: fresh, unlocked };
}

/**
 * Dice si el perfil ya puede jugar esa región en esa dificultad.
 * @param {object} profile
 * @param {string} regionId
 * @param {string} difficultyId
 */
export function canPlay(profile, regionId, difficultyId) {
  if (!profile.regions.includes(regionId) || !Object.hasOwn(DIFFICULTIES, difficultyId)) return false;
  return DIFFICULTIES[difficultyId].unlock !== 'hardWin' || profile.hardWin;
}

/**
 * Ganar una temporada desbloquea la región siguiente (en el orden de la
 * lista); ganar en Difícil o Pesadilla habilita la Pesadilla.
 * @returns {string[]} lo que se abrió recién
 */
function unlockNext(profile, state) {
  const out = [];
  const i = REGIONS.findIndex((r) => r.id === (state.region ?? 'desierto'));
  const next = REGIONS[i + 1];
  if (next && !profile.regions.includes(next.id)) {
    profile.regions = REGIONS.map((r) => r.id).filter((id) => id === next.id || profile.regions.includes(id));
    out.push(next.id);
  }
  if ((state.difficulty === 'dificil' || state.difficulty === 'pesadilla') && !profile.hardWin) {
    profile.hardWin = true;
    out.push('pesadilla');
  }
  return out;
}

/** Suma de control de un texto (base 36). */
function checksum(text) {
  return hashString(text, 4870).toString(36);
}

/** base64 "para URL" (sin +, / ni =). */
const toB64 = (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

/**
 * Código de progreso: "DL1-<datos>-<suma de control>".
 * @param {object} profile
 */
export function encodeProgress(profile) {
  const body = toB64(JSON.stringify(validateProfile(profile)));
  return `DL1-${body}-${checksum(body)}`;
}

/**
 * Lee un código de progreso. Rechaza códigos rotos o tocados a mano.
 * @param {string} code
 * @returns {{ok:true, profile:object}|{ok:false, error:string}}
 */
export function decodeProgress(code) {
  const parts = String(code).trim().split('-');
  if (parts.length !== 3 || parts[0] !== 'DL1') return { ok: false, error: 'Ese texto no es un código de Dune Ledger.' };
  const [, body, sum] = parts;
  if (checksum(body) !== sum) return { ok: false, error: 'El código está incompleto o fue modificado.' };
  try {
    return { ok: true, profile: validateProfile(safeParse(fromB64(body))) };
  } catch {
    return { ok: false, error: 'El código está roto.' };
  }
}

/** Mercaderes en el orden de la tienda. */
export const MERCHANT_LIST = MERCHANTS;
/** Mejoras en el orden de la tienda. */
export const UPGRADE_LIST = UPGRADES;
