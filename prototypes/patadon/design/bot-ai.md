# Patadón — IA del rival (bot)

> PROTOTIPO. ~250 líneas de JS, determinista, intercambiable por un rival online.

## 0. Contrato: el bot es un pulgar más

```js
// Misma firma que el lector táctil. null = pie soltado (plantado).
bot.step(obs) -> { L: {x,y} | null, R: {x,y} | null }   // marco local, |v| <= 1
```

- `obs` = copia del **estado presente** (balón pos/vel, pelvis/pies/facing de ambos, desequilibrio propio, marcador, reloj). Sin estado futuro, sin fuerzas sobre el balón.
- **Retardo de reacción**: buffer circular de instantáneas; el bot decide con la de hace `round(reactionMs/16.67)` pasos.
- Extrapolar el balón (`ball + vel·t`, `t ≤ 0.5 s`) es lícito: lo hace cualquier humano mirando la pantalla.
- RNG propio: `rngBot = fork(seed, 'bot')`; tocar el bot no altera la secuencia de la física ni del Mareado.
- Todos los números viven en `config.js` (`{value,min,max,step}`) bajo `CONFIG.bot`.

## 1. Arquitectura en tres capas

```
Cerebro (FSM, cada 6 pasos)       -> {heading, speed} | {kickTarget, power}
Locomoción (cada paso)            -> objetivo del pie que oscila
Patada (cada paso en SHOOT/DRIBBLE) -> waypoint + armado + golpeo
```

### 1.1 Cerebro

| Estado | Entra cuando | Sale hacia |
|---|---|---|
| KICKOFF | silbato / tras gol | CHASE al pitar |
| CHASE | balón libre | DRIBBLE si balón < 0.8 m y estoy detrás de él; DEFEND si el rival llega antes |
| DRIBBLE | balón controlado | SHOOT si `dist(portería) < shootRange` y ángulo libre; CHASE si balón > 1.5 m |
| SHOOT | ver arriba | CHASE al acabar el golpeo |
| DEFEND | rival 1 m más cerca del balón | CHASE si yo 0.5 m más cerca (histéresis) |
| RECOVER | `fallen` | `stun` 20 pasos lentos tras levantarse → CHASE |

Cada decisión, con probabilidad `mistakeRate`, toma la segunda mejor opción o duda 10 pasos.

```js
function think(o, p) {
  if (o.me.fallen) return set(RECOVER);
  const dMe = dist2(o.me.pelvis, o.ball.pos), dOp = dist2(o.op.pelvis, o.ball.pos);
  if (state === DEFEND && dMe < dOp - 0.5) return set(CHASE);
  if (dOp < dMe - 1.0 && state !== SHOOT) return set(DEFEND);
  if (dMe < 0.8 && behindBall(o.me, o.ball, oppGoal))
    return set(dist(o.ball.pos, oppGoal) < p.shootRange && openAngle(o) > 10 ? SHOOT : DRIBBLE);
  return set(CHASE);
}
```

### 1.2 Locomoción: marcha por pasos alternos

Entrada: rumbo `h` (mundo) y velocidad `s ∈ [0,1]`. Un pie oscila; el otro va `null` (plantado). Caminar = poner el pie hacia donde quiero ir.

```js
function gait(o, h, s, p) {
  if (++phase >= p.cadence) { phase = 0; swing = other(swing); } // soltar = aterriza
  const d = toLocal(dirVec(h), o.me.facing);
  const stride = s * (Math.abs(angleDiff(h, o.me.facing)) > 60 ? 0.4 : 1); // girar = pasitos
  let t = add(scale(d, stride), perp(d, swing === 'L' ? -0.22 : 0.22));      // base ancha
  t = lerp(scale(d, -0.3), t, phase / p.cadence);                            // sin saltos
  if (o.me.imbalance > p.balanceGuard) t = toLocal(o.me.comOffset, o.me.facing); // paso de rescate
  return out(swing, clampLen(t, 1));
}
```

`cadence` (pasos de simulación por zancada): menor = más ágil y más inestable.

### 1.3 Patada

1. Objetivo `T`: el poste más lejano a la proyección del rival sobre la línea de gol, girado `gauss(rngBot)·aimErrDeg`.
2. `û = norm(T − ball)`, punto de aproximación `B = ball − û·0.45`.
3. Si estoy **delante** del balón (`dot(me − ball, û) > 0`): waypoint `W = ball − û·0.6 + perp(û)·0.7` por el lado corto. Jaula abierta: sin pathfinding.
4. Llegada (`dist(pelvis,B) < 0.2`, `|facing − û| < 20°`): ambos pies `null` 4 pasos (asentar).
5. Pie de golpeo: el más cercano a la línea `B→T`.
6. **Armado** 8–14 pasos (telégrafo visible): pie a `−û·0.5·power`.
7. **Golpeo** 4 pasos: pie a `+û·1.0`. La potencia real la da la física (velocidad relativa del pie).
8. **Codicia**: con probabilidad `greed`, `power = 1`, armado ×1.4 y `balanceGuard` desactivado. La caída no se scripta: emerge de la física.

