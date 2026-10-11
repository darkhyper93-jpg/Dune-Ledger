/**
 * La caravana: carga usada, capacidad y precios de camellos.
 */

import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { hashUnit } from '../core/rng.js';
import { upgradeValue } from './perks.js';

/**
 * Carga máxima: 20 por camello (más con alforjas grandes).
 * @param {object} state
 */
export function capacity(state) {
  return state.camels * (RULES.camelCapacity + upgradeValue(state, 'carga'));
}

/**
 * Tope de comida y de agua (más con odres de cuero).
 * @param {object} state
 */
export function provisionCap(state) {
  return RULES.provisionCap + upgradeValue(state, 'odres');
}

/**
 * Lugares de carga ocupados (unidades × peso de cada bien).
 * @param {object} state
 */
export function cargoUsed(state) {
  let used = 0;
  for (const [id, qty] of Object.entries(state.cargo)) used += qty * getGood(id).weight;
  return used;
}

/**
 * Lugares libres de carga.
 * @param {object} state
 */
export function cargoFree(state) {
  return Math.max(0, capacity(state) - cargoUsed(state));
}

/**
 * Precio de un camello en una ciudad: fijo por semilla dentro del rango del tipo.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 */
export function camelPrice(seed, city) {
  const [lo, hi] = getCityType(city.type).camel;
  return Math.round(lo + hashUnit(`${seed}|camello|${city.id}`) * (hi - lo));
}

/**
 * Lo que te dan por vender un camello en esa ciudad (menos si está cansado).
 * @param {string} seed
 * @param {{id:string,type:string}} city
 * @param {number} [hp=100] salud del camello
 */
export function camelResale(seed, city, hp = 100) {
  return Math.floor(camelPrice(seed, city) * RULES.camelResale * (0.4 + 0.6 * hp / 100));
}

/**
 * Precio de la comida y el agua en una ciudad.
 * @param {{type:string}} city
 * @returns {{food:number,water:number}}
 */
export function provisionPrices(city) {
  const t = getCityType(city.type);
  return { food: t.food, water: t.water };
}
