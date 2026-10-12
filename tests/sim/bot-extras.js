/**
 * Lo que hace un bot "con extras" además de comerciar: compra equipo útil
 * en el bazar y sigue la crónica de la región (va hacia las ciudades que
 * pide, compra lo que hay que entregar y paga cuando corresponde). Sirve
 * para medir que el contenido nuevo no rompa el balance.
 */

import { GEAR_BY_ID } from '../../js/data/gear.js';
import { gearHere, buyGear, hasGear } from '../../js/game/gear.js';
import { chapterNow, chronicleCheck, chronicleAct } from '../../js/game/chronicle.js';
import { buy, maxBuy } from '../../js/game/actions.js';
import { canTrade } from '../../js/game/perks.js';
import { totalOwed } from '../../js/game/debt.js';
import { otherEnd } from '../../js/game/map-gen.js';
import { canNightMarch, lostChance } from '../../js/game/moon.js';

/** Equipo en orden de preferencia para un comerciante. */
const WANTED = ['cofre', 'brujula', 'lampara', 'astrolabio', 'toldo', 'catalejo', 'amuleto'];

/** Oro que el bot no quiere tocar (para la deuda y el viaje). */
function reserve(state) {
  return 200 + totalOwed(state.debt) * 0.3;
}

/**
 * Antes de elegir ruta: compra equipo, cumple la crónica si se puede acá y
 * se prepara para el próximo capítulo.
 * @param {{map:object, state:object}} game
 */
export function extrasBefore(game) {
  const { state, map } = game;
  for (const id of WANTED) {
    const it = GEAR_BY_ID[id];
    if (!hasGear(state, id) && gearHere(game).includes(it) && state.gold - it.price > reserve(state)) buyGear(game, id);
  }
  const chapter = chapterNow(state);
  if (!chapter) return;
  const g = chapter.goal;
  if (g.type === 'pay' && state.gold - g.gold < reserve(state) * 0.5) return;
  if (chronicleCheck(game).ok) {
    chronicleAct(game);
    return;
  }
  // Si hay que entregar algo y se vende acá, lo carga.
  const here = map.cityById[state.location];
  if (g.type === 'deliver' && state.cargo[g.good] < g.qty && canTrade(state, g.good, here.type)) {
    const n = Math.min(g.qty - state.cargo[g.good], maxBuy(game, g.good));
    if (n > 0) buy(game, g.good, n);
  }
}

/**
 * Bonus de valor por ir a cada ciudad vecina para avanzar la crónica.
 * @param {{map:object, state:object}} game
 * @returns {Record<string, number>}
 */
export function chronicleBonus(game) {
  const { state, map } = game;
  const chapter = chapterNow(state);
  const out = {};
  if (!chapter) return out;
  const g = chapter.goal;
  const ready = g.type === 'visit' || (g.type === 'deliver' && state.cargo[g.good] >= g.qty) || (g.type === 'pay' && state.gold > g.gold + reserve(state) * 0.5);
  if (!ready) return out;
  for (const r of map.routesByCity[state.location]) {
    const id = otherEnd(r, state.location);
    if (map.cityById[id].type === g.cityType) out[id] = 45;
  }
  return out;
}

/**
 * Marcha de noche cuando se puede y hay poco riesgo de perderse (luna
 * suficiente, guía o astrolabio): ahorra agua.
 * @param {{map:object, state:object}} game
 * @param {object} route
 * @returns {{night:boolean}}
 */
export function nightChoice(game, route) {
  return { night: canNightMarch(route) && lostChance(game.state) < 0.15 };
}
