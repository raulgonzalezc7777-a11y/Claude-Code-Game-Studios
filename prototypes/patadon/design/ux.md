<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Patadón: especificación UX

Regla central: **pulgar izquierdo = pie izquierdo, pulgar derecho = pie derecho.** Todo lo que sigue protege esa correspondencia.

Unidades: dp. En un móvil de 6" en horizontal (unos 360 dp de alto), 1 dp equivale a unos 2 px del lienzo lógico de 1280×720. Todo valor ajustable va en `config.js`.

## 1. Orientación

- **Solo horizontal.** Así cada pulgar tiene su mitad de pantalla y el campo se ve a lo ancho.
- Al pulsar JUGAR se pide pantalla completa y se intenta `screen.orientation.lock('landscape')`. Si falla, no pasa nada.
- **Si el móvil está en vertical** (puntero táctil y alto > ancho):
  - Aparece una capa opaca con un icono de móvil girando y el texto **"Gira el móvil"**.
  - Si había un partido, se pausa.
  - En PC no aparece nunca.

## 2. Controles táctiles

**Zonas.** La pantalla se parte por la mitad: izquierda = pie izquierdo, derecha = pie derecho. Los botones de la franja superior (56 dp) quedan fuera de las zonas.

**Ancla flotante** (no pads fijos). El punto donde se apoya el pulgar pasa a ser el centro. Por qué:
- **Ley de Fitts:** el objetivo es media pantalla, no un círculo de 120 dp. No hay que mirar dónde se toca, y la vista se queda en el balón.
- Las manos y las fundas cambian. Un pad fijo obliga a corregir el agarre.
- Con un pad fijo, el error "toqué fuera" se convierte en "no respondió". Con ancla flotante ese error no existe.

**Parámetros del ancla:**
- Radio máximo de recorrido: 60 dp.
- Zona muerta: 6 dp.
- Si el pulgar se pasa del radio, el ancla le sigue arrastrada, así nunca se "agota" el recorrido.

**Propiedad del toque.** El pie lo decide el punto donde el dedo se apoyó, no por dónde va después. Un pulgar que cruza el centro sigue mandando su pie.

**Feedback visual:**
- **Anillo** en el ancla: 120 dp de diámetro, trazo de 3 dp, 50 % de opacidad.
- **Punto** bajo el pulgar: 36 dp, opaco.
- **Fantasma del pie:** silueta translúcida de la bota en el campo, donde quedará el pie. Es el feedback clave: une el gesto con el mundo.
- **Colores** (los mismos que las botas del personaje):
  - Izquierdo: **naranja #E69F00** con la letra **"I"** en el anillo.
  - Derecho: **celeste #56B4E9** con la letra **"D"**.
  - Contorno oscuro de 2 dp. La letra hace que no dependa solo del color.
- Al chutar, el anillo pulsa a 1,3× durante 120 ms.
- Al levantar el pulgar, el anillo se desvanece en 150 ms.

**Áreas seguras:**
- `viewport-fit=cover` y `env(safe-area-inset-*)`.
- La HUD respeta los insets más 16 dp de margen.
- Se ignoran los toques a menos de 12 dp de los bordes laterales e inferior (barra de gestos).
- `touch-action: none` en el lienzo: sin zoom, sin desplazamiento, sin menú de pulsación larga.

**Tamaños mínimos:** botones de 48×48 dp, con 8 dp entre ellos.

**Vibración** (`navigator.vibrate`; se desactiva con "Vibración: No"; en iOS no existe y no pasa nada):

| Evento | Patrón |
|---|---|
| Toque de balón | 10 ms |
| Chut | 20 ms (40 ms si es fuerte) |
| Caída | 80 ms |
| Gol a favor | [40, 60, 40, 60, 120] |
| Gol en contra | 150 ms |

## 3. Teclado (PC) y mando

| Acción | Pie izquierdo | Pie derecho |
|---|---|---|
| Mover el pie | W A S D | Flechas (alternativa: I J K L) |
| Chutar | F | Shift derecho (alternativa: Ñ / `Semicolon`) |

- Las teclas se leen por posición (`event.code`), así que funcionan igual en QWERTY español o inglés.
- **Chut desde teclas:** mantén una dirección y pulsa chutar. Cuanto más tiempo se mantiene chutar (hasta 0,6 s), más potencia. Al soltar sale el chut con esa dirección: es el equivalente al deslizamiento rápido del móvil.
- **Generales:**
  - **Enter / Espacio:** JUGAR y confirmar en los menús (lo necesitan las pruebas automáticas).
  - **P / Escape:** pausa.
  - **M:** silenciar.
  - Durante el partido, Espacio no hace nada (evita pausas o saltos sin querer).
