/**
 * Zonas del mapa y reputación.
 *
 * El mapa de cada temporada se divide en tres zonas (Norte, Centro y Sur).
 * En cada una tenés una reputación de −100 a 100: con buena reputación
 * comprás más barato (hasta 5%) y los bandidos de la zona a veces te dejan
 * pasar; con mala, comprás más caro (hasta 10%) y los controles aprietan.
 * (Las "regiones" del diseño son los 5 mundos de la etapa 5; por eso acá
 * se llaman zonas.)
 */

/** Las tres zonas, de arriba hacia abajo. */
export const ZONES = [
  { id: 'norte', name: 'Norte' },
  { id: 'centro', name: 'Centro' },
  { id: 'sur', name: 'Sur' },
];

/** Límite de la reputación. */
export const REP_LIMIT = 100;

/**
 * Reputación inicial: 0 en todas las zonas.
 * @returns {Record<string, number>}
 */
export function initialRep() {
  return Object.fromEntries(ZONES.map((z) => [z.id, 0]));
}

/**
 * Cambia la reputación de una zona, sin salirse de −100..100.
 * @param {object} state
 * @param {string} zoneId
 * @param {number} delta
 */
export function changeRep(state, zoneId, delta) {
  state.rep[zoneId] = Math.max(-REP_LIMIT, Math.min(REP_LIMIT, Math.round(state.rep[zoneId] + delta)));
}

/**
 * Factor sobre el precio de compra según la reputación:
 * 100 → 0,95 (descuento), 0 → 1, −100 → 1,1 (recargo).
 * @param {number} rep
 */
export function repBuyFactor(rep) {
  return rep >= 0 ? 1 - 0.05 * (rep / REP_LIMIT) : 1 - 0.1 * (rep / REP_LIMIT);
}

/**
 * Zona de una ciudad.
 * @param {object} map
 * @param {string} cityId
 */
export function zoneOf(map, cityId) {
  return map.cityById[cityId].zone;
}

/**
 * Reparte las ciudades en zonas por altura en el mapa (tercios).
 * @param {{y:number, zone?:string}[]} cities se modifican
 */
export function assignZones(cities) {
  const sorted = cities.slice().sort((a, b) => a.y - b.y);
  sorted.forEach((c, i) => {
    c.zone = ZONES[Math.min(ZONES.length - 1, Math.floor((i * ZONES.length) / sorted.length))].id;
  });
}

/**
 * Nombre de una zona.
 * @param {string} zoneId
 */
export function zoneName(zoneId) {
  return ZONES.find((z) => z.id === zoneId)?.name ?? zoneId;
}
