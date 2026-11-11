# Game Brief: Patadón

## In your words
"Un juego de fútbol en primera persona en el que tengas que jugar con dos pies en vez de manos."
"Que el fútbol, ¿qué te parece que sea un uno contra uno? Que sea contra gente y todo eso, ¿qué te parece? Yo es lo que mejor veo. Por así decirlo, físicas. Y que haya un modo que sea borracho y que te vayas cayendo."
"Diseña todo bien, tienes todo el tiempo del mundo, necesito que sea bueno, no malo, que esté muy bien hecho, perfecto. Haz que pase por 5 subagentes y diséñalo y modélalo donde necesites, Unity o lo que tú veas, pero tu objetivo es crearlo, el juego perfecto. Haz bien los personajes estilo Rec Room."

**Pitch:** Fútbol 1 contra 1 en una jaula de barrio donde cada pulgar es un pie: camina, regatea y suelta un patadón sin caerte de culo.

**Genre:** arcade sports, physics comedy (1v1)

**Controls:** Táctil (horizontal): pulgar izquierdo = pie izquierdo, pulgar derecho = pie derecho. Tocar levanta el pie, arrastrar lo mueve, soltar lo apoya; un deslizamiento rápido es un chut. Tocar con los dos pulgares estando en el suelo = levantarse. Teclado: WASD mueve el pie izquierdo (F carga y suelta su chut), flechas mueven el pie derecho (Shift derecho / L carga y suelta su chut), V cambia de cámara, P/Escape pausa, M silencia, Enter/Espacio confirman.

**Question:** ¿Es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar, con físicas torpes?

**Hooks:** Cada pulgar es un pie y cada gesto arriesga el equilibrio; el cuerpo te sigue mirando al balón, tú solo pones los pies. Modo Mareado: el mismo partido con los pies que van a su aire.

**Intent:** payoff builds (you said: "físicas", caerse tiene que hacer gracia)

## Look and references
- Look: juguetes de plástico gorditos con botazas, en 3D toon (dirección "social game" tipo Rec Room *(you said)*, sin copiar su avatar: aquí hay piernas completas y botas enormes). Jaula de fútbol de barrio a media tarde dorada, cielo degradado y siluetas de edificios. Firma: huellas de tiza del color del equipo que dejan las botas y se borran en 3 s. Equipo propio naranja ● (botas naranja = izquierda, amarilla = derecha), rival azul ▲.
- References: QWOP (una entrada por parte del cuerpo, pero aquí legible), Rocket League (la jaula 1v1 y las paredes que juegan), juegos de lucha 1v1 (el cuerpo siempre encara al objetivo).
- View: 3D · Camera: tercera persona baja sobre el hombro (1,7 m de alto, 3,4 m detrás), siempre encarando el balón; opción "Vista Botines" en primera persona (tecla V / ajustes).

## First minute
El muñeco aparece en la jaula vacía y un pulgar fantasma late en la mitad izquierda: arrastras, sueltas y das un paso. Luego el derecho. Tras cuatro pasos alternos aparece el balón: llegas con pasitos y lo tocas. Se enciende la portería vacía y una flecha fantasma enseña el deslizamiento rápido: el primer chut que entra es "¡PATADÓN!" con confeti, y entra Tito Bombo, el primer rival.

## Challenge
Desde el primer partido el rival juega con tus mismas reglas: si te quedas sobre un pie o chutas demasiado fuerte, te caes y él se escapa. La Liga de Barrio sube de Tito Bombo (lento, duda) a La Capitana (rápida, amaga), con el tiempo de reacción del bot bajando de 450 a 120 ms. Perder no cuesta nada: Revancha en menos de 3 s.

## Core loop
- Pisar, pisar, tocar, chutar; caerse y levantarse.
- Partido de hasta 3 minutos o 3 goles → resultado → revancha o siguiente rival.
- Ganar desbloquea al siguiente rival y su equipación; Mareado se desbloquea al ganar a Tito.

