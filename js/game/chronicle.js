/**
 * Motor de las crónicas (las historias están en js/data/chronicles.js): qué
 * capítulo toca, si ya se cumplió y qué recompensa da. Los capítulos de
 * "llegar a" se cumplen solos al llegar; los de "entregar" y "pagar" se
 * hacen desde la Taberna de una ciudad del tipo pedido.
 */

import { CHRONICLES, CHAPTERS } from '../data/chronicles.js';
import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { regionId } from './perks.js';
import { changeRep } from './reputation.js';
import { healCamels } from './camels.js';
import { addLog } from './knowledge.js';
import { fmt } from '../core/text.js';

/** Crónica recién empezada. */
export function createChronicle() {
  return { step: 0, perk: null };
}

/**
 * Capítulo actual (con el título de la crónica), o null si ya terminó.
 * @param {object} state
 * @returns {null|{index:number, title:string, text:string, goal:object, reward:object, done:string}}
 */
export function chapterNow(state) {
  const ch = CHRONICLES[regionId(state)];
  const step = state.chronicle?.step ?? CHAPTERS;
  if (!ch || step >= CHAPTERS) return null;
  return { index: step, title: ch.title, ...ch.chapters[step] };
}

/**
 * Texto corto del objetivo de un capítulo.
 * @param {{type:string, cityType:string, good?:string, qty?:number, gold?:number}} goal
 */
export function goalText(goal) {
  const where = getCityType(goal.cityType).name.toLowerCase();
  if (goal.type === 'visit') return `Llegá a una ciudad de tipo ${where}.`;
  if (goal.type === 'deliver') return `Entregá ${goal.qty} de ${getGood(goal.good).name} en una ciudad de tipo ${where}.`;
  return `Pagá ${fmt(goal.gold)} de oro en una ciudad de tipo ${where}.`;
}

/** Aplica la recompensa de un capítulo y pasa al siguiente. */
function complete(game, chapter) {
  const { state, map } = game;
  const city = map.cityById[state.location];
  const r = chapter.reward;
  if (r.gold) state.gold += r.gold;
  if (r.rep) changeRep(state, city.zone, r.rep);
  if (r.heal) healCamels(state, r.heal);
  if (r.mount && state.camels < RULES.maxCamels) {
    state.camels += 1;
    state.camelHp.push(100);
  }
  if (r.reveal) {
    for (const c of map.cities) state.known[c.id] = true;
    for (const route of map.routes) state.knownRoutes[route.id] = true;
  }
  if (r.perk) state.chronicle.perk = r.perk;
  state.chronicle.step += 1;
  state.undo = [];
  addLog(state, `Crónica «${chapter.title}», capítulo ${chapter.index + 1}: ${chapter.done}${r.gold ? ` (+${fmt(r.gold)} de oro)` : ''}`, 'good');
  if (state.chronicle.step >= CHAPTERS) addLog(state, `¡Terminaste la crónica «${chapter.title}»!`, 'good');
}

/**
 * Al llegar a una ciudad: cumple el capítulo si pedía llegar ahí.
 * @param {{map:object, state:object}} game
 * @returns {boolean} si se cumplió un capítulo
 */
export function chronicleArrive(game) {
  const chapter = chapterNow(game.state);
  const city = game.map.cityById[game.state.location];
  if (!chapter || chapter.goal.type !== 'visit' || chapter.goal.cityType !== city.type) return false;
  complete(game, chapter);
  return true;
}

/**
 * Dice si se puede cumplir ahora el capítulo de entregar o pagar.
 * @param {{map:object, state:object}} game
 * @returns {{ok:boolean, error?:string}}
 */
export function chronicleCheck(game) {
  const { state, map } = game;
  const chapter = chapterNow(state);
  if (!chapter || chapter.goal.type === 'visit') return { ok: false, error: 'No hay nada que hacer acá.' };
  const g = chapter.goal;
  if (state.trip || state.over) return { ok: false, error: 'Ahora no se puede.' };
  if (map.cityById[state.location].type !== g.cityType) return { ok: false, error: goalText(g) };
  if (g.type === 'deliver' && state.cargo[g.good] < g.qty) return { ok: false, error: `Te falta ${getGood(g.good).name}: tenés ${state.cargo[g.good]} de ${g.qty}.` };
  if (g.type === 'pay' && state.gold < g.gold) return { ok: false, error: `Te falta oro: necesitás ${fmt(g.gold)}.` };
  return { ok: true };
}

/**
 * Entrega o paga lo que pide el capítulo actual.
 * @param {{map:object, state:object}} game
 * @returns {{ok:boolean, error?:string}}
 */
export function chronicleAct(game) {
  const check = chronicleCheck(game);
  if (!check.ok) return check;
  const { state } = game;
  const chapter = chapterNow(state);
  const g = chapter.goal;
  if (g.type === 'deliver') {
    state.cargo[g.good] -= g.qty;
    if (state.cargo[g.good] === 0) state.costBasis[g.good] = 0;
  } else {
    state.gold -= g.gold;
  }
  complete(game, chapter);
  return { ok: true };
}
