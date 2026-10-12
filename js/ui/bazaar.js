/**
 * Bazar de equipo (en la pestaña Provisiones) y lista del equipo que ya
 * lleva la caravana (en la pantalla Caravana).
 */

import { h } from './dom.js';
import { GEAR } from '../data/gear.js';
import { gearHere, buyGear, hasGear } from '../game/gear.js';
import { gearSvg } from '../render/gear-art.js';
import { svgNode } from '../render/shapes.js';
import { playCoins } from '../core/audio.js';
import { fmt } from '../core/text.js';
import { hintCard } from './coach.js';

/** Dibujo de un objeto del bazar. */
function gearArt(id, size = 48) {
  return h('span', { class: 'goodart', style: `width:${size}px;height:${size}px`, 'aria-hidden': 'true' }, svgNode(gearSvg(id)));
}

/**
 * Lo que vende el bazar de esta ciudad.
 * @param {object} app
 */
export function bazaarCard(app) {
  const { state } = app.game;
  const items = gearHere(app.game);
  if (!items.length) return null;
  return h('div', { class: 'card stack', 'data-testid': 'bazaar' },
    hintCard(app, 'bazar'),
    h('h3', {}, 'Bazar de equipo'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Se compra una vez y sirve hasta el final de la temporada.'),
    items.map((it) => {
      const owned = hasGear(state, it.id);
      return h('div', { class: 'gear-row' },
        gearArt(it.id),
        h('div', { class: 'grow' }, h('b', {}, it.name), h('div', { class: 'small muted' }, it.desc)),
        owned
          ? h('span', { class: 'pill' }, 'Ya lo tenés')
          : h('button', { class: 'btn small', 'data-testid': `gear-${it.id}`, disabled: state.gold < it.price, onclick: () => {
            const res = app.act((g) => buyGear(g, it.id));
            if (res.ok) {
              playCoins(40);
              app.toast(`¡${it.name} para la caravana!`);
            }
          } }, `${fmt(it.price)} de oro`));
    }));
}

/**
 * Equipo que ya lleva la caravana (o null si no tiene nada).
 * @param {object} app
 */
export function gearOwnedCard(app) {
  const { state } = app.game;
  const owned = GEAR.filter((it) => hasGear(state, it.id));
  if (!owned.length) return null;
  return h('div', { class: 'card stack', 'data-testid': 'gear-owned' },
    h('h3', {}, 'Equipo'),
    owned.map((it) => h('div', { class: 'gear-row' }, gearArt(it.id, 40), h('div', { class: 'grow' }, h('b', {}, it.name), h('div', { class: 'small muted' }, it.desc)))));
}
