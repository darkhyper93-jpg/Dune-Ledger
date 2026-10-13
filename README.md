# Dune Ledger

Juego de comercio con caravanas para el celular. Guiás una caravana por el
desierto: comprás barato en un pueblo, vendés caro en otro y tenés 60 días
para pagarle tu deuda al Gremio de Mercaderes. Todo es por turnos: gana el que
mejor piensa.

Es una página web instalable (PWA) que funciona sin internet, en vertical y
con un solo dedo. También se juega en la compu.

## Estado

**Versión 1.0** (el plan del documento de diseño está completo, con contenido extra) (ver `docs/DISENO.md`, "Plan por etapas").

Se juega en https://darkhyper93-jpg.github.io/Dune-Ledger/

- Etapa 1: mapa generado por semilla con niebla, mercado con stock, viajes
  con comida y agua, deuda con cuotas, cobrador y embargo, fin de temporada
  con puntaje y sellos. Bots codicioso y aleatorio para medir el balance.
- Etapa 2: los 12 bienes, eventos de viaje desde datos (`js/data/events.js`)
  con probabilidades visibles, contratos de taberna y Gremio, reputación por
  zona, rumores y noticias de mercado. Los bots viven los eventos.
- Etapa 3: salud de cada camello, tripulación con roles (guía, guardia,
  cocinero, contable, curandero, explorador), rasgos, sueldos semanales,
  moral, deserciones y niveles. Bot prudente.
- Etapa 4: sellos del Gremio, 8 mercaderes, 15 mejoras, préstamos y oro
  guardado, 30 logros, códice y código de progreso para copiar y pegar.
- Etapa 5: 5 regiones (Desierto, Estepa a caballo, Costa con rutas por mar,
  Montañas de Jade y Reino del Sultán) con mapa, bien estrella y eventos
  propios, que se abren ganando la anterior; 4 dificultades (Fácil, Normal,
  Difícil con precios que cambian cada semana, y Pesadilla sin préstamos).
- Etapa 6: desafío del día (mismo mapa para todos, con código de puntaje
  para compartir y comparar) y modo libre (sin deuda ni límite de días).
- Etapa 7: tutorial de la primera temporada, música de caravana generada en
  el momento, animaciones que responden a lo que hacés, accesibilidad
  revisada con axe (modo claro y noche) y prueba de rendimiento con el
  procesador 6 veces más lento.
- Contenido extra: 24 eventos, la caravana rival de Kasim «el Zorro», 10 mercaderes y escenas de ciudad distintas en cada región.
- Crónicas: una historia de tres capítulos por región que avanza mientras
  comerciás; bazar de equipo con 7 objetos.
- Versión 1.0: tratos y apuestas con Kasim, inversiones en ciudades, clima
  de temporada, gráfico de tu patrimonio contra Kasim e historial, ajustes de
  comodidad (texto grande, alto contraste, vibración), ranking online del
  desafío del día y 50 logros.
- Versión 1.1: la luna y la marcha nocturna. Por arena o piedra se puede
  salir de noche: se gasta la mitad del agua, pero sin luna es fácil
  perderse (aunque los bandidos tampoco te ven). Astrolabio en el bazar y el
  logro «Hijo de la luna».
- Versión 1.2: el libro mayor. En el Diario, una página de libro de
  cuentas con lo comprado (Debe) y vendido (Haber) de cada bien y su
  ganancia, y adónde fue el oro: provisiones, animales, sueldos, Gremio,
  equipo y lo demás, hasta el oro de hoy.
- Versión 1.3: correcciones de una revisión de diseño hecha con bots. El
  préstamo cobra 2% por día y presta hasta tu oro propio; agrandar la
  caravana rinde (pedidos grandes del Gremio, animales que cuentan como
  bienes); cuotas que suben, renegociar una vez y la Gran Feria del final;
  las cartas de evento dicen qué se pierde si sale mal; "Lo que conviene" al
  comprar; pagarles a los bandidos da un salvoconducto; Kasim compite de
  verdad; y el resumen explica por qué ganaste o perdiste.
- Versión 1.4: app para el celular. Botón "Instalar en el celular" en el menú
  (en Android abre el cartel del navegador; en iPhone explica Compartir →
  "Agregar a inicio"). Busca versiones nuevas al abrir y al volver de segundo
  plano: en el menú se actualiza sola; jugando, avisa con un cartel y un botón
  "Actualizar ahora", y después dice "¡Listo!".

## Instalarlo en el celular

1. Abrí https://darkhyper93-jpg.github.io/Dune-Ledger/ en el celular.
2. En el menú del juego tocá **Instalar en el celular**.
   - Android (Chrome, Brave, Edge, Samsung): tocá **Instalar ahora**, o en el
     menú del navegador (⋮) elegí **Instalar app**.
   - iPhone (Safari): tocá **Compartir** y después **Agregar a inicio**.
3. Listo: queda con su ícono, abre a pantalla completa y funciona sin internet.

Las decisiones tomadas donde el diseño dejaba algo abierto están en
`docs/DECISIONES.md`.

## Cómo correrlo

Necesitás Node 20 o más nuevo.

```sh
npm install
npm run build     # arma el sitio en _site/ (con el service worker)
npm run serve     # http://localhost:4173
```

## Pruebas

```sh
npm run lint      # ESLint
npm test          # unitarias (node:test)
npm run test:sim  # métricas de balance con bots (cientos de temporadas)
npm run test:e2e  # navegador con Playwright (Android, iPhone y WebKit)
npm run balance   # informe rápido de balance: npm run balance -- 500
```

En local, si sólo tenés Chromium: `npx playwright test --project=android`.
La medición de rendimiento corre aparte, al final, para no competir por el
procesador: `npx playwright test --project=rendimiento --no-deps`.

## Estructura

```
index.html  manifest.webmanifest
css/        estilos (paleta arena / terracota / turquesa, modo noche)
fonts/      letras alojadas en el sitio (Rubik y Fraunces, licencia OFL)
icons/      íconos de la app
js/
  main.js   entrada en el navegador
  core/     azar con semilla, guardado, sonido, actualizaciones, textos
  data/     contenido: bienes, ciudades, rutas, reglas y dificultades
  game/     la simulación (no toca el DOM: corre igual en Node)
  render/   dibujo del mapa en canvas y siluetas
  ui/       pantallas: menú, ciudad, mercado, mapa, caravana, resumen
scripts/    build del sitio, service worker, servidor local, íconos, balance
tests/      unit/ (lógica), sim/ (bots y balance), e2e/ (navegador)
```

La integración continua (`.github/workflows/ci.yml`) corre lint, pruebas
unitarias, bots y navegador, y sólo si todo pasa publica en GitHub Pages.
