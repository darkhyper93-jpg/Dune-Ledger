/**
 * Barra fija de arriba: día, oro, carga, comida, agua, camellos (con su
 * salud), moral de la tripulación y la próxima cuota del Gremio. Lo que está por faltar se pinta en rojo.
 */

import { h, mount } from './dom.js';
import { RULES } from '../data/rules.js';
import { cargoUsed, capacity, mountName } from '../game/caravan.js';
import { nextDue } from '../game/season.js';
import { dailyRation } from '../game/travel.js';
import { avgHealth } from '../game/camels.js';
import { fmt, plural } from '../core/text.js';
import { iconSvg } from '../render/ui-icons.js';
import { svgNode } from '../render/shapes.js';

/** Oro de la última vez que se dibujó la barra (para mostrar cuánto cambió). */
let last = { seed: null, gold: null };

/**
 * Un dato de la barra: etiqueta chica y valor (y, si hay, un cartelito que
 * sube con lo que cambió, como +120 al vender).
 */
function item(icon, label, value, warn = false, testId = null, delta = null) {
  return h('div', { class: `hud-item ${icon}${warn ? ' warn' : ''}`, 'data-testid': testId, title: label },
    h('span', { class: 'hico' }, svgNode(iconSvg(icon))), h('span', { class: 'lbl' }, `${label}:`), h('b', {}, value),
    delta ? h('span', { class: `delta ${delta > 0 ? 'up' : 'down'}`, 'aria-hidden': 'true' }, `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}`) : null);
}

/**
 * Dibuja la barra con el estado actual.
 * @param {HTMLElement} el
 * @param {{state:object}} game
 */
export function renderHud(el, game) {
  const { state } = game;
  const ration = dailyRation(state, 'food');
  const due = nextDue(state);
  const goldDelta = last.seed === state.seed && last.gold !== null ? state.gold - last.gold : 0;
  last = { seed: state.seed, gold: state.gold };
  const morale = state.crew.length ? Math.round(state.crew.reduce((sum, m) => sum + m.morale, 0) / state.crew.length) : 0;
  const calm = state.mode === 'libre' ? 'Modo libre: sin deuda ni apuro. Cerrá cuando quieras.' : '¡Deuda saldada! Podés retirarte cuando quieras.';
  let dueLine = h('div', { class: 'hud-due', 'data-testid': 'hud-due' }, h('span', { class: 'hico' }, svgNode(iconSvg('debt'))), h('span', { class: 'grow' }, calm));
  if (due) {
    const left = due.day - state.day;
    const urgent = left <= 5 && state.gold < due.owed;
    dueLine = h('div', { class: `hud-due${urgent ? ' urgent' : ''}`, 'data-testid': 'hud-due' },
      h('span', { class: 'hico' }, svgNode(iconSvg('debt'))),
      h('span', { class: 'grow' }, `Cuota de ${fmt(due.owed)} el día ${due.day}`),
      h('span', {}, left > 0 ? `faltan ${plural(left, 'día', 'días')}` : 'vence hoy'));
  }
  mount(el,
    item('day', 'Día', state.mode === 'libre' ? String(state.day) : `${state.day}/${RULES.seasonDays}`, false, 'hud-day'),
    item('gold', 'Oro', fmt(state.gold), false, 'hud-gold', goldDelta),
    item('cargo', 'Carga', `${cargoUsed(state)}/${capacity(state)}`, false, 'hud-cargo'),
    item('food', 'Comida', String(state.food), state.food < ration * 2, 'hud-food'),
    item('water', 'Agua', String(state.water), state.water < ration * 2, 'hud-water'),
    item('camel', mountName(state, 2, true), `${state.camels} (${avgHealth(state)}%)`, avgHealth(state) < 30, 'hud-camels'),
    state.crew.length ? item('morale', 'Moral', String(morale), morale < 35, 'hud-morale') : null,
    state.loan ? item('loan', 'Préstamo', fmt(state.loan), true, 'hud-loan') : null,
    dueLine);
}
