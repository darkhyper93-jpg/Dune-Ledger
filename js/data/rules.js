/**
 * Números de balance de una temporada.
 *
 * Todo lo que se ajusta al medir con los bots vive acá, para no tener que
 * buscar constantes perdidas en la lógica. Si cambiás algo, corré
 * `npm run test:sim` para ver que las métricas de balance se sigan cumpliendo.
 */

export const RULES = {
  /** Días que dura una temporada. */
  seasonDays: 60,

  /** Caravana inicial. Comida y agua alcanzan para unos 10 días. */
  start: { gold: 300, camels: 2, food: 20, water: 20 },

  /** Carga que lleva cada camello y tope de camellos. */
  camelCapacity: 20,
  maxCamels: 10,
  /** Al vender un camello se recupera esta parte de su precio. */
  camelResale: 0.5,

  /** Tope de comida y de agua que se puede llevar. */
  provisionCap: 200,

  /** Personas en la caravana en la etapa 1 (el mercader). */
  people: 1,

  /** Mercado. */
  market: {
    stockNormal: 50,
    stockMin: 0,
    stockMax: 100,
    /** Parte de la distancia al stock normal que se recupera por día. */
    stockRecovery: 0.03,
    /** Multiplica el `stockStep` de cada bien: más alto, mercados más chicos. */
    stockImpact: 1.2,
    /** Comprar cuesta este factor sobre el precio de venta. */
    buyMarkup: 1.1,
    modProduces: 0.6,
    modConsumes: 1.6,
    noiseMin: 0.9,
    noiseMax: 1.1,
    /** Límites absolutos de cualquier precio, respecto del base. */
    minFactor: 0.2,
    maxFactor: 3,
  },

  /** Deuda: el cobrador cobra una comisión si no pagaste antes del plazo. */
  debt: {
    collectorFee: 0.15,
    unpaidPenalty: 1.5,
    maxStrikes: 2,
  },

  /** Mapa. */
  map: {
    minCities: 12,
    maxCities: 16,
    width: 100,
    height: 150,
    minDist: 17,
    minDegree: 2,
    maxDegree: 4,
    /** Distancia (en unidades de mapa) que se recorre por día de viaje. */
    distPerDay: 14,
    maxDays: 5,
    guildPosts: 2,
  },
};

/**
 * Dificultades: deuda total, cuotas por día y multiplicador de sellos.
 * La etapa 1 sólo usa "normal"; las demás se habilitan en la etapa 5.
 */
export const DIFFICULTIES = {
  facil: { id: 'facil', name: 'Fácil', installments: [{ day: 20, amount: 200 }, { day: 40, amount: 350 }, { day: 60, amount: 450 }], sealMult: 1 },
  normal: { id: 'normal', name: 'Normal', installments: [{ day: 20, amount: 300 }, { day: 40, amount: 500 }, { day: 60, amount: 700 }], sealMult: 1.25 },
  dificil: { id: 'dificil', name: 'Difícil', installments: [{ day: 20, amount: 450 }, { day: 40, amount: 750 }, { day: 60, amount: 1000 }], sealMult: 1.6 },
  pesadilla: { id: 'pesadilla', name: 'Pesadilla', installments: [{ day: 20, amount: 600 }, { day: 40, amount: 1000 }, { day: 60, amount: 1400 }], sealMult: 2 },
};

/**
 * Devuelve la dificultad con ese id, o lanza un error.
 * @param {string} id
 */
export function getDifficulty(id) {
  if (!Object.hasOwn(DIFFICULTIES, id)) throw new Error(`Dificultad desconocida: ${id}`);
  return DIFFICULTIES[id];
}
