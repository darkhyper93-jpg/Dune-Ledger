/**
 * Retrato de Kasim "el Zorro", el mercader rival: un zorro con turbante
 * azafrán y una sonrisa de quien ya compró lo barato antes que vos.
 * SVG de 64×64, mismo trazo índigo que los bienes.
 */

const INK = '#2A2340';
const O = `stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;

/** SVG del retrato, como texto fijo. */
export function kasimSvg() {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="#F1E2C2"/>
  <path d="M8 10l14 10-6 10zM56 10L42 20l6 10z" fill="#C8642E" ${O}/>
  <path d="M12 14l7 6-3 5zM52 14l-7 6 3 5z" fill="#3A2A44"/>
  <path d="M13 28c0-8 9-13 19-13s19 5 19 13c0 5-3 9-7 12L32 56 20 40c-4-3-7-7-7-12z" fill="#D9773A" ${O}/>
  <path d="M15 33c4 4 9 6 14 6l3 17-12-16c-3-2-5-4-5-7zM49 33c-4 4-9 6-14 6l-3 17 12-16c3-2 5-4 5-7z" fill="#FBF3E4"/>
  <path d="M13 28c0-8 9-13 19-13s19 5 19 13c0 5-3 9-7 12L32 56 20 40c-4-3-7-7-7-12z" fill="none" ${O}/>
  <path d="M21 31c2-2 5-2 7 0M36 31c2-2 5-2 7 0" fill="none" ${O}/>
  <path d="M29 51h6l-3 4z" fill="${INK}"/>
  <path d="M26 44c2 2 4 2.6 6 2.6S36 46 38 44" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M16 22c2-8 8-13 16-13s14 5 16 13c-5-2-10-3-16-3s-11 1-16 3z" fill="#E2A42C" ${O}/>
  <path d="M21 16c3-2 7-2.6 11-2.6s8 .6 11 2.6" fill="none" stroke="#A8761A" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="32" cy="13" r="3" fill="#0E7C7A" ${O}/>
</svg>`;
}
