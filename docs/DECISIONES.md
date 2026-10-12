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

## Crónicas, noticias y bazar

- **Crónicas** (`js/data/chronicles.js`): una historia por región en tres
  capítulos («La caravana perdida de Rashid», «El potro blanco», «El mapa
  del pirata tuerto», «El monje de la montaña» y «El anillo del visir»).
  Cada capítulo pide llegar a un tipo de ciudad, entregar mercadería o pagar
  algo, y da una recompensa: oro, reputación, el mapa entero, un animal más,
  curar a los animales o, en la del sultán, no pagar impuestos el resto de la
  temporada. Se sigue desde la Taberna. Los bots no las juegan, así que no
  cambian las métricas. Dos logros más (47): terminar una crónica y
  terminar las cinco (el perfil guarda cuáles terminaste).
- **Noticias**: 6 más; 4 de ellas salen sólo en su región (feria de caballos
  en la Estepa, naufragio en la Costa, templo de jade, cumpleaños del sultán).
- **Bazar de equipo** (`js/data/gear.js`): 6 objetos que se compran una vez
  por temporada en ciertos tipos de ciudad: lámpara (+12% en tormentas),
  brújula (+12% al huir), toldo (+50% de curación al descansar), cofre (−40%
  de carga perdida en eventos), catalejo (precios de una vecina al llegar) y
  amuleto (+4% en todo lo que depende del azar). Los bots no compran equipo.
- **Partidas viejas**: crónica y equipo arrancan vacíos si faltan; no hizo
  falta cambiar la versión del formato.
- `validate.js` se partió: las piezas básicas y las partes chicas (rival,
  crónica, equipo) están en `validate-parts.js`.

## Versión 1.0 — correcciones, Kasim, inversiones, clima, comodidades y ranking

- **Aviso abajo**: los avisos salen sobre la barra de navegación y nunca
  tapan el oro ni la cuota. Consejos de una sola vez para Kasim, crónicas,
  bazar, inversiones y clima (el perfil recuerda cuáles viste).
- **Bots con extras** (`tests/sim/bot-extras.js`): compran equipo y siguen la
  crónica (guardando lo que hay que entregar). Prueba nueva: con extras no se
  gana más de 15 puntos por encima del bot base en ninguna región, y cada
  crónica se termina en al menos 6 de 30 temporadas. Con esto se ajustaron
  recompensas de crónicas (ningún capítulo da pérdida) y precios del equipo.
- **Gráfico del resumen**: patrimonio (oro + guardado + lo que pagaste por la
  carga + la mitad de lo invertido − deudas) contra el oro de Kasim, día a
  día (hasta 120 días). Colores validados con el script de la guía de
  visualización para modo claro y noche; leyenda, etiquetas directas,
  cursor con tooltip, flechas del teclado y tabla. El perfil guarda las
  últimas 12 temporadas (se ven en Logros).
- **Tratos con Kasim**: el día que sale de tu ciudad podés comprarle lo que
  cargó (+20% sobre lo que pagó) o apostar 60 a que llegás antes a su
  destino (paga el doble; si llegan el mismo día, gana él). Si le sacás la
  mitad más y 400 de oro, puede mandarte matones.
- **Inversiones**: 3 niveles por ciudad (120, 200, 320). Cada nivel da 3% de
  descuento al comprar ahí y +50% de reposición del mercado, y suma 4 de
  reputación. Al final cuentan la mitad de lo invertido.
- **Clima**: templado (más probable), tormentas, sequía, cosecha y ferias
  (+10%). Se elige por la semilla. Con los climas, la Costa quedaba en 86%:
  las rutas por mar ya no acortan un día y los piratas salen un poco más.
- **Comodidad**: texto grande y muy grande con `zoom` en todo menos el mapa y
  el viaje (en el canvas el zoom desalinearía los toques); alto contraste;
  vibración (Android) al vender con ganancia, en eventos y al ganar.
- **Ranking online del desafío** (Supabase, proyecto `dune-ledger` en São
  Paulo, plan gratis: se pausa tras una semana sin uso). Tabla
  `daily_scores` con RLS: el público sólo puede leer y agregar (sin cambiar
  ni borrar). La base exige el apodo con letras y números (3 a 16), el
  puntaje entre 0 y 100.000, el código de puntaje que corresponde, la fecha
  de hoy (±1 día) y una sola fila por dispositivo y día; el id del
  dispositivo no se puede leer. Se publican sólo el apodo y el puntaje.
  Limitación honesta: alguien que lea el código del juego podría inventar un
  puntaje creíble; para evitarlo haría falta validar la partida en un
  servidor. La clave publicable va sólo en el encabezado `apikey` (como
  Bearer la rechazaría Supabase). Las pruebas usan un servidor simulado.
  Para probarlo de punta a punta se activó `pg_net` en la base; después se
  desactivó desde el panel y se borraron las filas de prueba.

