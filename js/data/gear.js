/**
 * Bazar de equipo: objetos que se compran una sola vez por temporada y
 * sirven hasta el final. Cada tipo de ciudad vende algunos (`sold`).
 * Los efectos los lee la simulación con `hasGear(state, 'id')`.
 */

export const GEAR = [
  { id: 'lampara', name: 'Lámpara de aceite', price: 45, sold: ['capital', 'minera'], desc: 'Con luz, seguir en una tormenta sale un 12% mejor.' },
  { id: 'brujula', name: 'Brújula', price: 55, sold: ['capital', 'puerto'], desc: 'Huir de bandidos y piratas sale un 12% mejor.' },
  { id: 'toldo', name: 'Toldo de lona', price: 50, sold: ['aldea', 'oasis'], desc: 'Descansando a la sombra, los animales se recuperan un 50% más.' },
  { id: 'cofre', name: 'Cofre con candado', price: 75, sold: ['minera', 'capital'], desc: 'Cuando te roban o se cae carga, perdés un 40% menos.' },
  { id: 'catalejo', name: 'Catalejo', price: 60, sold: ['puerto', 'santa'], desc: 'Al llegar a una ciudad, ves los precios de una vecina que no conocés.' },
  { id: 'amuleto', name: 'Amuleto del ojo', price: 40, sold: ['santa', 'aldea'], desc: 'Dicen que da suerte: +4% en todas las opciones que dependen del azar.' },
];

/** Acceso por id. */
export const GEAR_BY_ID = Object.fromEntries(GEAR.map((g) => [g.id, g]));
