/**
 * Taberna: rumores (pueden ser falsos), noticias confirmadas y contratos.
 * También las tarjetas de contratos que se usan en el Gremio, la caravana
 * y el aviso de "podés entregar" en la ciudad.
 */

import { h } from './dom.js';
import { getGood } from '../data/goods.js';
import { offersHere, acceptContract, deliverContract, MAX_ACTIVE } from '../game/contracts.js';
import { rumorsAt, activeNews, newsText } from '../game/news.js';
import { zoneName } from '../game/reputation.js';
import { fmt, plural } from '../core/text.js';
import { playCoins } from '../core/audio.js';
import { renderHires } from './crew.js';
import { goodArt } from './art.js';
import { RIVAL, rivalNews, rivalWorth } from '../game/rival.js';
import { kasimSvg } from '../render/portraits.js';
import { svgNode } from '../render/shapes.js';
import { CHRONICLES, CHAPTERS } from '../data/chronicles.js';
import { chapterNow, chronicleCheck, chronicleAct, goalText } from '../game/chronicle.js';
import { regionId } from '../game/perks.js';
import { hintCard } from './coach.js';

/**
 * Tarjeta de un contrato (oferta o activo).
 * @param {object} app
 * @param {object} k contrato
 * @param {'offer'|'active'} kind
 */
export function contractCard(app, k, kind) {
  const { state, map } = app.game;
  const good = getGood(k.goodId);
  const dest = map.cityById[k.to];
  const left = k.deadline - state.day;
  const have = state.cargo[k.goodId];
  let action = null;
  if (kind === 'offer') {
    action = h('button', { class: 'btn small primary', 'data-testid': `accept-${k.id}`, disabled: state.contracts.active.length >= MAX_ACTIVE,
      onclick: () => {
        const res = app.act((g) => acceptContract(g, k.id));
        if (res.ok) app.toast(`Contrato aceptado: ${k.qty} de ${good.name} a ${dest.name}.`);
      } }, state.contracts.active.length >= MAX_ACTIVE ? `Máximo ${MAX_ACTIVE} contratos` : 'Aceptar');
  } else if (state.location === k.to) {
    action = h('button', { class: 'btn small teal', 'data-testid': `deliver-${k.id}`, disabled: have < k.qty, onclick: () => {
      const res = app.act((g) => deliverContract(g, k.id));
      if (res.ok) {
        playCoins(res.profit);
        app.toast(`¡Contrato cumplido! Cobraste ${fmt(res.total)}.`);
      }
    } }, have < k.qty ? `Te faltan ${k.qty - have}` : 'Entregar');
  }
  return h('div', { class: 'card contract', 'data-testid': `contract-${k.id}` },
    h('div', { class: 'row' }, goodArt(k.goodId, 40), h('b', { class: 'grow' }, `${k.qty} de ${good.name} para ${dest.name}`), h('b', { class: 'good' }, fmt(k.reward))),
    h('div', { class: 'small muted' }, `Antes del día ${k.deadline} (${left >= 0 ? `faltan ${plural(left, 'día', 'días')}` : 'vencido'}) · zona ${zoneName(dest.zone)}`,
      kind === 'active' ? ` · llevás ${have}` : ''),
    action);
}

/**
 * Aviso arriba de la ciudad cuando hay contratos para entregar acá.
 * @param {object} app
 */
export function deliverables(app) {
  const { state } = app.game;
  const here = state.contracts.active.filter((k) => k.to === state.location);
  if (!here.length) return null;
  return h('div', { class: 'stack', style: 'margin-bottom:12px' }, h('h3', {}, 'Contratos para entregar acá'), here.map((k) => contractCard(app, k, 'active')));
}

/**
 * Pestaña Taberna.
 * @param {object} app
 */
