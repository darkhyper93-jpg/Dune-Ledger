/**
 * Logros. Se revisan al cerrar cada temporada con `check({ state, map, over,
 * profile })` (profile ya incluye la temporada que terminó). Algunos
 * desbloquean mercaderes (ver `requires` en js/data/merchants.js).
 *
 * Las estadísticas que usan están en `state.stats` (ver js/game/stats.js).
 */

/** Cantidad vendida de un bien en la temporada. */
const sold = (s, id) => s.stats.sold[id] ?? 0;

export const ACHIEVEMENTS = [
  { id: 'primera', name: 'Primera temporada', desc: 'Terminá una temporada.', check: () => true },
  { id: 'victoria', name: 'Deuda saldada', desc: 'Ganá una temporada.', check: ({ over }) => over.won },
  { id: 'tres-victorias', name: 'Mercader de ley', desc: 'Ganá 3 temporadas (desbloquea al Viejo Sultán).', check: ({ profile }) => profile.wins >= 3 },
  { id: 'impecable', name: 'Cuentas claras', desc: 'Ganá sin ninguna falta con el Gremio.', check: ({ over, state }) => over.won && state.debt.strikes === 0 },
  { id: 'rico', name: 'Bolsillos llenos', desc: 'Terminá con 3.000 de oro o más.', check: ({ over }) => over.gold >= 3000 },
  { id: 'magnate', name: 'Magnate', desc: 'Hacé 5.000 puntos en una temporada.', check: ({ over }) => over.score >= 5000 },
  { id: 'retiro', name: 'Retiro anticipado', desc: 'Retirate antes del día 50 con la deuda pagada.', check: ({ over }) => over.won && over.reason === 'retiro' && over.day < 50 },
  { id: 'diez-camellos', name: 'Gran caravana', desc: 'Tené 10 camellos al mismo tiempo.', check: ({ state }) => state.stats.maxCamels >= 10 },
  { id: 'tripulacion', name: 'Tripulación completa', desc: 'Viajá con 5 tripulantes.', check: ({ state }) => state.stats.maxCrew >= 5 },
  { id: 'veterano', name: 'Veterano', desc: 'Llevá a un tripulante al nivel 3.', check: ({ state }) => state.stats.maxLevel >= 3 },
  { id: 'contratista', name: 'Palabra cumplida', desc: 'Cumplí 3 contratos en una temporada.', check: ({ state }) => state.stats.contractsDone >= 3 },
  { id: 'trotamundos', name: 'Trotamundos', desc: 'Visitá todas las ciudades del mapa (desbloquea al Cartógrafo).', check: ({ state, map }) => map.cities.every((c) => state.visited[c.id]) },
  { id: 'guerrero', name: 'Espada fácil', desc: 'Ganá 3 peleas contra bandidos en una temporada.', check: ({ state }) => state.stats.fightsWon >= 3 },
  { id: 'contrabando', name: 'Contrabando', desc: 'Pasá un control del sultán con armas sin que te las saquen (desbloquea al Contrabandista).', check: ({ state }) => state.stats.smuggled >= 1 },
  { id: 'buena-fama', name: 'Buena fama', desc: 'Llegá a 60 de reputación en una zona.', check: ({ state }) => Object.values(state.rep).some((r) => r >= 60) },
  { id: 'querido', name: 'Querido por todos', desc: 'Terminá con 30 o más de reputación en las tres zonas.', check: ({ state }) => Object.values(state.rep).every((r) => r >= 30) },
  { id: 'gran-venta', name: 'El negocio del año', desc: 'Hacé una venta con 500 de ganancia o más.', check: ({ state }) => (state.stats.bestSale?.profit ?? 0) >= 500 },
  { id: 'perlas', name: 'Collar de perlas', desc: 'Vendé 10 perlas en una temporada.', check: ({ state }) => sold(state, 'perlas') >= 10 },
  { id: 'datiles', name: 'Dulce negocio', desc: 'Vendé 50 dátiles en una temporada.', check: ({ state }) => sold(state, 'datiles') >= 50 },
  { id: 'seda', name: 'Ruta de la seda', desc: 'Vendé 40 de seda en una temporada.', check: ({ state }) => sold(state, 'seda') >= 40 },
  { id: 'bien-comidos', name: 'Bien comidos', desc: 'Ganá sin pasar ni un día de hambre o sed.', check: ({ over, state }) => over.won && state.stats.shortageDays === 0 },
  { id: 'incansable', name: 'Incansable', desc: 'Ganá sin descansar ni un día.', check: ({ over, state }) => over.won && state.stats.restDays === 0 },
  { id: 'tesoro', name: 'Cazatesoros', desc: 'Encontrá un tesoro en unas ruinas.', check: ({ state }) => state.stats.treasures >= 1 },
  { id: 'tormenta', name: 'Contra el viento', desc: 'Atravesá una tormenta sin esperar y sin perder nada.', check: ({ state }) => state.stats.stormsBeaten >= 1 },
  { id: 'samaritano', name: 'Buen samaritano', desc: 'Ayudá a 3 viajeros heridos en una temporada.', check: ({ state }) => state.stats.helped >= 3 },
  { id: 'prudente', name: 'Paso seguro', desc: 'Ganá viajando sólo por rutas de peligro bajo.', check: ({ over, state }) => over.won && state.stats.riskyTrips === 0 && state.stats.trips > 0 },
  { id: 'temerario', name: 'Temerario', desc: 'Hacé 5 viajes por rutas de peligro alto en una temporada.', check: ({ state }) => state.stats.highTrips >= 5 },
  { id: 'viajero', name: 'Siempre en camino', desc: 'Hacé 30 viajes en una temporada.', check: ({ state }) => state.stats.trips >= 30 },
  { id: 'cien-sellos', name: 'Cien sellos', desc: 'Juntá 100 sellos en total.', check: ({ profile }) => profile.totalSeals >= 100 },
  { id: 'coleccionista', name: 'Coleccionista', desc: 'Comerciá los 12 bienes (códice de bienes completo).', check: ({ profile }) => Object.keys(profile.codex.goods).length >= 12 },
];

/** Acceso por id. */
export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
