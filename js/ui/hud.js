/**
 * Barra fija de arriba: día, oro, carga, comida, agua, camellos (con su
 * salud), moral de la tripulación y la próxima cuota del Gremio. Lo que está por faltar se pinta en rojo.
 */

import { h, mount } from './dom.js';
import { RULES } from '../data/rules.js';
import { cargoUsed, capacity } from '../game/caravan.js';
import { nextDue } from '../game/season.js';
import { dailyRation } from '../game/travel.js';
import { avgHealth } from '../game/camels.js';
import { fmt, plural } from '../core/text.js';

/**
 * Un dato de la barra: etiqueta chica y valor.
 */
function item(label, value, warn = false, testId = null) {
  return h('div', { class: `hud-item${warn ? ' warn' : ''}`, 'data-testid': testId }, h('span', { class: 'muted tiny' }, label), h('b', {}, value));
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
  const morale = state.crew.length ? Math.round(state.crew.reduce((sum, m) => sum + m.morale, 0) / state.crew.length) : 0;
  let dueLine = h('div', { class: 'hud-due' }, h('span', {}, '¡Deuda saldada! Podés retirarte cuando quieras.'));
  if (due) {
    const left = due.day - state.day;
    const urgent = left <= 5 && state.gold < due.owed;
    dueLine = h('div', { class: `hud-due${urgent ? ' urgent' : ''}`, 'data-testid': 'hud-due' },
      h('span', {}, `Próxima cuota: ${fmt(due.owed)} el día ${due.day}`),
      h('span', {}, left > 0 ? `faltan ${plural(left, 'día', 'días')}` : 'vence hoy'));
  }
  mount(el,
    item('Día', `${state.day}/${RULES.seasonDays}`, false, 'hud-day'),
    item('Oro', fmt(state.gold), false, 'hud-gold'),
    item('Carga', `${cargoUsed(state)}/${capacity(state)}`, false, 'hud-cargo'),
    item('Comida', String(state.food), state.food < ration * 2, 'hud-food'),
    item('Agua', String(state.water), state.water < ration * 2, 'hud-water'),
    item('Camellos', `${state.camels} · ${avgHealth(state)}%`, avgHealth(state) < 30, 'hud-camels'),
    state.crew.length ? item('Moral', String(morale), morale < 35, 'hud-morale') : null,
    dueLine);
}
