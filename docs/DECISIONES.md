# Decisiones tomadas

El documento de diseño (`docs/DISENO.md`) deja algunas cosas abiertas o con
pequeñas contradicciones. Acá se anota qué se decidió y por qué, para poder
revisarlo más adelante.

## Etapa 1 — El núcleo

### Economía

- **Los 8 bienes de la etapa 1** son sal, dátiles, lana, té, metal, incienso,
  libros y seda. Con ellos cada tipo de ciudad (salvo la Capital) produce
  algo, y desde cualquier ciudad hay un negocio. Cerámica, especias, armas y
  perlas llegan en la etapa 2 (ya están cargados en `js/data/goods.js`).
- **El stock se recupera un 3% por día, no un 5%.** Con 5% un jugador que
  adivina el mercado a la perfección saca hasta un 31% por viaje en una ruta en
  bucle, y la métrica pide como máximo 25%. Con 3% el peor caso medido es 19%.
- **Cuánto mueve el stock cada unidad** (`stockStep`) depende del bien: los
  caros mueven más. Se calibró para que el bot codicioso pague la deuda en un
  70% de las temporadas (sin calibrar ganaba el 96%).
- **Los precios por unidad van con un decimal** (por ejemplo 5,4) y el total
  de cada compra o venta se redondea a oro entero. Con precios enteros los
  bienes baratos (sal, dátiles) saltaban de a 20% y el stock no se notaba.
- Al vender se muestra la ganancia contra el **costo promedio** de lo que
  llevás de ese bien.

### Caravana y viajes

- **"10 días de comida y agua" son 20 unidades de cada una**: al empezar sos
  1 persona + 2 camellos, o sea 2 raciones por día.
- **La comida y el agua no ocupan carga.** Se pueden llevar hasta 200 de cada una.
- **Sin comida o sin agua, cada día se deja un 10% de la carga.** La moral y
  la salud de los camellos llegan en la etapa 3; hasta entonces el castigo es
  ese, y la pantalla avisa en rojo antes de salir.
- Agua por terreno: arena ×1,5, piedra y montaña ×1, río ×0,25.
- No se puede salir de viaje si se llegaría después del día 60.
- Se puede **descansar** un día en la ciudad (los mercados se recuperan).
- Los camellos se venden a la mitad de su precio, si la carga entra en los demás.

### Deuda

- **El cobrador del Gremio**: si una cuota vence sin pagar y tenés el oro, se
  cobra donde estés con un 15% de comisión. El documento sólo habla de pagar
  en la Capital o en un Puesto; agregamos el cobrador para que un chico que se
  olvidó no pierda por un descuido si tenía la plata. Pagar a tiempo en la
  Capital o un Puesto sigue conviniendo (te ahorrás el 15%).
- **Si no te alcanza**: embargo de la carga más valiosa (se descuenta su valor
  a precio base), lo que falta sube un 50% y pasa a la cuota siguiente, y
  sumás una falta. Con dos faltas termina la temporada.
- La cuota del día 60 se cobra al cerrar la temporada.
- **Ganar** es terminar con toda la deuda pagada (aunque hayas tenido una falta).
- **Puestos del Gremio**: 2 por mapa, en ciudades a dos o más rutas de la Capital.
- **Préstamos**: quedan para una etapa siguiente (la etapa 1 pide "deuda con cuotas").

### Mapa

- La Capital es la ciudad más cercana al centro. Las rutas no se cruzan ni
  pasan pegadas a otra ciudad.
- Regla "siempre hay negocio": desde cada ciudad, algún bien comprado ahí se
  vende en una vecina a 1,25 veces o más (con stock normal). Si no, se
  regenera el mapa con la misma semilla.
- El mapa se encuadra en lo que conocés y se va abriendo a medida que descubrís.

### Puntaje y progreso

- Los **sellos** se calculan y se guardan en el perfil desde ya; se gastan en
  la etapa 4. Multiplicadores por dificultad: ×1, ×1,25, ×1,6 y ×2.
- **Contradicción para la etapa 4**: el Aprendiz "empieza con 150 de oro"
  pero la partida base arranca con 300. Por ahora se usan 300.

### Pruebas