**Regate** = misma rutina, `power 0.15–0.3`, `T` 2 m por delante, sesgado hacia portería y lejos del rival.
**Defensa**: ir a `G = ownGoal + (ball − ownGoal)·lerp(0.6, 0.35, defQuality)` + jitter `±(1−defQuality)·0.8 m`.

## 2. Dificultad y escalera de rivales

Perillas: `reactionMs` (mín. 120), `aimErrDeg` (σ), `cadence` (pasos/zancada), `powerUse` (profundidad de armado), `greed` (prob. de sobre-swing por patada), `defQuality` (0–1), `mistakeRate` (prob. por decisión), `shootRange` (m).

| # | Rival | react | aim | cad | power | greed | def | mist | shootR | Manía |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Tío Paco | 450 | 18 | 15 | 0.55 | 0.05 | 0.20 | 0.15 | 6 | Se queda mirando: duda 20 pasos tras cada toque rival |
| 2 | La Nena | 350 | 12 | 10 | 0.50 | 0.08 | 0.35 | 0.10 | 4 | Regatea siempre; solo tira a < 4 m |
| 3 | El Cañonero | 300 | 10 | 13 | 1.00 | 0.35 | 0.40 | 0.08 | 16 | Tira desde lejos y se cae a menudo |
| 4 | Muro Ferrándiz | 250 | 8 | 12 | 0.75 | 0.05 | 0.85 | 0.06 | 8 | Vuelve a DEFEND al perder el balón |
| 5 | El Toro | 200 | 6 | 9 | 0.85 | 0.20 | 0.55 | 0.05 | 9 | Carga con el hombro: rival < 1 m con balón → camina hacia su pelvis |
| 6 | La Profesora | 120 | 3 | 8 | 0.90 | 0.02 | 0.90 | 0.02 | 10 | Amaga: 25 % de armados se cancelan y regatea al lado contrario |

Las manías son un flag `quirk` que toca una línea de `think()`/`kick()`, no estados nuevos.

## 3. Modo Mareado

- La salida del bot pasa por **la misma** `applyMareado(input, rngMareado)` que el input humano, en la capa de entrada. El bot **no compensa** la deriva: no la conoce.
- Además: `mistakeRate ×2`, `greed +0.10`, jitter `cadence ±2` y `balanceGuard −0.15`. Ambos se caen; el bot, un poco más.

## 4. Anti-frustración

**Rubber-banding: sí, solo hacia abajo y solo cognitivo.** Si el bot gana por ≥ 2: `greed +0.10`, `mistakeRate +0.05` ("se confía"). Si pierde, nunca supera su preset. Así el jugador jamás se enfrenta a un rival mejor que el anunciado, y la remontada nace de errores visibles y castigables (sobre-swing, caída), no de velocidad invisible. Cero bonus físicos.

- *Bot atascado contra la pared*: balón < 0.6 m de pared y < 0.5 m de desplazamiento en 90 pasos → `T` = 3 m a lo largo de la pared hacia el centro; waypoint 0.8 m hacia dentro.
- *Ambos atascados en una esquina*: balón < 1 m de desplazamiento en 4 s con ambos a < 2 m → `BACKOFF` 40 pasos (retrocede 1.5 m) y reaproxima con ángulo rotado 60° respecto al intento anterior. Propuesta al game-designer: bote neutral a los 8 s (decisión suya).
- *Rival plantado en la línea*: lo resuelve el poste lejano + error de puntería.
- *Cebar el sobre-swing*: debilidad intencionada y aprendible.
- Todo armado dura ≥ 8 pasos (133 ms): el golpe siempre se ve venir.

## 5. Rendimiento

- `think()` cada 6 pasos; `gait()`/`kick()` cada paso: ~150–300 operaciones, comparando `dist²`.
- Sin pathfinding, raycasts ni asignaciones por paso: salida y buffer de `obs` preasignados (~14 floats × 27 instantáneas).
- Estimado < 0.02 ms/paso en móvil medio (presupuesto: 2 ms).

## 6. Verificación

- `?botdebug=1`: estado + pasos en él, preset, flecha de rumbo, círculos en los objetivos de cada pie (hueco = plantado), `B`, `W`, línea de tiro con su error, `G` y desequilibrio.
- Log en pantalla de las últimas 20 transiciones: `[paso] DRIBBLE→SHOOT (dg=7.2)`.
- Misma semilla + mismo log de input humano = mismo partido.
- `?botvsbot=1&seed=N` (sin render, acelerado, 3 min). Criterios: presets 3–6 marcan; ningún estado salvo DEFEND dura > 10 s; el detector de atasco salta < 3 veces por partido; La Profesora gana a Tío Paco en ≥ 9 de 10 semillas.

Reparto: presets 30 · obs/rng 25 · `think` 55 · `gait` 45 · patada/regate/defensa 60 · anti-atasco 15 · overlay 20 ≈ **250 líneas**.