- **Mando (más adelante):**
  - Stick izquierdo = pie izquierdo, stick derecho = pie derecho.
  - LT / RT = chut, con potencia analógica.
  - Start = pausa, A = confirmar.
  - Vibración con `vibrationActuator`.

## 4. Cámara

| Necesidad | Primera persona | Hombro bajo |
|---|---|---|
| Ver los propios pies y botas | Solo si se fuerza a mirar abajo; los pies tapan el campo | Siempre visibles: la correspondencia de colores se lee sola |
| Rival fuera de cuadro | Flecha en el borde, frecuente | Flecha en el borde, ocasional |
| Balón fuera de cuadro | Indicador con distancia en m, muy frecuente (el balón suele estar a los pies) | Indicador con distancia, poco frecuente |
| Dirección de la portería | Brújula permanente arriba | Icono de portería en el borde superior cuando no se ve |
| Desequilibrio | Inclinar el horizonte: riesgo de mareo | Se ve en el cuerpo inclinado |
| Mareo | Alto, peor aún en Modo Mareado | Bajo |
| Oclusión | Ninguna | El cuerpo tapa el balón: hace falta volverlo semitransparente al taparlo |

**Recomiendo hombro bajo.** Las botas de colores visibles enseñan el control sin texto, las caídas se leen (y tienen gracia), y el Modo Mareado no castiga al estómago.

Si el diseño de juego elige primera persona, harían falta tres cosas:
- Los pies siempre en el borde inferior.
- FOV de 75° o más.
- Nada de cabeceo de cámara.

Los indicadores son los mismos en ambos casos: flecha triangular de 28 dp en el borde, con el color y el dibujo del equipo rival, un círculo blanco para el balón y un icono de portería.

## 5. HUD

Franja superior, dentro del área segura. La parte de abajo es para los pulgares.

- **Izquierda:** distintivo de modo, una píldora de 14 dp: "NORMAL", o "MAREADO" con un icono de espiral.
- **Centro:** marcador **"2 – 1"** en 28 dp negrita, botón de pausa ‖ de 48 dp y tiempo **"1:24"** en 22 dp con cifras tabulares. Cada lado del marcador lleva el escudo del equipo, con color y dibujo.
- **Derecha:** botón de silencio, 48 dp.
- **Medidor de equilibrio** (abajo en el centro, entre los dos pulgares, donde nada lo tapa):
  - Barra horizontal de 180×14 dp con una marca en el centro y una aguja.
  - La aguja se mueve hacia el lado al que el jugador va a caer.
  - Los extremos tienen rayas diagonales (no solo rojo).
  - Al pasar del 75 % la barra late y suena un tic de aviso.
  - Se entiende de un vistazo: "voy a caer hacia la derecha".
- **Contraste:** todo el texto lleva un contorno oscuro de 2 dp sobre el césped.

## 6. Pantallas y flujo

Título → (primera vez: Tutorial) → Cuenta atrás → Partido ⇄ Pausa → Gol → Saque → … → Resultados → Siguiente rival / Revancha / Menú.

**Título**
- "PATADÓN" grande.
- Botón **JUGAR** de 96×240 dp, en el centro.
- Debajo, un selector de dos opciones: **Normal | Modo Mareado**.
  - Al elegir Mareado aparece: "La cámara se mueve mucho".
- Tarjeta de rival con flechas ‹ ›:
  - Nombre del rival y "Rival 3 de 8".
  - Los rivales bloqueados salen con candado.
- Abajo:
  - Esquema de los controles: dos pulgares con anillos I/D.
  - En PC, la línea: "WASD + F: pie izq. · Flechas + Shift der.: pie der. · P: pausa · M: sonido".
- Botón de ajustes en la esquina.
- Enter / Espacio = JUGAR.

**Tutorial** (enseña haciendo, en un campo vacío)
- 4 pasos. Se avanza al conseguirlo, no por tiempo.
- Cada acierto: marca verde y un sonido.
- Tras 8 s sin éxito aparece una mano animada que muestra el gesto.
- Botón "Saltar".
- Se puede repetir desde Ajustes.

**Partido**
- Cuenta atrás "3, 2, 1, ¡YA!", 2,4 s en total.

**Pausa** (botón arriba en el centro, o P / Escape)
- Título "PAUSA".
- Botones: Continuar, Reiniciar, Ajustes, Salir al menú.
- Al continuar hay una cuenta atrás de 3 s.

**Gol**
- "¡GOOOL!" con 0,3 s de cámara lenta, celebración de 1,5 s y vuelta al saque con "Saque" (0,8 s).
- Unos 2,6 s en total. Se puede saltar con un toque, Enter o Espacio.
- Sin repetición.
- Nada parpadea a más de 3 Hz.

**Resultados**
- Cabecera: "¡GANASTE!", "PERDISTE" o "EMPATE".
- Estadísticas, una por fila:

