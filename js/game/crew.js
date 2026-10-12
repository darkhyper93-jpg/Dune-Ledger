/**
 * La tripulación: contratar y despedir, efectos de cada rol (según el
 * nivel), sueldos cada 7 días, moral, experiencia y deserciones.
 */

import { ROLES, TRAITS, CREW_NAMES } from '../data/crew.js';
import { addLog } from './knowledge.js';
import { withRng } from './random.js';
import { fmt } from '../core/text.js';
import { upgradeValue } from './perks.js';
import { noteFlow } from './ledger.js';

/** Máximo de tripulantes. */
export const MAX_CREW = 5;
/** Cada cuántos días se pagan los sueldos. */
export const WAGE_DAYS = 7;
/** Con moral por debajo de esto, la gente se va al llegar a una ciudad. */
export const DESERT_MORALE = 25;
/** Moral inicial de alguien recién contratado. */
export const START_MORALE = 70;
/** Experiencia (días de viaje) para los niveles 2 y 3. */
export const LEVELS = [8, 20];
/** Cada cuántos días se renuevan los candidatos de una taberna. */
export const HIRE_TTL = 7;

/** Estado inicial: nadie contratado. */
export function initialHire() {
  return { offers: {}, nextId: 1 };
}

/**
 * Nivel de un tripulante (1 a 3) según su experiencia.
 * @param {{xp:number}} m
 */
export function levelOf(m) {
  return 1 + (m.xp >= LEVELS[0] ? 1 : 0) + (m.xp >= LEVELS[1] ? 1 : 0);
}

/** Mejor nivel de un rol en la caravana (0 si no hay nadie con ese rol). */
function best(state, role) {
  let lvl = 0;
  for (const m of state.crew) if (m.role === role) lvl = Math.max(lvl, levelOf(m));
  return lvl;
}

/** Días de una ruta con guía (uno menos, mínimo 1). */
export function guideDays(state, days) {
  return best(state, 'guia') ? Math.max(1, days - 1) : days;
}

/** Bonus a la chance de ganar una pelea: guardias y valientes. */
export function fightBonus(state) {
  let b = 0;
  for (const m of state.crew) {
    if (m.role === 'guardia') b += levelOf(m) >= 3 ? 0.2 : 0.15;
    if (m.trait === 'valiente') b += 0.05;
  }
  return b;
}

/** Bonus para pasar una tormenta (guía). */
export function stormBonus(state) {
  const lvl = best(state, 'guia');
  return lvl >= 3 ? 0.25 : lvl ? 0.15 : 0;
}

/** Factor de comida (cocinero). */
export function foodFactor(state) {
  const lvl = best(state, 'cocinero');
  return lvl >= 3 ? 0.6 : lvl ? 0.75 : 1;
}

/** Ventaja del contable en compras y ventas (0, 5% u 8%). */
export function tradeBonus(state) {
  const lvl = best(state, 'contable');
  return lvl >= 3 ? 0.08 : lvl ? 0.05 : 0;
}

/** Multiplicador de recuperación al descansar (curandero). */
export function healMult(state) {
  const lvl = best(state, 'curandero');
  return lvl >= 3 ? 2.5 : lvl ? 2 : 1;
}

/** Nivel del explorador (0 si no hay). */
export function scoutLevel(state) {
  return best(state, 'explorador');
}

/**
 * Candidatos para contratar en la ciudad actual.
 * @param {object} game
 */
export function hiresHere(game) {
  return game.state.hire.offers[game.state.location]?.list ?? [];
}

/**
 * Renueva los candidatos de una ciudad si no hay o si son viejos.
 * @param {object} game
 * @param {string} cityId
 */
export function refreshHires(game, cityId) {
  const { state } = game;
  const cur = state.hire.offers[cityId];
  if (cur && state.day - cur.day < HIRE_TTL) return;
  const list = withRng(state, (rng) => Array.from({ length: rng.int(2, 3) }, () => {
    const role = rng.pick(Object.keys(ROLES));
    const trait = rng.pick(Object.keys(TRAITS));
    const base = trait === 'codicioso' ? ROLES[role].wage * 1.5 : ROLES[role].wage;
    const cheap = (1 - upgradeValue(state, 'taberna')) * (role === 'guardia' ? 1 - upgradeValue(state, 'guardias') : 1);
    const wage = Math.max(1, Math.round(Math.round(base) * cheap));
    return { id: `t${state.hire.nextId++}`, name: rng.pick(CREW_NAMES), role, trait, xp: 0, morale: START_MORALE, wage };
  }));
  state.hire.offers[cityId] = { day: state.day, list };
}

