/**
 * Ilustraciones de los 13 bienes, dibujadas a mano en SVG (caja de 48×48).
 * Mismo estilo para todas: formas planas con un contorno índigo de 2 px,
 * una luz y una sombra, sobre una medalla de arena para que se lean igual
 * en modo claro y en modo noche.
 */

/** Contorno común. */
const INK = '#2A2340';
const O = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

/** Dibujo de cada bien (sin la medalla de fondo). */
export const GOOD_ART = {
  // Una bolsa de arpillera atada, con la sal asomando.
  sal: `
    <path d="M14 21c-2 6-3 13-1 18 1 3 4 4 11 4s10-1 11-4c2-5 1-12-1-18z" fill="#C99A5B" ${O}/>
    <path d="M16 24c-1 5-1 10 0 14" fill="none" stroke="#A97B42" stroke-width="2" stroke-linecap="round"/>
    <path d="M14 21c3-3 17-3 20 0" fill="#F4F1EC" ${O}/>
    <path d="M17 20c2-6 12-6 14 0" fill="#FFFFFF" ${O}/>
    <circle cx="21" cy="16.5" r="1" fill="#D9DCE6"/><circle cx="26" cy="15.5" r="1" fill="#D9DCE6"/>
    <path d="M15 22.5c5 2 13 2 18 0" fill="none" stroke="#7A4E2A" stroke-width="2.4" stroke-linecap="round"/>`,

  // Un racimo de dátiles con su hoja de palmera.
  datiles: `
    <path d="M24 8c-6 2-10 7-11 12 4-3 7-5 11-6z" fill="#5E9B4A" ${O}/>
    <path d="M24 8c6 2 10 7 11 12-4-3-7-5-11-6z" fill="#76B35C" ${O}/>
    <path d="M24 10v10" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="18" cy="27" rx="4.5" ry="6.5" transform="rotate(-18 18 27)" fill="#8A4B21" ${O}/>
    <ellipse cx="30" cy="27" rx="4.5" ry="6.5" transform="rotate(18 30 27)" fill="#9C5626" ${O}/>
    <ellipse cx="24" cy="31" rx="4.5" ry="6.5" fill="#B0652C" ${O}/>
    <ellipse cx="19" cy="37" rx="4" ry="5.5" transform="rotate(-12 19 37)" fill="#8A4B21" ${O}/>
    <ellipse cx="29" cy="37" rx="4" ry="5.5" transform="rotate(12 29 37)" fill="#9C5626" ${O}/>
    <path d="M22.5 27c0-2 1-3 2-3.5" stroke="#E7B27A" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,

  // Un ovillo de lana con una hebra suelta.
  lana: `
    <path d="M30 6l-12 32M38 10L22 40" stroke="#8A5A2B" stroke-width="3" stroke-linecap="round"/>
    <circle cx="23" cy="26" r="13" fill="#E9B85F" ${O}/>
    <path d="M11 23c6-4 16-4 24 1M10.5 29c7-3 17-2 24 2M16 15c5 5 8 14 8 24M23 13c4 6 6 15 4 25" fill="none" stroke="#B9822F" stroke-width="2" stroke-linecap="round"/>
    <path d="M36 32c4 2 5 6 3 8s-6 1-9 3" fill="none" stroke="#E9B85F" stroke-width="3" stroke-linecap="round"/>
    <path d="M36 32c4 2 5 6 3 8s-6 1-9 3" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round" opacity=".5"/>
    <path d="M16 18c2-2 4-3 6-3.5" stroke="#FFF1CF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="6" r="2" fill="#8A5A2B" ${O}/><circle cx="38" cy="10" r="2" fill="#8A5A2B" ${O}/>`,

  // Un ánfora de barro con una guarda pintada.
  ceramica: `
    <path d="M19 9h10v4c5 3 8 9 7 16-1 7-5 11-12 11s-11-4-12-11c-1-7 2-13 7-16z" fill="#C8643A" ${O}/>
    <path d="M17 11h14" ${O}/>
    <path d="M13.5 24h21" stroke="#F1D6A8" stroke-width="3"/>
    <path d="M15 24l3 3 3-3 3 3 3-3 3 3 3-3" fill="none" stroke="#8C3A1C" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M19 14c-4 1-6 4-6 7M29 14c4 1 6 4 6 7" fill="none" ${O}/>
    <path d="M18 31c1 3 3 5 6 6" fill="none" stroke="#E79A6B" stroke-width="2" stroke-linecap="round"/>`,

  // Una tetera moruna de metal con tapa en punta.
  te: `
    <path d="M24 6l3 6h-6z" fill="#E2A42C" ${O}/>
    <path d="M17 15c0-2 3-3 7-3s7 1 7 3z" fill="#E2A42C" ${O}/>
    <path d="M14 22c0-4 4-7 10-7s10 3 10 7c0 9-3 15-10 15s-10-6-10-15z" fill="#1E9C94" ${O}/>
    <path d="M34 21c4 0 6 2 6 5s-2 5-5 6" fill="none" ${O}/>
    <path d="M14 23c-4-1-8 1-9 4l5 1" fill="none" ${O}/>
    <path d="M15 37h18v3H15z" fill="#E2A42C" ${O}/>
    <path d="M18 21c0 4 1 8 3 11" fill="none" stroke="#7FD6CC" stroke-width="2" stroke-linecap="round"/>`,

  // Tres lingotes de metal apilados.
  metal: `
    <path d="M7 33l4-6h13l4 6z" fill="#B7C1D0" ${O}/>
    <path d="M7 33h21v5H7z" fill="#8792A5" ${O}/>
    <path d="M22 33l4-6h13l4 6z" fill="#C9D1DD" ${O}/>
    <path d="M22 33h21v5H22z" fill="#96A1B3" ${O}/>
    <path d="M15 22l4-6h13l4 6z" fill="#DCE2EA" ${O}/>
    <path d="M15 22h21v5H15z" fill="#A9B3C3" ${O}/>
    <path d="M20 19h9M12 30h8M27 30h8" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/>`,

  // Un incensario colgante echando humo.
  incienso: `
    <path d="M24 4v7" ${O}/>
    <path d="M15 20c0-5 4-8 9-8s9 3 9 8z" fill="#D9A23A" ${O}/>
    <path d="M13 20h22c0 8-4 14-11 14s-11-6-11-14z" fill="#B8862A" ${O}/>
    <circle cx="19" cy="25" r="1.6" fill="${INK}"/><circle cx="24" cy="27" r="1.6" fill="${INK}"/><circle cx="29" cy="25" r="1.6" fill="${INK}"/>
    <path d="M20 34l-2 6h12l-2-6" fill="#8E6420" ${O}/>
    <path d="M33 14c3-2 2-5 5-6M36 18c3-1 4-4 6-4" fill="none" stroke="#9BA3BF" stroke-width="2" stroke-linecap="round"/>`,

  // Un cuenco con un montoncito de especias y una ramita de canela.
  especias: `
    <path d="M12 26c3-11 8-15 12-15s9 4 12 15z" fill="#E36A2E" ${O}/>
    <path d="M18 18c2-2 4-4 6-4" stroke="#F7A26C" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="21" cy="21" r="1" fill="#A93E12"/><circle cx="27" cy="19" r="1" fill="#A93E12"/><circle cx="29" cy="23" r="1" fill="#A93E12"/>
    <path d="M8 26h32c0 8-7 13-16 13S8 34 8 26z" fill="#2B6C8F" ${O}/>
    <path d="M12 29h24" stroke="#E2A42C" stroke-width="2.4"/>
    <path d="M34 14l8-4" stroke="#8A4B21" stroke-width="4" stroke-linecap="round"/>`,

  // Una pila de tres libros con lomos de colores.
  libros: `
    <path d="M8 33h32v6H8z" fill="#2B6C8F" ${O}/>
    <path d="M11 26h29v7H11z" fill="#B4482A" ${O}/>
    <path d="M9 19h28v7H9z" fill="#1E9C94" ${O}/>
    <path d="M12 12h24v7H12z" fill="#E2A42C" ${O}/>
    <path d="M34 14h2M34 17h2M35 21h2M35 24h2M38 28h2M38 31h2M38 35h2" stroke="#F8EED9" stroke-width="1.4"/>
    <path d="M16 15.5h12M14 22.5h12M16 29.5h14M12 36h16" stroke="#F8EED9" stroke-width="2" stroke-linecap="round"/>`,

  // Un rollo de seda con la tela cayendo.
  seda: `
    <path d="M10 14c0-3 3-5 6-5h18v24H16c-3 0-6 2-6 5z" fill="#9B4DCA" ${O}/>
    <ellipse cx="16" cy="14" rx="6" ry="5" fill="#C58BEA" ${O}/>
    <ellipse cx="16" cy="14" rx="2" ry="1.6" fill="${INK}"/>
    <path d="M34 9c3 6-2 10 2 16s0 12-4 14c-2-6-6-8-6-14" fill="#B26BDE" ${O}/>
    <path d="M13 38c0-2 1-4 3-5h16" fill="none" ${O}/>
    <path d="M21 13c3 4 3 10 1 15" stroke="#E7CBF7" stroke-width="2" fill="none" stroke-linecap="round"/>`,

  // Un alfanje curvo con empuñadura dorada.
  armas: `
    <path d="M12 34C16 20 26 11 40 8c-6 6-11 15-17 28z" fill="#D7DEE8" ${O}/>
    <path d="M30 13c-4 4-8 10-11 17" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M9 31l12 7" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M9 31l12 7" stroke="#E2A42C" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M13 36l-4 6" stroke="#7A4E2A" stroke-width="5" stroke-linecap="round"/>
    <circle cx="8.5" cy="42.5" r="2.5" fill="#E2A42C" ${O}/>`,

  // Una ostra abierta con una perla.
  perlas: `
    <path d="M6 27c3 9 10 13 18 13s15-4 18-13z" fill="#8FA7B8" ${O}/>
    <path d="M12 31c3 4 7 6 12 6s9-2 12-6" fill="none" stroke="#B9CBD7" stroke-width="2" stroke-linecap="round"/>
    <path d="M8 25c1-9 8-15 16-15s15 6 16 15z" fill="#A9BDCB" ${O}/>
    <path d="M24 11v14M16 13l4 12M32 13l-4 12M11 18l7 7M37 18l-7 7" stroke="#7F98AA" stroke-width="1.6"/>
    <path d="M10 26h28" ${O}/>
    <circle cx="24" cy="28.5" r="5" fill="#FBF6EE" ${O}/>
    <circle cx="22.5" cy="27" r="1.5" fill="#FFFFFF"/>`,

  // Un disco de jade tallado colgado de un cordón rojo con borla, y una piedra en bruto.
  jade: `
    <path d="M24 5v7" stroke="#B4482A" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="24" cy="5" r="2" fill="#E2A42C" ${O}/>
    <circle cx="23" cy="24" r="12.5" fill="#3FA77A" ${O}/>
    <circle cx="23" cy="24" r="8.5" fill="none" stroke="#2C8560" stroke-width="1.8"/>
    <circle cx="23" cy="24" r="4" fill="#F1E2C2" ${O}/>
    <path d="M14.5 19c1.5-3 4-5 7-5.6" fill="none" stroke="#A8E6C4" stroke-width="2" stroke-linecap="round"/>
    <path d="M30 29l-2 2M16 29l2 2M17 17l1.5 1.5" stroke="#2C8560" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M33 43l2-7 6-2 4 4-1 5z" fill="#5FBF8F" ${O}/>
    <path d="M36 37l3 1" stroke="#C4F0D8" stroke-width="1.6" stroke-linecap="round"/>`,
};

/**
 * SVG completo de un bien, como texto (contenido fijo, sin datos del jugador).
 * @param {string} goodId
 * @param {{badge?:boolean}} [opts] badge: con medalla de arena de fondo
 */
export function goodSvg(goodId, opts = { badge: true }) {
  const bg = opts.badge ? '<circle cx="24" cy="24" r="23" fill="#F1E2C2"/><circle cx="24" cy="24" r="23" fill="none" stroke="#D8BE8E" stroke-width="1.5"/>' : '';
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bg}${GOOD_ART[goodId]}</svg>`;
}
