/**
 * Carta de evento durante un viaje: texto, opciones como botones grandes
 * (con su probabilidad de salir bien y lo que se pierde si sale mal, si
 * depende de la suerte) y, después
 * de elegir, el resultado. No se puede cerrar sin elegir.
 */

import { h, openSheet } from './dom.js';
import { eventDef, fillText, optionState } from '../game/events.js';
import { chooseOption } from '../game/season.js';
import { riskOf } from '../game/event-risk.js';
import { playCoins, playTap } from '../core/audio.js';
import { buzz } from '../core/haptics.js';

/** Títulos cortos de cada evento para la carta. */
const TITLES = {
  bandidos: '¡Bandidos!',
  'bandidos-amigos': 'Bandidos conocidos',
  tormenta: 'Tormenta de arena',
  'oasis-seco': 'Oasis seco',
  nomada: 'Mercader nómada',
  ruinas: 'Ruinas antiguas',
  viajero: 'Viajero herido',
  control: 'Control del sultán',
};

/**
 * Muestra el evento que frenó el viaje y llama a `onDone` al seguir.
 * @param {object} app
 * @param {Function} onDone
 */
export function showEvent(app, onDone) {
  const { game } = app;
  const ev = game.state.trip.event;
  const def = eventDef(ev.id);
  buzz('event');
  openSheet((close) => {
    const body = h('div', { class: 'stack event-card', 'data-testid': 'event-card' });
    const options = def.options.map((_, i) => {
      const st = optionState(game, i);
      const chance = st.chance === null ? null : h('span', { class: 'chance' }, `${Math.round(st.chance * 100)}% de salir bien`);
      const risk = riskOf(game, i);
      return h('button', { class: 'btn big event-opt', 'data-testid': `event-opt-${i}`, disabled: !st.available, onclick: () => choose(i) },
        h('span', {}, st.label), chance, risk ? h('span', { class: 'risk', 'data-testid': `event-risk-${i}` }, risk) : null,
        st.reason ? h('span', { class: 'chance' }, st.reason) : null);
    });
    body.append(
      h('div', { class: 'muted small' }, `Día ${game.state.day} · en el camino`),
      h('h2', {}, TITLES[ev.id] ?? 'En el camino'),
      h('p', { style: 'margin:0' }, fillText(def.text, ev.params)),
      h('div', { class: 'stack' }, options));

    const choose = (i) => {
      const res = app.quiet((g) => chooseOption(g, i));
      if (!res.ok) return;
      if (res.success === false) buzz('bad');
      if (res.lines?.some((l) => l.startsWith('+') && l.includes('oro'))) playCoins(60);
      else playTap();
      body.replaceChildren(
        h('h2', {}, res.success === false ? 'Salió mal…' : res.success ? '¡Salió bien!' : 'Listo'),
        h('p', { style: 'margin:0' }, res.text),
        res.lines?.length ? h('ul', { class: 'result-lines' }, res.lines.map((l) => h('li', {}, l))) : null,
        h('button', { class: 'btn big primary', 'data-testid': 'event-continue', onclick: () => { close(); onDone(); } }, 'Seguir viaje'));
      body.querySelector('button')?.focus();
    };
    return body;
  }, { label: TITLES[ev.id] ?? 'Evento', modal: true });
}
