/**
 * Actualizaciones de la app instalada (service worker).
 *
 * - Al abrir la app y cada vez que vuelve de segundo plano (y cada 30
 *   minutos mientras se ve), busca si hay una versión nueva.
 * - La versión nueva se baja sola en segundo plano. Si estás en el menú, se
 *   aplica en el momento (recarga sola); si estás jugando, avisa con un
 *   cartel y un botón "Actualizar ahora" (la partida ya está guardada), y si
 *   no lo tocás se aplica la próxima vez que vuelvas al menú.
 * - Después de recargar por una actualización, la app lo dice ("¡Listo!").
 * - El botón "Actualizar" de Ajustes fuerza la búsqueda y, si algo se trabó,
 *   borra el caché y recarga.
 */

/** Marca (en la sesión) que la recarga fue por una actualización. */
const UPDATED_KEY = 'dune-ledger:actualizado';
/** Cada cuánto se busca una versión nueva mientras la app está a la vista. */
const CHECK_EVERY = 30 * 60 * 1000;
/** No buscar más seguido que esto (al volver de segundo plano varias veces). */
const MIN_GAP = 60 * 1000;

let registration = null;
let waiting = null;
let inMenu = false;
let lastCheck = 0;
const listeners = new Set();

/** Avisa a quien escuche que hay (o ya no hay) una versión nueva lista. */
function notify() {
  for (const fn of listeners) fn(!!waiting);
}

/**
 * Activa el service worker que espera y recarga cuando toma el control.
 * @returns {boolean} si había algo para aplicar
 */
function applyWaiting() {
  if (!waiting) return false;
  try {
    sessionStorage.setItem(UPDATED_KEY, '1');
  } catch {
    /* sin almacenamiento sólo no se muestra el "¡Listo!" */
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
  waiting = null;
  return true;
}

/** Recuerda un worker nuevo listo; en el menú lo aplica ya, si no, avisa. */
function onWaiting(worker) {
  waiting = worker;
  if (inMenu) applyWaiting();
  else notify();
}

/**
 * Busca una versión nueva (sin repetir la búsqueda muy seguido).
 * @param {boolean} [force] buscar aunque se haya buscado hace poco
 */
export async function checkForUpdate(force = false) {
  if (!registration || (!force && Date.now() - lastCheck < MIN_GAP)) return;
  lastCheck = Date.now();
  try {
    await registration.update();
  } catch {
    /* sin conexión: se vuelve a intentar más tarde */
  }
}

/**
 * Registra el service worker (sólo si el navegador lo soporta y no es file://).
 */
export async function registerUpdates() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    lastCheck = Date.now();
    if (registration.waiting && navigator.serviceWorker.controller) onWaiting(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const nw = registration.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) onWaiting(nw);
      });
    });
    // Al volver de segundo plano (o desbloquear el celular), buscar.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') checkForUpdate();
    }, CHECK_EVERY);
  } catch {
    /* sin service worker el juego funciona igual, sólo que no offline */
  }
}

/**
 * Escucha si hay una versión nueva lista para aplicar.
 * @param {(ready:boolean) => void} fn
 * @returns {() => void} para dejar de escuchar
 */
export function onUpdateReady(fn) {
  listeners.add(fn);
  if (waiting) fn(true);
  return () => listeners.delete(fn);
}

/** Aplica ya la versión nueva (recarga la app). */
export function applyUpdate() {
  return applyWaiting();
}

/**
 * Dice (una sola vez) si la app acaba de recargar por una actualización.
 * @returns {boolean}
 */
export function consumeUpdated() {
  try {
    const was = sessionStorage.getItem(UPDATED_KEY) === '1';
    sessionStorage.removeItem(UPDATED_KEY);
    return was;
  } catch {
    return false;
  }
}

/**
 * Avisa si el jugador está en el menú (ahí es seguro actualizar).
 * @param {boolean} value
 */
export function setInMenu(value) {
  inMenu = value;
  if (inMenu) applyWaiting();
}

/**
 * Botón "Actualizar": busca una versión nueva y la aplica; si no hay o
 * algo falla, borra cachés y recarga desde la red.
 * @returns {Promise<void>}
 */
export async function forceUpdate() {
  try {
    if (registration) {
      await registration.update();
      if (registration.waiting) {
        waiting = registration.waiting;
        if (applyWaiting()) return;
      }
    }
    if ('caches' in globalThis) {
      for (const key of await caches.keys()) await caches.delete(key);
    }
    await registration?.unregister();
    try {
      sessionStorage.setItem(UPDATED_KEY, '1');
    } catch {
      /* nada */
    }
  } finally {
    location.reload();
  }
}
