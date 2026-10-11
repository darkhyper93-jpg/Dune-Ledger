/**
 * Interfaz de los modos de la etapa 6: la hoja del desafío del día (jugar,
 * tu código de puntaje y comparar el de un amigo) y la tarjeta del código
 * al terminar el desafío.
 */

import { h, openSheet } from './dom.js';
import { dailyDate, scoreCode, readScoreCode } from '../game/daily.js';
import { fmt } from '../core/text.js';

/** "2026-10-11" → "11/10/2026". */
export function prettyDate(date) {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Copia un texto al portapapeles (o deja seleccionado el campo, si no se puede).
 * @param {object} app
 * @param {string} text
 * @param {HTMLInputElement|HTMLTextAreaElement} [field]
 */
async function copy(app, text, field) {
  field?.select();
  try {
    await navigator.clipboard.writeText(text);
    app.toast('Código copiado.');
  } catch {
    app.toast('Seleccionalo y copialo a mano.');
  }
}

/**
 * Caja con un código de puntaje y su botón Copiar.
 * @param {object} app
 * @param {string} code
 */
function codeBox(app, code) {
  const field = h('input', { class: 'code score-code', readonly: true, value: code, 'data-testid': 'score-code', 'aria-label': 'Código de puntaje' });
  return h('div', { class: 'stack', style: 'gap:8px' }, field, h('button', { class: 'btn small primary', onclick: () => copy(app, code, field) }, 'Copiar código'));
}

/**
 * Comparar el código de un amigo con tu resultado de ese día.
 * @param {object} app
 */
function compareBox(app) {
  const input = h('input', { class: 'code', placeholder: 'DL-2026-10-11-…', 'data-testid': 'compare-input', 'aria-label': 'Código de un amigo', autocomplete: 'off', spellcheck: 'false' });
  const out = h('p', { class: 'small', style: 'margin:0', 'data-testid': 'compare-result', 'aria-live': 'polite' });
  const check = () => {
    const res = readScoreCode(input.value);
    if (!res.ok) {
      out.className = 'small bad';
      out.textContent = res.error;
      return;
    }
    const mine = app.profile.daily?.date === res.date ? app.profile.daily.score : null;
    let verdict = `Código válido: ${fmt(res.score)} puntos en el desafío del ${prettyDate(res.date)}.`;
    if (mine !== null) {
      const diff = Math.max(0, mine) - res.score;
      verdict += diff > 0 ? ` Le ganaste por ${fmt(diff)}.` : diff < 0 ? ` Te ganó por ${fmt(-diff)}.` : ' ¡Empate!';
    }
    out.className = 'small good';
    out.textContent = verdict;
  };
  return h('div', { class: 'stack', style: 'gap:8px' },
    h('h3', {}, 'Comparar con un amigo'),
    h('div', { class: 'row' }, input, h('button', { class: 'btn small', 'data-testid': 'compare-check', onclick: check }, 'Ver')),
    out);
}

/**
 * Hoja del desafío del día.
 * @param {object} app
 */
export function openDailySheet(app) {
  const today = dailyDate();
  const done = app.profile.daily?.date === today ? app.profile.daily : null;
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, `Desafío del ${prettyDate(today)}`),
    h('p', { class: 'small', style: 'margin:0' }, 'Hoy todos juegan el mismo mapa, con el Aprendiz y sin mejoras. Cuenta tu primera partida del día; las demás son de práctica.'),
    done ? h('div', { class: 'card stack', style: 'gap:8px' },
      h('div', {}, 'Tu resultado de hoy: ', h('b', {}, `${fmt(Math.max(0, done.score))} puntos`)),
      codeBox(app, scoreCode(done.date, done.score))) : null,
    h('button', { class: `btn big${done ? '' : ' primary'}`, 'data-testid': 'daily-play', onclick: () => {
      close();
      app.confirmReplace(() => app.newDaily(today));
    } }, done ? 'Jugar de práctica' : 'Jugar el desafío'),
    compareBox(app),
    h('button', { class: 'btn', onclick: close }, 'Cerrar')), { label: 'Desafío del día' });
}

/**
 * Tarjeta del resumen al terminar un desafío: el código para compartir.
 * @param {object} app
 */
export function dailyResultCard(app) {
  const { state } = app.game;
  const over = state.over;
  const official = over.official !== false;
  return h('div', { class: 'card stack unlock', 'data-testid': 'daily-result' },
    h('h3', {}, official ? `Desafío del ${prettyDate(state.daily)}` : 'Partida de práctica'),
    official
      ? h('p', { class: 'small', style: 'margin:0' }, 'Pasale este código a tus amigos: con él ven tu puntaje y no se puede inventar.')
      : h('p', { class: 'small', style: 'margin:0' }, 'Ya habías jugado el desafío de ese día: esta partida no suma sellos ni cambia tu resultado.'),
    official ? codeBox(app, scoreCode(state.daily, over.score)) : null);
}