export function renderTavern(app) {
  const { state } = app.game;
  const rumors = rumorsAt(state);
  const news = activeNews(state);
  const offers = offersHere(app.game).filter((k) => k.source === 'taberna');
  return h('div', { class: 'stack' },
    hintCard(app, 'cronica'),
    chronicleCard(app),
    h('h3', {}, 'Rumores'),
    rumors.length
      ? h('ul', { class: 'result-lines', 'data-testid': 'rumors' }, rumors.map((n) => h('li', {}, `Dicen que… ${newsText(n)} `, h('span', { class: 'muted small' }, `(se sabrá el día ${n.startDay})`))))
      : h('p', { class: 'muted small', style: 'margin:0' }, 'Nadie cuenta nada interesante hoy.'),
    h('p', { class: 'muted tiny', style: 'margin:0' }, 'Ojo: algunos rumores son falsos.'),
    h('h3', {}, 'Noticias confirmadas'),
    news.length
      ? h('ul', { class: 'result-lines' }, news.map((n) => h('li', {}, newsText(n), h('span', { class: 'muted small' }, ` (hasta el día ${n.endDay})`))))
      : h('p', { class: 'muted small', style: 'margin:0' }, 'Ninguna por ahora.'),
    hintCard(app, 'kasim'),
    rivalCard(app),
    h('h3', {}, 'Contratos'),
    h('p', { class: 'muted small', style: 'margin:0' }, 'Pagan más que el mercado, pero tienen fecha. Si no cumplís, baja tu reputación en esa zona.'),
    offers.length ? offers.map((k) => contractCard(app, k, 'offer')) : h('p', { class: 'muted small' }, 'No hay encargos nuevos. Volvé en unos días.'),
    renderHires(app));
}

/**
 * La crónica de la región: el capítulo actual, qué pide y, si es de
 * entregar o pagar, el botón para hacerlo acá.
 * @param {object} app
 */
function chronicleCard(app) {
  const { state } = app.game;
  const chapter = chapterNow(state);
  const ch = CHRONICLES[regionId(state)];
  if (!chapter) {
    return h('div', { class: 'card chronicle done', 'data-testid': 'chronicle' },
      h('span', { class: 'chronicle-kicker' }, 'Crónica terminada'), h('h3', {}, ch.title),
      h('p', { class: 'small', style: 'margin:0' }, ch.chapters[ch.chapters.length - 1].done));
  }
  const g = chapter.goal;
  const check = chronicleCheck(app.game);
  const verb = g.type === 'deliver' ? `Entregar ${g.qty} de ${getGood(g.good).name}` : g.type === 'pay' ? `Pagar ${fmt(g.gold)} de oro` : null;
  return h('div', { class: 'card chronicle', 'data-testid': 'chronicle' },
    h('span', { class: 'chronicle-kicker' }, `Crónica, capítulo ${chapter.index + 1} de ${CHAPTERS}`),
    h('h3', {}, chapter.title),
    h('p', { class: 'small chronicle-text', style: 'margin:0' }, chapter.text),
    h('p', { class: 'small', style: 'margin:0' }, h('b', {}, 'Para seguir: '), goalText(g)),
    verb ? h('button', { class: 'btn small primary', 'data-testid': 'chronicle-act', disabled: !check.ok, onclick: () => {
      const res = app.act((game) => chronicleAct(game));
      if (res.ok) {
        playCoins(60);
        app.toast('¡Capítulo cumplido! Mirá el Diario.');
      }
    } }, check.ok ? verb : check.error) : null);
}

/**
 * Lo que se cuenta en la taberna de Kasim, la caravana rival.
 * @param {object} app
 */
function rivalCard(app) {
  const { state } = app.game;
  if (!state.rival) return null;
  const news = rivalNews(app.game);
  const worth = Math.max(0, Math.round(rivalWorth(state) / 100) * 100);
  return h('div', { class: 'card rival', 'data-testid': 'rival' },
    h('span', { class: 'rival-face', 'aria-hidden': 'true' }, svgNode(kasimSvg())),
    h('div', { class: 'stack', style: 'gap:4px' },
      h('h3', {}, `${RIVAL.name} «el Zorro»`),
      h('p', { class: 'small', style: 'margin:0' }, news ?? 'Nadie lo vio por esta zona. Anda por otro lado del mapa.'),
      h('p', { class: 'small muted', style: 'margin:0' }, `Dicen que ya junta unos ${fmt(worth)} de oro. Donde él compra, sube el precio; donde vende, baja.`)));
}

/**
 * Contratos del Gremio (en la Capital y en los Puestos): pagan mejor.
 * @param {object} app
 */
export function guildContracts(app) {
  const offers = offersHere(app.game).filter((k) => k.source === 'gremio');
  if (!offers.length) return null;
  return h('div', { class: 'stack' }, h('h3', {}, 'Encargos del Gremio'), offers.map((k) => contractCard(app, k, 'offer')));
}
