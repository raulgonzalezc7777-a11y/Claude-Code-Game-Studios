<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Patadón — Diseño de juego (build 1)

**Pregunta del prototipo:** ¿es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar?
**Estética objetivo (MDA):** Desafío (dominar el cuerpo) + Sensación (patadas con peso) + comedia física. Las caídas dan risa porque cuestan poco.

## 1. Bucle y partido

- **Micro (30 s):** pisar–pisar–tocar–chutar; caerse, levantarse.
- **Meso (3–4 min):** un partido → resultado → revancha o siguiente rival.
- **Macro (15 min):** subir la Liga de Barrio (5 rivales). Volver: el siguiente rival, Modo Mareado y, más adelante, la rotación semanal.

| Regla | Valor |
|---|---|
| Cancha | Jaula de 20 × 12 m, tablas de 1,2 m y red hasta 4 m. **Sin fueras de banda** |
| Arco | 3,0 × 1,5 m, sin portero |
| Victoria | Primero a **3 goles**, o ir ganando al acabar **3:00** |
| Empate al 3:00 | **Gol de oro**; el arco se ensancha 0,5 m cada 30 s (máximo 5 m) para que el partido siempre termine |
| Tras un gol | Celebración de 2 s, reloj parado; cada jugador a 4 m del centro en su campo; **saca quien recibió el gol** (bucle de equilibrio suave) |
| Balón trabado | Sin toques durante 4 s en una esquina, o 5 s pisado entre los dos → bote neutral en el centro |
| Faltas | Ninguna. Todo es contacto físico |

## 2. Control: pulgar izquierdo = pie izquierdo

Pantalla partida en dos mitades. **Tocar** = levantar ese pie. **Arrastrar** = mover el pie (100 px = 0,5 m, relativo a la cámara). **Soltar** = apoyar el pie. Los pies se resuelven con IK y el cuerpo se coloca solo sobre los apoyos.

**Cuerpo:** muñeco de 1,0 m, alcance de pierna 0,55 m, paso máximo 0,5 m. Si el centro de masas sale del polígono de apoyo (+0,12 m de margen) más de **0,35 s → caída**. Un estabilizador corrige hasta 0,08 m/s de deriva: torpe pero controlable. Más de 1,2 s sobre un pie aumenta el bamboleo.

| Verbo | Gesto | Regla |
|---|---|---|
| **Pisar** | Alternar pulgares | 3 pasos/s ≈ 1,5 m/s, la velocidad máxima andando. Encadenar dos pasos con el mismo pie = trastabillar |
| **Tocar** (conducir) | Pie lento contra el balón | Velocidad del pie < 2,5 m/s → balón a 0,8 × esa velocidad, se queda cerca |
| **Chutar** | Llevar el pie atrás y barrer rápido | Velocidad del pie = velocidad del pulgar en los últimos 80 ms (2000 px/s = 10 m/s, el tope). Balón = 2 × pie × calidad del contacto (0,5–1,0, según lo centrado). Máximo 20 m/s (72 km/h). Un chut más fuerte exige más tiempo sobre un pie, es decir, más riesgo de caerse |
| **Pared** | Chutar contra la tabla | Restitución de 0,7. La jaula hace de compañero de equipo |
| **Bloquear** | Apoyar un pie abierto | El pie apoyado es un obstáculo sólido |
| **Barrer** | Arrastrar los dos pulgares a la vez y rápido hacia el mismo lado | Deslizamiento de 1,5 m, caída deliberada, 1,2 s para recuperarse. Si falla, el rival se escapa |
| **Levantarse** | Tocar con los dos pulgares a la vez | Ragdoll de 0,8 s; tocar a tiempo → de pie en 1,0 s; si no, se levanta solo a los 2,0 s |

Si un choque te pilla sobre un pie, te caes; si te pilla con los dos pies apoyados, solo te empuja. Saber **cuándo** tener los dos pies en el suelo es la habilidad que distingue al experto.

**Cámara (decidido):** por defecto **tercera persona baja sobre el hombro** (1,6 m de alto, 3,2 m detrás, FOV 70°, sesgo automático de hasta 25° para encuadrar balón y rival). En primera persona no ves tus pies (el juego entero), pierdes al rival que está a tu lado y no se ve la caída, que es el chiste. **Primera persona ("Vista Botines")** queda como opción en Ajustes: es otra posición de cámara, barata; se desbloquea al ganar al rival 3.

**Listo para PvP:** el bot usa la misma API de "pulgares virtuales" y los mismos límites (mínimo 0,15 s entre apoyos, mismo alcance), sin información extra. Paso fijo de 60 Hz y `rng()` con semilla: permiten rollback más adelante.

## 3. Primer minuto (sin textos, solo pulgares fantasma)

1. **0–10 s:** el muñeco aparece de pie y un pulgar fantasma late en la mitad izquierda. Al arrastrar y soltar, da un paso. Luego aparece el fantasma de la derecha. Tras 4 pasos alternos, los fantasmas desaparecen.
2. **10–25 s:** hay un balón a 3 m. Al llegar a él con toques suaves, rueda. Si te caes, aparece el icono de los dos pulgares para levantarte (se enseña cuando ocurre, nunca antes).
3. **25–45 s:** se ilumina un arco vacío a 6 m y aparece una flecha fantasma de barrido en el pie más cercano al balón. Si fallas, la jaula devuelve el balón y el fantasma se repite.
4. **45–60 s:** **GOL** → confeti y un "¡PATADÓN!" gigante. Entra Tito, el primer rival, y empieza el partido sin pasar por ningún menú.

