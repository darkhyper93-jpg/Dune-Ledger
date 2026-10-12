/**
 * Guardado en el navegador (localStorage).
 *
 * Se guardan tres cosas por separado: la temporada en curso (después de
 * cada acción), el perfil (sellos y récords entre temporadas) y los ajustes.
 * Todo lo que se lee se valida: JSON con claves peligrosas (__proto__,
 * constructor, prototype) se rechaza, y la partida pasa por validateState.
 * Si el almacenamiento no está disponible (modo privado), el juego sigue
 * funcionando sin guardar.
 */

import { validateState } from '../game/validate.js';
import { safeParse } from './json.js';
import { defaultProfile, validateProfile } from '../game/profile.js';

export const KEYS = {
  season: 'dune-ledger:temporada',
  profile: 'dune-ledger:perfil',
  settings: 'dune-ledger:ajustes',
};

export { safeParse };

/**
 * Devuelve el almacenamiento disponible o null.
 * @param {Storage} [store] para pruebas
 */
function storage(store) {
  if (store) return store;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Lee y parsea una clave; null si no hay nada o si está rota.
 * @param {string} key
 * @param {Storage} [store]
 */
function readJson(key, store) {
  const s = storage(store);
  if (!s) return null;
  try {
    const text = s.getItem(key);
    return text === null ? null : safeParse(text);
  } catch {
    return null;
  }
}

/**
 * Escribe un valor como JSON; devuelve false si no se pudo.
 * @param {string} key
 * @param {unknown} value
 * @param {Storage} [store]
 */
function writeJson(key, value, store) {
  const s = storage(store);
  if (!s) return false;
  try {
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda la temporada en curso.
 * @param {{state:object}} game
 * @param {Storage} [store]
 */
export function saveSeason(game, store) {
  return writeJson(KEYS.season, game.state, store);
}

/**
 * Carga y valida la temporada guardada.
 * @param {Storage} [store]
 * @returns {{map:object,state:object}|null}
 */
export function loadSeason(store) {
  const raw = readJson(KEYS.season, store);
  if (raw === null) return null;
  const res = validateState(raw);
  return res.ok ? res.game : null;
}

/**
 * Borra la temporada guardada.
 * @param {Storage} [store]
 */
export function clearSeason(store) {
  const s = storage(store);
  try {
    s?.removeItem(KEYS.season);
  } catch {
    /* sin almacenamiento: no hay nada que borrar */
  }
}

export { defaultProfile, validateProfile };

/** @param {Storage} [store] */
export function loadProfile(store) {
  return validateProfile(readJson(KEYS.profile, store));
}

/** @param {object} profile @param {Storage} [store] */
export function saveProfile(profile, store) {
  return writeJson(KEYS.profile, validateProfile(profile), store);
}

/** Ajustes por defecto: volúmenes de 0 a 1. */
export function defaultSettings() {
  return { music: 0.5, sfx: 0.8, vibrate: true, text: 'normal', contrast: false };
}

/** Tamaños de texto que se pueden elegir. */
export const TEXT_SIZES = ['normal', 'grande', 'muy-grande'];

/**
 * Valida ajustes leídos.
 * @param {unknown} raw
 */
export function validateSettings(raw) {
  const d = defaultSettings();
  if (typeof raw !== 'object' || raw === null) return d;
  const vol = (v, def) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : def);
  return {
    music: vol(raw.music, d.music),
    sfx: vol(raw.sfx, d.sfx),
    vibrate: typeof raw.vibrate === 'boolean' ? raw.vibrate : d.vibrate,
    text: TEXT_SIZES.includes(raw.text) ? raw.text : d.text,
    contrast: typeof raw.contrast === 'boolean' ? raw.contrast : d.contrast,
  };
}

/** @param {Storage} [store] */
export function loadSettings(store) {
  return validateSettings(readJson(KEYS.settings, store));
}

/** @param {object} settings @param {Storage} [store] */
export function saveSettings(settings, store) {
  return writeJson(KEYS.settings, validateSettings(settings), store);
}
