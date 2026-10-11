/**
 * Eventos de viaje, en datos. Cada uno es una carta con texto y 1 a 3 opciones.
 *
 * - when: condiciones para que aparezca (danger: peligros de la ruta,
 *   terrain: terrenos). Sin `when`, puede salir en cualquier ruta.
 * - weight: qué tan seguido sale (las rutas peligrosas suben los malos).
 * - setup(game, rng): calcula valores para el texto y las opciones
 *   (peaje, mercadería del nómada…). Se guardan con el evento.
 * - En textos y efectos, "$clave" se reemplaza por el valor de setup.
 *
 * Opciones:
 * - cost: { gold } que hace falta tener; needs: { food, water } idem.
 * - spareDays: días extra que la opción puede sumar sin pasar del día 60.
 * - requires: clave de setup que tiene que existir (no ser null).
 * - effects: lo que pasa sí o sí. Con `chance` (número o nombre de una
 *   función de js/game/events.js) hay `win` y `lose`.
 *
 * Efectos posibles: gold, food, water, cargoPct (parte de la carga que se
 * pierde), breakFragile (parte de la cerámica que se rompe), delay (días),
 * rep (reputación en la zona de destino), loot [mín, máx] de oro,
 * give { good, qty }, takeAll (bien que se pierde entero), inspect
 * (revisión: multa y confiscación de armas) y reveal (dato de precios).
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
    when: { danger: ['medio', 'alto'] },
    weight: 3,
    text: 'Una banda de bandidos te corta el paso. El jefe pide $toll de oro para dejarte seguir.',
    setup: (game) => ({ toll: Math.max(25, Math.round(cargoBase(game.state) * 0.1 + 10)) }),
    options: [
      { label: 'Pagar $toll de oro', cost: { gold: '$toll' }, effects: { gold: '-$toll' } },
      { label: 'Pelear', chance: 'fight', win: { rep: 5, loot: [20, 70] }, lose: { cargoPct: 0.3 },
        winText: '¡Los espantaste! Hasta dejaron algo de oro.', loseText: 'Te ganaron: se llevaron parte de la carga.' },
      { label: 'Huir', chance: 'flee', win: {}, lose: { cargoPct: 0.15 },
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
      { label: 'Seguir igual', chance: 0.6, win: {}, lose: { cargoPct: 0.15, breakFragile: 0.5 },
        winText: 'Pasaste la tormenta sin problemas.', loseText: 'El viento se llevó parte de la carga.' },
    ],
  },
  {
    id: 'oasis-seco',
    when: { terrain: ['arena'] },
    weight: 1,
    text: 'Llegás a un oasis que estaba en el mapa… pero está seco.',
    options: [
      { label: 'Cavar buscando agua', spareDays: 1, chance: 'dig', win: { water: 15 }, lose: { delay: 1 },
        winText: '¡Encontraste agua! Llenaste los odres.', loseText: 'Cavaste todo el día y nada.' },
      { label: 'Seguir con lo que hay', effects: {} },
    ],
  },
  {
    id: 'nomada',
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
    weight: 1,
    text: 'Entre las dunas asoman unas ruinas antiguas. Puede haber un tesoro… o una trampa.',
    options: [
      { label: 'Explorar', spareDays: 1, chance: 0.5, win: { loot: [40, 140] }, lose: { cargoPct: 0.1, delay: 1 },
        winText: '¡Encontraste monedas antiguas!', loseText: 'Era una trampa: perdiste un día y algo de carga.' },
      { label: 'Ignorarlas', effects: {} },
    ],
  },
  {
    id: 'viajero',
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
];

/** Acceso por id. */
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
