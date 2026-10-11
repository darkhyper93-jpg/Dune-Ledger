# Dune Ledger: documento de diseño

*Oct 11, 2026 · @Santi*

Dune Ledger es un juego de comercio para el celular: guiás una caravana por el desierto, comprás barato, vendés caro y tenés 60 días para pagarle tu deuda al Gremio de Mercaderes. Este documento es la guía completa para que Claude Code lo construya.

> Las decisiones tomadas donde este documento deja algo abierto están en `docs/DECISIONES.md`.

## La idea en corto

Dune Ledger es un roguelite de comercio por turnos que se juega con una mano. Cada partida es una temporada de 60 días: arrancás con una caravana chica, poco oro y una deuda con el Gremio.

- **Nombre:** Dune Ledger ("el libro de cuentas de las dunas"), en inglés como Scrap Nova. Toda la interfaz va en castellano rioplatense (vos, tenés, tocá).
- **Para quién:** chicos y adolescentes que juegan en el celular en ratos cortos. Es un proyecto escolar: tiene que poder mostrarse en clase.
- **Plataforma:** página web instalable (PWA), en vertical, que funciona sin internet. También se juega en la compu.
- **Duración:** una temporada dura entre 15 y 25 minutos. Se guarda sola después de cada acción, así que se puede cortar en cualquier momento.
- **Por qué atrapa:** cada decisión tiene un riesgo visible ("¿cargo más seda y me arriesgo a los bandidos?"). Los precios cambian y hay que leer el mercado. Cada temporada el mapa es distinto. Entre partidas se desbloquean mercaderes y mejoras. Un desafío diario con la misma semilla permite competir con amigos.
- **Diferencia con Scrap Nova:** no hay reflejos. Todo es por turnos y gana el que mejor piensa.

## Una partida paso a paso

El juego avanza por días y nada pasa mientras el jugador no toca nada.

1. Empezás en una ciudad al azar con 2 camellos (40 de carga), 300 de oro, 10 días de comida y de agua, y una deuda de 1.500 de oro con el Gremio.
2. En la ciudad podés comprar y vender en el mercado, cargar comida y agua, contratar tripulación, comprar camellos, aceptar contratos y escuchar rumores.
3. Elegís un destino en el mapa. Antes de salir se ve cuántos días tarda, cuánta comida y agua gasta y qué tan peligrosa es la ruta.
4. Viajás. Durante el viaje sale un evento más o menos cada 3 días, y algunos te hacen elegir.
5. Llegás, vendés y volvés al paso 2.
6. Los días 20, 40 y 60 el Gremio cobra una cuota. Si no podés pagar, hay castigo; con dos cuotas impagas, perdés.
7. El día 60 termina la temporada. El puntaje es el oro neto, y con él ganás Sellos para mejoras permanentes.

**Regla de diseño:** el jugador siempre ve lo que arriesga antes de decidir (precios, días, probabilidades). Nunca pierde por una sorpresa que no pudo ver venir.

## El mapa y los viajes

Cada temporada genera un mapa nuevo a partir de una semilla: 12 a 16 ciudades, cada una con 2 a 4 rutas, y siempre se puede llegar a todas (comprobarlo al generar; si no, regenerar).

**Tipos de ciudad.** Cada tipo produce algunos bienes (ahí son baratos) y consume otros (ahí son caros):

- **Puerto:** produce té, especias, seda y perlas.
- **Oasis:** produce dátiles e incienso; agua gratis.
- **Minera:** produce sal, metal y armas.
- **Ciudad santa:** produce libros; paga bien el incienso. Las armas están prohibidas.
- **Capital:** no produce casi nada y paga caro casi todo. Tiene el Gremio.
- **Aldea:** produce lana y cerámica; compra armas y metal.

**Rutas.** Cada ruta tiene un terreno (arena, piedra, montaña o río), dura de 1 a 5 días y tiene un peligro bajo, medio o alto. El peligro sube la probabilidad de eventos malos; el terreno cambia cuánta agua se gasta (arena más, río casi nada) y cuánto se cansan los camellos (montaña más).