- La métrica "duración de 15 a 25 minutos" se mide indirectamente: una
  temporada del bot codicioso tiene entre 20 y 45 viajes (mediana actual: 32).
- Las métricas del bot prudente y de los bandidos con guardias se agregan en
  las etapas 3 y 2, cuando existan.
- Se puede fijar la semilla con `?semilla=abc` en la URL (útil para pruebas y
  para reproducir errores).

### Técnica

- `sw.js` no se guarda en el repositorio: `npm run build` lo genera en `_site/`
  con la lista de archivos y una versión que es el hash del contenido.
- El repositorio estaba vacío, así que la rama de trabajo quedó como rama
  principal y GitHub Pages publica desde ahí.

## Etapa 2 — Eventos y contratos

- **Reputación por zona.** El mapa de cada temporada se divide en tres zonas
  (Norte, Centro y Sur, por altura). Se llaman "zonas" para no confundirlas
  con las 5 Regiones de la etapa 5. Efectos: comprar hasta 5% más barato con
  +100 y hasta 10% más caro con −100; con 40 o más, los bandidos de la zona
  te dejan pasar 4 de cada 10 veces; el soborno en controles depende de ella.
- **Eventos**: probabilidad base 28% por día de viaje, ×0,7 en peligro bajo,
  ×1,35 en alto (≈ uno cada 3 o 4 días). Los bandidos salen el doble en
  rutas de peligro alto y más si llevás perlas. El viaje se frena hasta
  elegir; si cerrás la app en medio de un evento, al volver sigue ahí.
