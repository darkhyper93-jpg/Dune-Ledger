/**
 * Pantalla del mapa: las ciudades conocidas y sus rutas. Tocar una ciudad
 * (o un destino de la lista de abajo) abre la hoja de la ruta con días,
 * comida y agua necesarias, peligro y últimos precios conocidos, y el
 * botón Viajar. El viaje en sí se muestra en js/ui/travel.js.
 */

import { h, openSheet, fmtPrice } from './dom.js';
import { createMapView } from '../render/map.js';
import { activeGoods } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { TERRAINS, DANGERS } from '../data/routes.js';
import { tripNeeds, canTravel } from '../game/travel.js';
import { startTrip } from '../game/season.js';
import { otherEnd } from '../game/map-gen.js';
import { canPayHere } from '../game/debt.js';
import { zoneName } from '../game/reputation.js';
import { goodArt } from './art.js';
import { ago } from './market.js';
import { plural } from '../core/text.js';

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
      h('div', { class: 'muted small' }, getCityType(city.type).name, ` · zona ${zoneName(city.zone)}`, canPayHere(city) ? ' · se le puede pagar al Gremio' : '')];
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
      parts.push(h('button', { class: 'btn big primary', 'data-testid': 'travel', disabled: !ok.ok, onclick: () => {
        close();
        const res = app.quiet((g) => startTrip(g, route.id));
        if (res.ok) app.go('travel');
      } },
        ok.ok ? `Viajar a ${city.name}` : ok.error));
    }
    if (seen && !here) {
      parts.push(h('h3', { style: 'margin-top:6px' }, `Precios de venta (${ago(state.day, seen.day)})`));
      parts.push(h('dl', { class: 'kv small' }, activeGoods().map((g) => [h('dt', { class: 'row', style: 'gap:8px' }, goodArt(g.id, 24), g.name), h('dd', {}, fmtPrice(seen.sell[g.id]))])));
    } else if (!here) {
      parts.push(h('p', { class: 'muted small' }, 'Todavía no conocés sus precios.'));
    }
    return h('div', { class: 'stack' }, parts);
  }, { label: city.name, onClose });
}
