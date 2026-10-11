/**
 * Tipos de ciudad y nombres posibles.
 *
 * Qué produce y qué consume cada tipo sale de la tabla de bienes
 * (js/data/goods.js); acá están los precios de provisiones, de camellos
 * y cuántas ciudades de cada tipo puede tener un mapa.
 */

/**
 * @typedef {{id:string,name:string,food:number,water:number,camel:[number,number],min:number,max:number,weight:number}} CityType
 * food / water: precio por unidad. camel: rango de precio de un camello.
 * min / max / weight: cuántas hay por mapa y qué tan seguido aparecen.
 */

/** @type {CityType[]} */
export const CITY_TYPES = [
  { id: 'capital', name: 'Capital', food: 3, water: 2, camel: [110, 120], min: 1, max: 1, weight: 0 },
  { id: 'puerto', name: 'Puerto', food: 2, water: 1, camel: [95, 115], min: 2, max: 4, weight: 3 },
  { id: 'oasis', name: 'Oasis', food: 2, water: 0, camel: [80, 90], min: 2, max: 4, weight: 3 },
  { id: 'minera', name: 'Minera', food: 3, water: 1, camel: [95, 110], min: 2, max: 4, weight: 3 },
  { id: 'santa', name: 'Ciudad santa', food: 2, water: 1, camel: [95, 110], min: 1, max: 2, weight: 2 },
  { id: 'aldea', name: 'Aldea', food: 1, water: 1, camel: [80, 90], min: 2, max: 4, weight: 3 },
];

/** Acceso rápido por id. */
export const CITY_TYPES_BY_ID = Object.fromEntries(CITY_TYPES.map((t) => [t.id, t]));

/**
 * Devuelve el tipo de ciudad con ese id o lanza un error.
 * @param {string} id
 * @returns {CityType}
 */
export function getCityType(id) {
  if (!Object.hasOwn(CITY_TYPES_BY_ID, id)) throw new Error(`Tipo de ciudad desconocido: ${id}`);
  return CITY_TYPES_BY_ID[id];
}

/** Nombres inventados para las ciudades; el mapa toma los que necesita. */
export const CITY_NAMES = [
  'Kharsa', 'Zafira', 'Qadim', 'Ombar', 'Tamrit', 'Sahlil', 'Barqa', 'Dunmar',
  'Ilsaf', 'Marrakh', 'Yazrin', 'Ghadal', 'Nefra', 'Sirtah', 'Awjal', 'Thamud',
  'Rubal', 'Kefir', 'Hassa', 'Mirab', 'Zawra', 'Ubari', 'Selim', 'Tazar',
  'Wadan', 'Jebal', 'Amrah', 'Dakhla', 'Fezzar', 'Ghurab',
];

