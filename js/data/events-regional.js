/**
 * Eventos propios de cada región (ver `when.region` y `when.terrain`): el
 * mar de la Costa, la Estepa, las Montañas de Jade y el Reino del Sultán.
 * Mismo formato que js/data/events.js.
 */

import { getGood } from './goods.js';

/** Valor de la carga a precio base (para calcular peajes y multas). */
export function cargoBase(state) {
  let v = 0;
  for (const [id, q] of Object.entries(state.cargo)) v += q * getGood(id).base;
  return v;
}

export const REGIONAL_EVENTS = [
  {
    id: 'piratas',
    when: { terrain: ['mar'] },
    weight: 4,
    text: 'Una galera de velas negras se pone a la par. Los piratas piden $toll de oro para no abordarte.',
    setup: (game) => ({ toll: Math.max(25, Math.round(cargoBase(game.state) * 0.15 + 10)) }),
    options: [
      { label: 'Pagar $toll de oro', cost: { gold: '$toll' }, effects: { gold: '-$toll' } },
      { label: 'Defender el barco', chance: 'fight', stat: 'piratesBeaten', win: { rep: 5, loot: [30, 90], morale: 10 }, lose: { cargoPct: 0.4, morale: -10 },
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
  {
    id: 'niebla',
    when: { terrain: ['mar'] },
    weight: 1.2,
    text: 'Una niebla espesa tapa la costa. No se ven ni las rocas ni el faro.',
    options: [
      { label: 'Anclar y esperar (+1 día)', spareDays: 1, effects: { delay: 1 } },
      { label: 'Navegar a ciegas', chance: 0.65, win: {}, lose: { cargoPct: 0.1, delay: 1 },
        winText: 'Encontraste el canal de memoria.', loseText: 'Rozaste unas rocas: hubo que arreglar el casco.' },
    ],
  },
  {
    id: 'lobos',
    when: { region: ['estepa'], notTerrain: ['mar'] },
    weight: 1.5,
    text: 'De noche, una manada de lobos sigue a la caravana. Los caballos están nerviosos.',
    options: [
      { label: 'Que hagan guardia los guardias', role: 'guardia', effects: { morale: 5 }, stat: 'wolves',
        winText: 'Los guardias los espantaron con antorchas.' },
      { label: 'Encender fogatas (2 de comida)', needs: { food: 2 }, effects: { food: -2 },
        winText: 'Con el fuego encendido, los lobos no se acercaron.' },
      { label: 'Apurar el paso', chance: 0.6, win: {}, lose: { camelHp: -20, morale: -5 },
        winText: 'Los dejaste atrás.', loseText: 'Atacaron a un caballo antes de que pudieras escapar.' },
    ],
  },
  {
    id: 'monasterio',
    when: { region: ['jade'], terrain: ['montana'] },
    weight: 1.2,
    text: 'Un monasterio colgado de la montaña. Los monjes ofrecen refugio y compran jade para sus altares.',
    setup: (game) => {
      const qty = game.state.cargo.jade;
      return { qty, jadeOffer: qty > 0 ? Math.round(qty * getGood('jade').base * 1.25) : null };
    },
    options: [
      { label: 'Venderles tu jade', requires: 'jadeOffer', effects: { gold: '$jadeOffer', takeAll: 'jade' },
        winText: 'Los monjes pagaron bien y te dieron su bendición.' },
      { label: 'Descansar con ellos (+1 día)', spareDays: 1, effects: { delay: 1, heal: 25, morale: 10 } },
      { label: 'Dejar una ofrenda (20 de oro)', cost: { gold: 20 }, effects: { gold: -20, rep: 8 } },
    ],
  },
  {
    id: 'banquete',
    when: { region: ['sultan'] },
    weight: 1.2,
    text: 'Un visir del sultán te invita a un banquete en su palacio. Buena ocasión para hacer contactos.',
    options: [
      { label: 'Ir al banquete (+1 día)', spareDays: 1, effects: { delay: 1, rep: 10, reveal: 1 }, stat: 'banquets',
        winText: 'Entre bandejas de dulces te contaron precios y chismes de la corte.' },
      { label: 'Mandar un regalo (30 de oro)', cost: { gold: 30 }, effects: { gold: -30, rep: 6 } },
      { label: 'Excusarse', effects: { rep: -3 } },
    ],
  },
  {
    // Sabotaje de Kasim: sólo sale si le sacás mucha ventaja (ver `rivalBehind`).
    id: 'matones-kasim',
    when: { rivalBehind: true, notTerrain: ['mar'] },
    weight: 1.2,
    text: 'Tres matones te cortan el paso. "Saludos de Kasim", dice uno. Quieren $toll de oro para dejarte seguir.',
    setup: (game) => ({ toll: Math.max(30, Math.round(cargoBase(game.state) * 0.1 + 20)) }),
    options: [
      { label: 'Pagarles ($toll)', cost: { gold: '$toll' }, effects: { gold: '-$toll' } },
      { label: 'Pelear', chance: 'fight', win: { rep: 6, morale: 8 }, lose: { cargoPct: 0.2, morale: -8 },
        winText: 'Salieron corriendo. Kasim se va a enterar.', loseText: 'Te dieron una paliza y se llevaron carga.' },
      { label: 'Dar un rodeo (+1 día)', spareDays: 1, effects: { delay: 1 } },
    ],
  },
  {
    id: 'pastor',
    when: { region: ['desierto'], terrain: ['arena', 'piedra'] },
    weight: 1,
    text: 'Un pastor de cabras te cuenta de un oasis escondido entre las dunas.',
    options: [
      { label: 'Pagarle por el dato (15 de oro)', cost: { gold: 15 }, effects: { gold: -15, water: 15, food: 4 },
        winText: 'Era cierto: agua y dátiles para el camino.' },
      { label: 'Agradecerle y seguir', effects: {} },
    ],
  },
];
