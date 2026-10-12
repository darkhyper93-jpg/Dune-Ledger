/**
 * Ranking online del desafío del día (Supabase, por su API REST pública).
 *
 * La base sólo acepta puntajes del día, con el código de puntaje que les
 * corresponde, un apodo limpio y una sola partida por dispositivo y por día;
 * nadie puede cambiar ni borrar nada (ver docs/DECISIONES.md). La clave que
 * va acá es la pública: está hecha para ir en el navegador.
 */

import { scoreCode } from '../game/daily.js';

/** Dónde está el ranking. */
export const RANKING = {
  url: 'https://vqnhkbdudyfsdryoxisw.supabase.co',
  key: 'sb_publishable_ZVdWJwMUHPDwYGLfIxSDKw_nSAILLQq',
};

/** Servidor que nunca existe (dominio reservado .invalid). */
export const TEST_URL = 'https://ranking.invalid';

/**
 * A qué servidor se le habla. Si el navegador lo maneja un programa de
 * pruebas (navigator.webdriver), nunca a la base real: así ninguna prueba
 * puede publicar puntajes de mentira aunque falle su servidor simulado.
 * @param {{webdriver?:boolean}} [nav]
 */
export function endpoint(nav = globalThis.navigator) {
  return nav?.webdriver ? TEST_URL : RANKING.url;
}

/** Cuántos puestos se muestran. */
const TOP = 20;
/** Clave del id de este dispositivo en el almacenamiento. */
const DEVICE_KEY = 'dune-ledger:dispositivo';
/** Mismo formato de apodo que exige la base. */
const NICK = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 _.-]{3,16}$/;

/**
 * Limpia un apodo (espacios de más) y lo valida; null si no sirve.
 * @param {string} raw
 */
export function cleanNickname(raw) {
  const nick = String(raw ?? '').trim().replace(/\s+/g, ' ');
  return NICK.test(nick) ? nick : null;
}

/**
 * Id al azar de este dispositivo (se crea la primera vez y queda guardado).
 * Sirve para que la base acepte una sola partida por día y por dispositivo.
 * @param {Storage} [storage]
 */
export function deviceId(storage = globalThis.localStorage) {
  let id = null;
  try {
    id = storage?.getItem(DEVICE_KEY) ?? null;
  } catch {
    id = null;
  }
  if (id && /^[0-9a-f]{32}$/.test(id)) return id;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  try {
    storage?.setItem(DEVICE_KEY, id);
  } catch {
    // Sin almacenamiento, el id dura lo que dura la página.
  }
  return id;
}

/**
 * Encabezados de la API pública. La clave publicable va sólo en `apikey`:
 * si además se manda como `Authorization: Bearer`, Supabase la intenta leer
 * como JWT y rechaza el pedido.
 */
function headers(extra = {}) {
  return { apikey: RANKING.key, ...extra };
}

/**
 * Publica el puntaje oficial del desafío.
 * @param {{date:string, nickname:string, score:number}} entry
 * @param {{fetchImpl?:Function, storage?:Storage}} [deps]
 * @returns {Promise<{ok:true}|{ok:false, error:string}>}
 */
export async function submitScore({ date, nickname, score }, { fetchImpl = globalThis.fetch, storage } = {}) {
  const nick = cleanNickname(nickname);
  if (!nick) return { ok: false, error: 'El apodo tiene que tener de 3 a 16 letras, números, espacios, puntos o guiones.' };
  const s = Math.max(0, Math.round(score));
  const body = { day: date, nickname: nick, score: s, code: scoreCode(date, s), device: deviceId(storage) };
  try {
    const res = await fetchImpl(`${endpoint()}/rest/v1/daily_scores`, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    });
    if (res.ok) return { ok: true };
    if (res.status === 409) return { ok: false, error: 'Desde este celular ya se publicó un puntaje de hoy.' };
    return { ok: false, error: 'El ranking no aceptó el puntaje. Puede que el desafío sea de otro día.' };
  } catch {
    return { ok: false, error: 'Sin conexión: probá de nuevo cuando tengas internet.' };
  }
}

/**
 * Los mejores puntajes de un día.
 * @param {string} date AAAA-MM-DD
 * @param {{fetchImpl?:Function}} [deps]
 * @returns {Promise<{ok:true, rows:{nickname:string, score:number}[]}|{ok:false, error:string}>}
 */
export async function fetchTop(date, { fetchImpl = globalThis.fetch } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Fecha inválida.' };
  const q = `select=nickname,score&day=eq.${date}&order=score.desc,created_at.asc&limit=${TOP}`;
  try {
    const res = await fetchImpl(`${endpoint()}/rest/v1/daily_scores?${q}`, { headers: headers() });
    if (!res.ok) return { ok: false, error: 'No se pudo leer el ranking.' };
    const data = await res.json();
    const rows = (Array.isArray(data) ? data : [])
      .filter((r) => r && typeof r.nickname === 'string' && Number.isInteger(r.score))
      .map((r) => ({ nickname: r.nickname, score: r.score }));
    return { ok: true, rows };
  } catch {
    return { ok: false, error: 'Sin conexión: el ranking se ve cuando tengas internet.' };
  }
}
