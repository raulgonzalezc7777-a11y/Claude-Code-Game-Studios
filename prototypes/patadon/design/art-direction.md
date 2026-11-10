<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Patadón: dirección de arte

## 1. Pilar visual

**"Juguetes de plástico con botazas."** Muñecos gorditos, redondeados y simpáticos (dirección "social game" tipo Rec Room, **sin copiar** su avatar: aquí hay piernas completas y no hay torso flotante). Lo que manda en pantalla son **los pies**: las botas son enormes, llevan contorno oscuro y el color del equipo. Si en una captura no se lee cada bota de un vistazo, el arte ha fallado.

**Detalle de firma:** las **botazas** (30 % de la altura del muñeco) dejan **huellas de tiza** del color de su equipo que se desvanecen en 3 s. En cada captura se ve el "dibujo" del partido sobre el césped.

## 2. Reglas técnicas

- Todo con primitivas de three.js. Sin modelos ni texturas externas; las texturas son `CanvasTexture` generadas al arrancar.
- Personajes y balón: `MeshToonMaterial` con `gradientMap` de 3 bandas (`DataTexture` 3×1: 90, 170, 255, `NearestFilter`). Entorno: `MeshLambertMaterial`.
- Presupuesto: ≤2 500 tris por personaje y ≤25 000 tris por escena, ≤60 draw calls. Cápsulas `(r, len, 4, 8)`, esferas `(12, 8)`.
- Contorno de casco invertido (copia con `side: BackSide`, escala 1.06, `#1E1A2E`) **solo en botas y balón**.

## 3. Receta del personaje (altura 1,20 m)

Jerarquía: `raíz → cadera (y 0,58) → muslo → rodilla (y 0,36) → espinilla → tobillo (y 0,14) → bota`. Las piernas van separadas ±0,11 m en X.

| Parte | Forma | Medidas (m) | Color |
|---|---|---|---|
| Bota | `CapsuleGeometry(0.10, 0.16)` girada 90° en X, escala Y 0,7 | 0,20 ancho × 0,14 alto × 0,36 largo; adelantada +0,06 en Z respecto al tobillo | color de equipo |
| Puntera | esfera r 0,085, achatada en Y 0,7, en la punta | — | equipo oscuro |
| Suela | `BoxGeometry(0.21, 0.035, 0.34)` bajo la bota | — | `#FFFFFF` |
| Espinilla / calcetín | cápsula r 0,055, len 0,16 | — | `#FFFFFF` con banda de equipo (anillo, cilindro r 0,058 × 0,03) |
| Muslo | cápsula r 0,07, len 0,14 | — | piel |
| Pantalón | cilindro r 0,20→0,22, alto 0,12, centro y 0,62 | — | `#F4F1E6` |
| Torso | cápsula r 0,21, len 0,10, centro y 0,79 | ocupa 0,53–1,05 | camiseta de equipo + emblema (§5) |
| Brazos | cápsula r 0,06, len 0,16; mano = esfera r 0,075 (manopla, sin dedos) | hombro en y 0,95, ±0,24 | camiseta / piel |
| Cabeza | esfera r 0,19, escala (1,05, 1, 1), centro y 1,01 | tope en 1,20; sin cuello | piel |

Los brazos son decorativos y pueden ir colgando o aletear. Lo que nunca debe pasar es que tapen las botas.

**Pieles (tonos juguete):** `#F6D2B0`, `#E2A877`, `#B9784A`, `#7A4A2C`.

### Cara

Una sola `CanvasTexture` de 512×256 en atlas 4×2 (celdas de 128 px), proyectada en un casquete: `SphereGeometry(0.192, 12, 8, -0.95, 1.9, 0.75, 1.35)` con `alphaTest: 0.5`. Cada personaje clona la textura (comparte la imagen) y cambia la expresión con `offset`. Tinta `#1E1A2E`, brillos `#FFFFFF`, mofletes `#FF8FA3` al 60 %.