**Niebla.** Al empezar sólo se conocen la ciudad inicial y sus vecinas. Al llegar a una ciudad se descubren sus rutas y sus vecinas. Los precios de una ciudad se conocen sólo si estuviste ahí o si alguien te los contó (taberna, explorador), y se muestran con el día en que los viste: "precios de hace 6 días".

**Lugares especiales** que aparecen sobre las rutas o como paradas cortas:

- **Oasis en ruta:** rellena el agua gratis.
- **Ruinas:** botín al azar con riesgo (ver Eventos).
- **Bazar nómada:** aparece unos días en un lugar y vende algo raro.
- **Puesto del Gremio:** se pueden pagar cuotas de la deuda sin ir a la capital.

**Consumo.** Por cada día de viaje se gasta 1 de comida y 1 de agua por cada 2 personas o animales (redondeando hacia arriba). Sin comida baja la moral; sin agua los camellos se cansan y se pierde carga de a poco (la que no se puede llevar se deja en el camino). Antes de salir, la pantalla muestra cuánta comida y agua hace falta para esa ruta, y avisa en rojo si no alcanza.

## La economía

El corazón del juego. Doce bienes, cada uno con un precio base, un peso (lugares de carga que ocupa cada unidad) y dónde conviene comprarlo y venderlo:

| Bien | Precio base | Peso | Barato en | Caro en | Nota |
|---|---|---|---|---|---|
| Sal | 8 | 2 | Minera | Puerto, Capital | |
| Dátiles | 6 | 1 | Oasis | Minera | Pierden 5% de valor por día |
| Lana | 10 | 2 | Aldea | Puerto | |
| Cerámica | 14 | 2 | Aldea | Capital | Frágil: puede romperse en montaña o tormenta |
| Té | 18 | 1 | Puerto | Santa, Minera | |
| Metal | 20 | 2 | Minera | Capital, Aldea | |
| Incienso | 30 | 1 | Oasis | Santa | |
| Especias | 35 | 1 | Puerto | Capital | |
| Libros | 45 | 1 | Santa | Capital | |
| Seda | 60 | 1 | Puerto | Capital | |
| Armas | 70 | 2 | Minera | Aldea | Ilegales en la ciudad santa |
| Perlas | 120 | 0 | Puerto | Capital, Santa | No ocupan lugar, pero atraen bandidos |

**Fórmula del precio** (de venta, en una ciudad, para un bien):

```
precio = base × modCiudad × ruido × (1.5 − stock / 100)
```

- **modCiudad:** 0.6 si la ciudad lo produce, 1.6 si lo consume, 1 si ninguna.
- **ruido:** entre 0.9 y 1.1, fijado por la semilla para cada ciudad y bien.
- **stock:** de 0 a 100, normal 50. Comprar baja el stock y vender lo sube, así que cada unidad que comprás sale un poco más cara y cada una que vendés paga un poco menos. Cada día el stock vuelve un 5% hacia lo normal.
- Comprar cuesta un 10% más que el precio de venta del momento.

Antes de confirmar, la pantalla muestra el precio unidad por unidad y el total, para que el jugador vea que inundar un mercado no conviene.

**Noticias de mercado.** Cada 7 a 10 días pasa algo: "sequía en el oeste: el agua y los dátiles se pagan el doble", "llegó un barco de seda: la seda vale la mitad en los puertos". Primero llegan como rumor a la taberna (puede ser falso) y unos días después se confirman. Duran entre 5 y 15 días.

**Reglas que la economía tiene que cumplir** (cada una con su prueba):

1. Ningún precio es negativo, cero ni infinito; siempre entre 20% y 300% del base.
2. Siempre existe al menos una ruta con ganancia razonable desde cualquier ciudad.
3. Ninguna ruta repetida para siempre gana sin límite: el stock la va agotando.

## La caravana

Recursos que se ven siempre: oro, comida, agua, carga usada / carga máxima, salud de los camellos y moral de la tripulación.

