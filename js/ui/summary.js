/**
 * Resumen al final de la temporada: puntaje, sellos, mejor venta y ruta
 * más rentable y logros nuevos. También suma el resultado al perfil (una sola vez).
 */

import { h } from './dom.js';
import { getGood } from '../data/goods.js';
import { fmt } from '../core/text.js';
import { recordSeason } from '../game/profile.js';
import { ACHIEVEMENTS_BY_ID } from '../data/achievements.js';
import { REGIONS_BY_ID } from '../data/regions.js';
import { DIFFICULTIES } from '../data/rules.js';
import { regionSvg } from '../render/regions-art.js';
import { svgNode } from '../render/shapes.js';
import { dailyResultCard } from './modes.js';
import { worthChart } from './chart.js';
import { climateOf } from '../game/climate.js';
import { kasimSvg } from '../render/portraits.js';
import { buzz } from '../core/haptics.js';
import { explainSeason } from '../game/explain.js';

/** Textos de cómo terminó la temporada. */
const REASONS = {
  fin: 'Llegó el día 60.',
  retiro: 'Te retiraste con la deuda saldada.',
  deuda: 'El Gremio te cerró las cuentas: dos cuotas impagas.',
};

/**
 * Suma la temporada terminada al perfil si todavía no se sumó.
 * @param {object} app
 * @returns {{newAchievements:string[], unlocked:string[]}} logros y desbloqueos nuevos
 */
function record(app) {
  const res = recordSeason(app.profile, app.game);
  app.saveAll();
  return res;
}

/** Cómo te fue contra Kasim, la caravana rival. */
function rivalCard(over) {
  if (over.rivalGold === null || over.rivalGold === undefined) return null;
  const diff = Math.round(over.score - over.rivalGold);
  const verdict = diff > 0 ? `¡Le ganaste por ${fmt(diff)}!` : diff < 0 ? `Te ganó por ${fmt(-diff)}. La próxima será.` : '¡Empate exacto!';
  return h('div', { class: 'card rival', 'data-testid': 'rival-result' },
    h('span', { class: 'rival-face', 'aria-hidden': 'true' }, svgNode(kasimSvg())),
    h('div', { class: 'stack', style: 'gap:4px' },
      h('h3', {}, 'Kasim «el Zorro»'),
      h('p', { class: 'small', style: 'margin:0' }, `Terminó la temporada con ${fmt(over.rivalGold)} entre oro, carga y camellos. ${verdict}`)));
}

/**
 * "¿Por qué ganaste/perdiste?": razones con números y preguntas para
 * conversar después de jugar.
 * @param {object} state
 */
function explainCard(state) {
  const { title, reasons, questions } = explainSeason(state);
  return h('div', { class: 'card stack', 'data-testid': 'explain' },
    h('h3', {}, title),
    reasons.length ? h('ul', { class: 'explain-list' }, reasons.map((r) => h('li', {}, r))) : null,
    h('p', { class: 'small', style: 'margin:0' }, h('b', {}, 'Para pensar:')),
    h('ul', { class: 'explain-list small' }, questions.map((q) => h('li', {}, q))));
}

/** Tarjeta de lo que se abrió al ganar: región nueva o la Pesadilla. */
function unlockCard(id) {
  if (id === 'pesadilla') {
    return h('div', { class: 'card stack unlock' }, h('h3', {}, '¡Se abrió la Pesadilla!'), h('span', { class: 'small' }, DIFFICULTIES.pesadilla.desc));
  }
  const r = REGIONS_BY_ID[id];
  return h('div', { class: 'card unlock region-unlock', 'data-testid': `unlocked-${id}` },
    h('span', { class: 'region-art' }, svgNode(regionSvg(id))),
    h('div', { class: 'stack', style: 'gap:4px;padding:12px 14px' }, h('h3', {}, `¡Región nueva: ${r.name}!`), h('span', { class: 'small' }, r.desc)));
}

