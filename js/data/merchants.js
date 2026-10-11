/**
 * Mercaderes: se elige uno al empezar cada temporada. Cada uno tiene una
 * habilidad única; los más fuertes cuestan más sellos y algunos además
 * piden un logro antes de poder comprarlos.
 *
 * `start` pisa la caravana inicial; `debtMult` multiplica la deuda; el resto
 * de las habilidades las lee la simulación con `hasPerk(state, 'id')`.
 */

export const MERCHANTS = [
  { id: 'aprendiz', name: 'Aprendiz', cost: 0, desc: 'Sin habilidad especial. Empieza con 2 camellos y 300 de oro.' },
  { id: 'contrabandista', name: 'Contrabandista', cost: 40, requires: 'contrabando', desc: 'Las armas no son ilegales para él y los controles fallan la mitad de las veces.' },
  { id: 'nomada', name: 'Nómada', cost: 60, desc: 'Gasta la mitad de agua y conoce todos los oasis desde el inicio.' },
  { id: 'banquera', name: 'Banquera', cost: 80, desc: 'Préstamos al 10% y 2% de interés diario sobre el oro guardado en el Gremio.' },
  { id: 'negociante', name: 'Negociante', cost: 100, desc: 'Compra un 8% más barato y los mercados se le recuperan más rápido.' },
  { id: 'capitana', name: 'Capitana de guardia', cost: 120, desc: 'Empieza con 2 guardias leales y gana las peleas un 20% más seguido.' },
  { id: 'cartografo', name: 'Cartógrafo', cost: 150, requires: 'trotamundos', desc: 'Ve todo el mapa y los precios de todas las ciudades al inicio.' },
  { id: 'sultan', name: 'Viejo Sultán', cost: 250, requires: 'tres-victorias', start: { gold: 500, camels: 4 }, debtMult: 2, desc: 'Empieza con 500 de oro y 4 camellos, pero debe el doble.' },
];

/** Acceso por id. */
export const MERCHANTS_BY_ID = Object.fromEntries(MERCHANTS.map((m) => [m.id, m]));
