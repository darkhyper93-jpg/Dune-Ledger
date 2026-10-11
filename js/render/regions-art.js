/**
 * Paisajes chiquitos de cada región para la pantalla de "Nueva temporada"
 * (SVG de 160×64). Cada uno muestra lo que distingue a la región: las
 * dunas del Desierto, los pastos y la yurta de la Estepa, el mar con
 * velero de la Costa, los picos nevados de Jade y las cúpulas del Sultán.
 */

const INK = '#2A2340';

/** Cielo con degradé propio de cada región. */
function sky(id, top, bottom) {
  return `<defs><linearGradient id="rs-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
  <rect width="160" height="64" fill="url(#rs-${id})"/>`;
}

/** Dibujo de cada región. */
const SCENES = {
  desierto: `${sky('desierto', '#E7965A', '#F6CF8A')}
    <circle cx="122" cy="22" r="10" fill="#FBE3A6"/>
    <path d="M0 44c22-8 44-8 66-2s40 4 58-4 26-4 36 0v26H0z" fill="#D9A15F"/>
    <path d="M0 54c30-6 60-6 90 0s50 3 70-2v14H0z" fill="#C4813F"/>
    <path d="M30 41c0-3 3-5 5-5 1-4 3-5 5-5s3 2 4 5h6l2-5h4l-1 4-3 4c-1 2-2 2-4 2v8h-2v-8h-8v8h-2v-8h-4v8h-2v-8c-1 0-1-1-1-2z" fill="${INK}"/>
    <path d="M36 35h8v-3h-8z" fill="#E2A42C" stroke="${INK}" stroke-width="1"/>`,
  estepa: `${sky('estepa', '#7FB3C9', '#E8E3B8')}
    <path d="M14 18c8-2 14-2 20 0M98 12c6-2 12-2 18 0M104 16c6-2 10-2 16 0" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" fill="none" opacity=".8"/>
    <path d="M0 40c26-8 54-9 80-3s54 5 80-3v30H0z" fill="#9DB45A"/>
    <path d="M0 50c34-5 70-5 104 0s40 2 56-1v15H0z" fill="#7E9A42"/>
    <path d="M106 44c0-7 5-12 11-12s11 5 11 12z" fill="#F1E2C2" stroke="${INK}" stroke-width="1.5"/>
    <path d="M106 44h22M114 44v-5h6v5" stroke="${INK}" stroke-width="1.5" fill="#B4482A"/>
    <path d="M117 32v-3" stroke="${INK}" stroke-width="1.5"/>
    <g transform="translate(30 31)" fill="${INK}">
      <path d="M3 9c0-4 3-6 8-6h9c2 0 3-1 4-3l3-6c1-2 3-3 5-2l4 3-1 2h-3l-3 5c-1 2-1 5-2 7v10h-2v-8l-3 1-1 7h-2l-1-7h-8l-1 7H8l-1-7H6l-1 7H3v-8z"/>
      <path d="M3 9C1 10 0 13-1 16l-1-1c0-4 1-7 4-8z"/>
      <path d="M26 -4l-3 5" stroke="#B4482A" stroke-width="2" stroke-linecap="round"/>
    </g>
    <path d="M60 52l2-6M64 53l1-6M68 52l2-5M20 56l1-5M24 56l2-5" stroke="#5E7A2E" stroke-width="1.5" stroke-linecap="round"/>`,
  costa: `${sky('costa', '#5E8FC2', '#F2C98F')}
    <circle cx="36" cy="26" r="9" fill="#FBE3A6"/>
    <path d="M0 40h160v24H0z" fill="#2B6C8F"/>
    <path d="M0 44c10 2 20 2 30 0s20-2 30 0 20 2 30 0 20-2 30 0 20 2 30 0 10-1 10-1M10 54c10 2 20 2 30 0s20-2 30 0 20 2 30 0" stroke="#7FC6D9" stroke-width="1.6" fill="none"/>
    <path d="M70 40h30l-4 6H74z" fill="${INK}"/>
    <path d="M86 39V14l14 23zM84 39V20L72 37z" fill="#F8EED9" stroke="${INK}" stroke-width="1.5"/>
    <path d="M128 40c2-6 8-8 14-8s12 2 18 8z" fill="#D9A15F"/>
    <path d="M142 33l1-12M143 21c-4-2-8-1-10 2 3-1 6-1 10 0zM143 21c4-2 8-1 10 2-3-1-6-1-10 0z" stroke="${INK}" stroke-width="1.6" fill="#3D8A4E"/>`,
  jade: `${sky('jade', '#6E86B8', '#D7E3E6')}
    <path d="M0 50l26-30 16 14 22-24 26 30 18-16 26 22 26-18v36H0z" fill="#5B6E7E"/>
    <path d="M18 29l8-9 6 6-5 2-3-2zM56 18l8-8 9 10-6-1-4 3zM102 26l6-6 6 6-4-1z" fill="#FFFFFF"/>
    <path d="M0 56l30-14 24 8 30-14 30 12 22-8 24 10v14H0z" fill="#2F7A5C"/>
    <path d="M66 58l6-9 9 1 5 7-4 5h-13z" fill="#3FA77A" stroke="${INK}" stroke-width="1.5"/>
    <path d="M71 52l4-1" stroke="#C4F0D8" stroke-width="1.6" stroke-linecap="round"/>`,
  sultan: `${sky('sultan', '#4B3F8A', '#E59A6A')}
    <circle cx="130" cy="16" r="6" fill="#FBE3A6"/>
    <path d="M0 50c40-6 80-6 120-2s30 2 40 0v16H0z" fill="#C4813F"/>
    <path d="M40 50V34c0-9 7-14 14-14s14 5 14 14v16z" fill="${INK}"/>
    <path d="M54 20v-6" stroke="${INK}" stroke-width="2"/><circle cx="54" cy="12" r="2.4" fill="#E2A42C" stroke="${INK}" stroke-width="1.2"/>
    <path d="M22 50V24l3-5 3 5v26zM80 50V24l3-5 3 5v26z" fill="${INK}"/>
    <path d="M94 50V38c0-6 4-9 8-9s8 3 8 9v12z" fill="${INK}"/>
    <path d="M30 50V40h10v10zM68 50V40h12v10z" fill="${INK}"/>
    <path d="M50 38h8v12h-8z" fill="#E2A42C"/><path d="M24 30h2M82 30h2M100 40h4" stroke="#E2A42C" stroke-width="2"/>`,
};

/**
 * SVG completo del paisaje de una región, como texto (contenido fijo).
 * @param {string} regionId
 */
export function regionSvg(regionId) {
  return `<svg viewBox="0 0 160 64" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${SCENES[regionId]}</svg>`;
}
