/**
 * Íconos de interfaz dibujados para Dune Ledger (caja 24×24, trazo de 2 px
 * con puntas redondas, color = currentColor). Todos del mismo estilo para
 * que la barra de arriba y la navegación se lean como una familia.
 */

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const UI_ICONS = {
  /** Día: un sol sobre la duna. */
  day: `<path d="M3 18c3-3 6-3 9-1s6 2 9-1" ${S}/><circle cx="12" cy="9" r="3.5" ${S}/><path d="M12 2.5v1.5M5.5 9H4M20 9h-1.5M7.4 4.4l1 1M16.6 4.4l-1 1" ${S}/>`,
  /** Oro: una pila de monedas. */
  gold: `<ellipse cx="9" cy="7" rx="6" ry="2.5" ${S}/><path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" ${S}/><ellipse cx="15" cy="15" rx="6" ry="2.5" ${S}/><path d="M9 14.3V15c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v4c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5v-4" ${S}/>`,
  /** Carga: un cajón de madera. */
  cargo: `<path d="M3 8l9-4 9 4v9l-9 4-9-4z" ${S}/><path d="M3 8l9 4 9-4M12 12v9M7.5 6l9 4" ${S}/>`,
  /** Comida: una hogaza de pan. */
  food: `<path d="M4 14c0-5 3.6-8 8-8s8 3 8 8v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" ${S}/><path d="M9 9.5l-1.5 3M13 9l-1 3M16.5 10l-1 2.5" ${S}/>`,
  /** Agua: una gota. */
  water: `<path d="M12 3c3.5 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.5 6-11z" ${S}/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5" ${S}/>`,
  /** Camello. */
  camel: `<path d="M2.5 13.5c.5-3 2.5-4.5 4.5-4.5.8-2 2-3 3.3-3 1.5 0 2.4 1.4 3 3.2.5-.7 1.2-1 2-1 1.4 0 2 1 2.5 2.6l.7-3.3c.2-1 1-1.5 2-1.5h1l-.4 2-1.3.5-.8 4.3c-.3 1.6-1.5 2.7-3 2.7H6.3c-2 0-3.6-1.1-3.8-2z" ${S}/><path d="M6.5 15.5l-1 5.5M9 15.5l1 5.5M14.5 15.5l-1 5.5M17 15.5l1 5.5" ${S}/>`,
  /** Moral: una cara. */
  morale: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M8.5 14.5c1 1.3 2.2 2 3.5 2s2.5-.7 3.5-2M9 10h.01M15 10h.01" ${S}/>`,
  /** Deuda: un pergamino con sello. */
  debt: `<path d="M6 4h11a2 2 0 0 1 2 2v1h-3M6 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" ${S}/><path d="M8 8h6M8 11h6M8 14h3" ${S}/><circle cx="17" cy="17" r="3" ${S}/><path d="M16 20l-1 2.5M18 20l1 2.5" ${S}/>`,
  /** Préstamo: una bolsa con un signo más. */
  loan: `<path d="M9 4h6l-1.5 3h-3z" ${S}/><path d="M10.5 7C6 9 4 13 4 16c0 3 2.5 5 8 5s8-2 8-5c0-3-2-7-6.5-9" ${S}/><path d="M12 12v6M9 15h6" ${S}/>`,
  /** Ciudad: cúpula y torre. */
  city: `<path d="M3 21h18M5 21v-7a4 4 0 0 1 8 0v7M15 21V9l2-3 2 3v12M9 6.5V10" ${S}/>`,
  /** Mapa: un pliego con una ruta. */
  map: `<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" ${S}/><path d="M9 4v14M15 6v14" ${S}/>`,
  /** Diario: un libro abierto. */
  /** Candado: algo que todavía no se desbloqueó. */
  lock: `<rect x="5" y="11" width="14" height="10" rx="2" ${S}/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2" ${S}/>`,
  journal: `<path d="M12 6c-2-1.5-5-2-8-2v14c3 0 6 .5 8 2 2-1.5 5-2 8-2V4c-3 0-6 .5-8 2zM12 6v14" ${S}/>`,
};

/**
 * SVG de un ícono de interfaz, como texto fijo.
 * @param {string} id
 */
export function iconSvg(id) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${UI_ICONS[id]}</svg>`;
}
