/**
 * La caravana: carga usada, capacidad y precios de camellos.
 */

import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { hashUnit } from '../core/rng.js';

/**
 * Carga máxima: 20 por camello.
 * @param {object} state
 */
export function capacity(state) {
  return state.camels * RULES.camelCapacity;
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
 * Lo que te dan por vender un camello en esa ciudad.
 * @param {string} seed
 * @param {{id:string,type:string}} city
 */
export function camelResale(seed, city) {
  return Math.floor(camelPrice(seed, city) * RULES.camelResale);
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