- **Pelear contra bandidos**: 45% + 8% por cada arma que llevás (tope 75%).
  Los guardias se suman en la etapa 3 (ahí se mide "con 2 guardias pierde
  menos del 30%").
- **Opciones que suman días** (esperar la tormenta, desviarse) se desactivan
  si te harían pasar del día 60.
- **"Mandar al explorador"** en las ruinas llega con la tripulación (etapa 3).
- **Cerámica**: además de la tormenta, en rutas de montaña cada pieza tiene
  4% por día de romperse.
- **Armas**: no se compran ni se venden en la ciudad santa; el control del
  sultán las confisca y multa.
- **Noticias**: una cada 7 a 10 días; 75% son verdad. El rumor aparece en la
  taberna 3 a 5 días antes y dura 5 a 15 días. Multiplican el precio ×2 o ×½
  (siempre dentro del 20%–300% del base).
- **Contratos**: 2 en cada taberna y 1 más del Gremio (paga mejor) en la
  Capital y los Puestos. Se renuevan cada 7 días. Pagan 1,3 a 1,6 veces lo
  que valdría la mercadería en el destino. Máximo 3 activos. Cumplir da +10
  de reputación en la zona del destino; vencerse, −15.
- **Préstamos** siguen pendientes (no estaban en el plan de la etapa 2).
- **Balance**: con eventos y contratos el bot codicioso (que acepta contratos
  hacia ciudades vecinas) paga la deuda en ~72% de las temporadas.
- Las partidas guardadas de la etapa 1 no se cargan en la etapa 2 (cambió el
  formato); hay que empezar una temporada nueva.

## Etapa 3 — Caravana viva

- **Salud de los camellos**: −3 por día de viaje (×1,6 en montaña, ×0,8 por
  el río), −15 extra por día sin agua y −5 sin comida; +25 por día de
  descanso (×2 con curandero, ×2,5 en nivel 3). A 0 el camello muere y se deja
  la carga que no entra (primero lo más barato por lugar). El último camello
  nunca muere. Al vender, se va el más cansado y vale menos.
- **Hambre y sed** cambian respecto de la etapa 1: sin agua los camellos
  sufren y se deja un 10% de la carga por día; sin comida baja la moral de la
  tripulación (−15 por día) y los camellos se cansan un poco.
- **Tripulación**: hasta 5. Se contrata en la taberna (2 o 3 candidatos que
  se renuevan cada 7 días) pagando la primera semana; después, sueldo cada 7
  días (si no alcanza, −20 de moral). Comen y toman agua como todos.
- **Roles** (nivel 1 → nivel 3): guía −1 día por ruta y +15% → +25% en
  tormentas; guardia +15% → +20% en peleas; cocinero −25% → −40% de comida;
  contable 5% → 8% en compras y ventas; curandero ×2 → ×2,5 al descansar;
  explorador trae los precios de las vecinas al llegar y puede explorar ruinas
  (85% → 95%, sin riesgo).
- **Niveles**: nivel 2 a los 8 días de viaje, nivel 3 a los 20. Si hay dos
  del mismo rol cuenta el mejor, salvo los guardias, que se suman.
- **Rasgos**: valiente (+5% en peleas, 5% de chance de pagar 15 de multa al
  llegar); codicioso (cobra 50% más y con moral < 30 roba un 5% del oro el día
  de pago); charlatán (un rumor extra por semana, mitad falsos); dormilón (10%
  de chance de salir un día tarde); leal (nunca se va).
- **Moral**: +5 por día de descanso, +10 al ganar una pelea, −10 al perderla.
  Con menos de 25, la persona se va al llegar a una ciudad (salvo los leales).
- **Balance**: para que jugar seguro "funcione pero gane menos", las rutas
  peligrosas tienen mucho más riesgo: probabilidad de evento por día 33% ×
  (0,4 bajo, 1,2 medio, 1,8 alto), bandidos el triple en peligro alto, peaje
  del 15% del valor de la carga y pelea perdida −40% de carga. Hay más rutas de
  peligro bajo (mitad o más) y el mercado es un poco más chico (stock ×1,2 por
  unidad). El contador cobra 22 por semana.
  Resultado (300 temporadas): codicioso ~74%, prudente ~46%, aleatorio 0%;
  con 2 guardias se pierde la pelea un 25% de las veces.
- **Ruta en bucle**: la ganancia por viaje ahora descuenta la comida y el agua
  de ida y vuelta (un viaje cuesta provisiones) y se mide sin noticias de
  mercado, que son externas al bucle.

## Etapa 4 — Progreso permanente

- **Aprendiz**: el diseño dice que empieza con 150 de oro, pero la partida
  base arranca con 300. Se usa 300 (si no, el Aprendiz sería peor que no
  elegir nada y el balance medido con los bots dejaría de valer).
- **Mercaderes con logro**: además de los sellos, el Contrabandista pide el
  logro «Contrabando», el Cartógrafo «Trotamundos» y el Viejo Sultán «Mercader
  de ley» (ganar 3 temporadas).
- **Capitana**: empieza con 2 guardias leales (que cobran sueldo como
  cualquiera) y suma +20% a las peleas.
- **Negociante**: el stock se recupera 1,5 veces más rápido en todo el mapa.
- **Préstamos**: hasta 1.000 en total; en cada vencimiento de cuota crecen un
  20% (10% para la Banquera). Cuentan como deuda: hay que devolverlos para
  ganar y al cerrar se cobran del oro.
- **Oro guardado**: cualquiera puede guardar oro en el Gremio (Capital o
  Puesto). Está a salvo, cuenta para el puntaje y el cobrador lo usa si falta;
  sólo la Banquera cobra 2% por día.
- **"Un rumor verdadero garantizado por semana"** se implementó como
  «Oídos en el bazar»: los rumores son verdad un 7% más seguido por nivel.
- **Mejoras**: 15, de 1 a 5 niveles (ver `js/data/upgrades.js`). La prórroga
  corre 5 días la primera cuota (y la segunda en nivel 2).
- **Códice**: bienes comerciados, tipos de ciudad visitados, eventos vividos,
  oficios y personalidades contratadas. Se va guardando mientras jugás; lo
  visto no se borra con "deshacer".
- **Código de progreso**: `DL1-<datos en base64>-<suma de control>`. Si se
  toca a mano o tiene claves peligrosas, se rechaza.
- Los bots de las métricas juegan con el Aprendiz y sin mejoras: el balance
  base no cambia.

## Rediseño visual (entre la etapa 4 y la 5)

- **Dirección**: "el libro de cuentas de una caravana". Arena tostada,
  papel de libro de cuentas y tinta índigo; turquesa para actuar, terracota
  para la marca y azafrán para el oro. Se dejó el fondo crema y la serif de
  alto contraste porque es el aspecto por defecto de muchas interfaces
  generadas y se veía genérico.
- **Tipografía**: Lilita One (gruesa, de juego) para títulos y números
  grandes; Rubik para el texto, con cifras de ancho fijo.
- **Ilustraciones propias en SVG** (sin imágenes externas): los 12 bienes
  (`js/render/goods-art.js`), una escena por tipo de ciudad y la portada
  (`js/render/scenes.js`) e íconos de interfaz (`js/render/ui-icons.js`).
- **Botones tipo ficha**: se hunden al tocarlos (borde inferior de color).
- **Nombres de ciudades** en castellano y según su tipo (puertos que suenan
  a mar, mineras a roca), así el nombre ya da una pista.

## Etapa 5 — Regiones y dificultades

- **Regiones en datos** (`js/data/regions.js`): cada una cambia el mapa
  (terrenos, peligro, distancias, puertos), la montura, impuestos o deuda
  y el peso de algunos eventos. Se abren en orden ganando una temporada en
  la anterior. El mapa del Desierto es el mismo que antes para la misma semilla.
- **Estepa**: caballos que cargan 12 (un camello carga 20) y hacen las rutas
  en el 80% de los días. Con 14 de carga y 70% de días el juego quedaba muy
  fácil (89% para el bot codicioso, 50 viajes).
- **Costa**: al menos 4 puertos; entre dos puertos la ruta es por mar (un
  día menos, poco gasto de agua, sin cansar a los camellos), con piratas y
  calma chicha en vez de bandidos, tormentas de arena o nómadas.
- **Montañas de Jade**: casi todo montaña (cansa más a los camellos) y más
  peligro. El jade (base 150, peso 1) sólo existe en esta región: se saca en
  las mineras y se paga en la Capital y las ciudades santas.
- **Reino del Sultán**: deuda ×1,2, 5% de impuesto a cada venta, controles
  el doble de seguido y un recaudador que cobra el diezmo del camino. Con
  deuda ×1,3 y 10% de impuesto el bot codicioso ganaba sólo 29%.
- **Eventos nuevos**: piratas y calma chicha (mar), estampida (Estepa),
  avalancha (Jade, montaña) y recaudador (Sultán).
- **Balance por región** (decisión propia, sin mejoras ni mercader): el
  codicioso tiene que ganar entre 40% y 85% en cada región, con 15 a 45
  viajes. Hoy: Estepa 80%, Costa 76%, Jade 54%, Sultán 55%. Las regiones
  del final son más difíciles a propósito: se llega a ellas con mejoras.
- **Dificultades**: Fácil baja 30% la chance de evento por día. Difícil y
  Pesadilla tienen "vaivén" de precios: cada bien en cada ciudad sube o
  baja hasta 15% cada 5 días (fijo dentro de esos 5 días, para que
  descansar no sirva para tirar el dado), y 50% más de bandidos y piratas.
  Pesadilla además no deja pedir préstamos y se abre ganando en Difícil.
  Orden comprobado con bots: Fácil 89% > Normal 70% > Difícil 44% >
  Pesadilla 25%.
- **Partidas viejas**: una temporada guardada con la versión anterior se
  carga en el Desierto (se le agrega el jade vacío y se descarta deshacer).
- **Montura en los textos**: donde decía "camellos" ahora dice la montura
  de la región ("caballos" en la Estepa).

## Etapa 6 — Desafío diario y modo libre

- **Fecha del desafío**: el día local del celular (AAAA-MM-DD). La semilla
  es `diario-<fecha>`; siempre en el Desierto, en Normal, con el Aprendiz
  y sin mejoras.
- **Una partida oficial por día**: la primera que se termina es la que
  cuenta (suma sellos y logros y queda como tu resultado del día). Se puede
  volver a jugar, pero esas partidas son de práctica: no suman nada ni
  cambian el resultado. Así no se pueden juntar sellos repitiendo un mapa
  conocido.
- **Código de puntaje**: `DL-<fecha>-<puntaje>-<3 letras de control>`. Un
  puntaje negativo se muestra como 0. En el menú del desafío se puede
  pegar el código de un amigo: dice si es válido y quién ganó ese día.
- **Modo libre**: sin cuotas ni préstamos, sin límite de días (tope técnico
  de 999) y con un botón para terminar cuando quieras. No suma sellos,
  logros ni temporadas; lo visto sí entra al códice.
- **Partidas guardadas**: el formato pasa a la versión 4 (con el modo);
  las de las versiones 2 y 3 se migran solas (`js/game/migrate.js`).

## Etapa 7 — Pulido

- **Tutorial**: un consejo por vez en la ciudad o el mapa (comprar, cargar
  provisiones y salir, elegir ruta, vender, la deuda). Avanza solo cuando
  hacés lo que pide, se puede saltear y no vuelve a aparecer.
- **Música**: generada con Web Audio, sin archivos: bordón grave, un laúd
  que improvisa en escala hiyaz sobre re y pandero con ritmo maqsum a 84
  por minuto. Se calla con la app en segundo plano y respeta su volumen.
- **Animaciones** (sólo las que responden a algo que hiciste): fundido corto
  al cambiar de pantalla, la carta del evento que se "reparte", cuánto
  cambió el oro arriba y el sello "Saldado" al ganar. Con "reducir
  movimiento" del sistema no se animan.
- **Accesibilidad**: prueba con axe (WCAG 2.1 AA) de todas las pantallas
  principales en modo claro y noche. Se oscureció el turquesa del modo claro
  (#0B6E6C) para llegar a 4,5:1 de contraste en textos chicos.
- **Rendimiento**: prueba con el procesador 6 veces más lento: abrir en
  menos de 3 s, empezar una temporada (que genera todo el mapa) en menos de
  600 ms y cualquier otro toque en menos de 400 ms. Los dibujos SVG se leen
  una sola vez y se clonan; las filas fuera de pantalla no se dibujan hasta
  verlas.
- **Mapa**: el círculo de días de cada ruta se corre para no tapar nombres
  ni ciudades, los nombres tienen un borde para leerse sobre las rutas y el
  mapa no se acerca tanto con pocas ciudades conocidas.

## Contenido nuevo (después del plan)

- **Eventos**: 11 más (24 en total). Comunes: espejismo, pata herida,
  peregrinos, mercado negro, pozo viejo y fogón compartido. Regionales
  (en `js/data/events-regional.js`): niebla en el mar, lobos en la Estepa,
  monasterio en las Montañas de Jade (compra jade y deja descansar), banquete
  del visir en el Reino del Sultán y un pastor en el Desierto. Efecto nuevo
  `heal` (los animales recuperan salud) y campo `stat` para contar logros
  desde los datos.
- **Caravana rival** (idea propia): Kasim «el Zorro» recorre el mismo mapa
  con unos 32 de carga. Al salir de una ciudad compra el bien con mejor
  margen hacia una vecina y al llegar lo vende, así que mueve el stock como
  un jugador: donde compra sube el precio y donde vende baja. Descansa 2
  días en cada ciudad. Es temerario: prefiere rutas de peligro medio y alto,
  porque si competía por las rutas seguras el bot prudente caía a 40%. Usa
  su propio azar, así que no cambia tus eventos. En la Taberna se cuenta por
  dónde anda si está a una ruta de distancia, también se ve en el mapa, y al
  final del resumen se compara su oro con tu puntaje. La prueba del bucle lo
  excluye, igual que las noticias, porque mide sólo cómo se agota el stock.
  Los bots usan sus noticias para no ir a vender adonde él llega primero.
- **Logros**: 15 más (45). Ganar en cada región, en Difícil, en Pesadilla y
  en las cinco regiones; ganar un desafío; ganarle a Kasim (y por el doble);
  y uno por cada evento nuevo importante. El perfil guarda en qué regiones
  ganaste (`wonIn`).
- **Mercaderes**: Espía del Gremio (110 sellos, pide ganarle a Kasim): sabe
  siempre dónde anda el rival y sus rumores son verdad un 15% más seguido.
  Caravanero (140, pide ganar en la Estepa): +5 de carga por animal y se
  cansan un 30% menos.
- **Escenas por región**: el fondo de cada ciudad cambia con la región
  (dunas, pastos con nubes de viento, mar con velero, picos nevados o el
  cielo violeta con luna del sultán).
- **Balance con todo esto** (300 temporadas, Normal): codicioso 76,7%,
  prudente 43,7%, aleatorio 0%.
