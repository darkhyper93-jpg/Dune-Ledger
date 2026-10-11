/**
 * Tarjeta del tutorial: el consejo que toca en esta pantalla, con un botón
 * para saltearlo (o "Entendido" en el último). Desaparece para siempre
 * cuando el perfil marca `tutorialDone`.
 */

import { h } from './dom.js';
import { tutorialTip } from '../game/tutorial.js';
import { svgNode } from '../render/shapes.js';
import { goodSvg } from '../render/goods-art.js';

/**
 * Consejo del tutorial para una pantalla, o null si no toca ninguno.
 * @param {object} app
 * @param {string} screen
 * @returns {{id:string, text:string, final:boolean}|null}
 */
export function currentTip(app, screen) {
  if (app.profile.tutorialDone) return null;
  return tutorialTip(app.game?.state ?? null, screen);
}

/** Apaga el tutorial y redibuja. */
function finish(app, text) {
  app.profile.tutorialDone = true;
  app.saveAll();
  app.toast(text);
  app.render();
}

/**
 * Tarjeta del consejo actual (o null).
 * @param {object} app
 * @param {string} screen
 */
export function coachCard(app, screen) {
  const tip = currentTip(app, screen);
  if (!tip) return null;
  return h('aside', { class: 'coach', 'data-testid': `coach-${tip.id}`, 'aria-label': 'Consejo' },
    h('span', { class: 'coach-badge', 'aria-hidden': 'true' }, svgNode(goodSvg('libros'))),
    h('div', { class: 'coach-body' },
      h('p', {}, tip.text),
      tip.final
        ? h('button', { class: 'btn small primary', 'data-testid': 'coach-done', onclick: () => finish(app, 'Listo: ya sabés lo básico.') }, 'Entendido')
        : h('button', { class: 'linkish', 'data-testid': 'coach-skip', onclick: () => finish(app, 'Tutorial apagado.') }, 'Saltear tutorial')));
}