## 4. Liga de Barrio

| # | Rival | Personalidad | Reacción | Error de pie | Potencia de tiro | Barridas |
|---|---|---|---|---|---|---|
| 1 | Tito "el Nene" | Corre detrás del balón, se cae mucho | 0,90 s | 25 cm | 50 % | 0 % |
| 2 | Chela "la Tranquila" | Defiende cerca del arco, nunca corre | 0,70 s | 18 cm | 60 % | 10 % |
| 3 | Rulo "el Muro" | Bloquea con los pies abiertos; obliga a jugar a la pared | 0,55 s | 14 cm | 70 % | 20 % |
| 4 | Pichi "Rayo" | Regatea rápido y presiona | 0,45 s | 12 cm | 80 % | 30 % |
| 5 | El Capi | Completo; busca tiros de banda contra la tabla | 0,30 s | 8 cm | 95 % | 45 % |

Los rivales se caen con las mismas reglas que tú. **La derrota no cuesta nada**: el botón "Revancha" vuelve al partido en menos de 3 s. Como la derrota es frecuente, recuperarse tiene que ser rápido. **Más adelante:** versiones "+" de cada rival (−20 % de reacción) y una segunda liga, la Comarcal.

## 5. Modo Mareado y modos locos

**Mareado** se desbloquea al ganar a Tito, para que el modo justo sea la primera impresión. Nunca cuenta para la liga ni para ningún ranking, y el bot sufre los mismos modificadores:

| Modificador | Valor |
|---|---|
| Retardo de entrada | 120 ms (Normal: 0) |
| Deriva del pie | ±15 cm sinusoidal, con periodos de 2,3 s (izquierdo) y 3,1 s (derecho) |
| Margen de equilibrio | −40 % |
| Tropiezo aleatorio | Impulso de 1,5 m/s cada 6–10 s (`rng`) |
| Pies cruzados | Cada 20 s, izquierda y derecha se intercambian 3 s, avisado 1 s antes con un icono |
| Bamboleo de cámara | ±3° de balanceo a 0,5 Hz, **desactivable** (riesgo de mareo real) |
| Caídas | Ragdoll exagerado con estrellitas |

**Modos locos (más adelante, rotación semanal):** *Hielo* (fricción × 0,2, los pies resbalan al apoyar); *Pelota Gigante* (balón de 1,6 m de diámetro, masa × 3, arcos de 4 × 2,5 m); *Luna* (gravedad × 0,3, botes altos). Cada uno es un archivo de parámetros, sin código nuevo.

## 6. Progresión y monetización

**Build 1:** solo se guarda el avance de la liga en local. Cada rival vencido regala una equipación (5 en total). No hay moneda, ni tienda, ni anuncios.

**Más adelante (Play Store):**
- **Chapas** (moneda blanda): victoria 30, derrota 10, gol 5, primera victoria contra un rival 100; unas 10 por minuto.
- Cosméticos de los muñecos (cabezas, equipaciones, botas, celebraciones): 150–600 chapas, 15–60 min de juego. Nunca cambian el colisionador.
- **Anuncio recompensado** opcional: dobla las chapas del partido, máximo 5 al día. Sin intersticiales.
- Pase cosmético opcional; nunca se vende poder. El único sumidero son los cosméticos, que rotan cuando el catálogo se agote.

## 7. Victoria, derrota y Resultados

**Victoria en el partido:** 3 goles, ir ganando al 3:00 o marcar el gol de oro. **La liga se completa** al ganar a El Capi, con créditos y la cámara Botines ya desbloqueada.

**Pantalla de Resultados:** marcador y ganador, duración, tu tiro más fuerte (km/h), goles de pared, caídas tuyas frente a las del rival y pasos dados. Botones: **Revancha** (grande), **Siguiente rival** (si ganaste) y Menú. *Más adelante:* repetición en bucle de 3 s de "la caída del partido" (búfer de transformaciones).

**Cancelación** (6–8 personas, en su teléfono, 15 min). Se cancela si ocurre **cualquiera**:
- Menos del 50 % marca el gol del tutorial antes de 90 s.
- La mediana necesita más de 4 intentos para ganar a Tito.
- La tasa de victorias contra Rulo no mejora del primer al tercer bloque de partidos (no hay dominio).
- La mayoría llama a las caídas "frustrantes" antes que "graciosas".
- Menos de la mitad pide revancha sin que se lo sugieran.
- Menos de 30 fps en un Android de gama media de 2021 (cancelar o cambiar de enfoque técnico).

## 8. Juegos cercanos y diferencias

| Juego | Qué comparte | Diferencia en Patadón |
|---|---|---|
| QWOP | Una entrada por parte del cuerpo | Allí músculos directos, casi injugable; aquí objetivo del pie con IK y autoequilibrio: legible y competitivo |
| Soccer Physics | Fútbol con cuerpos torpes | 2D, un botón, caótico; aquí 3D, dos pulgares, deliberado |
| Gang Beasts / Human: Fall Flat | Cuerpos cómicos | Agarran con brazos; aquí no hay manos. Nada de gelatina ni de judía; el aspecto lo define dirección de arte |
| Rocket League | Jaula 1v1, paredes | Coches frente a pies; la jaula viene del fútbol indoor real |
| Head Ball 2 | Fútbol 1v1 móvil | 2D lateral, cabezas; aquí 3D, pies |

Mecánica propia: **cada pulgar es un pie, y cada gesto arriesga el equilibrio.**
