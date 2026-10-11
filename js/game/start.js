/**
 * Cómo arranca la caravana según el mercader y las mejoras del Gremio:
 * oro, camellos, provisiones, deuda, reputación, tripulación inicial y lo
 * que se conoce del mapa.
 */

import { RULES } from '../data/rules.js';
import { getMerchant, hasPerk, upgradeLevel, upgradeValue } from './perks.js';
import { otherEnd } from './map-gen.js';
import { snapshotPrices } from './knowledge.js';

/**
 * Recursos con los que empieza la caravana.
 * @param {object} state con `merchant` y `upgrades` ya puestos
 * @returns {{gold:number, camels:number, food:number, water:number, debtMult:number, delays:number}}
 */
export function startingResources(state) {
  const m = getMerchant(state.merchant);
  const s = RULES.start;
  const extra = upgradeValue(state, 'provisiones');
  return {
    gold: (m.start?.gold ?? s.gold) + upgradeValue(state, 'oro'),
    camels: Math.min(RULES.maxCamels, (m.start?.camels ?? s.camels) + upgradeValue(state, 'camello')),
    food: s.food + extra,
    water: s.water + extra,
    debtMult: m.debtMult ?? 1,
    delays: upgradeLevel(state, 'plazo'),
  };
}

/**
 * Ventajas que se aplican con el mapa ya armado: reputación inicial,
 * guardias de la Capitana y lo que se sabe del mapa.
 * @param {{map:object, state:object}} game
 */
export function applyStartPerks(game) {
  const { state, map } = game;
  const fame = upgradeValue(state, 'fama');
  for (const z of Object.keys(state.rep)) state.rep[z] = fame;
  if (hasPerk(state, 'capitana')) {
    for (const name of ['Zahra', 'Kasim']) {
      state.crew.push({ id: `t${state.hire.nextId++}`, name, role: 'guardia', trait: 'leal', xp: 0, morale: 80, wage: 12 });
    }
  }
  if (upgradeLevel(state, 'mapa')) {
    for (const r of map.routesByCity[state.location]) {
      const nb = otherEnd(r, state.location);
      for (const r2 of map.routesByCity[nb]) {
        state.known[otherEnd(r2, nb)] = true;
        state.knownRoutes[r2.id] = true;
      }
    }
  }
  if (hasPerk(state, 'nomada')) {
    for (const c of map.cities) if (c.type === 'oasis') state.known[c.id] = true;
  }
  if (hasPerk(state, 'cartografo')) {
    for (const c of map.cities) {
      state.known[c.id] = true;
      snapshotPrices(game, c.id);
    }
    for (const r of map.routes) state.knownRoutes[r.id] = true;
  }
}
