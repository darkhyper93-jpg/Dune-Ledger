/**
 * Ilustraciones del bazar de equipo (caja de 48×48), en el mismo estilo que
 * los bienes: formas planas, contorno índigo de 2 px y una luz.
 */

const INK = '#2A2340';
const O = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

const ART = {
  // Una lámpara de aceite de bronce con la llama encendida.
  lampara: `
    <path d="M24 9c-3 4-4 7-2 10 1 1 3 1 4 0 2-3 1-6-2-10z" fill="#F6B73C" ${O}/>
    <path d="M24 13c-1 2-1 4 0 5" stroke="#FBE3A6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M10 30c0-5 6-8 14-8s14 3 14 8c0 4-6 7-14 7s-14-3-14-7z" fill="#C98A3A" ${O}/>
    <path d="M38 29c4-1 6 1 6 3s-3 4-6 3" fill="none" ${O}/>
    <path d="M10 29l-4-4h6" fill="#C98A3A" ${O}/>
    <path d="M16 37h16l2 5H14z" fill="#A8761A" ${O}/>
    <path d="M15 27c4-2 9-2 13-1" stroke="#F1D18F" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Una brújula de bolsillo con la aguja roja hacia el norte.
  brujula: `
    <circle cx="24" cy="26" r="16" fill="#C98A3A" ${O}/>
    <circle cx="24" cy="26" r="12" fill="#FBF3E4" ${O}/>
    <path d="M24 6v4" ${O}/><circle cx="24" cy="6" r="2.5" fill="#C98A3A" ${O}/>
    <path d="M24 16l4 10h-8z" fill="#B4482A" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M24 36l-4-10h8z" fill="#1E2742" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="24" cy="26" r="2" fill="#E2A42C" ${O}/>`,
  // Un toldo a rayas sobre dos palos, con volado y su sombra.
  toldo: `
    <ellipse cx="24" cy="41" rx="16" ry="3" fill="#C4A57A"/>
    <path d="M10 41V22M38 41V22" ${O}/>
    <path d="M12 12L16 12L12 22L6 22z" fill="#B4482A"/><path d="M16 12L20 12L18 22L12 22z" fill="#F8EED9"/><path d="M20 12L24 12L24 22L18 22z" fill="#B4482A"/><path d="M24 12L28 12L30 22L24 22z" fill="#F8EED9"/><path d="M28 12L32 12L36 22L30 22z" fill="#B4482A"/><path d="M32 12L36 12L42 22L36 22z" fill="#F8EED9"/>
    <path d="M6 22l6-10h24l6 10z" fill="none" ${O}/>
    <path d="M6 22a3 3 0 0 0 6 0z" fill="#B4482A" ${O}/><path d="M12 22a3 3 0 0 0 6 0z" fill="#F8EED9" ${O}/><path d="M18 22a3 3 0 0 0 6 0z" fill="#B4482A" ${O}/><path d="M24 22a3 3 0 0 0 6 0z" fill="#F8EED9" ${O}/><path d="M30 22a3 3 0 0 0 6 0z" fill="#B4482A" ${O}/><path d="M36 22a3 3 0 0 0 6 0z" fill="#F8EED9" ${O}/>`,
  // Un cofre de madera con herrajes y candado.
  cofre: `
    <path d="M8 22h32v18H8z" fill="#9C5626" ${O}/>
    <path d="M8 22c0-7 7-11 16-11s16 4 16 11z" fill="#B0652C" ${O}/>
    <path d="M14 13v27M34 13v27" stroke="#3A2A44" stroke-width="3"/>
    <path d="M8 26h32" ${O}/>
    <path d="M21 26h6v7h-6z" fill="#E2A42C" ${O}/>
    <path d="M22 26v-3a2 2 0 0 1 4 0v3" fill="none" stroke="${INK}" stroke-width="1.8"/>
    <path d="M12 17c3-3 8-4 12-4" stroke="#D99A5E" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  // Un catalejo extendido, con anillos de bronce.
  catalejo: `
    <path d="M7 33l9-5 3 6-9 5z" fill="#1E2742" ${O}/>
    <path d="M16 28l12-7 4 8-13 6z" fill="#B0652C" ${O}/>
    <path d="M28 21l11-6 5 10-12 6z" fill="#9C5626" ${O}/>
    <path d="M16 28l3 6M28 21l4 8" stroke="#E2A42C" stroke-width="2.5"/>
    <ellipse cx="41.5" cy="20" rx="2.5" ry="5.5" transform="rotate(-28 41.5 20)" fill="#9FD3E0" ${O}/>
    <path d="M22 41h8M26 33v8" ${O}/>`,
  // Un amuleto del ojo azul colgado de un cordón.
  amuleto: `
    <path d="M14 6c2 6 6 9 10 10 4-1 8-4 10-10" fill="none" stroke="#B4482A" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="24" cy="29" r="13" fill="#2F6FB5" ${O}/>
    <circle cx="24" cy="29" r="8.5" fill="#FBF3E4" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="24" cy="29" r="5" fill="#7FC6D9" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="24" cy="29" r="2.4" fill="#1E2742"/>
    <circle cx="22.5" cy="27.5" r="1" fill="#FFFFFF"/>
    <circle cx="24" cy="16" r="2.4" fill="#E2A42C" ${O}/>`,
  // Un astrolabio de bronce: anilla, disco con estrellas y la regla cruzada.
  astrolabio: `
    <circle cx="24" cy="8" r="3" fill="none" ${O}/>
    <path d="M21 12h6l-1 3h-4z" fill="#A8761A" ${O}/>
    <circle cx="24" cy="28" r="15" fill="#C98A3A" ${O}/>
    <circle cx="24" cy="28" r="11" fill="#1E2742" ${O}/>
    <circle cx="19" cy="23" r="1.2" fill="#FBE3A6"/><circle cx="29" cy="25" r="1" fill="#FBE3A6"/><circle cx="21" cy="33" r="0.9" fill="#FBE3A6"/><circle cx="30" cy="33" r="1.3" fill="#FBE3A6"/>
    <path d="M27 20a6 6 0 1 0 0 8a4.6 4.6 0 1 1 0-8z" fill="#F1D18F"/>
    <path d="M12 34L36 22" stroke="#E2A42C" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M12 34L36 22" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"/>
    <circle cx="24" cy="28" r="2" fill="#E2A42C" ${O}/>`,
};

/**
 * SVG de un objeto del bazar, con la medalla de arena de fondo.
 * @param {string} id
 */
export function gearSvg(id) {
  const bg = '<circle cx="24" cy="24" r="23" fill="#F1E2C2"/><circle cx="24" cy="24" r="23" fill="none" stroke="#D8BE8E" stroke-width="1.5"/>';
  return `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${bg}${ART[id]}</svg>`;
}
