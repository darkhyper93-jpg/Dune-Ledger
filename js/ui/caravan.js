/**
 * Pantallas Caravana (camellos, tripulación, carga, contratos, reputación)
 * y Diario (lo que pasó cada día).
 */

import { h } from './dom.js';
import { getGood, ACTIVE_GOODS } from '../data/goods.js';
import { RULES } from '../data/rules.js';
import { cargoUsed, capacity } from '../game/caravan.js';
import { dailyRation } from '../game/travel.js';
import { totalOwed } from '../game/debt.js';
import { fmt, plural } from '../core/text.js';
import { ZONES } from '../game/reputation.js';
import { contractCard } from './tavern.js';
import { renderCamels, renderCrew } from './crew.js';
import { goodArt } from './art.js';

/**
 * Pantalla de la caravana.
 * @param {object} app
 */
export function renderCaravan(app) {
  const { state } = app.game;
  const ration = dailyRation(state, 'food');
  const water = dailyRation(state);
  const cargo = ACTIVE_GOODS.filter((id) => state.cargo[id] > 0);
  return h('div', { class: 'stack' },
    h('h1', {}, 'Tu caravana'),
    h('div', { class: 'card stack' },
      h('dl', { class: 'kv' },
        h('dt', {}, 'Camellos'), h('dd', {}, `${state.camels} (lleva ${RULES.camelCapacity} c/u)`),
        h('dt', {}, 'Carga'), h('dd', {}, `${cargoUsed(state)} de ${capacity(state)}`),
        h('dt', {}, 'Gasto por día'), h('dd', {}, `${ration} de comida y ${water} de agua`),
        h('dt', {}, 'Comida alcanza'), h('dd', {}, plural(Math.floor(state.food / ration), 'día', 'días')),
        h('dt', {}, 'Agua alcanza'), h('dd', {}, `${plural(Math.floor(state.water / water), 'día', 'días')} (en piedra)`),
        h('dt', {}, 'Deuda que queda'), h('dd', {}, fmt(totalOwed(state.debt))),
        h('dt', {}, 'Faltas con el Gremio'), h('dd', { class: state.debt.strikes ? 'bad' : '' }, `${state.debt.strikes} de ${RULES.debt.maxStrikes}`))),
    renderCamels(app),
    h('h2', {}, 'Tripulación'),
    renderCrew(app),
    h('h2', {}, 'Carga'),
    cargo.length
      ? h('div', { class: 'card' }, h('dl', { class: 'kv' }, cargo.map((id) => {
        const g = getGood(id);
        const fresh = g.decay ? ` · frescura ${Math.round((state.freshness[id] ?? 1) * 100)}%` : '';
        return [h('dt', { class: 'row', style: 'gap:8px' }, goodArt(id, 28), g.name), h('dd', {}, `${state.cargo[id]} (peso ${state.cargo[id] * g.weight})${fresh}`)];
      })))
      : h('p', { class: 'muted' }, 'Los camellos van vacíos. Comprá algo barato en el Mercado.'),
    h('h2', {}, 'Contratos'),
    state.contracts.active.length
      ? state.contracts.active.map((k) => contractCard(app, k, 'active'))
      : h('p', { class: 'muted' }, 'No tenés contratos. Buscalos en la Taberna o en el Gremio.'),
    h('h2', {}, 'Reputación'),
    h('div', { class: 'card stack' }, ZONES.map((z) => repRow(z, state.rep[z.id])),
      h('p', { class: 'muted small', style: 'margin:0' }, 'Con buena reputación comprás más barato y los bandidos de la zona a veces te dejan pasar. Con mala, todo cuesta más.')),
  );
}

/**
 * Una fila de reputación con barra de −100 a 100.
 */
function repRow(zone, rep) {
  const left = rep >= 0 ? 50 : 50 + rep / 2;
  const width = Math.abs(rep) / 2;
  return h('div', { class: 'stack', style: 'gap:4px' },
    h('div', { class: 'row between small' }, h('span', {}, zone.name), h('b', { class: rep > 0 ? 'good' : rep < 0 ? 'bad' : '' }, rep > 0 ? `+${rep}` : String(rep))),
    h('div', { class: 'rep-bar' }, h('span', { style: `left:${left}%;width:${width}%;background:${rep >= 0 ? 'var(--teal)' : 'var(--bad)'}` })));
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
