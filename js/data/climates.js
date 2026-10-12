/**
 * Climas de temporada: se elige uno al empezar (por la semilla, así el
 * desafío del día tiene el mismo para todos) y dura toda la temporada.
 *
 * - weight: qué tan seguido sale.
 * - events: multiplica el peso de algunos eventos.
 * - water / food: multiplica el agua por día y el precio de la comida.
 * - prices: multiplica precios de bienes (en todas las ciudades o en las de
 *   `cityTypes`).
 */

export const CLIMATES = [
  { id: 'templado', name: 'Templado', weight: 3, desc: 'Un año como cualquier otro.' },
  { id: 'tormentas', name: 'Año de tormentas', weight: 1.2, desc: 'Más tormentas de arena, niebla en el mar y días sin viento.', events: { tormenta: 2.5, niebla: 2, calma: 1.5 } },
  { id: 'sequia', name: 'Sequía', weight: 1.2, desc: 'Se toma un 25% más de agua, los oasis se secan y los dátiles valen más.', water: 1.25, events: { 'oasis-seco': 2.5 }, prices: [{ goods: ['datiles'], mult: 1.4 }] },
  { id: 'cosecha', name: 'Gran cosecha', weight: 1.2, desc: 'Comida barata: dátiles y té valen menos y las provisiones cuestan menos.', food: 0.7, prices: [{ goods: ['datiles'], mult: 0.7 }, { goods: ['te'], mult: 0.8 }] },
  { id: 'ferias', name: 'Temporada de ferias', weight: 1.2, desc: 'La Capital y las ciudades santas pagan un 10% más por seda, especias, incienso y perlas.', prices: [{ goods: ['seda', 'especias', 'incienso', 'perlas'], cityTypes: ['capital', 'santa'], mult: 1.1 }] },
];

/** Acceso por id. */
export const CLIMATES_BY_ID = Object.fromEntries(CLIMATES.map((c) => [c.id, c]));