**Camellos.** Cada uno lleva 20 de carga. Cuestan entre 80 y 120 de oro según la ciudad (en las aldeas y oasis son más baratos). Máximo 10. Cada camello tiene salud: baja con viajes largos, montañas y falta de agua; se recupera descansando un día en una ciudad. Un camello con salud 0 muere y su carga queda en el camino si no entra en los otros.

**Tripulación.** Hasta 5 personas, contratadas en la taberna. Cada una tiene un rol:

| Rol | Qué hace |
|---|---|
| Guía | Las rutas duran 1 día menos (mínimo 1); menos tormentas perdidas |
| Guardia | Mejora la chance de ganar contra bandidos |
| Cocinero | Se gasta un 25% menos de comida |
| Contable | Compra un 5% más barato y vende un 5% más caro |
| Curandero | Los camellos y la tripulación se recuperan el doble |
| Explorador | Muestra los precios de las ciudades vecinas y descubre ruinas |

Y un rasgo que le da personalidad:

- **Valiente:** +moral en peleas, pero a veces se mete en problemas.
- **Codicioso:** pide más sueldo; puede robar un poco si la moral baja.
- **Charlatán:** trae rumores extra de la taberna (algunos falsos).
- **Dormilón:** a veces la caravana pierde medio día.
- **Leal:** nunca se va, aunque la moral esté baja.

**Sueldos y moral.** Se paga un sueldo cada 7 días. Si no se paga, o se pasa hambre o sed, baja la moral; con moral baja la gente se va al llegar a una ciudad. Ganar peleas, descansar y vender con mucha ganancia suben la moral.

**Experiencia.** Cada tripulante sube de nivel con los días de viaje. En el nivel 3 su habilidad mejora (por ejemplo, el Cocinero pasa a ahorrar un 40%). Perder a alguien con experiencia tiene que doler.

## Eventos y decisiones

Durante cada viaje puede pasar algo (más probable en rutas de peligro alto). Un evento es una carta con un texto corto y 2 o 3 opciones; cada opción muestra su probabilidad de salir bien cuando la hay, para que la decisión sea del jugador y no de la suerte a ciegas.

| Evento | Opciones |
|---|---|
| Bandidos | Pagar peaje (seguro, cuesta oro) · Pelear (% según guardias y armas que llevás) · Huir (% según guía; si sale mal, perdés carga) |
| Tormenta de arena | Esperar (pierde 1 día y agua) · Seguir (riesgo de perder carga o un camello) |
| Oasis seco | Cavar (% de encontrar agua, cansa camellos) · Seguir con lo que hay |
| Mercader nómada | Comprar algo raro · Vender a su precio · Pasar de largo |
| Ruinas | Explorar (botín o trampa) · Mandar al explorador (más seguro) · Ignorar |
| Viajero herido | Ayudar (cuesta comida y agua, puede unirse o dar un dato) · Seguir |
| Control del sultán | Dejar revisar (multa si hay contrabando) · Sobornar · Desviarse (+1 día) |

**Contratos.** En la taberna y en el Gremio aparecen encargos: "llevá 10 de té a Kharsa antes del día 24 por 400 de oro". Pagan más que vender en el mercado, pero tienen fecha. No cumplir baja la reputación.

**Reputación** por región, de −100 a 100. Con buena reputación hay descuentos, contratos mejores y los bandidos de esa zona a veces dejan pasar. Con mala, los precios suben y los controles son más estrictos.

**Todo en datos.** Los eventos viven en `js/data/events.js`, cada uno con:

```js
{
  id: 'bandidos',
  when: { danger: ['medio', 'alto'] },   // condiciones para que aparezca
  weight: 3,                             // cuán seguido sale
  text: 'Una banda te corta el paso…',
  options: [
    { label: 'Pagar 50 de oro', effects: { gold: -50 } },
    { label: 'Pelear', chance: 'fight',  // la probabilidad la calcula una función
      win: { morale: +10 }, lose: { cargoPct: -0.3, camelHp: -20 } },
  ],
}
```

