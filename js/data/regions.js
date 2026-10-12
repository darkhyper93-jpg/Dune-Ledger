/**
 * Las 5 regiones. Cada una cambia el mapa, la montura, algún bien estrella
 * y trae eventos propios (ver `region` en js/data/events.js). Se
 * desbloquean en orden, ganando una temporada en la anterior.
 *
 * - mount: animal de carga (nombre, carga por animal y velocidad: los días
 *   de cada ruta se multiplican por `speed`).
 * - map: pesos de peligro, terrenos favorecidos, distancia por día, mínimo de
 *   puertos y si hay rutas por mar entre puertos.
 * - debtMult, salesTax: deuda más alta e impuesto a las ventas.
 * - eventWeights: multiplica qué tan seguido sale un evento en la región.
 */

export const REGIONS = [
  {
    id: 'desierto', name: 'Desierto de Sal', star: 'sal',
    desc: 'Dunas, oasis y minas de sal. Donde empieza todo mercader.',
    mount: { one: 'camello', many: 'camellos', capacity: 20, speed: 1 },
    map: {},
  },
  {
    id: 'estepa', name: 'Estepa del Viento', star: 'lana',
    desc: 'Pastizales sin fin. Los caballos son rápidos, pero cargan menos que un camello.',
    mount: { one: 'caballo', many: 'caballos', capacity: 12, speed: 0.8 },
    map: { terrain: { piedra: 4, rio: 2 }, distPerDay: 16 }, debtMult: 1.1,
  },
  {
    id: 'costa', name: 'Costa de las Perlas', star: 'perlas',
    desc: 'Puertos por todas partes: entre puertos se viaja en barco, pero hay piratas.',
    mount: { one: 'camello', many: 'camellos', capacity: 20, speed: 1 },
    map: { minPorts: 4, sea: true }, debtMult: 1.1,
  },
  {
    id: 'jade', name: 'Montañas de Jade', star: 'jade',
    desc: 'Rutas largas y peligrosas por la montaña. El jade vale una fortuna.',
    mount: { one: 'camello', many: 'camellos', capacity: 20, speed: 1 },
    map: { terrain: { montana: 8 }, danger: { bajo: 4, medio: 4, alto: 2 }, distPerDay: 14 },
  },
  {
    id: 'sultan', name: 'Reino del Sultán', star: 'especias',
    desc: 'Rico y vigilado: impuesto del 5% a cada venta, controles por todos lados y la deuda más alta.',
    mount: { one: 'camello', many: 'camellos', capacity: 20, speed: 1 },
    map: {}, debtMult: 1.2, salesTax: 0.05, eventWeights: { control: 2 },
  },
];

/** Acceso por id. */
export const REGIONS_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/**
 * Devuelve la región o lanza un error si no existe.
 * @param {string} id
 */
export function getRegion(id) {
  if (!Object.hasOwn(REGIONS_BY_ID, id)) throw new Error(`Región desconocida: ${id}`);
  return REGIONS_BY_ID[id];
}
