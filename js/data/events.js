/**
 * Eventos de viaje, en datos. Cada uno es una carta con texto y 1 a 3 opciones.
 *
 * - when: condiciones para que aparezca (danger: peligros de la ruta,
 *   terrain: terrenos, notTerrain: terrenos donde no sale, region:
 *   regiones). Sin `when`, puede salir en cualquier ruta.
 * - weight: qué tan seguido sale (las rutas peligrosas suben los malos).
 * - setup(game, rng): calcula valores para el texto y las opciones
 *   (peaje, mercadería del nómada…). Se guardan con el evento.
 * - En textos y efectos, "$clave" se reemplaza por el valor de setup.
 *
 * Opciones:
 * - cost: { gold } que hace falta tener; needs: { food, water } idem.
 * - spareDays: días extra que la opción puede sumar sin pasar del día 60.
 * - requires: clave de setup que tiene que existir (no ser null).
 * - role: rol de tripulante que hace falta (por ejemplo, 'explorador').
 * - effects: lo que pasa sí o sí. Con `chance` (número o nombre de una
 *   función de js/game/events.js) hay `win` y `lose`.
 *
 * Efectos posibles: gold, food, water, cargoPct (parte de la carga que se
 * pierde), breakFragile (parte de la cerámica que se rompe), delay (días),
 * rep (reputación en la zona de destino), loot [mín, máx] de oro,
 * give { good, qty }, takeAll (bien que se pierde entero), inspect
 * (revisión: multa y confiscación de armas), reveal (dato de precios) y
 * camelHp (salud que pierde cada camello), heal (salud que recupera cada
 * uno) y morale (moral de la tripulación).
 * - stat: estadística que suma la opción si sale bien (para logros).
 * Los eventos propios de cada región están en events-regional.js.
 */

import { getGood } from './goods.js';
import { REGIONAL_EVENTS, cargoBase } from './events-regional.js';

