/**
 * Crónicas: una historia corta por región, en tres capítulos, que avanza
 * mientras comerciás. Cada capítulo pide algo concreto y da una recompensa.
 *
 * Objetivos (goal):
 * - visit: llegar a una ciudad de un tipo (cityType).
 * - deliver: entregar `qty` de un bien en una ciudad de un tipo (desde la Taberna).
 * - pay: pagar `gold` en una ciudad de un tipo (desde la Taberna).
 *
 * Recompensas (reward): gold, rep (en la zona de esa ciudad), reveal (se ve
 * todo el mapa), mount (un animal más), heal (salud de los animales) y
 * perk 'exento' (sin impuesto a las ventas el resto de la temporada).
 */

export const CHRONICLES = {
  desierto: {
    title: 'La caravana perdida de Rashid',
    chapters: [
      {
        text: 'En la taberna te muestran una carta arrugada: la caravana de Rashid, el viejo que te enseñó el oficio, se perdió en el desierto. La última vez lo vieron cerca de un oasis.',
        goal: { type: 'visit', cityType: 'oasis' }, reward: { gold: 30 },
        done: 'En el oasis te cuentan que Rashid llegó medio muerto de sed y siguió hacia una aldea.',
      },
      {
        text: 'Rashid está en una aldea, con fiebre. El curandero dice que puede salvarlo con un remedio de especias.',
        goal: { type: 'deliver', good: 'especias', qty: 3, cityType: 'aldea' }, reward: { rep: 10 },
        done: 'Con el remedio, Rashid abre los ojos y te reconoce: "Sabía que vendrías, muchacho".',
      },
      {
        text: 'Rashid se recupera, pero el Gremio le reclama 150 de oro por la caravana perdida. Si no paga, lo meten preso.',
        goal: { type: 'pay', gold: 150, cityType: 'capital' }, reward: { gold: 230, reveal: true },
        done: 'Rashid queda libre y te regala su mapa de toda la vida: ahora conocés todo el desierto.',
      },
    ],
  },
  estepa: {
    title: 'El potro blanco',
    chapters: [
      {
        text: 'Dicen que por la estepa corre un potro blanco que nadie pudo domar. Los pastores de las aldeas saben dónde pasta.',
        goal: { type: 'visit', cityType: 'aldea' }, reward: { gold: 20 },
        done: 'Un pastor te lleva hasta el río: ahí está, blanco como la sal.',
      },
      {
        text: 'Para atraparlo hace falta un corral fuerte y herraduras. Llevá metal a una aldea.',
        goal: { type: 'deliver', good: 'metal', qty: 4, cityType: 'aldea' }, reward: { rep: 8 },
        done: 'Tres días de paciencia y el potro come de tu mano.',
      },
      {
        text: 'Presentá al potro en la Capital: el Gremio honra a quien trae un caballo así.',
        goal: { type: 'visit', cityType: 'capital' }, reward: { gold: 200, mount: 1 },
        done: 'Te dan 200 de oro… y el potro decide quedarse con vos. Uno más en la caravana.',
      },
    ],
  },
  costa: {
    title: 'El mapa del pirata tuerto',
    chapters: [
      {
        text: 'Un marinero borracho te vende medio mapa de un tesoro pirata. La otra mitad la tiene un pescador de algún puerto.',
        goal: { type: 'visit', cityType: 'puerto' }, reward: { gold: 20 },
        done: 'El pescador tiene la otra mitad, pero no la da gratis.',
      },
      {
        text: 'El pescador te cambia su mitad del mapa por té para todo el invierno.',
        goal: { type: 'deliver', good: 'te', qty: 4, cityType: 'puerto' }, reward: { rep: 6 },
        done: 'Las dos mitades encajan: la cruz marca una caleta junto a un oasis.',
      },
      {
        text: 'El mapa marca una caleta cerca de un oasis, entre palmeras. Andá a buscar el cofre.',
        goal: { type: 'visit', cityType: 'oasis' }, reward: { gold: 320 },
        done: 'Bajo la arena, un cofre con monedas de oro de otro siglo. ¡El tuerto no mentía!',
      },
    ],
  },
  jade: {
    title: 'El monje de la montaña',
    chapters: [
      {
        text: 'Un monje herido te pide que lleves su carta a la ciudad santa: anuncia que el altar del monasterio se partió.',
        goal: { type: 'visit', cityType: 'santa' }, reward: { gold: 30 },
        done: 'El abad lee la carta y suspira: hace falta jade para el altar nuevo.',
      },
      {
        text: 'El abad necesita jade para el altar. En las mineras de la montaña lo sacan.',
        goal: { type: 'deliver', good: 'jade', qty: 3, cityType: 'santa' }, reward: { gold: 560 },
        done: 'Te pagan el jade más que bien y te bendicen el camino.',
      },
      {
        text: 'Los monjes te piden un último favor: ayudar a reabrir el paso de una mina, cerrado por un derrumbe.',
        goal: { type: 'pay', gold: 100, cityType: 'minera' }, reward: { gold: 220, heal: 100, rep: 15 },
        done: 'Con el paso abierto, los mineros te reciben como a un héroe, cuidan a tus camellos y te regalan una veta de oro.',
      },
    ],
  },
  sultan: {
    title: 'El anillo del visir',
    chapters: [
      {
        text: 'El visir perdió su anillo de sello y desconfía de todos. Ofrece una recompensa a quien lo encuentre. Empezá por la Capital.',
        goal: { type: 'visit', cityType: 'capital' }, reward: { gold: 30 },
        done: 'En el palacio, un guardia te sopla que un ladronzuelo de aldea anda vendiendo un anillo.',
      },
      {
        text: 'El ladronzuelo dice saber quién tiene el anillo, pero quiere oro por el dato.',
        goal: { type: 'pay', gold: 80, cityType: 'aldea' }, reward: { rep: 6 },
        done: 'Lo tiene un joyero de la Capital, que sólo acepta pagos en incienso.',
      },
      {
        text: 'El joyero devuelve el anillo si le llevás incienso para su templo.',
        goal: { type: 'deliver', good: 'incienso', qty: 3, cityType: 'capital' }, reward: { gold: 320, rep: 15, perk: 'exento' },
        done: 'El visir recupera su sello y firma un decreto: no pagás impuestos el resto de la temporada.',
      },
    ],
  },
};

/** Cantidad de capítulos de cada crónica. */
export const CHAPTERS = 3;
