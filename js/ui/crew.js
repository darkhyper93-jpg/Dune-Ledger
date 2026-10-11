/**
 * Tarjetas de la caravana viva: salud de cada camello, la tripulación
 * (rol, rasgo, nivel, moral) y la gente para contratar en la taberna.
 */

import { h, openSheet } from './dom.js';
import { ROLES, TRAITS } from '../data/crew.js';
import { levelOf, hiresHere, hire, fire, MAX_CREW, DESERT_MORALE, LEVELS, WAGE_DAYS } from '../game/crew.js';
import { avgHealth } from '../game/camels.js';
import { fmt } from '../core/text.js';
import { mountName } from '../game/caravan.js';

/**
 * Barra de 0 a 100 con color según el valor.
 * @param {number} value
 * @param {string} label para lectores de pantalla
 */
export function bar(value, label) {
  const color = value < 30 ? 'var(--bad)' : value < 60 ? 'var(--gold)' : 'var(--teal)';
  return h('div', { class: 'rep-bar', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(value), 'aria-label': label },
    h('span', { style: `left:0;width:${value}%;background:${color}` }));
}

/**
 * Tarjeta con la salud de cada camello.
 * @param {object} app
 */
export function renderCamels(app) {
  const { state } = app.game;
  return h('div', { class: 'card stack', 'data-testid': 'camels' },
    h('div', { class: 'row between' }, h('h3', {}, mountName(state, 2, true)), h('span', { class: 'small muted' }, `salud promedio ${avgHealth(state)}%`)),
    state.camelHp.map((hp, i) => h('div', { class: 'stack', style: 'gap:4px' },
      h('div', { class: 'row between small' }, h('span', {}, `${mountName(state, 1, true)} ${i + 1}`), h('b', { class: hp < 30 ? 'bad' : '' }, `${hp}%`)),
      bar(hp, `Salud del ${mountName(state)} ${i + 1}`))),
    h('p', { class: 'muted small', style: 'margin:0' }, `Se cansan viajando (más en la montaña y sin agua) y se recuperan descansando en una ciudad. Un ${mountName(state)} sin salud muere.`));
}

/**
 * Lista de la tripulación con su moral, nivel y botón para despedir.
 * @param {object} app
 */
export function renderCrew(app) {
  const { state } = app.game;
  if (!state.crew.length) {
    return h('p', { class: 'muted' }, 'Viajás solo. En la Taberna podés contratar guías, guardias, cocineros y más.');
  }
  return h('div', { class: 'stack', 'data-testid': 'crew' }, state.crew.map((m) => {
    const lvl = levelOf(m);
    const next = lvl < 3 ? ` · nivel ${lvl + 1} a los ${LEVELS[lvl - 1]} días de viaje` : '';
    return h('div', { class: 'card stack', style: 'gap:6px' },
      h('div', { class: 'row between' }, h('b', {}, `${m.name} · ${ROLES[m.role].name}`), h('span', { class: 'pill' }, `Nivel ${lvl}`)),
      h('div', { class: 'small muted' }, `${TRAITS[m.trait].name}: ${TRAITS[m.trait].desc}`),
      h('div', { class: 'small' }, lvl >= 3 ? ROLES[m.role].lvl3 : ROLES[m.role].desc),
      h('div', { class: 'row between small' }, h('span', {}, 'Moral'), h('b', { class: m.morale < DESERT_MORALE ? 'bad' : '' }, `${m.morale}`)),
      bar(m.morale, `Moral de ${m.name}`),
      h('div', { class: 'row between small muted' }, h('span', {}, `Sueldo: ${fmt(m.wage)} cada ${WAGE_DAYS} días${next}`),
        h('button', { class: 'btn small ghost', onclick: () => confirmFire(app, m) }, 'Despedir')));
  }));
}

/** Pide confirmación para despedir. */
function confirmFire(app, m) {
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, `¿Despedir a ${m.name}?`),
    h('p', { class: 'muted' }, 'Se va con lo que sabe: la experiencia no vuelve.'),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: close }, 'No'),
      h('button', { class: 'btn primary', onclick: () => { close(); app.act((g) => fire(g, m.id)); } }, 'Sí, despedir'))), { label: 'Despedir' });
}

/**
 * Gente para contratar en la taberna de la ciudad actual.
 * @param {object} app
 */
export function renderHires(app) {
  const { state } = app.game;
  const list = hiresHere(app.game);
  const full = state.crew.length >= MAX_CREW;
  return h('div', { class: 'stack' },
    h('h3', {}, 'Gente para contratar'),
    h('p', { class: 'muted small', style: 'margin:0' }, `Llevás ${state.crew.length} de ${MAX_CREW}. Se paga la primera semana al contratar; también comen y toman agua.`),
    list.length ? list.map((c) => h('div', { class: 'card stack', style: 'gap:6px', 'data-testid': `hire-card-${c.id}` },
      h('div', { class: 'row between' }, h('b', {}, `${c.name} · ${ROLES[c.role].name}`), h('b', {}, `${fmt(c.wage)} / semana`)),
      h('div', { class: 'small' }, ROLES[c.role].desc),
      h('div', { class: 'small muted' }, `${TRAITS[c.trait].name}: ${TRAITS[c.trait].desc}`),
      h('button', { class: 'btn small primary', 'data-testid': `hire-${c.id}`, disabled: full || state.gold < c.wage, onclick: () => {
        const res = app.act((g) => hire(g, c.id));
        if (res.ok) app.toast(`${c.name} se suma a la caravana.`);
      } }, full ? 'Caravana completa' : `Contratar (${fmt(c.wage)})`)))
      : h('p', { class: 'muted small' }, 'No hay nadie buscando trabajo. Volvé en unos días.'));
}