/**
 * Contrata a un candidato: paga la primera semana por adelantado.
 * @param {object} game
 * @param {string} id
 */
export function hire(game, id) {
  const { state } = game;
  if (state.over || state.trip) return { ok: false, error: 'Ahora no se puede.' };
  const list = hiresHere(game);
  const c = list.find((x) => x.id === id);
  if (!c) return { ok: false, error: 'Esa persona ya no está.' };
  if (state.crew.length >= MAX_CREW) return { ok: false, error: `Podés llevar hasta ${MAX_CREW} personas.` };
  if (state.gold < c.wage) return { ok: false, error: 'No te alcanza para la primera semana.' };
  state.gold -= c.wage;
  noteFlow(state, 'sueldos', -c.wage);
  list.splice(list.indexOf(c), 1);
  state.crew.push(c);
  state.seen.roles[c.role] = true;
  state.seen.traits[c.trait] = true;
  state.stats.maxCrew = Math.max(state.stats.maxCrew, state.crew.length);
  state.undo = [];
  addLog(state, `Contrataste a ${c.name} (${ROLES[c.role].name}, ${TRAITS[c.trait].name.toLowerCase()}) por ${c.wage} por semana.`, 'info');
  return { ok: true, total: c.wage };
}

/**
 * Despide a un tripulante.
 * @param {object} game
 * @param {string} id
 */
export function fire(game, id) {
  const { state } = game;
  const m = state.crew.find((x) => x.id === id);
  if (!m || state.over || state.trip) return { ok: false, error: 'Ahora no se puede.' };
  state.crew.splice(state.crew.indexOf(m), 1);
  state.undo = [];
  addLog(state, `${m.name} dejó la caravana.`, 'info');
  return { ok: true };
}

/**
 * Cambia la moral de toda la tripulación (0 a 100).
 * @param {object} state
 * @param {number} delta
 */
export function changeMorale(state, delta) {
  for (const m of state.crew) m.morale = Math.max(0, Math.min(100, Math.round(m.morale + delta)));
}

/**
 * Paso diario de la tripulación: experiencia en viaje, moral por hambre,
 * sed o descanso, y sueldos cada 7 días.
 * @param {object} game
 * @param {{travel:boolean, rest:boolean, hungry:boolean, thirsty:boolean}} day
 * @returns {{extraRumor:boolean}} si un charlatán trae un rumor extra
 */
export function crewDay(game, day) {
  const { state } = game;
  if (!state.crew.length) return { extraRumor: false };
  if (day.travel) for (const m of state.crew) m.xp = Math.min(999, m.xp + 1);
  if (day.hungry) changeMorale(state, -15);
  if (day.thirsty) changeMorale(state, -10);
  if (day.rest && !day.hungry && !day.thirsty) changeMorale(state, 5 * healMult(state));
  if (state.day % WAGE_DAYS !== 0) return { extraRumor: false };
  const total = state.crew.reduce((s, m) => s + m.wage, 0);
  if (state.gold >= total) {
    state.gold -= total;
    noteFlow(state, 'sueldos', -total);
    addLog(state, `Pagaste ${fmt(total)} de sueldos.`, 'info');
  } else {
    changeMorale(state, -20);
    addLog(state, `No alcanzó el oro para los sueldos (${fmt(total)}): la tripulación está enojada.`, 'bad');
  }
  for (const m of state.crew) {
    if (m.trait === 'codicioso' && m.morale < 30 && state.gold > 0) {
      const stolen = Math.ceil(state.gold * 0.05);
      state.gold -= stolen;
      addLog(state, `${m.name} se quedó con ${fmt(stolen)} de oro de la caja.`, 'bad');
    }
  }
  return { extraRumor: state.crew.some((m) => m.trait === 'charlatan') };
}

/**
 * Al llegar a una ciudad: se va quien tenga la moral muy baja (salvo los
 * leales) y el valiente a veces se mete en una pelea.
 * @param {object} game
 */
export function crewArrive(game) {
  const { state } = game;
  for (const m of state.crew.slice()) {
    if (m.morale < DESERT_MORALE && m.trait !== 'leal') {
      state.crew.splice(state.crew.indexOf(m), 1);
      addLog(state, `${m.name} se fue de la caravana: no aguantaba más.`, 'bad');
    }
  }
  if (state.crew.some((m) => m.trait === 'valiente')) {
    withRng(state, (rng) => {
      if (rng.chance(0.05) && state.gold > 0) {
        const fine = Math.min(state.gold, 15);
        state.gold -= fine;
        addLog(state, `Tu valiente se peleó en la taberna: pagaste ${fine} de multa.`, 'bad');
      }
    });
  }
}