## Versión 1.1 — la luna y la marcha nocturna

- **La luna** da una vuelta cada 28 días; la fase del día 1 sale de la
  semilla (no se guarda nada nuevo: se calcula). Ocho nombres de fase.
- **Marcha nocturna**: sólo por arena o piedra (de noche, río, mar y montaña
  no). Se gasta la mitad del agua (con 60% el redondeo hacia arriba se comía
  el ahorro en caravanas chicas) y los camellos se cansan 1 punto más por
  día. Al salir se tira si la caravana se pierde (+1 día, sólo si entra en
  la temporada): 5% con luna llena y 40% sin luna; el guía y el astrolabio
  dividen cada uno la chance por dos. Sin luna también hay menos bandidos
  (35% de los de día, hasta 100% con luna llena): oscuridad = sigilo pero
  riesgo de perderse; luz = rumbo seguro pero te ven.
- La elección se recuerda entre hojas de ruta (sólo en la sesión).
- El bot con extras marcha de noche cuando la chance de perderse es menor
  al 15%; el balance de extras casi no cambia (±5 puntos por región).
- **Pruebas que no tocan la base real**: en WebKit el servidor simulado del
  ranking no atendía los pedidos (con el service worker activo Playwright
  no los ve) y una corrida de CI publicó 4 filas «La Zorra» en la base real
  del día. Ahora, con `navigator.webdriver`, el juego le habla a
  `ranking.invalid`; las pruebas del ranking bloquean el service worker y
  fallan si algún pedido sale hacia supabase.co. Las filas de prueba se
  borraron a mano desde el panel (la herramienta de la base se cuelga con
  sentencias que borran).

## Versión 1.2 — el libro mayor

- **Dónde vive**: en `state.stats.ledger`, así deshacer una compra o venta
  borra también su asiento (deshacer ya restaura las estadísticas). Todo lo
  que no es comercio de mercado vacía la pila de deshacer, así que no hay
  asientos que queden colgados.
- **Cuentas**: por bien, cantidad y oro comprado y vendido y la ganancia de
  lo vendido (con el costo promedio que ya se llevaba). Aparte, provisiones,
  animales (compra y venta), sueldos (incluida la primera semana al
  contratar), pagos al Gremio (también lo que cobra el cobrador, sólo la
  parte que sale de la bolsa) y equipo e inversiones.
- **"Camino, contratos, banco y otros"** no se anota: es la diferencia entre
  el oro de hoy y el inicial menos todas las cuentas. Así el libro siempre
  cierra con el oro de la barra sin instrumentar cada evento.
- El oro inicial se anota después de los arreglos de inicio (mercader y
  mejoras). Una partida vieja sin libro arranca uno vacío sin oro inicial y
  no muestra "otros" (no se puede saber).
- **Diseño**: la única nota fuerte de la pantalla es el papel: renglones
  finos, el margen rojo y la doble raya de cierre de los libros de
  contabilidad; columnas Debe y Haber con números tabulares. Las ganancias
  llevan signo (+/−) además del color.

## Seguridad del ranking (ajuste)

- **Permisos mínimos**: el público sólo puede leer `id, day, nickname, score,
  code, created_at` e insertar `day, nickname, score, code, device`. No puede
  leer `device`, ni poner la fecha de alta, ni cambiar o borrar filas. RLS
  activo en todas las tablas.
- **Límite de pedidos** (trigger `private.limit_score_inserts`, antes de cada
  alta): por IP, 5 puntajes cada 10 minutos y 20 por hora; en total, 120 por
  minuto. Pasado el límite responde 429 y el juego avisa "probá de nuevo en
  unos minutos" sin marcar el puntaje como publicado. La IP sale de
  `cf-connecting-ip` (la pone Cloudflare) y se guarda sólo como hash en
  `private.score_attempts` (esquema sin acceso público, con RLS y sin
  políticas a propósito); los intentos de más de un día se borran solos.
- La fecha de alta (`created_at`) la pone la base, así nadie la puede usar
  para esquivar el límite global ni el desempate del ranking.
- Probado con una transacción que se deshace: 5 altas aceptadas y la sexta
  rechazada con PT429; no quedó ninguna fila.

## Versión 1.3 — correcciones de la revisión de diseño

