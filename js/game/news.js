/**
 * Noticias de mercado y rumores: cuándo salen, cuándo se confirman y cómo
 * cambian los precios. Los textos y efectos están en js/data/news.js.
 */

import { NEWS, NEWS_BY_ID } from '../data/news.js';
import { ZONES, zoneName } from './reputation.js';
import { withRng } from './random.js';
import { addLog } from './knowledge.js';

/** Probabilidad de que un rumor sea verdad. */
export const RUMOR_TRUE = 0.75;

/**
 * Estado inicial de las noticias: la primera sale entre el día 4 y el 7.
 * @param {import('../core/rng.js').Rng} rng
 */
export function initialNews(rng) {
  return { next: rng.int(4, 7), items: [] };
}

/**
 * Texto de una noticia, con el nombre de la zona si corresponde.
 * @param {{tpl:string, zone:string|null}} item
 */
export function newsText(item) {
  const tpl = NEWS_BY_ID[item.tpl];
  const text = tpl ? tpl.text : 'Cambian los precios.';
  return text.replace('{zona}', zoneName(item.zone ?? ''));
}

/**
 * Dice si una noticia toca a una ciudad.
 */
function covers(item, city) {
  return item.zone ? city.zone === item.zone : city.type === item.cityType;
}

/**
 * Multiplicador de precio por noticias activas para un bien en una ciudad.
 * @param {object} game
 * @param {string} cityId
 * @param {string} goodId
 */
export function newsMult(game, cityId, goodId) {
  const city = game.map.cityById[cityId];
  let mult = 1;
  for (const item of activeNews(game.state)) {
    if (item.goods.includes(goodId) && covers(item, city)) mult *= item.mult;
  }
  return mult;
}

/**
 * Rumores que circulan hoy (todavía no confirmados ni desmentidos).
 * @param {object} state
 */
export function rumorsAt(state) {
  return state.news.items.filter((n) => n.rumorDay <= state.day && state.day < n.startDay);
}

/**
 * Noticias confirmadas y vigentes hoy.
 * @param {object} state
 */
export function activeNews(state) {
  return state.news.items.filter((n) => n.real && n.startDay <= state.day && state.day <= n.endDay);
}

/**
 * Crea una noticia nueva al azar (arranca como rumor hoy).
 */
function makeNews(state, rng) {
  const tpl = rng.pick(NEWS);
  const startDay = state.day + rng.int(3, 5);
  return {
    tpl: tpl.id,
    goods: tpl.goods.slice(),
    mult: tpl.mult,
    cityType: tpl.scope === 'type' ? tpl.cityType : null,
    zone: tpl.scope === 'zone' ? rng.pick(ZONES).id : null,
    rumorDay: state.day,
    startDay,
    endDay: startDay + rng.int(5, 15) - 1,
    real: rng.chance(RUMOR_TRUE),
  };
}

/**
 * Paso diario de las noticias: sale un rumor nuevo si toca, se confirman
 * o desmienten los que llegan a su fecha, y se olvidan las muy viejas.
 * @param {object} game
 */
export function tickNews(game) {
  const { state } = game;
  if (state.day >= state.news.next) {
    withRng(state, (rng) => {
      state.news.items.push(makeNews(state, rng));
      state.news.next = state.day + rng.int(7, 10);
    });
  }
  for (const item of state.news.items) {
    if (item.startDay !== state.day) continue;
    if (item.real) addLog(state, `Se confirmó: ${newsText(item)}`, 'info');
    else addLog(state, `Era falso el rumor: ${newsText(item)}`, 'info');
  }
  state.news.items = state.news.items.filter((n) => n.endDay >= state.day - 10);
}