## Goal & fail state
- Ganar el partido: primero a 3 goles, o ir ganando al acabar 3:00; empate → gol de oro con porterías que se ensanchan. Ganar a los 6 rivales completa la Liga de Barrio.
- Perder el partido no cuesta nada salvo repetirlo.

## Features
- [ ] Control de cada pie con su pulgar (táctil) o su grupo de teclas, con chut por velocidad del pie
- [ ] Equilibrio: caer al quedarse fuera de los apoyos, levantarse con los dos pulgares
- [ ] Partido 1 contra 1 en jaula con paredes, porterías, saque tras gol, balón trabado y gol de oro
- [ ] Rival bot con las mismas entradas que un humano y 6 rivales de la Liga de Barrio
- [ ] Modo Mareado (retardo, deriva, tropiezos, pies cruzados, cámara que se balancea)
- [ ] Tutorial enseñado jugando
- [ ] Personajes juguete procedurales con caras expresivas y huellas de tiza

## Your systems
- partido 1 contra 1 contra gente · thin stand-in *(guessed: bot con las mismas entradas que un humano; online después)*
- físicas · in the slice
- modo borracho (Modo Mareado) · in the slice
- personajes estilo Rec Room · in the slice

## Keep
-

## Avoid
- La palabra "borracho" y referencias al alcohol en el juego (clasificación por edad): se llama Modo Mareado.
- Primera persona como cámara por defecto: tapa los pies y al rival (queda como opción).
- Copiar el avatar de Rec Room (torso flotante sin piernas).
- Pago para ganar.

## Out of scope
- Online (código de amigo, ranking): siguiente paso, cuando la jugabilidad esté validada.
- Monedas, tienda, anuncios recompensados, pase cosmético.
- Modos locos de rotación semanal (hielo, pelota gigante, luna).
- Pies invertidos y mando.
- Empaquetado para Play Store (TWA / Capacitor).

## Build order
1. Un pie por pulgar, equilibrio y caída, balón, jaula y porterías; partido contra Tito Bombo hasta 3 goles o 3:00, perder si el rival gana.
2. Bot con los 6 rivales y la Liga de Barrio con progreso guardado.
3. Modo Mareado.
4. Tutorial, ajustes y pulido (caras, VFX, sonido, vibración).

---
**Kill condition:** si con 6–8 jugadores en el móvil la mayoría llama a las caídas "frustrantes" antes que "graciosas", o su tasa de victorias contra Mamut no mejora del primer al tercer bloque de partidos.

**Who it's for / what they feel:** jugadores de móvil de 12+ que quieren partidos cortos de risa y pique; sentir que dominan un cuerpo torpe.

**Games you love / don't:** Subway Surfers y juegos de mundo abierto de coches (ideas descartadas en favor de este).

## Decisiones del estudio (síntesis de los 5 especialistas)
Documentos: `design/game-design.md`, `design/physics-controls.md`, `design/art-direction.md`, `design/ux.md`, `design/bot-ai.md`.
- **Cancha 16 × 10 m** (diseño de juego decía 20 × 12, arte 24 × 15): andando a ~2 m/s una jaula mayor deja demasiado tiempo muerto en un 1v1. Porterías 3 × 1,6 m.
- **El cuerpo encara siempre el balón** (decisión del estudio, ver juegos de lucha 1v1): adelante = hacia el balón, los lados orbitan alrededor. Quita el problema de girar y deja la habilidad en los pies y en colocarse detrás del balón.
- **Rivales:** nombres y siluetas de arte (Tito Bombo, La Rulos, Don Ramiro, Mamut, Chispa, La Capitana) con los presets y manías de la IA.
- **Colores:** equipos de arte (naranja ● contra azul ▲); los anillos de los pulgares usan el color de cada bota del jugador (naranja izquierda, amarilla derecha) en vez del celeste de UX, que chocaba con el azul rival.
- **Pies invertidos:** fuera (no hay pie bueno; rompe la regla central).
