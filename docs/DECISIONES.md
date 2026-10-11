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
