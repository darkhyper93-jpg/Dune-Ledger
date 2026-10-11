/**
 * Menú principal, Ajustes y "Cómo se juega".
 */

import { h } from './dom.js';
import { svgNode } from '../render/shapes.js';
import { sceneSvg } from '../render/scenes.js';
import { VERSION } from '../core/version.js';
import { forceUpdate } from '../core/updates.js';
import { setVolumes, playTap } from '../core/audio.js';
import { startMusic, stopMusic } from '../core/music.js';
import { fmt } from '../core/text.js';
import { progressCodeCard } from './progress.js';
import { openDailySheet } from './modes.js';

/**
 * Menú principal.
 * @param {object} app
 */
export function renderMenu(app) {
  const { game, profile } = app;
  const canContinue = game && !game.state.over;
  return h('div', { class: 'menu' },
    h('div', { class: 'cover' }, h('div', { class: 'scene' }, svgNode(sceneSvg('cover'))), h('h1', {}, 'Dune Ledger')),
    h('p', { class: 'tagline' }, 'Comprá barato, vendé caro y pagale al Gremio antes del día 60.'),
    h('div', { class: 'stack' },
      canContinue ? h('button', { class: 'btn big primary', 'data-testid': 'continue', onclick: () => app.go('city') }, `Continuar${game.state.mode === 'diario' ? ' el desafío' : game.state.mode === 'libre' ? ' el modo libre' : ''} (día ${game.state.day})`) : null,
      h('button', { class: `btn big ${canContinue ? '' : 'primary'}`, 'data-testid': 'new-season', onclick: () => app.confirmReplace(() => app.go('choose')) }, 'Nueva temporada'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', 'data-testid': 'daily', onclick: () => openDailySheet(app) }, 'Desafío del día'),
        h('button', { class: 'btn', 'data-testid': 'free', onclick: () => app.confirmReplace(() => app.newFree()) }, 'Modo libre')),
      h('button', { class: 'btn big', 'data-testid': 'shop', onclick: () => app.go('shop') }, `Gremio (${fmt(profile.seals)} sellos)`),
      h('button', { class: 'btn big', 'data-testid': 'records', onclick: () => app.go('records') }, 'Logros y códice'),
      h('button', { class: 'btn big', 'data-testid': 'help', onclick: () => app.go('help') }, 'Cómo se juega'),
      h('button', { class: 'btn big', 'data-testid': 'settings', onclick: () => app.go('settings') }, 'Ajustes')),
    h('div', { class: 'profile-strip' },
      h('span', {}, h('b', {}, fmt(profile.seals)), ' sellos'),
      h('span', {}, h('b', {}, String(profile.seasons)), ' temporadas'),
      h('span', {}, h('b', {}, String(profile.wins)), ' ganadas')));
}

/**
 * Un control de volumen.
 */
function volume(app, key, label) {
  return h('label', { class: 'stack', style: 'gap:2px' }, h('span', {}, label),
    h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(app.settings[key]), 'data-testid': `vol-${key}`,
      oninput: (e) => {
        app.settings[key] = Number(e.target.value);
        setVolumes(app.settings);
        if (key === 'music') {
          if (app.settings.music > 0) startMusic();
          else stopMusic();
        }
      },
      onchange: () => {
        app.saveAll();
        if (key === 'sfx') playTap();
      } }));
}

/**
 * Ajustes: volúmenes, versión y botón Actualizar.
 * @param {object} app
 */
export function renderSettings(app) {
  return h('div', { class: 'stack' },
    h('h1', {}, 'Ajustes'),
    h('div', { class: 'card stack' }, volume(app, 'music', 'Música'), volume(app, 'sfx', 'Efectos')),
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('span', {}, 'Versión'), h('b', { 'data-testid': 'version' }, VERSION)),
      h('button', { class: 'btn', 'data-testid': 'update', onclick: (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Actualizando…';
        forceUpdate();
      } }, 'Actualizar'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'El juego se actualiza solo cuando estás en el menú. Si algo se traba, tocá Actualizar.')),
    progressCodeCard(app),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}

/**
 * Explicación corta del juego.
 * @param {object} app
 */
export function renderHelp(app) {
  const p = (text) => h('p', { style: 'margin:0' }, text);
  return h('div', { class: 'stack' },
    h('h1', {}, 'Cómo se juega'),
    h('div', { class: 'card stack' },
      p('Tenés 60 días para pagarle 1.500 de oro al Gremio de Mercaderes, en tres cuotas: 300 el día 20, 500 el día 40 y 700 el día 60.'),
      p('Cada tipo de ciudad produce algunos bienes (ahí son baratos) y consume otros (ahí se pagan bien). Comprá barato, viajá y vendé caro.'),
      p('Si comprás mucho de golpe, el precio sube; si vendés mucho, baja. Los mercados se recuperan de a poco con los días.'),
      p('Antes de viajar mirá cuánta comida y agua hace falta. Sin provisiones vas a dejar carga en el camino.'),
      p('Pagá en la Capital o en un Puesto del Gremio (banderita). Si una cuota vence sin pagar, el cobrador te cobra 15% extra o te embarga la carga.'),
      p('En el camino pasan cosas: bandidos, tormentas, mercaderes nómadas… Cada opción muestra su probabilidad de salir bien. Las rutas de peligro alto tienen más sorpresas.'),
      p('Los camellos se cansan viajando y se recuperan descansando. En la Taberna podés contratar tripulación: cada rol ayuda en algo, pero cobran sueldo cada 7 días y, si la moral baja mucho, se van.'),
      p('En la Taberna hay rumores (¡algunos falsos!) y contratos que pagan bien si llegás a tiempo. Cumplir sube tu reputación en esa zona; fallar la baja.'),
      p('Al final, tu puntaje es el oro más la carga menos lo que debas. Con él ganás Sellos del Gremio.'),
      p('Con los sellos, en el Gremio comprás mercaderes con habilidades especiales y mejoras que valen para todas las temporadas. Algunos mercaderes piden un logro.'),
      p('Ganar una temporada abre la región siguiente: la Estepa (a caballo), la Costa (con barcos), las Montañas de Jade y el Reino del Sultán. Ganar en Difícil abre la Pesadilla.'),
      p('El Desafío del día es el mismo mapa para todos: al terminar te da un código para comparar con tus amigos. El Modo libre no tiene deuda ni apuro, ideal para aprender.')),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}
