/**
 * Instalar el juego en el celular (como app, con su ícono).
 *
 * En Android (Chrome, Edge, Brave, Samsung) el navegador avisa con el
 * evento `beforeinstallprompt`: lo guardamos y el botón "Instalar" muestra
 * el cartel del navegador. En iPhone no hay ese cartel: se instala desde
 * Compartir → "Agregar a inicio", así que el juego explica los pasos.
 */

let deferred = null;
const listeners = new Set();

/** Avisa que cambió si se puede instalar con un toque. */
function notify() {
  for (const fn of listeners) fn();
}

/**
 * Empieza a escuchar al navegador. Hay que llamarlo apenas carga la página:
 * el evento sale una sola vez.
 */
export function listenInstall() {
  globalThis.addEventListener?.('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  globalThis.addEventListener?.('appinstalled', () => {
    deferred = null;
    notify();
  });
}

/** Dice si el juego ya está abierto como app instalada. */
export function isInstalled() {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches || globalThis.navigator?.standalone === true;
}

/** Dice si el navegador dejó instalar con un toque (Android). */
export function canPromptInstall() {
  return deferred !== null;
}

/** Dice si es un iPhone o iPad (allá se instala desde Compartir). */
export function isIOS() {
  const nav = globalThis.navigator ?? {};
  return /iPhone|iPad|iPod/.test(nav.userAgent ?? '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
}

/**
 * Muestra el cartel de instalación del navegador.
 * @returns {Promise<boolean>} si la persona aceptó
 */
export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  e.prompt();
  const choice = await e.userChoice.catch(() => ({ outcome: 'dismissed' }));
  notify();
  return choice.outcome === 'accepted';
}

/**
 * Escucha cuándo cambia si se puede instalar con un toque.
 * @param {() => void} fn
 */
export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