| Celda | Expresión | Dibujo |
|---|---|---|
| 0 | Normal | ojos óvalo vertical con brillo; sonrisa en arco pequeño |
| 1 | Parpadeo | ojos línea; cada 3–5 s durante 120 ms |
| 2 | Esfuerzo / patada | ojos `> <` apretados, boca "D" grande, mofletes |
| 3 / 4 | Modo Mareado A/B | ojos en espiral (giro alterno), boca ondulada; A y B se alternan a 6 Hz |
| 5 | Caído / aturdido | ojos `X X`, boca "o" pequeña |
| 6 | Gol | ojos `^ ^`, bocaza abierta con lengua `#FF6B81` |
| 7 | Gol recibido | cejas caídas, ojos semicerrados, boca temblorosa |

## 4. Plantilla: Liga de Barrio

Camiseta y botas = color de equipo. Piel, pelo y accesorios = paleta propia. **Cada silueta cambia proporciones o tocado, no solo el color.**

| # | Nombre | Silueta | Paleta propia |
|---|---|---|---|
| Jugador | **Chuta** | base; **remolino**: un cono curvado (r 0,05, alto 0,14) inclinado 30° en la coronilla | pelo `#3B2A20`, piel `#E2A877` |
| 1 | **Tito Bombo** | torso escala X 1,35 (barril); gorra del revés (media esfera + visera hacia atrás) | gorra `#E84A3C`, piel `#F6D2B0` |
| 2 | **La Rulos** | afro-nube de 7 esferas r 0,09–0,12 que dobla el ancho de la cabeza; cuerpo fino (torso X 0,85) | pelo `#2A1A14`, piel `#7A4A2C`, diadema `#FFD23F` |
| 3 | **Don Ramiro** | 0,9 de altura, barriga (esfera r 0,16 delante), boina plana (cilindro r 0,21 × 0,04) y bigote (2 cápsulas) | boina `#5A4636`, bigote `#D9D4CC`, piel `#E2A877` |
| 4 | **Chispa** | piernas ×1,25 (muslo y espinilla), cresta de 5 conos en fila | cresta `#7CFF4F`, piel `#B9784A` |
| 5 | **Mamut** | 1,15 de escala, hombros cuadrados (torso X 1,3, Y 1,1), cabeza ×0,8 con gorro de lana y pompón (esfera r 0,07) | gorro `#2FB8A8`, pompón `#FFF6E5`, piel `#F6D2B0` |
| 6 | **La Capitana** (jefa) | coleta alta con forma de lágrima (`LatheGeometry`, 0,28 de largo, que se balancea con muelle); brazalete y gafas de sol (2 discos) | pelo `#C2462E`, brazalete `#FFD23F`, gafas `#1E1A2E`, piel `#F6D2B0` |

## 5. Colores de equipo (accesibles)

| Rol | Hex | Forma asociada |
|---|---|---|
| Equipo A (jugador) | `#FFA51F` claro, oscuro `#D97706` | **círculo ●** |
| Equipo B (rival) | `#3346C8` oscuro, oscuro `#1F2A8A` | **triángulo ▲** |

El naranja claro frente al azul oscuro separa los equipos por **valor** (luminancia) y por tono, y aguanta deuteranopía y protanopía. Además, la forma repite la información: emblema en el pecho (disco o triángulo blanco), marca en el suelo bajo cada jugador (anillo continuo o tres triángulos), marcador y larguero de la portería propia. **Prueba obligatoria:** una captura en escala de grises tiene que seguir leyéndose.

Neutros: tinta `#1E1A2E`, papel `#FFF6E5`, acento `#FF4D6D` (no es de ningún equipo; se usa para UI y para avisos).

## 6. La pista: jaula de barrio, 24 × 15 m

