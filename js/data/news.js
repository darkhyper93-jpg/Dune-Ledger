/**
 * Noticias de mercado. Cada 7 a 10 días sale una: primero llega como rumor
 * a la taberna (puede ser falso) y unos días después se confirma o se
 * desmiente. Mientras dura, multiplica el precio de algunos bienes.
 *
 * scope 'type': afecta a todas las ciudades de un tipo (cityType).
 * scope 'zone': afecta a una zona del mapa elegida al azar ({zona} en el texto).
 * regions: si está, la noticia sólo sale en esas regiones.
 */

export const NEWS = [
  { id: 'sequia', scope: 'zone', goods: ['datiles'], mult: 2, text: 'Sequía en el {zona}: los dátiles se pagan el doble.' },
  { id: 'barco-seda', scope: 'type', cityType: 'puerto', goods: ['seda'], mult: 0.5, text: 'Llegó un barco cargado de seda: vale la mitad en los puertos.' },
  { id: 'fiesta', scope: 'type', cityType: 'capital', goods: ['especias', 'incienso'], mult: 2, text: 'Fiesta en la Capital: especias e incienso se pagan el doble.' },
  { id: 'peregrinos', scope: 'type', cityType: 'santa', goods: ['incienso', 'te'], mult: 2, text: 'Llegan peregrinos a las ciudades santas: incienso y té valen el doble.' },
  { id: 'derrumbe', scope: 'type', cityType: 'minera', goods: ['sal', 'metal'], mult: 2, text: 'Derrumbe en las minas: la sal y el metal escasean en las mineras.' },
  { id: 'cosecha', scope: 'type', cityType: 'oasis', goods: ['datiles'], mult: 0.5, text: 'Gran cosecha en los oasis: los dátiles valen la mitad.' },
  { id: 'escaramuzas', scope: 'zone', goods: ['armas'], mult: 2, text: 'Escaramuzas en el {zona}: las armas valen el doble.' },
  { id: 'invierno', scope: 'zone', goods: ['lana'], mult: 2, text: 'Noches heladas en el {zona}: la lana se paga el doble.' },
  { id: 'buceo', scope: 'type', cityType: 'puerto', goods: ['perlas'], mult: 0.5, text: 'Buena temporada de buceo: las perlas valen la mitad en los puertos.' },
  { id: 'biblioteca', scope: 'type', cityType: 'capital', goods: ['libros'], mult: 2, text: 'Se quemó la biblioteca de la Capital: los libros valen el doble.' },
  { id: 'boda', scope: 'zone', goods: ['ceramica', 'seda'], mult: 2, text: 'Boda de un príncipe en el {zona}: cerámica y seda se pagan el doble.' },
  { id: 'caravana-te', scope: 'zone', goods: ['te'], mult: 0.5, text: 'Una caravana enorme de té llegó al {zona}: el té vale la mitad.' },
  { id: 'langostas', scope: 'zone', goods: ['datiles', 'te'], mult: 2, text: 'Una plaga de langostas arrasó los cultivos del {zona}: dátiles y té se pagan el doble.' },
  { id: 'mina-nueva', scope: 'zone', goods: ['metal'], mult: 0.5, text: 'El Gremio abrió una mina nueva en el {zona}: el metal vale la mitad.' },
  // Noticias de una sola región.
  { id: 'feria-caballos', scope: 'type', cityType: 'aldea', goods: ['lana'], mult: 0.5, regions: ['estepa'], text: 'Gran feria de caballos en las aldeas: sobra lana y vale la mitad.' },
  { id: 'naufragio', scope: 'type', cityType: 'capital', goods: ['perlas', 'seda'], mult: 2, regions: ['costa'], text: 'Una tormenta hundió la flota del Gremio: perlas y seda escasean en la Capital.' },
  { id: 'templo-jade', scope: 'type', cityType: 'santa', goods: ['jade'], mult: 2, regions: ['jade'], text: 'Se consagra un templo nuevo: las ciudades santas pagan el doble por el jade.' },
  { id: 'cumple-sultan', scope: 'type', cityType: 'capital', goods: ['especias', 'seda'], mult: 2, regions: ['sultan'], text: 'Cumpleaños del sultán: en la Capital pagan el doble por especias y seda.' },
];

/** Acceso por id. */
export const NEWS_BY_ID = Object.fromEntries(NEWS.map((n) => [n.id, n]));
