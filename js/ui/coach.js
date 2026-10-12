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

/** Textos de los consejos que aparecen una sola vez, la primera vez que ves algo. */
const HINTS = {
  kasim: 'Este es Kasim, la caravana rival. Si anda cerca, acá te cuentan adónde va: no vayas a vender lo mismo que él justo después.',
  cronica: 'Cada región tiene una crónica: una historia en tres capítulos que avanza mientras comerciás y da buenas recompensas.',
  bazar: 'En el bazar se compra equipo que sirve toda la temporada. Cada tipo de ciudad vende cosas distintas.',
  invertir: 'Podés invertir en las ciudades: lo que pongas te da descuentos ahí y el mercado se repone más rápido.',
  clima: 'Cada temporada tiene su clima, que cambia los eventos y algunos precios. Lo ves en la cabecera de cada ciudad: tocalo para ver qué hace.',
};

/**
 * Consejo de una sola vez (o null si ya lo viste o el tutorial está en curso).
 * @param {object} app
 * @param {'kasim'|'cronica'|'bazar'|'invertir'|'clima'} id
 */
export function hintCard(app, id) {
  const p = app.profile;
  if (!p.tutorialDone || p.hints?.[id]) return null;
  return h('aside', { class: 'coach hint', 'data-testid': `hint-${id}`, 'aria-label': 'Consejo' },
    h('span', { class: 'coach-badge', 'aria-hidden': 'true' }, svgNode(goodSvg('libros'))),
    h('div', { class: 'coach-body' },
      h('p', {}, HINTS[id]),
      h('button', { class: 'linkish', onclick: () => {
        p.hints = { ...p.hints, [id]: true };
        app.saveAll();
        app.render();
      } }, 'Entendido')));
}