/** Eventos que pueden salir en cualquier región. */
const COMMON_EVENTS = [
  {
    id: 'bandidos',
    when: { danger: ['medio', 'alto'], notTerrain: ['mar'] },
    weight: 3,
    text: 'Una banda de bandidos te corta el paso. El jefe pide $toll de oro para dejarte seguir.',
    setup: (game) => ({ toll: Math.max(25, Math.round(cargoBase(game.state) * 0.15 + 10)) }),
    options: [
      // Pagar compra un salvoconducto: unos días sin bandidos ni piratas (como un seguro).
      { label: 'Pagar $toll de oro (salvoconducto por 7 días)', cost: { gold: '$toll' }, effects: { gold: '-$toll', safePass: true } },
      { label: 'Pelear', chance: 'fight', win: { rep: 5, loot: [20, 70], morale: 10 }, lose: { cargoPct: 0.4, camelHp: -15, morale: -10 },
        winText: '¡Los espantaste! Hasta dejaron algo de oro.', loseText: 'Te ganaron: se llevaron parte de la carga.' },
      { label: 'Huir', chance: 'flee', win: {}, lose: { cargoPct: 0.25 },
        winText: 'Te escapaste por un atajo.', loseText: 'Te alcanzaron y tuviste que soltar carga.' },
    ],
  },
  {
    id: 'bandidos-amigos',
    weight: 0, // sólo sale en lugar de "bandidos" si tenés buena reputación en la zona
    text: 'Unos bandidos te rodean… pero el jefe te reconoce: "Con vos no, mercader". Te dejan pasar.',
    options: [{ label: 'Seguir viaje', effects: {} }],
  },
  {
    // Las perlas no ocupan lugar, pero llaman la atención en cualquier ruta.
    id: 'ladron-perlas',
    when: { carrying: 'perlas' },
    weight: 3,
    text: 'De noche, alguien rondó la caravana. Buscaba tus perlas.',
    options: [
      { label: 'Hacer guardia toda la noche (+1 día)', spareDays: 1, effects: { delay: 1 } },
      { label: 'Que el guardia vigile', role: 'guardia', effects: { morale: -3 } },
      { label: 'Esconderlas y seguir', chance: 'hide', win: {}, lose: { losePart: { good: 'perlas', pct: 0.5 } },
        winText: 'Nadie las encontró.', loseText: 'A la mañana faltaban perlas.' },
    ],
  },
  {
    id: 'tormenta',
    when: { terrain: ['arena', 'piedra'] },
    weight: 2,
    text: 'Se levanta una tormenta de arena. No se ve nada.',
    options: [
      { label: 'Esperar a que pase (+1 día)', spareDays: 1, effects: { delay: 1 } },
      { label: 'Seguir igual', chance: 'storm', win: {}, lose: { cargoPct: 0.15, breakFragile: 0.5, camelHp: -20 },
        winText: 'Pasaste la tormenta sin problemas.', loseText: 'El viento se llevó parte de la carga.' },
    ],
  },
  {
    id: 'oasis-seco',
    when: { terrain: ['arena'] },
    weight: 1,
    text: 'Llegás a un oasis que estaba en el mapa… pero está seco.',
    options: [
      { label: 'Cavar buscando agua', spareDays: 1, chance: 'dig', win: { water: 15, camelHp: -5 }, lose: { delay: 1, camelHp: -10 },
        winText: '¡Encontraste agua! Llenaste los odres.', loseText: 'Cavaste todo el día y nada.' },
      { label: 'Seguir con lo que hay', effects: {} },
    ],
  },
  {
    id: 'nomada',
    when: { notTerrain: ['mar'] },
    weight: 1.5,
    text: 'Un mercader nómada te ofrece $qty de $goodName por $price de oro.$sellText',
    setup: (game, rng) => {
      const good = rng.pick(['perlas', 'seda', 'especias', 'incienso']);
      const qty = rng.int(2, 5);
      const price = Math.round(getGood(good).base * qty * 0.75);
      const carried = Object.entries(game.state.cargo).filter(([, q]) => q > 0).sort((a, b) => b[1] - a[1])[0];
      const sellGood = carried ? carried[0] : null;
      const sellPrice = carried ? Math.round(getGood(carried[0]).base * carried[1] * 1.05) : 0;
      const sellText = carried ? ` También te compra todo tu ${getGood(carried[0]).name.toLowerCase()} por ${sellPrice}.` : '';
      return { good, goodName: getGood(good).name.toLowerCase(), qty, price, sellGood, sellPrice, sellText };
    },
    options: [
      { label: 'Comprarle ($price de oro)', cost: { gold: '$price' }, space: true, effects: { gold: '-$price', give: { good: '$good', qty: '$qty' } } },
      { label: 'Venderle a su precio ($sellPrice)', requires: 'sellGood', effects: { gold: '$sellPrice', takeAll: '$sellGood' } },
      { label: 'Pasar de largo', effects: {} },
    ],
  },
  {
    id: 'ruinas',
    when: { notTerrain: ['mar'] },
    weight: 1,
    text: 'Entre las dunas asoman unas ruinas antiguas. Puede haber un tesoro… o una trampa.',
    options: [
      { label: 'Explorar', spareDays: 1, chance: 0.5, win: { loot: [40, 140] }, lose: { cargoPct: 0.1, delay: 1 },
        winText: '¡Encontraste monedas antiguas!', loseText: 'Era una trampa: perdiste un día y algo de carga.' },
      { label: 'Mandar al explorador', role: 'explorador', chance: 'scout', win: { loot: [40, 140] }, lose: {},
        winText: 'Tu explorador volvió con monedas antiguas.', loseText: 'Tu explorador no encontró nada, pero volvió sano.' },
      { label: 'Ignorarlas', effects: {} },
    ],
  },
  {
    // Sólo sale con el mapa del tesoro entero, en su ruta (ver js/game/treasure.js).
    id: 'tesoro',
    weight: 0,
    text: 'Las marcas del mapa coinciden con el paisaje: una roca partida y tres palmeras. El tesoro tiene que estar acá abajo.',
    setup: (game) => ({ gold: game.state.treasure?.gold ?? 0 }),
    options: [
      { label: 'Cavar (un día más de viaje)', spareDays: 1, effects: { gold: '$gold', delay: 1 },
        winText: '¡Un cofre lleno de monedas antiguas! Valió la pena el mapa.' },
      { label: 'Seguir de largo (podés volver otro día)', effects: {} },
    ],
  },
  {
    id: 'viajero',
    when: { notTerrain: ['mar'] },
    weight: 1,
    text: 'Un viajero herido te pide ayuda al costado del camino.',
    options: [
      { label: 'Ayudarlo (3 de comida y 3 de agua)', needs: { food: 3, water: 3 }, effects: { food: -3, water: -3, rep: 5, reveal: 1 },
        winText: 'Te lo agradece y te cuenta los precios de una ciudad.' },
      { label: 'Seguir de largo', effects: { rep: -2 } },
    ],
  },
  {
    id: 'control',
    when: { danger: ['bajo', 'medio'] },
    weight: 1.2,
    text: 'Un control de la guardia del sultán revisa las caravanas. Las armas son contrabando.',
    setup: (game) => ({ fine: 30 + Math.round(game.state.cargo.armas * getGood('armas').base * 0.5) }),
    options: [
      { label: 'Dejar que revisen', effects: { inspect: true } },
      { label: 'Sobornar (20 de oro)', cost: { gold: 20 }, chance: 'bribe', win: { gold: -20 }, lose: { gold: -20, inspect: true, rep: -5 },
        winText: 'El guardia mira para otro lado.', loseText: 'No aceptó el soborno y revisó igual.' },
      { label: 'Desviarse (+1 día)', spareDays: 1, effects: { delay: 1 } },
    ],
  },
  {
    id: 'espejismo',
    when: { terrain: ['arena'] },
    weight: 1,
    text: 'En el horizonte brilla un oasis con palmeras. ¿Será real o un espejismo?',
    options: [
      { label: 'Preguntarle al guía', role: 'guia', chance: 0.9, win: { water: 12 }, lose: { delay: 1 },
        winText: 'El guía conocía el lugar: era real. Llenaste los odres.', loseText: 'Ni el guía se salvó del engaño: perdiste un día.' },
      { label: 'Desviarse a ver', spareDays: 1, chance: 0.35, win: { water: 12 }, lose: { delay: 1, water: -4 },
        winText: '¡Era real! Agua fresca para todos.', loseText: 'Era un espejismo. Perdiste un día y agua.' },
      { label: 'Seguir la ruta', effects: {} },
    ],
  },
  {
    id: 'pata-herida',
    when: { notTerrain: ['mar'] },
    weight: 1,
    text: 'Uno de tus animales pisó mal entre las piedras y renguea.',
    options: [
      { label: 'Que lo cure el curandero', role: 'curandero', effects: { heal: 10 },
        winText: 'Lo vendó con hierbas: en un rato estaba como nuevo.' },
      { label: 'Parar a curarlo (+1 día)', spareDays: 1, effects: { delay: 1, heal: 5 } },
      { label: 'Seguir igual', effects: { camelHp: -20 } },
    ],
  },
  {
    id: 'peregrinos',
    when: { notTerrain: ['mar'], danger: ['bajo', 'medio'] },
    weight: 1,
    text: 'Unos peregrinos van rumbo a la ciudad santa y te piden que los acompañes. Pagan poco, pero se habla bien de quien los cuida.',
    options: [
      { label: 'Acompañarlos (+1 día)', spareDays: 1, effects: { delay: 1, gold: 25, rep: 8 }, stat: 'pilgrims',
        winText: 'Llegaron sanos y salvos: te bendicen en cada pueblo.' },
      { label: 'Compartirles comida (3)', needs: { food: 3 }, effects: { food: -3, rep: 4 } },
      { label: 'Seguir solo', effects: {} },
    ],
  },
  {
    id: 'mercado-negro',
    when: { notTerrain: ['mar'], danger: ['medio', 'alto'] },
    weight: 1,
    text: 'Un encapuchado ofrece $qty de $goodName a precio de remate: $price de oro. Demasiado barato…',
    setup: (game, rng) => {
      const good = rng.pick(['seda', 'especias', 'incienso', 'perlas']);
      const qty = rng.int(3, 6);
      return { good, goodName: getGood(good).name.toLowerCase(), qty, price: Math.round(getGood(good).base * qty * 0.45) };
    },
    options: [
      { label: 'Comprar ($price de oro)', cost: { gold: '$price' }, space: true, chance: 0.65,
        win: { gold: '-$price', give: { good: '$good', qty: '$qty' } }, lose: { gold: '-$price' },
        winText: 'Era mercadería buena. ¡Negocio redondo!', loseText: 'Los fardos tenían arena adentro. Te estafaron.' },
      { label: 'Denunciarlo en la próxima ciudad', effects: { rep: 5 } },
      { label: 'Pasar de largo', effects: {} },
    ],
  },
  {
    id: 'pozo',
    when: { notTerrain: ['mar', 'rio'] },
    weight: 1,
    text: 'Encontrás un pozo viejo al costado del camino. El agua huele raro.',
    options: [
      { label: 'Que el cocinero la hierva', role: 'cocinero', effects: { water: 15 },
        winText: 'Hervida y con unas hojas de menta, quedó rica.' },
      { label: 'Tomar igual', chance: 0.6, win: { water: 15 }, lose: { water: 5, camelHp: -15, morale: -10 },
        winText: 'Estaba buena. Odres llenos.', loseText: 'Les cayó mal a todos.' },
      { label: 'No arriesgarse', effects: {} },
    ],
  },
  {
    id: 'fogon',
    weight: 1,
    text: 'Te cruzás con otra caravana del Gremio. Arman un fogón juntos y se cuentan novedades.',
    options: [
      { label: 'Invitar la cena (2 de comida)', needs: { food: 2 }, effects: { food: -2, morale: 8, reveal: 1 },
        winText: 'Entre té y dátiles te pasaron precios frescos.' },
      { label: 'Saludar y seguir', effects: {} },
    ],
  },
];

/** Todos los eventos: los comunes y los de cada región. */
export const EVENTS = [...COMMON_EVENTS, ...REGIONAL_EVENTS];

/** Acceso por id. */
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
