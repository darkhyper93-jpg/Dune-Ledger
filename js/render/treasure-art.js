/**
 * Dibujo del mapa del tesoro roto en tres pedazos (caja de 120×72). Los
 * pedazos que tenés se ven en pergamino con su parte del camino; los que
 * faltan, sólo con el borde punteado y un signo de pregunta. Mismo estilo
 * que los bienes: formas planas y contorno índigo.
 */

const INK = '#2A2340';
const RED = '#B4482A';
const PAPER = '#F1DDB0';

/** Los tres pedazos: contorno con el borde roto y lo que tiene dibujado. */
const STRIPS = [
  {
    edge: 'M4 6H40L36 18L42 30L37 44L41 58L38 66H4Z',
    marks: `<path d="M8 30q8-6 16 0" fill="none" stroke="#C49A5A" stroke-width="2" stroke-linecap="round"/>
      <path d="M10 56C18 50 26 52 38 44" fill="none" stroke="${RED}" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>`,
    q: 21,
  },
  {
    edge: 'M40 6H80L76 20L82 33L77 47L81 66H38L41 58L37 44L42 30L36 18Z',
    marks: `<circle cx="58" cy="20" r="5" fill="#7FB7BE" stroke="${INK}" stroke-width="1.5"/>
      <path d="M40 43C50 36 60 46 78 34" fill="none" stroke="${RED}" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>`,
    q: 59,
  },
  {
    edge: 'M80 6H116V66H81L77 47L82 33L76 20Z',
    marks: `<path d="M80 33C88 30 91 26 96 22" fill="none" stroke="${RED}" stroke-width="2" stroke-dasharray="3 3" stroke-linecap="round"/>
      <path d="M94 12L104 22M104 12L94 22" stroke="${RED}" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M90 52l4-6 4 6M98 52l4-6 4 6" fill="none" stroke="#C49A5A" stroke-width="2" stroke-linejoin="round"/>`,
    q: 98,
  },
];

/**
 * SVG del mapa con `found` pedazos encontrados (de izquierda a derecha).
 * @param {number} found 0 a 3
 * @returns {string}
 */
export function treasureMapSvg(found) {
  const parts = STRIPS.map((s, i) => (i < found
    ? `<path d="${s.edge}" fill="${PAPER}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>${s.marks}`
    : `<path d="${s.edge}" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="3 3" stroke-linejoin="round"/>
      <text x="${s.q}" y="42" text-anchor="middle" font-family="Rubik, system-ui, sans-serif" font-weight="700" font-size="18" fill="${INK}" fill-opacity=".45">?</text>`));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 72">${parts.join('')}</svg>`;
}
