/**
 * Tripulación: roles (qué hace cada uno), rasgos (su personalidad) y
 * nombres. Los efectos concretos están en js/game/crew.js.
 */

/** Roles, con sueldo semanal y qué hacen en nivel 1 y en nivel 3. */
export const ROLES = {
  guia: { id: 'guia', name: 'Guía', wage: 14, desc: 'Las rutas duran 1 día menos (mínimo 1) y las tormentas se pasan mejor.', lvl3: 'Pasa las tormentas todavía mejor.' },
  guardia: { id: 'guardia', name: 'Guardia', wage: 12, desc: 'Mejora la chance de ganar contra bandidos (+15%).', lvl3: '+20% en cada pelea.' },
  cocinero: { id: 'cocinero', name: 'Cocinero', wage: 10, desc: 'Se gasta un 25% menos de comida.', lvl3: 'Ahorra un 40% de comida.' },
  contable: { id: 'contable', name: 'Contable', wage: 22, desc: 'Comprás un 5% más barato y vendés un 5% más caro.', lvl3: '8% en compras y ventas.' },
  curandero: { id: 'curandero', name: 'Curandero', wage: 12, desc: 'Camellos y tripulación se recuperan el doble al descansar.', lvl3: 'Se recuperan dos veces y media.' },
  explorador: { id: 'explorador', name: 'Explorador', wage: 14, desc: 'Al llegar trae los precios de las ciudades vecinas; explora ruinas sin riesgo.', lvl3: 'Explora ruinas casi sin fallar.' },
};

/** Rasgos de personalidad. */
export const TRAITS = {
  valiente: { id: 'valiente', name: 'Valiente', desc: 'Pelea mejor y se alegra al ganar, pero a veces se mete en problemas.' },
  codicioso: { id: 'codicioso', name: 'Codicioso', desc: 'Pide un 50% más de sueldo y, con la moral baja, roba un poco.' },
  charlatan: { id: 'charlatan', name: 'Charlatán', desc: 'Trae rumores extra cada semana (algunos falsos).' },
  dormilon: { id: 'dormilon', name: 'Dormilón', desc: 'A veces la caravana sale tarde y pierde un día.' },
  leal: { id: 'leal', name: 'Leal', desc: 'Nunca se va, aunque la moral esté por el piso.' },
};

/** Nombres posibles. */
export const CREW_NAMES = [
  'Amira', 'Bashir', 'Dalila', 'Farid', 'Hana', 'Idris', 'Jamila', 'Karim', 'Layla', 'Malik',
  'Nadia', 'Omar', 'Rania', 'Samir', 'Tariq', 'Yasmin', 'Zaid', 'Selma', 'Hakim', 'Noor',
];
