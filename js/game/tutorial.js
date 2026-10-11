/**
 * Tutorial de la primera temporada: un consejo corto por vez, que avanza
 * solo cuando hacés lo que pide (comprar, viajar, vender) y termina con la
 * deuda. Se apaga para siempre al terminar o al saltearlo (lo guarda el
 * perfil en `tutorialDone`). No toca el DOM: sólo dice qué consejo toca.
 */

/** Hay carga a bordo o ya hubo una compra. */
const bought = (s) => s.stats.spent > 0;
/** Ya salió de viaje alguna vez (o está viajando). */
const traveled = (s) => s.stats.trips > 0 || s.trip !== null;
/** Ya vendió algo. */
const soldSomething = (s) => Object.keys(s.stats.sold).length > 0;

/**
 * Pasos en orden. `screens` dice dónde se muestra cada uno; `done` cuándo
 * ya se cumplió. El último (`final`) se cierra con "Entendido".
 */
export const TUTORIAL = [
  {
    id: 'comprar', screens: ['city'], done: bought,
    text: 'Este es el mercado. Lo que se produce acá está barato: comprá unas unidades con el botón +.',
  },
  {
    id: 'viajar', screens: ['city'], done: traveled,
    text: 'Antes de salir mirá Provisiones: cada día de viaje gasta comida y agua. Después abrí el Mapa.',
  },
  {
    id: 'ruta', screens: ['map'], done: traveled,
    text: 'Tocá una ciudad vecina: vas a ver los días de viaje, el peligro y lo que gastás. Elegí una donde lo tuyo se pague caro.',
  },
  {
    id: 'vender', screens: ['city'], done: soldSomething,
    text: 'Llegaste. Vendé tu carga en el mercado: si el precio está más alto que lo que pagaste, ganás.',
  },
  {
    id: 'deuda', screens: ['city'], done: () => false, final: true,
    text: 'Arriba ves la próxima cuota del Gremio. Pagala en la Capital o en un Puesto del Gremio antes de que venza. ¡Suerte, mercader!',
  },
];

/**
 * Consejo que toca mostrar en esta pantalla, o null.
 * @param {object|null} state partida en curso
 * @param {string} screen pantalla actual ('city', 'map'…)
 * @returns {{id:string, text:string, final?:boolean}|null}
 */
export function tutorialTip(state, screen) {
  if (!state || state.over) return null;
  // Los pasos con la misma condición son el mismo momento, en distintas
  // pantallas (por ejemplo "viajar" en la ciudad y "ruta" en el mapa).
  const now = TUTORIAL.find((t) => !t.done(state));
  const step = now && TUTORIAL.find((t) => t.done === now.done && t.screens.includes(screen));
  if (!step) return null;
  return { id: step.id, text: step.text, final: step.final === true };
}
