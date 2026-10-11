/**
 * Escenas ilustradas de cada tipo de ciudad para la cabecera de la pantalla
 * de ciudad (SVG de 360×140). El fondo cambia con la región (dunas, pastos,
 * mar, picos nevados o el cielo violeta del sultán) y adelante va la silueta propia
 * de cada lugar: el puerto con barcos, el oasis con palmeras, la mina en la
 * montaña, las cúpulas de la ciudad santa, la aldea con su molino y la
 * Capital amurallada.
 */

const INK = '#2A2340';

/**
 * Fondo de cada región: colores del cielo, el astro, el paisaje de atrás
 * (dunas, pastos, mar, picos nevados) y el color del suelo de adelante.
 */
const LANDS = {
  desierto: {
    sky: ['#3E5C9A', '#E7965A', '#F6CF8A'], sun: '#FBE3A6',
    back: '<path d="M0 98c50-14 95-14 140-4s90 8 130-6 70-10 90-4v56H0z" fill="#D9A15F"/>',
    ground: '#C4813F',
  },
  estepa: {
    sky: ['#5F8FB8', '#A9CDD6', '#EDE6B9'], sun: '#FFF4CC',
    back: `<path d="M0 96c40-16 90-18 140-8s90 10 130-4 70-8 90-2v58H0z" fill="#9DB45A"/>
      <path d="M40 60c10-3 20-3 30 0M250 48c8-2 16-2 24 0M262 54c8-2 14-2 20 0" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".8"/>`,
    ground: '#7E9A42',
  },
  costa: {
    sky: ['#4D7FB5', '#E9A27A', '#F6D3A0'], sun: '#FBE3A6',
    back: `<path d="M0 86h360v54H0z" fill="#2B6C8F"/>
      <path d="M0 90c20 3 40 3 60 0s40-3 60 0 40 3 60 0 40-3 60 0 40 3 60 0 40-3 60 0" stroke="#7FC6D9" stroke-width="2" fill="none"/>
      <path d="M300 86l8-10h14l4 10z" fill="#1E2742" opacity=".55"/><path d="M312 76V60l10 14z" fill="#F8EED9" opacity=".7"/>`,
    ground: '#D9A15F',
  },
  jade: {
    sky: ['#536B9C', '#9FB6C8', '#DCE6E4'], sun: '#F3F6F2',
    back: `<path d="M0 100l50-46 30 22 50-50 50 52 40-30 60 44 40-26 40 34v40H0z" fill="#5B6E7E"/>
      <path d="M38 65l12-11 10 8-8 2zM118 38l12-12 13 14-8-1zM248 70l8-6 8 6z" fill="#FFFFFF"/>
      <path d="M0 106c60-10 110-8 170-2s120 4 190-6v42H0z" fill="#3F8466"/>`,
    ground: '#2F6E54',
  },
  sultan: {
    sky: ['#3B2F78', '#B0638A', '#EFA772'], sun: '#FCE7B0', moon: true,
    back: '<path d="M0 98c50-14 95-14 140-4s90 8 130-6 70-10 90-4v56H0z" fill="#C98A5E"/>',
    ground: '#A8653D',
  },
};

/** Cielo, astro y paisaje de fondo de la región. */
function backdrop(id, region) {
  const land = LANDS[region] ?? LANDS.desierto;
  const [top, mid, low] = land.sky;
  const astro = land.moon
    ? `<circle cx="282" cy="52" r="16" fill="${land.sun}"/><circle cx="290" cy="47" r="14" fill="${mid}"/>`
    : `<circle cx="282" cy="62" r="20" fill="${land.sun}"/><circle cx="282" cy="62" r="30" fill="${land.sun}" opacity=".25"/>`;
  return `
  <defs>
    <linearGradient id="sky-${id}-${region}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/>
    </linearGradient>
  </defs>
  <rect width="360" height="140" fill="url(#sky-${id}-${region})"/>
  ${astro}
  ${land.back}`;
}

/** Suelo de adelante, del color de la región. */
const ground = (region) => `<path d="M0 116c60-10 120-8 180 0s120 6 180-4v28H0z" fill="${(LANDS[region] ?? LANDS.desierto).ground}"/>`;

/** Silueta de camello de perfil (también la usa el mapa). */
export const CAMEL_PATH = 'M-30 6c0-8 6-12 12-12 3-9 8-13 13-13s8 5 10 11c3-5 6-7 10-7 5 0 7 6 10 12h4l5-14h10l-2 9-6 11c-2 4-6 6-11 6h-1v26h-5V14h-6v14h-5V14h-14v14h-5V14h-6v14h-5V14c-6-1-9-4-9-8z';

/** Un camello cargado, de perfil (silueta), con el lomo en (0,0). */
function camel(x, y, s = 1, cargo = '#E2A42C') {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}">
    <path d="${CAMEL_PATH}"/>
    <path d="M-16 -4h22v-8h-22z" fill="${cargo}" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