/**
 * Pantalla de resumen.
 * @param {object} app
 */
export function renderSummary(app) {
  const { state, map } = app.game;
  const over = state.over;
  const { newAchievements: fresh, unlocked } = record(app);
  if (over.won && !over.buzzed) {
    buzz('win');
    over.buzzed = true;
  }
  const best = state.stats.bestSale;
  const routes = Object.entries(state.stats.routeProfit).sort((a, b) => b[1] - a[1]);
  const topRoute = routes[0];
  const routeName = (key) => key.split('>').map((id) => map.cityById[id].name).join(' → ');

  const free = state.mode === 'libre';
  const counts = !free && over.official !== false;
  const title = free ? 'Fin del modo libre' : over.won ? '¡Temporada ganada!' : 'Temporada perdida';
  const where = free ? 'Modo libre: no da sellos ni logros.' : `${REGIONS_BY_ID[state.region].name}, ${DIFFICULTIES[state.difficulty].name.toLowerCase()}, ${climateOf(state).name.toLowerCase()}`;
  return h('div', { class: 'stack' },
    h('div', { class: `banner ${over.won || free ? 'win' : 'lose'}` },
      over.won ? h('span', { class: 'stamp', 'aria-hidden': 'true' }, 'Saldado') : null,
      h('h1', {}, title),
      free ? null : h('p', { style: 'margin:6px 0 0' }, REASONS[over.reason]),
      h('p', { class: 'small', style: 'margin:4px 0 0' }, where)),
    h('div', { class: 'card stack center' },
      h('div', { class: 'muted' }, 'Puntaje'),
      h('div', { class: 'score', 'data-testid': 'final-score' }, fmt(over.score)),
      counts ? h('div', {}, 'Ganaste ', h('b', { 'data-testid': 'final-seals' }, `${over.seals} sellos del Gremio`)) : null,
      h('div', { class: 'muted small' }, free ? 'Puntaje = oro + valor de la carga + animales.' : 'Puntaje = oro + valor de la carga + animales − deuda que quedó. Sellos = puntaje / 100 × dificultad.')),
    state.mode === 'diario' ? dailyResultCard(app) : null,
    worthChart(state.history),
    rivalCard(over),
    free ? null : explainCard(state),
    h('div', { class: 'card' }, h('dl', { class: 'kv' },
      h('dt', {}, 'Oro final'), h('dd', {}, fmt(over.gold)),
      h('dt', {}, 'Deuda sin pagar'), h('dd', { class: over.owed ? 'bad' : 'good' }, fmt(over.owed)),
      h('dt', {}, 'Viajes'), h('dd', {}, String(state.stats.trips)),
      h('dt', {}, 'Mejor venta'), h('dd', {}, best ? `${getGood(best.goodId).name} en ${map.cityById[best.cityId].name}: +${fmt(best.profit)}` : '—'),
      h('dt', {}, 'Ruta más rentable'), h('dd', {}, topRoute && topRoute[1] > 0 ? `${routeName(topRoute[0])} (+${fmt(topRoute[1])})` : '—'),
      h('dt', {}, 'Sellos acumulados'), h('dd', {}, fmt(app.profile.seals)))),
    ...unlocked.map(unlockCard),
    fresh.length ? h('div', { class: 'card stack', 'data-testid': 'new-achievements' }, h('h3', {}, '¡Logros nuevos!'),
      fresh.map((id) => h('div', { class: 'achievement done' }, h('b', {}, `★ ${ACHIEVEMENTS_BY_ID[id].name}`), h('span', { class: 'small muted' }, ACHIEVEMENTS_BY_ID[id].desc)))) : null,
    h('p', { class: 'muted small center' }, 'Gastá tus sellos en el Gremio: mercaderes nuevos y mejoras para las próximas temporadas.'),
    h('button', { class: 'btn big primary', 'data-testid': 'new-season', onclick: () => app.go('choose') }, 'Nueva temporada'),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver al menú'));
}