Así se pueden agregar eventos nuevos sin tocar la lógica, y las pruebas pueden recorrerlos todos para verificar que ningún efecto deja valores imposibles.

## La deuda con el Gremio

La deuda es el reloj del juego: le da a cada temporada una meta clara y tensión creciente.

En dificultad Normal se deben 1.500 de oro, en tres cuotas:

| Día | Cuota |
|---|---|
| 20 | 300 |
| 40 | 500 |
| 60 | 700 |

- Se paga en la capital o en un puesto del Gremio. Se puede adelantar.
- Si no pagás una cuota: el Gremio te embarga la carga más valiosa y la cuota pendiente sube un 50%. Dos cuotas sin pagar terminan la temporada (perdiste).
- **Préstamos:** el Gremio presta hasta 1.000 más, con un 20% de interés por cuota. Útil para arriesgar en grande; peligroso.

**Fin de la temporada** (día 60 o al pagar todo y elegir retirarse):

```
puntaje = oro + valor de la carga (a precio de la ciudad actual) − deuda que quede
sellos  = puntaje / 100 (redondeado hacia abajo)
```

Ganar la temporada (pagar toda la deuda) desbloquea la siguiente región.

**Dificultades:**

| Dificultad | Deuda | Diferencias |
|---|---|---|
| Fácil | 1.000 | Eventos más suaves |
| Normal | 1.500 | La base |
| Difícil | 2.200 | Precios más volátiles, más bandidos |
| Pesadilla | 3.000 | Se desbloquea ganando en Difícil; sin préstamos |

Más dificultad da más sellos por punto (×1, ×1,25, ×1,6, ×2).

## Progreso permanente

Lo que hace volver: entre temporadas se gastan Sellos del Gremio, la moneda permanente (el oro de la temporada no pasa a la siguiente).

**Mercaderes.** Se elige uno al empezar cada temporada; cada uno tiene una habilidad única, y los más fuertes cuestan más sellos (igual que las naves de Scrap Nova):

| Mercader | Costo | Habilidad |
|---|---|---|
| Aprendiz | Gratis | Ninguna; empieza con 2 camellos y 150 de oro |
| Contrabandista | 40 | Las armas no son ilegales para él; los controles fallan la mitad de las veces |
| Nómada | 60 | Gasta la mitad de agua; conoce todos los oasis desde el inicio |
| Banquera | 80 | Préstamos al 10%; cobra 2% de interés diario sobre el oro guardado en el Gremio |
| Negociante | 100 | Compra un 8% más barato; el stock se le recupera más rápido |
| Capitana de guardia | 120 | Empieza con 2 guardias; gana las peleas un 20% más seguido |
| Cartógrafo | 150 | Ve todo el mapa y los precios de todas las ciudades al inicio |
| Viejo Sultán | 250 | Empieza con 500 de oro y 4 camellos, pero debe el doble |

**Mejoras del Gremio** (unas 15, cada una con 3 a 5 niveles): oro inicial, carga por camello, camello inicial extra, comida y agua iniciales, descuento en la taberna, una cuota con 5 días más de plazo, un rumor verdadero garantizado por semana, guardias más baratos, etc. Ninguna rompe el juego: suman de a poco.

**Regiones**, cada una con mapa, bienes estrella y eventos propios:

1. Desierto de Sal (la inicial)
2. Estepa del Viento (caballos más rápidos pero con menos carga)
3. Costa de las Perlas (barcos: rutas por mar)
4. Montañas de Jade (rutas largas y peligrosas, el jade vale mucho)
5. Reino del Sultán (impuestos, controles y la deuda más alta)

**Logros** (unos 30) y un **códice** que se va llenando con cada bien, ciudad, evento y personaje visto. Algunos logros desbloquean mercaderes o mejoras.

## Modos

