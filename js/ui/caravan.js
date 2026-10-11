/**
 * Pantallas Caravana (camellos, carga, deuda) y Diario (lo que pasó cada día).
 */

import { h } from './dom.js';
import { getGood, ACTIVE_GOODS } from '../data/goods.js';
import { RULES } from '../data/rules.js';
import { cargoUsed, capacity } from '../game/caravan.js';
import { dailyRation } from '../game/travel.js';
import { totalOwed } from '../game/debt.js';
import { fmt, plural } from '../core/text.js';

/**
 * Pantalla de la caravana.
 * @param {object} app
 */
export function renderCaravan(app) {
  const { state } = app.game;
  const ration = dailyRation(state);
  const cargo = ACTIVE_GOODS.filter((id) => state.cargo[id] > 0);
  return h('div', { class: 'stack' },
    h('h1', {}, 'Tu caravana'),
    h('div', { class: 'card stack' },
      h('dl', { class: 'kv' },
        h('dt', {}, 'Camellos'), h('dd', {}, `${state.camels} (lleva ${RULES.camelCapacity} c/u)`),
        h('dt', {}, 'Carga'), h('dd', {}, `${cargoUsed(state)} de ${capacity(state)}`),
        h('dt', {}, 'Gasto por día'), h('dd', {}, `${ration} de comida y ${ration} de agua`),
        h('dt', {}, 'Comida alcanza'), h('dd', {}, plural(Math.floor(state.food / ration), 'día', 'días')),
        h('dt', {}, 'Agua alcanza'), h('dd', {}, `${plural(Math.floor(state.water / ration), 'día', 'días')} (en piedra)`),
        h('dt', {}, 'Deuda que queda'), h('dd', {}, fmt(totalOwed(state.debt))),
        h('dt', {}, 'Faltas con el Gremio'), h('dd', { class: state.debt.strikes ? 'bad' : '' }, `${state.debt.strikes} de ${RULES.debt.maxStrikes}`))),
    h('h2', {}, 'Carga'),
    cargo.length
      ? h('div', { class: 'card' }, h('dl', { class: 'kv' }, cargo.map((id) => {
        const g = getGood(id);
        const fresh = g.decay ? ` · frescura ${Math.round((state.freshness[id] ?? 1) * 100)}%` : '';
        return [h('dt', {}, `${g.icon} ${g.name}`), h('dd', {}, `${state.cargo[id]} (peso ${state.cargo[id] * g.weight})${fresh}`)];
      })))
      : h('p', { class: 'muted' }, 'Los camellos van vacíos. Comprá algo barato en el Mercado.'),
    h('p', { class: 'muted small' }, 'Tripulación, salud de los camellos y moral llegan en la etapa 3.'));
}

/**
 * Pantalla del diario: lo último primero.
 * @param {object} app
 */
export function renderJournal(app) {
  const { state } = app.game;
  const items = state.log.slice().reverse().map((e) => h('li', { class: e.kind }, h('span', { class: 'd' }, `Día ${e.day}`), h('span', {}, e.text)));
  return h('div', { class: 'stack' },
    h('h1', {}, 'Diario'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Todo lo que pasó en la temporada. Sirve para aprender qué conviene.'),
    h('ul', { class: 'log', 'data-testid': 'journal' }, items));
}
