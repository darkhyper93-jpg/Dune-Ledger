/**
 * Terrenos y niveles de peligro de las rutas.
 *
 * El terreno cambia cuánta agua se gasta por día (`water`): la arena seca
 * más, el río casi nada. `fatigue` es cuánto se cansan los camellos (se usa
 * a partir de la etapa 3). El peligro sube la chance de eventos malos
 * (etapa 2); en la etapa 1 sólo se muestra.
 */

/** @type {Record<string,{id:string,name:string,water:number,fatigue:number,color:string}>} */
export const TERRAINS = {
  arena: { id: 'arena', name: 'Arena', water: 1.5, fatigue: 1, color: '#d9a85b' },
  piedra: { id: 'piedra', name: 'Piedra', water: 1, fatigue: 1, color: '#9a8a78' },
  montana: { id: 'montana', name: 'Montaña', water: 1, fatigue: 1.6, color: '#7d5a44' },
  rio: { id: 'rio', name: 'Río', water: 0.25, fatigue: 0.8, color: '#2aa198' },
};

/** @type {Record<string,{id:string,name:string,level:number}>} */
export const DANGERS = {
  bajo: { id: 'bajo', name: 'Bajo', level: 0 },
  medio: { id: 'medio', name: 'Medio', level: 1 },
  alto: { id: 'alto', name: 'Alto', level: 2 },
};

/**
 * Dice si un id es un terreno válido.
 * @param {unknown} id
 */
export function isTerrain(id) {
  return typeof id === 'string' && Object.hasOwn(TERRAINS, id);
}

/**
 * Dice si un id es un nivel de peligro válido.
 * @param {unknown} id
 */
export function isDanger(id) {
  return typeof id === 'string' && Object.hasOwn(DANGERS, id);
}
