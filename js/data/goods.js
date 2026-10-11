/**
 * Los bienes que se compran y venden en Dune Ledger.
 *
 * Cada bien tiene precio base, peso (lugares de carga por unidad), en qué
 * tipo de ciudad se produce (barato) y en cuáles se consume (caro).
 * `stockStep` dice cuánto se mueve el stock del mercado por cada unidad
 * comerciada: los bienes caros mueven más el mercado, así no se puede
 * inundar una ciudad de seda sin que se note.
 *
 * La etapa 1 usa 8 de los 12 bienes (ver ACTIVE_GOODS); el resto ya está
 * cargado para las etapas siguientes.
 */

/** @typedef {{id:string,name:string,base:number,weight:number,produces:string[],consumes:string[],stockStep:number,decay?:number,icon:string,note?:string}} Good */

/** @type {Good[]} */
export const GOODS = [
  { id: 'sal', name: 'Sal', base: 8, weight: 2, produces: ['minera'], consumes: ['puerto', 'capital'], stockStep: 1.2, icon: '◇' },
  { id: 'datiles', name: 'Dátiles', base: 6, weight: 1, produces: ['oasis'], consumes: ['minera'], stockStep: 1.2, decay: 0.05, icon: '●', note: 'Pierden 5% de valor por día' },
  { id: 'lana', name: 'Lana', base: 10, weight: 2, produces: ['aldea'], consumes: ['puerto'], stockStep: 1.2, icon: '≈' },
  { id: 'ceramica', name: 'Cerámica', base: 14, weight: 2, produces: ['aldea'], consumes: ['capital'], stockStep: 1.6, icon: '◒', note: 'Frágil' },
  { id: 'te', name: 'Té', base: 18, weight: 1, produces: ['puerto'], consumes: ['santa', 'minera'], stockStep: 2, icon: '❦' },
  { id: 'metal', name: 'Metal', base: 20, weight: 2, produces: ['minera'], consumes: ['capital', 'aldea'], stockStep: 2, icon: '▬' },
  { id: 'incienso', name: 'Incienso', base: 30, weight: 1, produces: ['oasis'], consumes: ['santa'], stockStep: 2.8, icon: '♨' },
  { id: 'especias', name: 'Especias', base: 35, weight: 1, produces: ['puerto'], consumes: ['capital'], stockStep: 3, icon: '✱' },
  { id: 'libros', name: 'Libros', base: 45, weight: 1, produces: ['santa'], consumes: ['capital'], stockStep: 3.6, icon: '▤' },
  { id: 'seda', name: 'Seda', base: 60, weight: 1, produces: ['puerto'], consumes: ['capital'], stockStep: 4.4, icon: '∿' },
  { id: 'armas', name: 'Armas', base: 70, weight: 2, produces: ['minera'], consumes: ['aldea'], stockStep: 4.8, icon: '⚔', note: 'Ilegales en la ciudad santa' },
  { id: 'perlas', name: 'Perlas', base: 120, weight: 0, produces: ['puerto'], consumes: ['capital', 'santa'], stockStep: 6, icon: '○', note: 'No ocupan lugar, pero atraen bandidos' },
];

/** Ids de los bienes que se juegan en la etapa actual. */
export const ACTIVE_GOODS = ['sal', 'datiles', 'lana', 'te', 'metal', 'incienso', 'libros', 'seda'];

/** Acceso rápido por id. */
export const GOODS_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g]));

/**
 * Devuelve el bien con ese id o lanza un error si no existe.
 * @param {string} id
 * @returns {Good}
 */
export function getGood(id) {
  const good = Object.hasOwn(GOODS_BY_ID, id) ? GOODS_BY_ID[id] : null;
  if (!good) throw new Error(`Bien desconocido: ${id}`);
  return good;
}

/**
 * Dice si un texto es el id de un bien existente (sin caer en __proto__ y similares).
 * @param {unknown} id
 * @returns {boolean}
 */
export function isGoodId(id) {
  return typeof id === 'string' && Object.hasOwn(GOODS_BY_ID, id);
}

/**
 * Lista de bienes activos en el orden de la tabla.
 * @returns {Good[]}
 */
export function activeGoods() {
  return GOODS.filter((g) => ACTIVE_GOODS.includes(g.id));
}