| Fila | Ejemplo |
|---|---|
| Goles | 3 – 1 |
| Tiros | 7 |
| A puerta | 4 |
| Caídas | 5 |
| Chut más rápido | 87 km/h |

- Botón principal: **"Siguiente rival"** si ganaste, **"Revancha"** si no. Secundario: "Menú".
- Enter = botón principal.

**Ajustes**

| Ajuste | Valores |
|---|---|
| Sonido | Sí / No |
| Vibración | Sí / No |
| Asistencia de equilibrio | Sí / No |
| Pies invertidos | Sí / No |
| Texto grande | Sí / No |
| Reducir movimiento | Sí / No |
| Repetir tutorial | (botón) |

Sustituir el array `CONTROLS` en inglés de `index.html` por los textos en español de esta sección.

## 7. Textos

**Tutorial** (pantalla táctil / teclado):

| Paso | Táctil | Teclado |
|---|---|---|
| 1 | "Pulgar izquierdo: pie izquierdo" | "WASD: pie izquierdo" |
| 2 | "Pulgar derecho: pie derecho" | "Flechas: pie derecho" |
| 3 | "Camina hasta el balón" | igual |
| 4 | "Desliza rápido para chutar" | "Mantén F y suelta" |
| 4b | "¡Chuta a la portería!" | igual |

- Al terminar: "¡Golazo! Ya sabes jugar".
- Pista de inactividad: "Prueba así".

**Etiquetas:**
- Botones: JUGAR · Normal · Modo Mareado · Rival · Saltar · Continuar · Reiniciar · Salir al menú · Ajustes · Siguiente rival · Revancha · Menú.
- Avisos: "Gira el móvil" · "Toca para continuar" · "Enter para jugar".
- Sugerencia: "¿Activar asistencia de equilibrio?" con botones "Sí" / "No, gracias".

## 8. Accesibilidad

**Equipos sin depender del color:**
- Jugador: azul #0072B2, camiseta lisa.
- Rival: bermellón #D55E00, camiseta a rayas horizontales con número.
- Es la paleta Okabe-Ito, segura para daltonismo.
- Las flechas de borde y los escudos repiten el dibujo de cada equipo.

**Asistencia de equilibrio:**
- Hace falta más desequilibrio para caer. El diseño de juego ajusta el valor en `config.js`.
- Desactivada por defecto.
- Si alguien se cae 4 veces en su primer partido, al terminar se le ofrece activarla.
- En los resultados aparece "Asistencia: Sí", sin castigo.

**Pies invertidos:**
- Cada pulgar pasa a mandar el pie del lado contrario, y los colores de los anillos cambian con él.
- *Pregunta para el diseño de juego:* ¿el personaje tiene un pie bueno? Si no lo tiene, esta opción aporta poco y rompe la regla central. Propongo dejarla escondida en Ajustes.

**Texto:**
- Mínimo 14 dp. Las cifras de la HUD, 22 dp o más.
- "Texto grande" lo multiplica por 1,25.
- Contraste de 4,5:1 o más.

**Reducir movimiento:**
- Quita las sacudidas de cámara.
- En Modo Mareado, reduce el balanceo a la mitad.

**Lista de comprobación:**
- Se puede jugar solo con teclado.
- Se puede jugar solo con mando (cuando exista).
- Nada depende solo del color.
- Sin destellos.
- No hay diálogos, así que no hacen falta subtítulos.
- Funciona entre 16:9 y 21:9.

## 9. Casos límite

| Situación | Qué pasa |
|---|---|
| **Un pulgar levantado** | Ese pie se planta: es el apoyo estable, no queda suelto. El otro pie sigue funcionando. `pointercancel` cuenta como levantar el dedo. |
| **Los dos levantados** | Los dos pies se plantan y el jugador queda quieto de pie. No hay pausa automática (los jugadores reacomodan las manos). A los 3 s aparece en la zona de los pulgares el aviso "Pon los pulgares" con anillos fantasma. |
| **Tercer dedo** | Se ignora. Cada zona solo hace caso a su primer `pointerId`, y un toque nuevo en una zona ocupada no hace nada. Los botones de la HUD siguen funcionando con cualquier dedo. |
| **App en segundo plano / pestaña oculta / `blur`** | Pausa inmediata. Se borran los toques y las teclas pulsadas. Al volver se muestra el menú de pausa; nunca se reanuda solo. |
| **Rotación a vertical en pleno partido** | Pausa, capa "Gira el móvil" y se cancelan los toques. Al volver a horizontal aparece el menú de pausa, y Continuar inicia la cuenta atrás de 3 s. |
| **Giro de 180° en horizontal** | Se recoloca la pantalla, los pies se plantan y se da 1 s de gracia sin caídas. |
| **Botón Atrás de Android (en la versión empaquetada)** | Abre la pausa; desde la pausa, vuelve al menú. |
