/**
 * Actualizaciones de la app instalada (service worker).
 *
 * Cuando hay una versión nueva, se instala en segundo plano y se aplica
 * sola recién cuando el jugador vuelve al menú, para no cortar una partida.
 * El botón "Actualizar" de Ajustes fuerza la búsqueda y, si algo se trabó,
 * borra el caché y recarga.
 */

let registration = null;
let waiting = null;
let inMenu = false;

/** Activa el service worker que espera y recarga cuando toma el control. */
function applyWaiting() {
  if (!waiting) return false;
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
  waiting.postMessage({ type: 'SKIP_WAITING' });
  waiting = null;
  return true;
}

/** Recuerda un worker nuevo listo; si estamos en el menú, lo aplica ya. */
function onWaiting(worker) {
  waiting = worker;
  if (inMenu) applyWaiting();
}

/**
 * Registra el service worker (sólo si el navegador lo soporta y no es file://).
 */
export async function registerUpdates() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  try {
    registration = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    if (registration.waiting && navigator.serviceWorker.controller) onWaiting(registration.waiting);
    registration.addEventListener('updatefound', () => {
      const nw = registration.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) onWaiting(nw);
      });
    });
  } catch {
    /* sin service worker el juego funciona igual, sólo que no offline */
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
  } finally {
    location.reload();
  }
}