- **Temporada:** el modo principal descrito arriba. Mapa nuevo cada vez, mercader y mejoras a elección.
- **Desafío diario:** todos juegan el mismo mapa (semilla del día), con el mismo mercader y sin mejoras permanentes, para que sea justo. Al terminar se muestra un código de puntaje para compartir con amigos (por ejemplo `DL-2026-10-11-4870-a3f`), que incluye una suma de control para que no se pueda inventar a mano.
- **Libre:** sin deuda ni límite de días, para explorar y aprender la economía. No da sellos ni logros.

## Pantallas y controles

Se juega con un dedo, el celular en vertical. Todo botón mide al menos 48 px y nada importante queda en los bordes donde están los gestos del sistema.

**Barra fija arriba:** Día 23/60 · oro · comida · agua · carga 64/100 · próxima cuota: 500 el día 40.

**Pantallas:**

- **Mapa:** las ciudades conocidas y sus rutas (con días y peligro). Tocar una ciudad vecina muestra la ruta, lo que se gasta y los últimos precios conocidos; un botón grande "Viajar".
- **Ciudad**, con pestañas:
  - **Mercado:** lista de bienes con precio de compra y venta, cuánto llevás, botones − / + y Máx, y la ganancia estimada si lo vendés en la mejor ciudad que conocés.
  - **Provisiones:** comida, agua, camellos.
  - **Taberna:** rumores, contratos, tripulación para contratar.
  - **Gremio** (sólo capital o puesto): pagar cuotas, préstamos.
- **Caravana:** camellos, tripulación (rol, rasgo, nivel, moral), contratos activos.
- **Evento:** una carta grande en el centro con las opciones como botones.
- **Diario:** lo que pasó cada día (compras, ventas, eventos), útil para aprender.
- **Resumen al final:** puntaje, sellos ganados, mejor venta, ruta más rentable, logros nuevos.

**Comodidades:**

- Deshacer la última compra o venta mientras sigas en la ciudad (sin trampa: deshace exacto, stock incluido).
- Guardado automático después de cada acción: se puede cerrar la app en cualquier momento y seguir después.
- Un tutorial corto en la primera temporada que se apaga solo.

## Arte y sonido

**Arte:** geométrico y limpio, dibujado con canvas o SVG (sin imágenes externas). Paleta de arena, terracota y turquesa, con noche azul oscura para el modo oscuro. Las ciudades son siluetas simples según su tipo (cúpula para la santa, torre para la capital, palmeras para el oasis). Durante el viaje, una fila de camellos avanza por la ruta del mapa y el cielo pasa del día a la noche.

**Sonido** (todo generado con Web Audio, como en Scrap Nova):

- Monedas al vender; más agudas y más monedas cuanto más ganancia.
- Viento suave durante los viajes; más fuerte en tormentas.
- Música procedural en escala árabe (hijaz), tranquila en ciudades y más tensa cuando se acerca una cuota.
- Controles de volumen separados para música y efectos.

**Letras:** alojadas en el propio sitio (no desde Google Fonts), para que funcione sin conexión.

## Cómo construirlo

Misma forma de trabajo que Scrap Nova, que ya funcionó bien: JavaScript sin frameworks (módulos ES), canvas para el mapa, HTML/CSS para los menús, Web Audio para el sonido, y app instalable (PWA).

**Reglas de arquitectura:**

- **La simulación va separada del dibujo.** Toda la lógica (precios, viajes, eventos, deuda) vive en `js/game/` y no toca el DOM. Así se puede jugar una temporada entera en Node, sin navegador, para las pruebas y los bots.
- **Azar con semilla** (`js/core/rng.js`): la misma semilla da el mismo mapa, los mismos precios y los mismos eventos. Imprescindible para el desafío diario y para reproducir errores.
- **Contenido en datos, no en código:** `goods.js`, `cities.js`, `events.js`, `crew.js`, `merchants.js`, `upgrades.js`, `regions.js`, `achievements.js` dentro de `js/data/`.

**Estructura sugerida:**

```
dune-ledger/
  index.html  manifest.webmanifest  sw.js
  css/
  js/
    main.js
    core/    rng.js save.js audio.js updates.js
    data/    goods.js cities.js events.js …
    game/    season.js market.js travel.js events.js crew.js debt.js map-gen.js
    render/  map.js fx.js
    ui/      city.js market.js caravan.js event.js summary.js settings.js
  scripts/   gen-sw.js build-site.js
  tests/
    unit/    sim/    e2e/
```

