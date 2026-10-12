/**
 * La parte de la hoja de una ciudad vecina que arma el viaje: duración,
 * terreno, peligro, provisiones y, por arena o piedra, si salir de día o de
 * noche (con la luna de hoy y la chance de perderse). El botón Viajar sale
 * con lo elegido.
 */

import { h, mount } from './dom.js';
import { TERRAINS, DANGERS } from '../data/routes.js';
import { tripNeeds, canTravel } from '../game/travel.js';
import { startTrip } from '../game/season.js';
import { canNightMarch, lostChance, moonPhase, moonName, moonLight } from '../game/moon.js';
import { moonSvg } from '../render/moon-art.js';
import { svgNode } from '../render/shapes.js';
import { plural } from '../core/text.js';
import { hintCard } from './coach.js';

/** Lo último elegido (de día o de noche), para no tener que elegirlo cada vez. */
let preferNight = false;

/**
 * Bloque de la ruta con el botón para salir.
 * @param {object} app
 * @param {object} route
 * @param {{name:string}} city destino
 * @param {() => void} close cierra la hoja
 * @returns {HTMLElement}
 */
export function routeBlock(app, route, city, close) {
  const { game } = app;
  const { state } = game;
  const box = h('div', { class: 'stack' });
  const nightOk = canNightMarch(route);
  let night = nightOk && preferNight;
  const hint = nightOk ? hintCard(app, 'luna', { inline: true }) : null;

  const draw = () => {
    const need = tripNeeds(state, route, { night });
    const ok = canTravel(game, route.id);
    const parts = [h('dl', { class: 'kv' },
      h('dt', {}, 'Duración'), h('dd', { 'data-testid': 'route-days' }, plural(need.days, 'día', 'días')),
      h('dt', {}, 'Terreno'), h('dd', {}, TERRAINS[route.terrain].name),
      h('dt', {}, 'Peligro'), h('dd', {}, h('span', { class: `pill ${route.danger}` }, DANGERS[route.danger].name)),
      h('dt', {}, 'Comida'), h('dd', { class: need.enoughFood ? '' : 'need-bad' }, `${need.food} (tenés ${state.food})`),
      h('dt', {}, 'Agua'), h('dd', { class: need.enoughWater ? '' : 'need-bad', 'data-testid': 'route-water' }, `${need.water} (tenés ${state.water})`))];
    if (nightOk) parts.push(hint, nightChooser(state, night, (v) => {
      night = v;
      preferNight = v;
      draw();
    }));
    if (!need.enoughFood || !need.enoughWater) {
      parts.push(h('p', { class: 'bad small', style: 'margin:0' }, '¡No te alcanzan las provisiones! Cada día sin comida o sin agua vas a dejar un 10% de la carga en el camino. Cargá en Provisiones.'));
    }
    parts.push(h('button', { class: 'btn big primary', 'data-testid': 'travel', disabled: !ok.ok, onclick: () => {
      close();
      const res = app.quiet((g) => startTrip(g, route.id, { night }));
      if (res.ok) app.go('travel');
    } }, ok.ok ? `Viajar a ${city.name}${night ? ' de noche' : ''}` : ok.error));
    mount(box, ...parts);
  };
  draw();
  return box;
}

/**
 * Elegir salir de día o de noche, con la luna de hoy.
 * @param {object} state
 * @param {boolean} night
 * @param {(night:boolean) => void} onPick
 */
function nightChooser(state, night, onPick) {
  const phase = moonPhase(state);
  const lost = Math.round(lostChance(state) * 100);
  const light = moonLight(phase);
  const bandits = light < 0.35 ? 'Sin luna los bandidos casi no te ven.' : light > 0.8 ? 'Con tanta luz, los bandidos te ven como de día.' : 'Los bandidos te ven menos que de día.';
  const opt = (value, title, sub) => h('button', {
    class: `seg-btn${night === value ? ' chosen' : ''}`, role: 'radio', 'aria-checked': String(night === value),
    'data-testid': value ? 'march-night' : 'march-day', onclick: () => onPick(value),
  }, h('b', {}, title), h('span', { class: 'tiny' }, sub));
  return h('div', { class: 'stack night-pick', style: 'gap:8px' },
    h('div', { class: 'row moon-line', 'data-testid': 'moon' },
      h('span', { class: 'moon-ico' }, svgNode(moonSvg(phase))),
      h('span', { class: 'grow' }, h('b', {}, moonName(phase)), ' esta noche')),
    h('div', { class: 'seg seg-2', role: 'radiogroup', 'aria-label': 'Cuándo salir' },
      opt(false, 'De día', 'Como siempre'),
      opt(true, 'De noche', `Menos agua, ${lost}% de perderse`)),
    night ? h('p', { class: 'small', style: 'margin:0', 'data-testid': 'night-note' },
      `Sin el sol se gasta mucho menos agua, pero los camellos tropiezan y te podés perder un día. ${bandits}`) : null);
}