- **Hora:** media tarde dorada. Sombras largas pero suaves, ambiente cálido.
- **Suelo:** césped artificial con franjas de 3 m en una `CanvasTexture` de 64×8 repetida, alternando `#3FAE5A` y `#379E50`. Fuera de la pista, cemento `#B8B0A4`.
- **Líneas:** planos de 0,08 m a y+0,005, color tiza `#F4F1E6`: perímetro, línea central, círculo central (`RingGeometry` r 2), áreas de 4 × 6 m.
- **Muro:** tablas bajas de 1 m de alto, `#E8E0D0`, con bloques pintados cada 4 m que alternan los dos colores de equipo apagados al 40 %.
- **Jaula:** postes cilíndricos r 0,05 cada 3 m, `#5B6470`, de 4 m de alto. Encima de las tablas, malla en `CanvasTexture` 32×32 con un rombo de alambre, `alphaTest`, repetida, de 3 m de alto.
- **Porterías:** 3 × 2 m. Postes en cilindro r 0,06, larguero del color del equipo que la defiende, red en malla `CanvasTexture` más fina y con bamboleo de vértices al marcar gol.
- **Balón:** `IcosahedronGeometry(0.22, 1)` con sombreado plano y colores por vértice, `#FFFFFF` con parches `#2B2B3A`. Es más grande de lo realista a propósito, para que se lea bien.
- **Fondo barato:** cielo con gradiente en `scene.background` (`CanvasTexture` 1×256) de `#6EC6FF` arriba a `#FFD6A0` en el horizonte. Dos capas de edificios (cajas planas sin luz): la cercana `#8C6FA8` con ventanas `#FFE08A` (`InstancedMesh` de quads), la lejana `#B7A3CF`. Un depósito de agua y un tendedero con 5 trapos de colores completan el barrio.

**Luces:**
- `HemisphereLight(#CFE8FF, #6A8F4E, 0.9)`.
- `DirectionalLight(#FFE2B8, 1.6)` desde unos 40° de elevación, lateral. Mapa de sombras de 1024 con `PCFSoftShadowMap` y cámara de sombra ajustada a la pista. Solo proyectan sombra los personajes y el balón.
- Calidad baja: sin sombras reales; en su lugar, disco oscuro `#1E1A2E` al 35 % bajo cada cuerpo.

## 7. VFX de comedia física

Todo con pool, sin texturas nuevas y con malla barata.

| Efecto | Receta |
|---|---|
| Impacto de patada | 6 esferas blancas achatadas que crecen de 0 a 0,25 m y se desvanecen en 0,25 s, más un anillo `RingGeometry` orientado a la dirección del golpe. En los patadones, globo "¡PUM!" (sprite de canvas, `#FFD23F` con tinta) |
| Estela del balón | tira de triángulos con las últimas 12 posiciones, ancho de 0,2 a 0, color del último equipo que tocó el balón. Solo aparece por encima del umbral de velocidad de `config.js` |
| Polvo al caer | 5 bolitas `#D8C8A8` que se abren en abanico a ras de suelo, 0,4 s |
| Aturdido | 3 estrellas (`ShapeGeometry` de 5 puntas, `#FFD23F`) más un pajarito (2 triángulos que aletean), orbitando a r 0,25 sobre la cabeza a 2 vueltas/s |
| Gol | `InstancedMesh` de 60 confetis (planos de 0,04 × 0,07) en el color del equipo que marca, blanco y `#FFD23F`, con gravedad y giro durante 2,5 s; además se sacude la red |
| Huellas de tiza (firma) | quad de 0,12 × 0,26 por paso con silueta de suela, color de equipo al 70 %, se desvanece en 3 s, pool de 40 |

## 8. UI

- **Fuentes:** `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`, peso 800–900. Los números con `font-variant-numeric: tabular-nums`.
- **Botones:** pastilla (`border-radius: 999px`), alto mínimo 56 px, fondo `#FF4D6D`, texto `#FFF6E5`, borde de 3 px `#1E1A2E` y "canto" `box-shadow: 0 6px 0 #1E1A2E`. Al pulsar baja 4 px y la sombra se queda en 2 px. Secundario: fondo `#FFF6E5` con texto de tinta.
- **Pads de pulgar:** dos círculos translúcidos (`#FFF6E5` al 25 %, borde de 3 px) con un icono de bota: izquierda y derecha. Se iluminan con el color de equipo al tocarlos.
- **Marcador:** pastilla de papel arriba en el centro: `● 2 – 1 ▲`, cada forma en su color y la tinta para los números.
- **Paneles:** papel `#FFF6E5`, radio de 24 px, borde de tinta de 3 px. El texto del cuerpo nunca va por debajo de 16 px.
