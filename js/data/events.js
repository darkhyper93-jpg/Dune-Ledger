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
 * camelHp (salud que pierde cada camello) y morale (moral de la tripulación).
 */

import { getGood } from './goods.js';

/** Valor de la carga a precio base (para calcular peajes). */
function cargoBase(state) {
  let v = 0;
  for (const [id, q] of Object.entries(state.cargo)) v += q * getGood(id).base;
  return v;
}

export const EVENTS = [
  {
    id: 'bandidos',
    when: { danger: ['medio', 'alto'], notTerrain: ['mar'] },
    weight: 3,
    text: 'Una banda de bandidos te corta el paso. El jefe pide $toll de oro para dejarte seguir.',
    setup: (game) => ({ toll: Math.max(25, Math.round(cargoBase(game.state) * 0.15 + 10)) }),
    options: [
      { label: 'Pagar $toll de oro', cost: { gold: '$toll' }, effects: { gold: '-$toll' } },
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
  // ── Eventos de cada región ──
  {
    id: 'piratas',
    when: { terrain: ['mar'] },
    weight: 3,
    text: 'Una galera de velas negras se pone a la par. Los piratas piden $toll de oro para no abordarte.',
    setup: (game) => ({ toll: Math.max(25, Math.round(cargoBase(game.state) * 0.15 + 10)) }),
    options: [
      { label: 'Pagar $toll de oro', cost: { gold: '$toll' }, effects: { gold: '-$toll' } },
      { label: 'Defender el barco', chance: 'fight', win: { rep: 5, loot: [30, 90], morale: 10 }, lose: { cargoPct: 0.4, morale: -10 },
        winText: '¡Los rechazaste! En la huida dejaron caer un cofre.', loseText: 'Te abordaron y se llevaron parte de la carga.' },
      { label: 'Escapar a toda vela', chance: 'flee', win: {}, lose: { cargoPct: 0.25 },
        winText: 'El viento estuvo de tu lado y los dejaste atrás.', loseText: 'Te alcanzaron: tiraste carga al agua para ganar velocidad.' },
    ],
  },
  {
    id: 'calma',
    when: { terrain: ['mar'] },
    weight: 1.5,
    text: 'Se para el viento. Las velas cuelgan y el barco no avanza.',
    options: [
      { label: 'Esperar el viento (+1 día)', spareDays: 1, effects: { delay: 1 } },
      { label: 'Remar todos juntos', effects: { morale: -8, water: -4 } },
    ],
  },
  {
    id: 'estampida',
    when: { region: ['estepa'], notTerrain: ['mar'] },
    weight: 2,
    text: 'La tierra tiembla: una manada de caballos salvajes viene en estampida hacia la caravana.',
    options: [
      { label: 'Apartarse y esperar (+1 día)', spareDays: 1, effects: { delay: 1 } },
      { label: 'Cruzar antes de que lleguen', chance: 0.6, win: {}, lose: { cargoPct: 0.15, camelHp: -15 },
        winText: 'Pasaste justo a tiempo.', loseText: 'La manada te pasó por encima: perdiste carga.' },
    ],
  },
  {
    id: 'avalancha',
    when: { region: ['jade'], terrain: ['montana'] },
    weight: 2,
    text: 'Un ruido seco arriba del paso: se vienen piedras y nieve.',
    options: [
      { label: 'Volver y rodear (+2 días)', spareDays: 2, effects: { delay: 2 } },
      { label: 'Apurar el paso', chance: 0.55, win: {}, lose: { cargoPct: 0.2, breakFragile: 0.5, camelHp: -25 },
        winText: 'Cruzaste un segundo antes del derrumbe.', loseText: 'La avalancha te alcanzó de costado.' },
    ],
  },
  {
    id: 'recaudador',
    when: { region: ['sultan'] },
    weight: 2,
    text: 'Un recaudador del sultán cobra el diezmo del camino: $tax de oro.',
    setup: (game) => ({ tax: Math.max(15, Math.round(cargoBase(game.state) * 0.08)), fine: Math.max(40, Math.round(cargoBase(game.state) * 0.2)) }),
    options: [
      { label: 'Pagar el diezmo ($tax)', cost: { gold: '$tax' }, effects: { gold: '-$tax', rep: 2 } },
      { label: 'Esconder la carga', chance: 'bribe', win: {}, lose: { gold: '-$fine', rep: -5 },
        winText: 'Revisó por arriba y no vio nada.', loseText: 'Encontró la carga escondida y te multó con $fine.' },
    ],
  },
];

/** Acceso por id. */
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
