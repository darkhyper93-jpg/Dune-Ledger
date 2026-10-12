/**
 * Vibración corta para momentos importantes (sólo en celulares que la
 * soportan, como Android; en iPhone el navegador no deja). Se puede apagar
 * en Ajustes.
 */

let enabled = true;

/** Patrones de vibración (en milisegundos: vibra, pausa, vibra…). */
const PATTERNS = {
  coin: [12],
  event: [20, 60, 20],
  bad: [60],
  win: [30, 50, 30, 50, 80],
};

/**
 * Prende o apaga la vibración.
 * @param {boolean} on
 */
export function setHaptics(on) {
  enabled = on;
}

/**
 * Vibra con el patrón pedido, si se puede y está prendida.
 * @param {'coin'|'event'|'bad'|'win'} kind
 */
export function buzz(kind) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Algunos navegadores tiran error si la página no tiene foco: no importa.
  }
}

/**
 * Aplica el tamaño de texto y el contraste elegidos a toda la página.
 * @param {{text:string, contrast:boolean, vibrate:boolean}} settings
 */
export function applyComfort(settings) {
  setHaptics(settings.vibrate);
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.text = settings.text;
  if (settings.contrast) root.dataset.contrast = 'alto';
  else delete root.dataset.contrast;
}
