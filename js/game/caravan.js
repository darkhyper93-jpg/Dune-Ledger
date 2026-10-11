/**
 * La caravana: carga usada, capacidad y precios de camellos.
 */

import { RULES } from '../data/rules.js';
import { getGood } from '../data/goods.js';
import { getCityType } from '../data/cities.js';
import { hashUnit } from '../core/rng.js';
import { upgradeValue, regionOf, hasPerk } from './perks.js';

/**
 * Carga que lleva cada animal: 20 un camello (12 un caballo en la Estepa),
 * más con alforjas grandes.
 * @param {object} state
 */
export function perMount(state) {
  return regionOf(state).mount.capacity + upgradeValue(state, 'carga') + (hasPerk(state, 'caravanero') ? 5 : 0);
}

/**
 * Carga máxima de la caravana.
 * @param {object} state
 */
export function capacity(state) {
  return state.camels * perMount(state);
}

/**
 * Nombre de la montura de la región: mountName(state) → "camello",
 * mountName(state, 3) → "camellos", con `cap` en mayúscula.
 * @param {object} state
 * @param {number} [n=1]
 * @param {boolean} [cap=false]
 */
export function mountName(state, n = 1, cap = false) {
  const m = regionOf(state).mount;
  const name = n === 1 ? m.one : m.many;
  return cap ? name[0].toUpperCase() + name.slice(1) : name;
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
