/**
 * Pantalla de ciudad, con pestañas: Mercado, Provisiones, Taberna y (en la
 * Capital o en un Puesto) Gremio. Arriba, el nombre y la silueta de la ciudad y,
 * cuando corresponde, el botón para cerrar la temporada.
 */

import { h, openSheet } from './dom.js';
import { renderMarket } from './market.js';
import { renderTavern, guildContracts, deliverables } from './tavern.js';
import { getCityType } from '../data/cities.js';
import { RULES } from '../data/rules.js';
import { citySvg, svgNode } from '../render/shapes.js';
import { canPayHere, totalOwed, owedOn, nextInstallment } from '../game/debt.js';
import { canFinish, rest, finishSeason } from '../game/season.js';
import { buyProvision, buyCamel, sellCamel, payGuild } from '../game/actions.js';
import { camelPrice, camelResale, provisionPrices } from '../game/caravan.js';
import { dailyRation, canTravel } from '../game/travel.js';
import { fmt, plural } from '../core/text.js';
import { playTap, playCoins } from '../core/audio.js';

/**
 * Arma la pantalla de la ciudad actual.
 * @param {object} app
 * @param {{tab?:string}} params
 */
export function renderCity(app, params = {}) {
  const { game } = app;
  const { state, map } = game;
  const city = map.cityById[state.location];
  const hasGuild = canPayHere(city);
  const tabs = [['mercado', 'Mercado'], ['provisiones', 'Provisiones'], ['taberna', 'Taberna']];
  if (hasGuild) tabs.push(['gremio', 'Gremio']);
  const tab = tabs.some(([id]) => id === params.tab) ? params.tab : 'mercado';

  const head = h('div', { class: 'city-head' }, svgNode(citySvg(city.type)),
    h('div', { class: 'grow' },
      h('h1', { 'data-testid': 'city-name' }, city.name),
      h('div', { class: 'muted small' }, getCityType(city.type).name,
        city.guildPost ? ' · Puesto del Gremio' : '', city.type === 'capital' ? ' · Sede del Gremio' : '')));

  const tabBar = h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) =>
    h('button', { role: 'tab', 'aria-selected': String(id === tab), 'data-testid': `tab-${id}`, onclick: () => app.go('city', { tab: id }) }, label)));

  let content;
  if (tab === 'provisiones') content = renderProvisions(app);
  else if (tab === 'taberna') content = renderTavern(app);
  else if (tab === 'gremio') content = renderGuild(app);
  else content = renderMarket(app);

  return h('div', {}, head, endCard(app), deliverables(app), tabBar, content);
}

/**
 * Tarjeta para cerrar la temporada, si se puede (último día o deuda pagada).
 */
function endCard(app) {
  const { game } = app;
  const { state, map } = game;
  const stuck = map.routesByCity[state.location].every((r) => !canTravel(game, r.id).ok);
  if (!canFinish(game) && !stuck) return null;
  const owed = totalOwed(state.debt);
  let text = 'Ya pagaste toda la deuda. Podés retirarte ahora o seguir comerciando hasta el día 60.';
  if (state.day >= RULES.seasonDays) text = 'Último día de la temporada: vendé lo que te convenga y cerrala.';
  else if (stuck && owed > 0) text = `No te da el tiempo para otro viaje. Descansá hasta el día ${RULES.seasonDays} para cerrar.`;
  return h('div', { class: 'card stack', style: 'margin-bottom:12px' }, h('p', { style: 'margin:0' }, text),
    canFinish(game) ? h('button', { class: 'btn big primary', 'data-testid': 'finish', onclick: () => confirmFinish(app) }, 'Cerrar temporada') : null);
}

/**
 * Pide confirmación y cierra la temporada.
 */
function confirmFinish(app) {
  const owed = totalOwed(app.game.state.debt);
  openSheet((close) => h('div', { class: 'stack' },
    h('h2', {}, '¿Cerrar la temporada?'),
    h('p', { class: 'muted' }, owed > 0
      ? `Todavía debés ${fmt(owed)}. El cobrador te va a cobrar lo que pueda (con 15% de comisión) y lo que falte se resta del puntaje.`
      : 'La carga que lleves cuenta para el puntaje al precio de esta ciudad.'),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', onclick: close }, 'Seguir jugando'),
      h('button', { class: 'btn primary', 'data-testid': 'finish-confirm', onclick: () => {
        close();
        app.act((g) => {
          finishSeason(g, g.state.day >= RULES.seasonDays ? 'fin' : 'retiro');
          return { ok: true };
        });
        app.go('summary');
      } }, 'Cerrar'))), { label: 'Cerrar temporada' });
}

/**
 * Una tarjeta de provisión (comida o agua) con botones por días.
 */