**Lecciones de Scrap Nova que hay que aplicar desde el día 1:**

1. Validar el guardado al cargarlo: rangos, ids que existen, y rechazar claves peligrosas como `__proto__`. Lo mismo para el código de progreso (copiar y pegar todo el progreso como texto, con suma de control).
2. Guardar la temporada en curso después de cada acción, no sólo al final.
3. Service worker con la lista de archivos generada por un script y una versión que cambia sola con el contenido; descargar siempre fresco (`cache: 'reload'`); actualizarse solo cuando el jugador está en el menú; y un botón "Actualizar" en Ajustes por si algo se traba.
4. La versión que muestra Ajustes tiene que coincidir con la de `package.json` (con prueba).

**Calidad del código:**

- Archivos de menos de 400 líneas; si uno crece, se divide.
- Comentarios y docstrings en español, explicando qué hace cada archivo y cada función.
- ESLint en la integración continua.
- GitHub Actions: corre lint, pruebas unitarias y de navegador, y sólo si todo pasa publica en GitHub Pages.

## Balance y pruebas

Tres niveles de pruebas:

- **Unitarias** (`node:test`): fórmula de precios, stock, consumo, deuda y embargo, cada evento, guardado y código de progreso.
- **Simulaciones con bots:** jugadores automáticos que juegan cientos de temporadas en Node:
  - **Codicioso:** siempre busca la ruta de más ganancia que conoce.
  - **Aleatorio:** compra y viaja al azar.
  - **Prudente:** sólo rutas de peligro bajo, siempre con provisiones de sobra.
- **Navegador** (Playwright): se juega una temporada corta tocando la pantalla como una persona, en tamaño Android y iPhone, y con WebKit (Safari) en la integración continua.

**Métricas que el balance tiene que cumplir** (cada una es una prueba que falla si se rompe):

| Métrica | Objetivo |
|---|---|
| El bot codicioso paga toda la deuda (Normal) | 65–80% de las temporadas |
| El bot aleatorio paga toda la deuda | menos del 15% |
| El bot prudente paga la deuda | 40–60% (jugar seguro funciona, pero gana menos) |
| Una ruta en bucle, repetida 10 veces | nunca más de 25% de ganancia por viaje al final |
| Precios durante toda la temporada | entre 20% y 300% del base |
| Bandidos con 2 guardias, eligiendo pelear | se pierde menos del 30% de las veces |
| Duración de una temporada jugada | 15 a 25 minutos |

**Lección de Scrap Nova:** medir con partidas reales, con riesgo y eventos incluidos, y no sólo con números teóricos. Una ruta puede parecer la mejor en la planilla y ser mala porque los bandidos te sacan la mitad. Los bots tienen que vivir los eventos igual que un jugador.

## Plan por etapas

Cada etapa termina con todas las pruebas en verde y el juego publicado, así siempre hay algo jugable para mostrar.

1. **El núcleo.** Mapa generado, 8 bienes, mercado con stock, viajes con comida y agua, deuda con cuotas, fin de temporada y resumen. Bot codicioso y aleatorio. Ya se puede jugar una temporada completa.
2. **Eventos y contratos.** Las cartas de eventos desde datos, contratos de la taberna, reputación, rumores y noticias de mercado. Los 12 bienes.
3. **Caravana viva.** Camellos con salud, tripulación con roles, rasgos, sueldos, moral y niveles. Bot prudente.
4. **Progreso permanente.** Sellos, mercaderes, mejoras del Gremio, logros y códice. Código de progreso.
5. **Regiones y dificultades.** Las 5 regiones con sus bienes y eventos, y las 4 dificultades.
6. **Desafío diario y modo libre**, con código de puntaje para compartir.
7. **Pulido.** Arte final, música, animaciones, tutorial, accesibilidad y rendimiento en celulares viejos.
