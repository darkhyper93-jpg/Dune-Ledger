/**
 * Tarjeta del mapa del tesoro: los pedazos que tenés, lo que dicen y, en la
 * Taberna, el botón para comprar un rumor de dónde está el más cercano.
 */

import { h } from './dom.js';
import { svgNode } from '../render/shapes.js';
import { treasureMapSvg } from '../render/treasure-art.js';
import { treasureClue, buyRumor, mapComplete, RUMOR_PRICE, TREASURE_PIECES } from '../game/treasure.js';
import { fmt } from '../core/text.js';
import { playCoins } from '../core/audio.js';

/**
 * Tarjeta del tesoro (null en partidas viejas, que no tienen).
 * @param {object} app
 * @param {{rumor?:boolean}} [opts] rumor: mostrar el botón para comprar uno
 * @returns {HTMLElement|null}
 */
export function treasureCard(app, { rumor = false } = {}) {
  const { state, map } = app.game;
  const t = state.treasure;
  if (!t) return null;
  const n = t.found.length;
  const clue = treasureClue(app.game);
  const canRumor = rumor && !t.dug && !mapComplete(state) && !t.hint;
  return h('div', { class: 'card treasure', 'data-testid': 'treasure' },
    h('span', { class: 'treasure-art', 'aria-hidden': 'true' }, svgNode(treasureMapSvg(t.dug ? TREASURE_PIECES : n))),
    h('div', { class: 'stack', style: 'gap:4px' },
      h('h3', {}, 'Mapa del tesoro'),
      h('p', { class: 'small muted', style: 'margin:0', 'data-testid': 'treasure-pieces' },
        t.dug ? 'Tesoro desenterrado' : `${n} de ${TREASURE_PIECES} pedazos`),
      h('p', { class: 'small', style: 'margin:0', 'data-testid': 'treasure-clue' }, clue.text),
      t.hint ? h('p', { class: 'small', style: 'margin:0', 'data-testid': 'treasure-hint' },
        h('b', {}, 'Rumor: '), `hay un pedazo en ${map.cityById[t.hint].name}. Está marcado en el mapa.`) : null,
      canRumor ? h('button', { class: 'btn small', 'data-testid': 'buy-rumor', disabled: state.gold < RUMOR_PRICE, onclick: () => {
        const res = app.act((g) => buyRumor(g));
        if (res.ok) {
          playCoins(10);
          app.toast(`Hay un pedazo en ${map.cityById[res.cityId].name}: ya está marcado en el mapa.`);
        }
      } }, `Pagar un rumor: ¿dónde hay un pedazo? (${fmt(RUMOR_PRICE)} de oro)`) : null));
}
