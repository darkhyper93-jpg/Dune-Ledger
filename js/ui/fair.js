/**
 * Avisos de las mecánicas del final: la tarjeta de la Gran Feria (desde que
 * se anuncia hasta que termina) y la de renegociar una cuota en el Gremio.
 */

import { h, openSheet } from './dom.js';
import { getGood } from '../data/goods.js';
import { fmt } from '../core/text.js';
import { canRenegotiate, renegotiate, renegotiateFee } from '../game/renegotiate.js';
import { goodArt } from './art.js';

/**
 * Tarjeta de la Gran Feria, o null si todavía no se anunció o ya pasó.
 * @param {object} app
 */
export function fairCard(app) {
  const { state, map } = app.game;
  const f = state.fair;
  if (!f || state.day > f.end) return null;
  const city = map.cityById[f.cityId];
  const good = getGood(f.goodId);
  const live = state.day >= f.start;
  const here = state.location === f.cityId;
  let text;
  if (live && here) text = `¡La Gran Feria es acá y es hoy! Pagan mucho más por ${good.name.toLowerCase()} hasta el día ${f.end}.`;
  else if (live) text = `La Gran Feria ya empezó en ${city.name}: pagan mucho más por ${good.name.toLowerCase()} hasta el día ${f.end}.`;
  else text = `Gran Feria en ${city.name} del día ${f.start} al ${f.end}: van a pagar mucho más por ${good.name.toLowerCase()}. Faltan ${f.start - state.day} días.`;
  return h('aside', { class: `card fair-card${live ? ' live' : ''}`, 'data-testid': 'fair' },
    h('span', { class: 'fair-art', 'aria-hidden': 'true' }, goodArt(f.goodId, 40)),
    h('p', { style: 'margin:0' }, text));
}

/**
 * Tarjeta para pedir más plazo al Gremio (o null si no hay nada que pasar).
 * @param {object} app
 */
export function renegotiateCard(app) {
  const check = canRenegotiate(app.game);
  const { state } = app.game;
  if (state.debt.installments.every((i) => i.amount <= i.paid)) return null;
  if (!check.ok && /Ya renegociaste/.test(check.error)) return null;
  const pct = Math.round(renegotiateFee(state) * 100);
  return h('div', { class: 'card stack', 'data-testid': 'renegotiate' },
    h('h3', {}, '¿No llegás con la cuota?'),
    h('p', { class: 'small', style: 'margin:0' }, `Una vez por temporada, el Gremio te pasa la cuota que viene a la siguiente con ${pct}% de recargo, sin contarte una falta. Se pide desde 7 días antes del vencimiento, y la última no se puede pasar.`),
    check.ok
      ? h('button', { class: 'btn', 'data-testid': 'renegotiate-go', onclick: () => confirmRenegotiate(app, check) }, `Pedir más plazo (+${fmt(check.extra)})`)
      : h('p', { class: 'small muted', style: 'margin:0' }, check.error));
}

/**
 * Confirma antes de renegociar, mostrando cuánto cuesta.
 */
function confirmRenegotiate(app, check) {
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, 'Pedir más plazo'),
    h('p', {}, `Los ${fmt(check.inst.amount - check.inst.paid)} de la cuota del día ${check.inst.day} pasan al día ${check.later.day}, con ${fmt(check.extra)} de recargo. Sólo se puede una vez por temporada.`),
    h('button', { class: 'btn big primary', 'data-testid': 'renegotiate-confirm', onclick: () => {
      close();
      const res = app.act((g) => renegotiate(g));
      if (res.ok) app.toast(`Listo: la cuota pasa al día ${res.day}.`);
    } }, 'Sí, pedir más plazo'),
    h('button', { class: 'btn', onclick: close }, 'Mejor no')), { label: 'Pedir más plazo' });
}
