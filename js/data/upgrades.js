/**
 * Mejoras del Gremio: se compran con sellos entre temporadas y suman de a
 * poco. Cada una tiene varios niveles; `costs[i]` es lo que cuesta pasar al
 * nivel i+1 y `step` lo que suma cada nivel (su unidad depende de la mejora).
 * La simulación las lee con `upgradeLevel(state, 'id')`.
 */

export const UPGRADES = [
  { id: 'oro', name: 'Bolsa más pesada', desc: '+50 de oro al empezar por nivel.', costs: [10, 20, 35, 55, 80], step: 50 },
  { id: 'carga', name: 'Alforjas grandes', desc: '+2 de carga por camello por nivel.', costs: [20, 40, 70], step: 2 },
  { id: 'camello', name: 'Camello de regalo', desc: 'Un camello más al empezar por nivel.', costs: [40, 90], step: 1 },
  { id: 'provisiones', name: 'Despensa llena', desc: '+5 de comida y de agua al empezar por nivel.', costs: [8, 16, 28], step: 5 },
  { id: 'taberna', name: 'Amigo en la taberna', desc: 'Sueldos 10% más baratos por nivel.', costs: [15, 30, 50], step: 0.1 },
  { id: 'plazo', name: 'Prórroga', desc: 'La primera cuota (y en nivel 2 también la segunda) vence 5 días después.', costs: [30, 60], step: 5 },
  { id: 'rumores', name: 'Oídos en el bazar', desc: 'Los rumores son verdad más seguido (+7% por nivel).', costs: [12, 25, 40], step: 0.07 },
  { id: 'guardias', name: 'Escuela de guardias', desc: 'Guardias 20% más baratos por nivel.', costs: [15, 35], step: 0.2 },
  { id: 'socio', name: 'Socio del Gremio', desc: 'Vendés 1% más caro por nivel.', costs: [25, 50, 80], step: 0.01 },
  { id: 'resistentes', name: 'Camellos de raza', desc: 'Los camellos se cansan 10% menos por nivel.', costs: [15, 30, 50], step: 0.1 },
  { id: 'fama', name: 'Buena fama', desc: '+10 de reputación en todas las zonas al empezar por nivel.', costs: [12, 25, 40], step: 10 },
  { id: 'contactos', name: 'Contactos', desc: 'Los contratos pagan 5% más por nivel.', costs: [15, 30, 50], step: 0.05 },
  { id: 'mapa', name: 'Mapa del abuelo', desc: 'Empezás conociendo las ciudades a dos rutas de distancia.', costs: [35], step: 1 },
  { id: 'odres', name: 'Odres de cuero', desc: 'Podés llevar 50 más de comida y de agua por nivel.', costs: [10, 20], step: 50 },
  { id: 'seguro', name: 'Seguro de carga', desc: 'Perdés 10% menos de carga en eventos por nivel.', costs: [20, 40, 65], step: 0.1 },
];

/** Acceso por id. */
export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));