Una revisión externa encontró con bots que **no comprar camellos y pedir el
préstamo máximo ganaba el 96,5%** de las temporadas en Normal, y que agrandar
la caravana bajaba el puntaje. Lo reprodujimos con las mismas semillas
(`probe-0` a `probe-199`): mismo 71,5% → 96,5%. Cambios, medidos con bots:

- **Bot explotador como techo** (`tests/sim/bots.js`, perfil `exploit`: 2
  camellos y todo el préstamo hasta el día 40, devolviéndolo cuando le sobra)
  y `tests/sim/ceiling.test.js`: ninguna estrategia simple gana más del 90% en
  Normal; el préstamo suma a lo sumo 5 puntos; con 4 camellos la mediana
  supera a la de 2.
- **Préstamo con costo real**: 2% por día sobre lo que se debe (interés
  compuesto; la Banquera, 1%) y presta hasta tu oro propio (mínimo 100, tope
  1.000). Con 3% el préstamo ya restaba; con 1% seguía siendo casi gratis
  (95%). El banco muestra cuánto devolvés por cada 100 a los 7, 14 y 30 días,
  y el libro mayor separa el préstamo de los intereses pagados.
- **Que la carga importe**: el límite no era la carga sino lo poco que
  aguanta cada mercado. `stockImpact` baja de 1,2 a 0,9 (mercados más
  profundos) y los animales cuentan en el patrimonio y el puntaje por lo que
  te darían al venderlos (50 cada uno sano): comprar uno ya no es oro tirado.
- **Cuotas que suben** para compensar: Normal 300 / 600 / 1.000 (antes
  300 / 500 / 700); Fácil 200 / 400 / 650; Difícil 450 / 900 / 1.400;
  Pesadilla 600 / 1.200 / 1.850. La Costa sube su deuda un 10% (con mercados
  más profundos las perlas la volvían demasiado fácil).
- **Renegociar** (`js/game/renegotiate.js`): una vez por temporada, desde 7
  días antes de una cuota que no sea la última, pasa a la siguiente con 25% de
  recargo y sin falta. Salida para el que viene mal.
- **Gran Feria** (`js/game/fair.js`): el día 40 se anuncia una ciudad que, del
  55 al 60, paga ×2,2 por un bien que no produce (el precio sigue con su tope
  de 300% del base). Le da un objetivo al final.

Resultado con las semillas de las métricas (300 temporadas): codicioso 77,3%,
prudente 43,3%, aleatorio 0%, explotador 83,5% (antes 96,5%); el cuarto que
peor arranca (patrimonio al día 15) gana alrededor del 52% (antes 44%).
- **Pagar a bandidos o piratas** da un salvoconducto de 7 días sin ellos
  (`safeUntil`): pagar compra tranquilidad, como un seguro. El bot que elige
  por valor esperado ahora paga cuando lleva mucha carga por peligro alto y
  huye con poca carga.
- **Perlas**: siguen sin ocupar lugar, pero su mercado es más fino
  (`stockStep` 6 → 8) y aparece un ladrón de perlas en cualquier ruta, incluso
  segura, más seguido cuantas más llevás (si sale mal, se lleva la mitad). Su
  parte de la ganancia del bot bajó de 22% a 18% en el Desierto (22% en la
  Costa, donde son el bien estrella).
- **Pedidos grandes del Gremio**: los contratos del Gremio piden 40 a 64
  lugares de carga. Con eso, 2 camellos pasó a ser lo peor: mediana ~2.990
  contra 3.200–4.000 con 3 o 4 (antes, más camellos siempre bajaba el
  puntaje). La Estepa sube su deuda un 10%.
- **Kasim compite**: antes arrancaba con 400 y terminaba con una mediana de
  634 (ganarle era lo mismo que ganar la temporada). Ahora empieza con dos
  camellos como vos, compra uno más cuando su carga viene llena, sólo carga
  mientras cada unidad le deja ganancia en el destino, no gasta su reserva,
  descansa un día por ciudad, prefiere ir adonde van tus contratos y a la
  Gran Feria, y por temerario a veces lo asaltan (pierde media carga). Su
  patrimonio cuenta sus camellos, como el tuyo. Resultado: mediana ~1.600 y
  el codicioso le gana en el 60% de las temporadas mientras gana la suya en
  el 76%: ganarle a Kasim pasó a ser una meta aparte (prueba en
  `tests/sim/ceiling.test.js`). El criterio de "70–110% de tu patrimonio" no
  sirve: el puntaje del jugador varía demasiado (de −1.000 a +4.000).
- Pesadilla quedó más dura (el codicioso gana ~20%, antes ~36%): es el modo
  para quien ya ganó en Difícil.
