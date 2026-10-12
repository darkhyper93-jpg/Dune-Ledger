/**
 * Ranking online del desafío: el formulario para publicar tu puntaje con un
 * apodo y la tabla de los mejores del día (se carga sola, con estados de
 * "cargando" y "sin conexión").
 */

import { h } from './dom.js';
import { submitScore, fetchTop, cleanNickname } from '../net/leaderboard.js';
import { fmt } from '../core/text.js';

/**
 * Formulario para publicar el resultado oficial del día (o null si ya se
 * publicó o no hay resultado de ese día).
 * @param {object} app
 * @param {string} date
 * @param {() => void} [onDone] después de publicar
 */
export function publishForm(app, date, onDone) {
  const p = app.profile;
  const d = p.daily;
  if (!d || d.date !== date || d.published) return null;
  const input = h('input', {
    class: 'code nick-input', id: `nick-${date}`, value: p.nickname || '', maxlength: '16', autocomplete: 'nickname',
    autocapitalize: 'words', spellcheck: 'false', 'data-testid': 'nickname', 'aria-describedby': `nick-help-${date}`,
  });
  const status = h('p', { class: 'small', style: 'margin:0', 'aria-live': 'polite', 'data-testid': 'publish-status' });
  const button = h('button', { class: 'btn small primary', 'data-testid': 'publish', onclick: async () => {
    const nick = cleanNickname(input.value);
    if (!nick) {
      status.className = 'small bad';
      status.textContent = 'El apodo tiene que tener de 3 a 16 letras, números, espacios, puntos o guiones.';
      input.focus();
      return;
    }
    button.disabled = true;
    button.textContent = 'Publicando…';
    const res = await submitScore({ date, nickname: nick, score: d.score });
    p.nickname = nick;
    if (res.ok || /ya se publicó/.test(res.error ?? '')) {
      d.published = true;
      app.saveAll();
      status.className = 'small good';
      status.textContent = res.ok ? '¡Publicado! Ya estás en el ranking de hoy.' : res.error;
      button.remove();
      onDone?.();
      return;
    }
    app.saveAll();
    status.className = 'small bad';
    status.textContent = res.error;
    button.disabled = false;
    button.textContent = 'Probar de nuevo';
  } }, 'Publicar en el ranking');
  return h('div', { class: 'stack publish', style: 'gap:8px' },
    h('label', { for: `nick-${date}` }, h('b', {}, 'Tu apodo en el ranking')),
    input,
    h('span', { class: 'tiny muted', id: `nick-help-${date}` }, 'Se publican sólo tu apodo y tu puntaje. Una vez por día y por celular.'),
    button, status);
}

/**
 * Tabla con los mejores del día; se llena cuando llega la respuesta.
 * @param {object} app
 * @param {string} date
 */
export function rankingTable(app, date) {
  const box = h('div', { class: 'ranking', 'data-testid': 'ranking', 'aria-live': 'polite' }, h('p', { class: 'small muted', style: 'margin:0' }, 'Cargando el ranking…'));
  fetchTop(date).then((res) => {
    if (!res.ok) {
      box.replaceChildren(h('p', { class: 'small muted', style: 'margin:0' }, res.error));
      return;
    }
    if (!res.rows.length) {
      box.replaceChildren(h('p', { class: 'small muted', style: 'margin:0' }, 'Todavía nadie publicó su puntaje hoy. ¡Podés ser el primero!'));
      return;
    }
    const mine = app.profile.daily?.date === date && app.profile.daily.published ? { nick: app.profile.nickname, score: Math.max(0, app.profile.daily.score) } : null;
    box.replaceChildren(h('ol', { class: 'ranking-list' }, res.rows.map((r, i) => {
      const me = mine && r.nickname === mine.nick && r.score === mine.score;
      return h('li', { class: me ? 'me' : '' },
        h('span', { class: 'rank-pos' }, String(i + 1)),
        h('span', { class: 'grow' }, r.nickname, me ? h('span', { class: 'tiny' }, ' (vos)') : null),
        h('b', {}, fmt(r.score)));
    })));
  });
  return box;
}
