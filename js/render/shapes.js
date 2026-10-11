/**
 * Siluetas geométricas de las ciudades y del logo, como trazos SVG en una
 * caja de 24×24. El mismo trazo sirve para SVG (pantallas) y para canvas
 * (mapa) con Path2D, así el arte es uno solo y no hay imágenes externas.
 */

/** Silueta por tipo de ciudad. */
export const CITY_PATHS = {
  capital: 'M3 21V11h2V9h2v2h2V6.5L12 3l3 3.5V11h2V9h2v2h2v10h-7v-4.5a2 2 0 0 0-4 0V21z',
  santa: 'M3 21v-6.5a6 6 0 0 1 12 0V21zM8.5 8.6V6.5h1v2.1zM17 21V8.5L18.75 4l1.75 4.5V21z',
  oasis: 'M11.2 18 12 10.2h1L13.8 18zM12.5 10.4C10 7.6 7 7.6 4.5 9.6 7.5 8.9 9.8 9.3 12 11zM12.5 10.4c2.5-2.8 5.5-2.8 8-.8-3-.7-5.3-.3-7.5 1.4zM12.5 10.4C11.6 7 9.8 5 7.5 4.6c2 1.2 3.3 3.3 4.2 6.2zM12.5 10.4c.9-3.4 2.7-5.4 5-5.8-2 1.2-3.3 3.3-4.2 6.2zM2.5 21.5c1.5-2.6 5.5-3.7 9.5-3.7s8 1.1 9.5 3.7z',
  puerto: 'M2.5 16h19l-3.2 4.5H5.7zM11.3 15V2.5l7.2 12.5zM10 15V6.5L4.5 15z',
  minera: 'M1.5 21 8.5 8.5l4 6 3-4.5L22.5 21zM8.5 21v-3.2a1.6 1.6 0 0 1 3.2 0V21z',
  aldea: 'M2.5 21v-7l4.5-4.2 4.5 4.2v7zM12.5 21v-9.5l4.5-4 4.5 4V21zM5.5 21v-3h3v3z',
};

/** Banderita del Gremio (para puestos). */
export const FLAG_PATH = 'M5 22V3h1.6v1h11l-2.6 4 2.6 4h-11v10z';

/** Logo: sol, dunas y una fila de camellos. */
export const LOGO_SVG = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="60" cy="60" r="56" fill="var(--surface-2)"/>
  <circle cx="78" cy="44" r="16" fill="var(--accent)"/>
  <path d="M4 78c18-10 34-12 52-6s34 6 60-4v22a56 56 0 0 1-112 0z" fill="var(--gold)" opacity=".55"/>
  <path d="M4 90c22-8 44-8 62-2s32 4 50-2v4a56 56 0 0 1-112 0z" fill="var(--accent)" opacity=".85"/>
  <g fill="var(--ink)">
    <path d="M26 74c0-4 3-6 6-6 1-3 3-5 5-5s3 2 4 4c1-1 2-1 3 0l2-3h3l-1 4c-1 2-2 3-4 3v8h-2v-6h-7v6h-2v-6c-2 0-4-1-5-2l-1 8h-2z"/>
    <path d="M52 72c0-3 2-5 5-5 1-2 2-4 4-4s3 2 3 3c1-1 2-1 3 0l1-2h3l-1 3c-1 2-2 3-3 3v7h-2v-5h-6v5h-2v-5c-1 0-3 0-4-1l-1 6h-2z"/>
    <path d="M75 70c0-3 2-4 4-4 1-2 2-3 3-3s2 1 3 3l1-2h3l-1 3c-1 1-1 2-3 2v6h-1.5v-4h-5v4H77v-4l-1 4h-1.5z"/>
  </g>
</svg>`;

/**
 * SVG de la silueta de una ciudad, como texto (contenido fijo, sin datos del jugador).
 * @param {string} type
 */
export function citySvg(type) {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12.5" r="11.5" fill="var(--surface-2)"/><path d="${CITY_PATHS[type]}" fill="var(--ink)" transform="translate(2.4 2.6) scale(.8)"/></svg>`;
}

/**
 * Convierte un SVG fijo (de este archivo) en un nodo, sin usar innerHTML.
 * @param {string} markup
 * @returns {SVGElement}
 */
export function svgNode(markup) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return document.importNode(doc.documentElement, true);
}
