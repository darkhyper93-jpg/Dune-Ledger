# Dune Ledger

Juego de comercio con caravanas para el celular. Guiás una caravana por el
desierto: comprás barato en un pueblo, vendés caro en otro y tenés 60 días
para pagarle tu deuda al Gremio de Mercaderes. Todo es por turnos: gana el que
mejor piensa.

Es una página web instalable (PWA) que funciona sin internet, en vertical y
con un solo dedo. También se juega en la compu.

## Estado

**Etapa 6 — Desafío diario y modo libre** (ver `docs/DISENO.md`, "Plan por etapas").

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