function provisionCard(app, kind, label, price) {
  const { state } = app.game;
  const ration = dailyRation(state);
  const have = state[kind];
  const buyDays = (days) => {
    const qty = Math.min(days * ration, RULES.provisionCap - have);
    if (qty <= 0) return app.toast(`Podés llevar hasta ${RULES.provisionCap}.`);
    const res = app.act((g) => buyProvision(g, kind, qty));
    if (res.ok) {
      playTap();
      app.toast(`Cargaste ${qty} de ${label.toLowerCase()} por ${fmt(res.total)}.`);
    }
  };
  return h('div', { class: 'card stack' },
    h('div', { class: 'row between' }, h('h3', {}, label),
      h('span', { class: 'muted small' }, price === 0 ? 'Gratis acá' : `${price} de oro c/u`)),
    h('div', { class: 'small' }, `Tenés ${have}: alcanza para ${plural(Math.floor(have / ration), 'día', 'días')} (gastás ${ration} por día).`),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', 'data-testid': `${kind}-1`, onclick: () => buyDays(1) }, `+1 día (${fmt(ration * price)})`),
      h('button', { class: 'btn small', 'data-testid': `${kind}-5`, onclick: () => buyDays(5) }, `+5 días (${fmt(5 * ration * price)})`)));
}

/**
 * Pestaña Provisiones: comida, agua, camellos y descanso.
 */
function renderProvisions(app) {
  const { game } = app;
  const { state, map } = game;
  const city = map.cityById[state.location];
  const p = provisionPrices(city);
  const price = camelPrice(state.seed, city);
  const resale = camelResale(state.seed, city);
  const ration = dailyRation(state);
  return h('div', { class: 'stack' },
    h('p', { class: 'muted small', style: 'margin:0' }, 'Por día de viaje se gasta 1 de comida y 1 de agua cada 2 (vos y tus camellos). La arena gasta más agua; el río, casi nada.'),
    provisionCard(app, 'food', 'Comida', p.food),
    provisionCard(app, 'water', 'Agua', p.water),
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('h3', {}, 'Camellos'), h('span', { class: 'muted small' }, `${state.camels} de ${RULES.maxCamels}`)),
      h('div', { class: 'small' }, `Cada camello lleva ${RULES.camelCapacity} de carga, pero también come y toma.`),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small', 'data-testid': 'camel-buy', disabled: state.camels >= RULES.maxCamels, onclick: () => {
          const res = app.act((g) => buyCamel(g));
          if (res.ok) app.toast(`¡Camello nuevo por ${fmt(res.total)}!`);
        } }, `Comprar (${fmt(price)})`),
        h('button', { class: 'btn small', disabled: state.camels <= 1, onclick: () => {
          const res = app.act((g) => sellCamel(g));
          if (res.ok) app.toast(`Vendiste un camello por ${fmt(res.total)}.`);
        } }, `Vender (${fmt(resale)})`))),
    h('div', { class: 'card stack' },
      h('h3', {}, 'Descansar'),
      h('div', { class: 'small' }, `Pasás un día en ${city.name} y los mercados se recuperan un poco. Gastás ${ration} de comida y ${ration} de agua.`),
      h('button', { class: 'btn', 'data-testid': 'rest', disabled: state.day >= RULES.seasonDays, onclick: () => {
        app.act((g) => rest(g));
        if (app.game.state.over) app.go('summary');
        else app.toast(`Día ${app.game.state.day}.`);
      } }, 'Descansar un día')));
}

/**
 * Pestaña Gremio: cuotas, pagos y faltas.
 */
function renderGuild(app) {
  const { state } = app.game;
  const owed = totalOwed(state.debt);
  const next = nextInstallment(state.debt);
  const pay = (amount) => {
    const res = app.act((g) => payGuild(g, amount));
    if (res.ok) {
      playCoins(0);
      app.toast(`Pagaste ${fmt(res.total)} al Gremio.`);
    }
  };
  const rows = state.debt.installments.map((i) => {
    const left = owedOn(i);
    const status = left === 0 ? h('span', { class: 'good' }, 'Paga') : i.day < state.day ? h('span', { class: 'bad' }, 'Vencida') : `Debés ${fmt(left)}`;
    return [h('dt', {}, `Día ${i.day}: ${fmt(i.amount)}`), h('dd', {}, status)];
  });
  return h('div', { class: 'stack' },
    h('div', { class: 'card stack' },
      h('h3', {}, 'Tu deuda con el Gremio'),
      h('dl', { class: 'kv' }, rows, h('dt', {}, 'Faltas'), h('dd', { class: state.debt.strikes ? 'bad' : '' }, `${state.debt.strikes} de ${RULES.debt.maxStrikes}`)),
      h('p', { class: 'small muted', style: 'margin:0' }, 'Podés adelantar pagos. Si una cuota vence sin pagar, el cobrador te la cobra donde estés con 15% de comisión; si no te alcanza, embarga tu carga más valiosa, lo que falta sube 50% y sumás una falta. Con dos faltas, perdés.')),
    owed > 0 ? h('div', { class: 'btn-row' },
      next ? h('button', { class: 'btn primary', 'data-testid': 'pay-next', disabled: state.gold <= 0, onclick: () => pay(owedOn(next)) }, `Pagar cuota (${fmt(Math.min(owedOn(next), state.gold))})`) : null,
      h('button', { class: 'btn', 'data-testid': 'pay-all', disabled: state.gold <= 0, onclick: () => pay(owed) }, `Pagar todo (${fmt(Math.min(owed, state.gold))})`))
      : h('p', { class: 'good center' }, '¡No le debés nada al Gremio!'),
    guildContracts(app));
}
