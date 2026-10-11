/**
 * Resumen al final de la temporada: puntaje, sellos, mejor venta y ruta
 * más rentable y logros nuevos. También suma el resultado al perfil (una sola vez).
 */

import { h } from './dom.js';
import { getGood } from '../data/goods.js';
import { fmt } from '../core/text.js';
import { recordSeason } from '../game/profile.js';
import { ACHIEVEMENTS_BY_ID } from '../data/achievements.js';

/** Textos de cómo terminó la temporada. */
const REASONS = {
  fin: 'Llegó el día 60.',
  retiro: 'Te retiraste con la deuda saldada.',
  deuda: 'El Gremio te cerró las cuentas: dos cuotas impagas.',
};

/**
 * Suma la temporada terminada al perfil si todavía no se sumó.
 * @param {object} app
 * @returns {string[]} logros nuevos
 */
function record(app) {
  const res = recordSeason(app.profile, app.game);
  app.saveAll();
  return res.newAchievements;
}

/**
 * Pantalla de resumen.
 * @param {object} app
 */
export function renderSummary(app) {
  const { state, map } = app.game;
  const over = state.over;
  const fresh = record(app);
  const best = state.stats.bestSale;
  const routes = Object.entries(state.stats.routeProfit).sort((a, b) => b[1] - a[1]);
  const topRoute = routes[0];
  const routeName = (key) => key.split('>').map((id) => map.cityById[id].name).join(' → ');

  return h('div', { class: 'stack' },
    h('div', { class: `banner ${over.won ? 'win' : 'lose'}` },
      h('h1', {}, over.won ? '¡Temporada ganada!' : 'Temporada perdida'),
      h('p', { style: 'margin:6px 0 0' }, REASONS[over.reason])),
    h('div', { class: 'card stack center' },
      h('div', { class: 'muted' }, 'Puntaje'),
      h('div', { class: 'score', 'data-testid': 'final-score' }, fmt(over.score)),
      h('div', {}, 'Ganaste ', h('b', { 'data-testid': 'final-seals' }, `${over.seals} sellos del Gremio`)),
      h('div', { class: 'muted small' }, 'Puntaje = oro + valor de la carga − deuda que quedó. Sellos = puntaje / 100 × dificultad.')),
    h('div', { class: 'card' }, h('dl', { class: 'kv' },
      h('dt', {}, 'Oro final'), h('dd', {}, fmt(over.gold)),
      h('dt', {}, 'Deuda sin pagar'), h('dd', { class: over.owed ? 'bad' : 'good' }, fmt(over.owed)),
      h('dt', {}, 'Viajes'), h('dd', {}, String(state.stats.trips)),
      h('dt', {}, 'Mejor venta'), h('dd', {}, best ? `${getGood(best.goodId).name} en ${map.cityById[best.cityId].name}: +${fmt(best.profit)}` : '—'),
      h('dt', {}, 'Ruta más rentable'), h('dd', {}, topRoute && topRoute[1] > 0 ? `${routeName(topRoute[0])} (+${fmt(topRoute[1])})` : '—'),
      h('dt', {}, 'Sellos acumulados'), h('dd', {}, fmt(app.profile.seals)))),
    fresh.length ? h('div', { class: 'card stack', 'data-testid': 'new-achievements' }, h('h3', {}, '¡Logros nuevos!'),
      fresh.map((id) => h('div', { class: 'achievement done' }, h('b', {}, `★ ${ACHIEVEMENTS_BY_ID[id].name}`), h('span', { class: 'small muted' }, ACHIEVEMENTS_BY_ID[id].desc)))) : null,
    h('p', { class: 'muted small center' }, 'Gastá tus sellos en el Gremio: mercaderes nuevos y mejoras para las próximas temporadas.'),
    h('button', { class: 'btn big primary', 'data-testid': 'new-season', onclick: () => app.go('choose') }, 'Nueva temporada'),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver al menú'));
}
