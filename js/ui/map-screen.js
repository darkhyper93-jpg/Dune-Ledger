/**
 * Pantalla del mapa: las ciudades conocidas y sus rutas. Tocar una ciudad
 * (o un destino de la lista de abajo) abre la hoja de la ruta con días,
 * comida y agua necesarias, peligro y últimos precios conocidos, y el
 * botón Viajar. El viaje se anima con la caravana y el cielo.
 */

import { h, openSheet, closeSheets, fmtPrice } from './dom.js';
import { createMapView } from '../render/map.js';
import { activeGoods } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { TERRAINS, DANGERS } from '../data/routes.js';
import { tripNeeds, canTravel } from '../game/travel.js';
import { travel } from '../game/season.js';
import { otherEnd } from '../game/map-gen.js';
import { canPayHere } from '../game/debt.js';
import { ago } from './market.js';
import { plural } from '../core/text.js';
import { setWind } from '../core/audio.js';

let current = null; // vista del mapa activa (una sola a la vez)

/**
 * Arma la pantalla del mapa.
 * @param {object} app
 * @returns {HTMLElement}
 */
export function renderMap(app) {
  const { game } = app;
  const { state, map } = game;
  current?.destroy();
  const canvas = h('canvas', { 'aria-label': 'Mapa del desierto', role: 'img', 'data-testid': 'map-canvas' });
  const wrap = h('div', { class: 'map-wrap' }, canvas,
    h('div', { class: 'map-hint' }, 'Tocá una ciudad vecina para ver la ruta.'));
  let selected = null;
  const view = createMapView(canvas, {
    onPick: (id) => {
      selected = id;
      view.draw(game, { selected });
      if (id) openCity(app, id, () => { selected = null; view.draw(game, {}); });
    },
  });
  current = view;

  const dests = map.routesByCity[state.location].map((r) => {
    const to = map.cityById[otherEnd(r, state.location)];
    return h('button', { class: 'btn small', 'data-testid': `dest-${to.id}`, onclick: () => {
      selected = to.id;
      view.draw(game, { selected });
      openCity(app, to.id, () => { selected = null; view.draw(game, {}); });
    } }, `${to.name} · ${plural(r.days, 'día', 'días')}`);
  });

  const panel = h('div', { class: 'dest-panel', 'aria-label': 'Destinos desde acá' }, dests);
  const root = h('div', { style: 'position:absolute;inset:0' }, wrap, panel);
  requestAnimationFrame(() => {
    view.resize();
    view.draw(game, {});
  });
  return root;
}

/**
 * Abre la hoja de una ciudad del mapa: ruta (si es vecina) y precios vistos.
 * @param {object} app
 * @param {string} cityId
 * @param {Function} onClose
 */
function openCity(app, cityId, onClose) {
  const { game } = app;
  const { state, map } = game;
  const city = map.cityById[cityId];
  const route = map.routesByCity[state.location].find((r) => otherEnd(r, state.location) === cityId);
  const here = cityId === state.location;
  const seen = state.prices[cityId];

  openSheet((close) => {
    const parts = [h('h2', {}, city.name),
      h('div', { class: 'muted small' }, getCityType(city.type).name, canPayHere(city) ? ' · se le puede pagar al Gremio' : '')];
    if (here) parts.push(h('p', {}, 'Estás acá.'));
    else if (!route) parts.push(h('p', { class: 'muted' }, 'No hay ruta directa desde donde estás.'));
    else {
      const need = tripNeeds(state, route);
      const ok = canTravel(game, route.id);
      parts.push(h('dl', { class: 'kv' },
        h('dt', {}, 'Duración'), h('dd', { 'data-testid': 'route-days' }, plural(route.days, 'día', 'días')),
        h('dt', {}, 'Terreno'), h('dd', {}, TERRAINS[route.terrain].name),
        h('dt', {}, 'Peligro'), h('dd', {}, h('span', { class: `pill ${route.danger}` }, DANGERS[route.danger].name)),
        h('dt', {}, 'Comida'), h('dd', { class: need.enoughFood ? '' : 'need-bad' }, `${need.food} (tenés ${state.food})`),
        h('dt', {}, 'Agua'), h('dd', { class: need.enoughWater ? '' : 'need-bad' }, `${need.water} (tenés ${state.water})`)));
      if (!need.enoughFood || !need.enoughWater) {
        parts.push(h('p', { class: 'bad small', style: 'margin:0' }, '¡No te alcanzan las provisiones! Cada día sin comida o sin agua vas a dejar un 10% de la carga en el camino. Cargá en Provisiones.'));
      }
      parts.push(h('button', { class: 'btn big primary', 'data-testid': 'travel', disabled: !ok.ok, onclick: () => { close(); startTravel(app, route.id); } },
        ok.ok ? `Viajar a ${city.name}` : ok.error));
    }
    if (seen && !here) {
      parts.push(h('h3', { style: 'margin-top:6px' }, `Precios de venta (${ago(state.day, seen.day)})`));
      parts.push(h('dl', { class: 'kv small' }, activeGoods().map((g) => [h('dt', {}, `${g.icon} ${g.name}`), h('dd', {}, fmtPrice(seen.sell[g.id]))])));
    } else if (!here) {
      parts.push(h('p', { class: 'muted small' }, 'Todavía no conocés sus precios.'));
    }
    return h('div', { class: 'stack' }, parts);
  }, { label: city.name, onClose });
}

/**
 * Viaja: resuelve el viaje en la simulación y después lo anima sobre el mapa.
 * Tocar la pantalla saltea la animación.
 * @param {object} app
 * @param {string} routeId
 */
function startTravel(app, routeId) {
  const { game } = app;
  const route = game.map.routeById[routeId];
  const from = game.state.location;
  const startDay = game.state.day;
  const res = app.act((g) => travel(g, routeId));
  if (!res.ok) return;
  closeSheets();
  app.setNavEnabled(false);
  const view = current;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const perDay = reduce ? 150 : 650;
  const total = Math.max(1, res.days) * perDay;
  const t0 = performance.now();
  let done = false;
  const banner = h('div', { class: 'travel-banner', 'data-testid': 'travel-banner' }, 'En camino…');
  document.querySelector('.map-wrap')?.append(banner);
  document.querySelector('.dest-panel')?.remove();
  document.querySelector('.map-hint')?.remove();
  setWind(true);

  const finish = () => {
    if (done) return;
    done = true;
    setWind(false);
    app.setNavEnabled(true);
    window.removeEventListener('pointerdown', finish);
    if (game.state.over) app.go('summary');
    else app.go('city', { tab: 'mercado', arrived: true });
  };
  window.addEventListener('pointerdown', finish);

  const frame = (now) => {
    if (done) return;
    const t = Math.min(1, (now - t0) / total);
    const daysPassed = t * res.days;
    const night = 0.45 * (1 - Math.cos(daysPassed * Math.PI * 2)) / 2;
    banner.textContent = `En camino… día ${Math.min(startDay + Math.ceil(daysPassed), startDay + res.days)}`;
    view.draw(game, { travel: { route, from, t: t * (res.days / route.days) }, night });
    if (t < 1) requestAnimationFrame(frame);
    else setTimeout(finish, 250);
  };
  requestAnimationFrame(frame);
}