/** Siluetas de cada tipo (color de tinta, como un recorte de papel). */
const SKYLINES = {
  cover: `
    <path d="M226 92V80h8v-5h6v5h8v-9l6-6 6 6v21z" fill="${INK}" opacity=".35"/>
    ${camel(62, 64, 0.55)}${camel(104, 62, 0.58, '#1E9C94')}${camel(148, 63, 0.6, '#B4482A')}
    <path d="M20 84c30-4 60-5 90-4s70 4 100 1" stroke="${INK}" stroke-width="2" stroke-dasharray="4 6" fill="none" opacity=".4"/>`,
  capital: `
    <path d="M40 116V78h14v-8h8v8h12V64l10-10 10 10v14h12v-8h8v8h14v38z" fill="${INK}"/>
    <path d="M150 116V70c0-18 12-28 26-28s26 10 26 28v46z" fill="${INK}"/>
    <path d="M176 42v-10" stroke="${INK}" stroke-width="3"/><circle cx="176" cy="29" r="4" fill="#E2A42C" stroke="${INK}" stroke-width="2"/>
    <path d="M214 116V82h10v-6h8v6h10V60l6-10 6 10v56z" fill="${INK}"/>
    <path d="M44 84h6M60 84h6M178 80h-4v14h4zM228 90h6" stroke="#E2A42C" stroke-width="3"/>`,
  puerto: `
    <path d="M0 106h360v34H0z" fill="#2B6C8F"/>
    <path d="M0 108c20 3 40 3 60 0s40-3 60 0 40 3 60 0 40-3 60 0 40 3 60 0 40-3 60 0" stroke="#7FC6D9" stroke-width="2" fill="none"/>
    <path d="M60 106h70v-4l-6-10H66l-6 10z" fill="${INK}"/>
    <path d="M94 92V48l26 40zM90 92V58L70 88z" fill="#F8EED9" stroke="${INK}" stroke-width="2"/>
    <path d="M190 106h46l-4-8h-38z" fill="${INK}"/><path d="M212 98V70l16 24z" fill="#F8EED9" stroke="${INK}" stroke-width="2"/>
    <path d="M290 106V58l6-6 6 6v48z" fill="${INK}"/><path d="M290 64h12" stroke="#E2A42C" stroke-width="4"/>`,
  oasis: `
    <ellipse cx="180" cy="114" rx="70" ry="9" fill="#1E9C94"/>
    <ellipse cx="180" cy="112" rx="50" ry="4" fill="#7FD6CC" opacity=".7"/>
    ${[[110, 52], [150, 40], [230, 46], [262, 58]].map(([x, top]) => `
      <path d="M${x} 112C${x + 3} ${(112 + top) / 2} ${x + 1} ${top + 20} ${x - 3} ${top + 8}" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M${x - 3} ${top + 8}c-12-8-26-4-32 4 10-3 20-2 32 0zM${x - 3} ${top + 8}c12-8 26-4 32 4-10-3-20-2-32 0zM${x - 3} ${top + 8}c-6-12-18-16-26-12 9 1 17 5 26 14zM${x - 3} ${top + 8}c6-12 18-16 26-12-9 1-17 5-26 14z" fill="${INK}"/>`).join('')}`,
  minera: `
    <path d="M30 116l60-74 30 30 40-52 70 96z" fill="${INK}"/>
    <path d="M136 116v-24a14 14 0 0 1 28 0v24z" fill="#1A1430"/>
    <path d="M136 92h28M140 92v24M160 92v24" stroke="#C4813F" stroke-width="3"/>
    <path d="M200 120h90" stroke="${INK}" stroke-width="3"/>
    <path d="M222 112l-4-16h46l-4 16z" fill="${INK}"/>
    <path d="M224 96c4-8 10-10 16-6 4-6 12-6 18 2z" fill="#9AA6B8" stroke="${INK}" stroke-width="2"/>
    <circle cx="230" cy="114" r="5" fill="${INK}"/><circle cx="252" cy="114" r="5" fill="${INK}"/>`,
  santa: `
    <path d="M90 116V84c0-14 10-24 24-24s24 10 24 24v32z" fill="${INK}"/>
    <path d="M150 116V74c0-20 14-32 30-32s30 12 30 32v42z" fill="${INK}"/>
    <path d="M180 42v-10" stroke="${INK}" stroke-width="3"/><circle cx="180" cy="29" r="4" fill="#E2A42C" stroke="${INK}" stroke-width="2"/>
    <path d="M222 116V84c0-12 8-20 18-20s18 8 18 20v32z" fill="${INK}"/>
    <path d="M276 116V46l8-16 8 16v70z" fill="${INK}"/><path d="M272 56h24" stroke="${INK}" stroke-width="4"/>
    <path d="M176 92h8v24h-8zM110 96h8M236 96h8" stroke="#E2A42C" stroke-width="3"/>`,
  aldea: `
    <path d="M60 116V92l20-16 20 16v24zM110 116V98l14-11 14 11v18z" fill="${INK}"/>
    <path d="M200 116V80h20v36z" fill="${INK}"/>
    <g transform="translate(210 78)"><path d="M0 0l-4-34h8z M0 0l34-4v8zM0 0l4 34h-8zM0 0l-34 4v-8z" fill="#F8EED9" stroke="${INK}" stroke-width="2"/></g>
    <circle cx="210" cy="78" r="4" fill="${INK}"/>
    <path d="M260 116v-14h30v14M256 102h38" stroke="${INK}" stroke-width="4" fill="none"/>
    <path d="M76 100h8M120 104h6" stroke="#E2A42C" stroke-width="3"/>`,
};

/**
 * Escena completa de un tipo de ciudad en una región, como texto SVG fijo.
 * @param {string} type
 * @param {string} [region='desierto']
 */
export function sceneSvg(type, region = 'desierto') {
  return `<svg viewBox="0 0 360 140" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${backdrop(type, region)}${SKYLINES[type]}${ground(region)}</svg>`;
}
