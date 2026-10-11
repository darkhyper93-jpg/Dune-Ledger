/**
 * Menú principal, Ajustes y "Cómo se juega".
 */

import { h, openSheet } from './dom.js';
import { LOGO_SVG, svgNode } from '../render/shapes.js';
import { VERSION } from '../core/version.js';
import { forceUpdate } from '../core/updates.js';
import { setVolumes, playTap } from '../core/audio.js';
import { fmt } from '../core/text.js';

/**
 * Menú principal.
 * @param {object} app
 */
export function renderMenu(app) {
  const { game, profile } = app;
  const canContinue = game && !game.state.over;
  return h('div', { class: 'menu' },
    h('div', { class: 'logo' }, svgNode(LOGO_SVG), h('h1', {}, 'Dune Ledger'), h('p', {}, 'Comprá barato, vendé caro y pagale al Gremio.')),
    h('div', { class: 'stack' },
      canContinue ? h('button', { class: 'btn big primary', 'data-testid': 'continue', onclick: () => app.go('city') }, `Continuar (día ${game.state.day})`) : null,
      h('button', { class: `btn big ${canContinue ? '' : 'primary'}`, 'data-testid': 'new-season', onclick: () => {
        if (!canContinue) return app.newSeason();
        openSheet((close) => h('div', { class: 'stack' },
          h('h2', {}, '¿Empezar de nuevo?'),
          h('p', { class: 'muted' }, 'Vas a perder la temporada que tenés empezada.'),
          h('div', { class: 'btn-row' }, h('button', { class: 'btn', onclick: close }, 'No'),
            h('button', { class: 'btn primary', 'data-testid': 'confirm-new', onclick: () => { close(); app.newSeason(); } }, 'Sí, nueva'))), { label: 'Nueva temporada' });
      } }, 'Nueva temporada'),
      h('button', { class: 'btn big', 'data-testid': 'help', onclick: () => app.go('help') }, 'Cómo se juega'),
      h('button', { class: 'btn big', 'data-testid': 'settings', onclick: () => app.go('settings') }, 'Ajustes')),
    h('p', { class: 'center muted small' }, `Sellos del Gremio: ${fmt(profile.seals)} · Temporadas: ${profile.seasons} · Ganadas: ${profile.wins}`));
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
    h('div', { class: 'card stack' }, volume(app, 'music', 'Música'), volume(app, 'sfx', 'Efectos'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'La música llega en la etapa de pulido.')),
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('span', {}, 'Versión'), h('b', { 'data-testid': 'version' }, VERSION)),
      h('button', { class: 'btn', 'data-testid': 'update', onclick: (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Actualizando…';
        forceUpdate();
      } }, 'Actualizar'),
      h('p', { class: 'muted small', style: 'margin:0' }, 'El juego se actualiza solo cuando estás en el menú. Si algo se traba, tocá Actualizar.')),
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
      p('Al final, tu puntaje es el oro más la carga menos lo que debas. Con él ganás Sellos del Gremio.')),
    h('button', { class: 'btn big', onclick: () => app.go('menu') }, 'Volver'));
}
