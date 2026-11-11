<!-- PROTOTYPE - NOT FOR PRODUCTION -->
# Patadón: física y controles (spec v0.1)

Paso fijo `dt = 1/60 s`. Unidades SI. Plano del suelo XZ, Y arriba. Los nombres `en_snake_case` son claves de `config.js` (rangos en §9). Integrador: Euler semi-implícito (`v += a·dt; x += v·dt`). Es estable mientras `ω·dt < 2`; el peor caso es `foot_omega` = 40 → 0.67.

## 1. Entrada

**InputFrame** (la única interfaz; humano, teclado y bot producen lo mismo):
`{ lx, ly, ld, rx, ry, rd }`, con `lx..ry` ∈ int8 [−127, 127] (= u·127) y `ld, rd` ∈ {0,1} (pulgar apoyado).

**Táctil.** Cada mitad de pantalla posee un pie; el primer toque en una mitad es el dueño. `a` = punto de toque inicial (px), `d = p_touch − a`.

```
u_raw = d / touch_radius_px            ; |u_raw| se recorta a 1
u     = 0                               si |u_raw| < input_deadzone
u     = û_raw · (|u_raw| − dz)/(1 − dz) en otro caso      ; u ∈ disco unidad
```
Pantalla arriba = +z local (adelante), derecha = +x local.
*Ejemplo:* arrastre de 49 px hacia arriba → |u_raw| = 0.70 → u = (0, 0.66).

**Teclado.** Pie izq. = WASD, pie der. = flechas (o IJKL). Cualquier tecla pulsada = `d=1`. Vector de teclas `k` (normalizado) y `u ← move_toward(u, k, key_ramp_rate·dt)`. Soltar todas = plantar. No hay tecla de chute: S→W rápido (de −1 a +1 en 0.2 s) genera la velocidad de patada sola.

**Bot.** Escribe InputFrames y no tiene ningún otro canal. En Mareado pasa por el mismo retardo.

## 2. Pie

Estados por pie: `PLANTED → (d=1) SWING → (d=0) PLANTING → PLANTED`.

Objetivo en mundo (rot(θ) = orientación del cuerpo):
```
T_local = (±foot_rest_offset, 0) + u · foot_reach   (+ deriva de Mareado §7)
T       = P + rot(θ)·T_local                         ; recortado al interior de la arena
```
SWING: muelle-amortiguador sobre la posición horizontal `f`:
```
a_f = ω²(T − f) − 2ζω·v_f      ω = foot_omega, ζ = foot_zeta
|v_f| ≤ foot_max_speed
altura: y_f ← min(foot_lift_height, y_f + foot_lift_rate·dt)
```
Velocidad pico ante un salto del objetivo Δ (amortiguamiento crítico) ≈ 0.37·ω·Δ. *Ejemplo:* un flick de u=(0,−1) a (0,+1) da Δ = 1.1 m → 0.37·25·1.1 ≈ 10 m/s, que es justo `foot_max_speed`.

PLANTING: el objetivo queda congelado y el pie sigue su inercia (follow-through). Se planta cuando `|v_f| < plant_speed_max` o pasa `plant_timeout`. En ese momento `y_f = 0` y la posición queda fija en el mundo.

**Sobreestiramiento:** si un pie plantado cumple `|f − P| > leg_stretch_max`, se despega solo (pasa a SWING con u = 0) y suma `ΔI = 0.25` (espagat).

## 3. Locomoción y equilibrio

Sea `C` el centro de apoyo: el punto medio si hay 2 pies plantados, el pie plantado si hay 1, y `P` si no hay ninguno.
```
P*  = C + rot(θ)·(0, body_lean)
a_P = ωb²(P* − P) − 2ζb·ωb·V        ωb = body_omega, ζb = body_zeta; |V| ≤ body_max_speed
G   = P + V·com_lookahead + sway     ; "CoM proyectado" (sway solo en Mareado)
```
Así, alternar pies avanza el cuerpo. *Ejemplo:* pasos de 0.55 m cada 0.25 s ≈ 2.2 m/s.

**Orientación:** si `|V| > turn_min_speed` y `angle(V, θ) < 150°`, θ gira hacia atan2(V) a `turn_rate` como máximo. Con más de 150° se camina de espaldas y no se gira.

**Región de apoyo S:** cápsula entre las proyecciones al suelo de ambos pies, con radio `support_margin`. Un pie en SWING solo cuenta durante sus primeros `swing_grace` s; pasado eso queda "a la pata coja" y S es un círculo en el pie plantado.

**Desequilibrio I ≥ 0** (adimensional):
```
e = max(0, dist(G, segmento_S) − support_margin)                  [m]
dI/dt = imb_gain_excess·e
      + imb_gain_air·[0 plantados ∧ t_air > air_grace]
      − [e = 0]·(imb_decay_single si 1 plantado | imb_decay_double si 2)
I += impulsos (choques §5, retroceso de chute §4)
```
| Símbolo | Tipo | Rango | Descripción |
|---|---|---|---|
| e | float | 0–~1 m | exceso del CoM fuera de S |
| I | float | 0–∞; acción ≥ thr_fall | desequilibrio |
| thr_* | float | 0.3–1.5 | umbrales (× Mareado) |

*Ejemplo:* pata coja con e = 0.1 m durante 0.5 s → +0.15. Un empujón que deja e = 0.3 m durante 0.4 s → +0.36.

**Máquina de estados del cuerpo:**
```
STAND    --I ≥ stumble_threshold-->  STUMBLE  (ω del pie × stumble_control_mult, potencia × 0.5)
STUMBLE  --I < stumble_exit-->       STAND    (histéresis)
*        --I ≥ fall_threshold-->     FALLEN   (entrada ignorada, V *= exp(−fall_friction·dt), collider bajo)
FALLEN   --fall_time-->              GETUP    (pies vuelven a ±rest bajo P)
GETUP    --getup_time-->             STAND    (I = getup_imbalance, invulnerable invuln_time)
```
Invulnerable: no se reciben ΔI externos y los choques solo empujan.

**Auto-paso (asistencia, opcional `auto_step`):** se activa en STAND con `ld = rd = 0` durante `auto_step_delay` y (e > 0 o I > 0.25 o la distancia entre pies queda fuera de [0.15, 0.6] m). En ese caso el pie más lejano a G hace un SWING sintético de `auto_step_time` hacia `G ± foot_rest_offset·lateral`. Vive dentro de la simulación, así que es idéntico para humano y bot.

## 4. Balón

Tamaño de juguete: `ball_radius` = 0.16 m (≈1.45× uno real; se lee mejor junto a un muñeco de 1.2 m).
```
a = (0, −gravity, 0) − ball_drag·|v|·v
en suelo (y ≤ r+1 mm): v_xz −= min(|v_xz|, ball_roll_friction·g·dt)·v̂_xz ; v_xz *= (1 − ball_roll_damping·dt)
bote suelo: v_y = −ball_restitution_ground·v_y ; si |v_y| < 0.5 → v_y = 0
pared/techo: v_n = −ball_restitution_wall·v_n ; v_t *= 0.9
```
Sin spin físico; la rotación visual es `v/r`. *Ejemplo:* a 10 m/s rodando frena en ≈ 17 m (d = [v₀ − (a/k)·ln(1 + k·v₀/a)]/k, con a = 1.18 m/s² y k = 0.3/s), casi lo que mide el campo.

**Pie–balón** (el pie es cinemático, esfera de `foot_radius` centrada en y_f + foot_radius). Se usa test barrido (segmento relativo del tick contra la esfera suma de radios) para evitar tunneling a velocidades relativas de hasta ~26 m/s.
```
n      = normalize(c_ball − c_foot)                         ; 3D
n_y    = clamp(n_y·loft_gain, 0, sin(loft_max_deg))         ; contacto bajo = vaselina
v_n    = (v_f − v_ball)·n ;  si v_n ≤ 0 → solo separar
dir    = normalize(lerp(n, v̂_f_xz + n_y·Y, kick_aim_blend))
si |v_f| ≥ kick_speed_min:  Δv = (1+kick_restitution)·v_n·kick_power_mult·[0.5 si STUMBLE]
sino (regate):              Δv = (1+dribble_restitution)·v_n
v_ball += Δv·dir ; |v_ball| ≤ (kick_speed_cap | dribble_speed_cap)
I_pateador += kick_recoil_k·Δv
cooldown por pie: foot_ball_cooldown
```
Rango de Δv: entre 0 y (1+e)·(2·foot_max_speed), recortado a `kick_speed_cap`. *Ejemplo:* pie a 9 m/s contra un balón parado → 1.6·9 = 14.4 m/s (por debajo del tope de 16); retroceso +0.29 de I. El pie recién levantado (y_f bajo, n_y ≈ 0.28·2 → ~34°) sale en vaselina; con el pie arriba el tiro sale raso.

Los pies plantados y las piernas (cápsula pie→cadera, `leg_radius`) son obstáculos estáticos para el balón con e = 0.3, lo que permite controlarlo. El torso es una cápsula de `body_radius` × 1.0 m con e = 0.4, que suma la V del cuerpo.

## 5. Cuerpo–cuerpo

Pelvis = círculos de `body_radius` (1.3× tumbado). Con `pen = 2r − d > 0` se separan pen/2 cada uno.
```
s = closing speed = −(V_B − V_A)·n  (n de A a B), si s > 0:
  j = (1+body_restitution)·s/2 ;  V_A −= j·n ; V_B += j·n
  ΔI_B = charge_imb_k·max(0, s − charge_min_speed)·[brace_mult si B tiene 2 pies plantados]
  ΔI_A = charge_self_k·max(0, s − charge_min_speed)
```
*Ejemplo:* s = 3 m/s → B +0.70 (tropieza) o +0.35 si está bien apoyado; A +0.30.

**Patada a la pierna (entrada):** un pie en SWING con `|v_f| ≥ kick_speed_min` que toca la cápsula de pierna del rival:
```
ΔI_B = tackle_imb_k·|v_f| · [tackle_planted_mult si esa pierna está plantada]
                          · [clean_tackle_mult si A tocó balón en los últimos clean_tackle_window s]
ΔI_A = tackle_self_imb
```
*Ejemplo:* 9 m/s contra pierna plantada → 0.08·9·1.3 = 0.94, casi derribo.

## 6. Arena (jaula, sin fueras)

Rectángulo de `pitch_length` × `pitch_width` (20 × 12 m), con chaflanes de `corner_chamfer` en las esquinas para que el balón no se atasque. Techo de malla a `wall_height`. Porterías de `goal_width` × `goal_height` × 1.0 m de fondo, con red de e = 0.1. Gol = el centro del balón supera la línea en más de r dentro de la boca. Tras un gol, saque a los 1.5 s.
Justificación de la medida: a ~2.5 m/s se cruza el campo en 8 s y un tiro de 14 m/s lo recorre en 1.5 s. 24 × 15 m da demasiado tiempo muerto para 1v1 sin portero.

## 7. Modo Mareado

Nivel `z ∈ [0,1]`: `z += dt/dizzy_ramp_time`; vuelve a 0 para ambos tras cada gol. Escala `s = dizzy_level_floor + (1 − dizzy_level_floor)·z`.
```
retardo:  D = round(dizzy_input_delay_ms·s·0.06) ticks (ring buffer; si D crece se repite el frame, si baja se descarta)
deriva:   T_local += dizzy_drift_amp·s·(sin(2π·dizzy_drift_freq_x·t+φx), sin(2π·dizzy_drift_freq_y·t+φy))
sway:     cada dizzy_sway_period s, clave k_i = (2·rng()−1, 2·rng()−1); sway = dizzy_sway_amp·s·smoothstep_lerp(k_i, k_i+1)
umbrales: thr *= 1 − (1 − dizzy_fall_mult)·s ;  decays *= 1 − (1 − dizzy_decay_mult)·s
```
φx y φy salen de `rng()` al inicio del partido. *Ejemplo:* con z = 1 hay 120 ms de retardo (7 ticks), 0.10 m de deriva y caída con I ≥ 0.75.

## 8. Determinismo

- Acumulador de paso fijo con como mucho 5 pasos por frame. El render interpola y nunca escribe estado.
- PRNG con semilla (`CONFIG.seed`, mulberry32) y streams separados: partido, sway_P0, sway_P1. Se consume en orden fijo. Nada de `Math.random` ni `Date.now` en la simulación.
- Orden por tick: entradas (con retardo) → pies P0, P1 → pelvis → θ → balón → pie–balón (P0L, P0R, P1L, P1R) → cuerpo–balón → cuerpo–cuerpo → pie–pierna → paredes → gol → I y estados.
- Las entradas son int8: una partida entera = semilla + lista de InputFrames, lo que sirve para replay y rollback.
- Para online entre motores JS, `sin/cos/atan2/exp` no están garantizados bit a bit: conviene usar una LUT o un polinomio propio. `+ − × ÷ sqrt` sí son IEEE exactos.

## 9. Tabla de tuning

| clave | unidad | def | min | max | paso |
|---|---|---|---|---|---|
| touch_radius_px | px | 70 | 40 | 120 | 5 |
| input_deadzone | – | 0.12 | 0 | 0.3 | 0.01 |
| key_ramp_rate | 1/s | 10 | 4 | 20 | 1 |
| input_frame | 0 local / 1 cámara | 0 | 0 | 1 | 1 |
| foot_reach | m | 0.55 | 0.35 | 0.8 | 0.05 |
| foot_rest_offset | m | 0.15 | 0.08 | 0.25 | 0.01 |
| foot_omega | rad/s | 25 | 10 | 40 | 1 |
| foot_zeta | – | 0.8 | 0.4 | 1.2 | 0.05 |
| foot_max_speed | m/s | 10 | 5 | 15 | 0.5 |
| foot_radius | m | 0.09 | 0.06 | 0.14 | 0.01 |
| foot_lift_height | m | 0.06 | 0.02 | 0.15 | 0.01 |
| foot_lift_rate | m/s | 0.6 | 0.3 | 2 | 0.1 |
| plant_speed_max | m/s | 1.5 | 0.5 | 3 | 0.1 |
| plant_timeout | s | 0.15 | 0.05 | 0.3 | 0.01 |
| leg_stretch_max | m | 0.75 | 0.6 | 1.0 | 0.05 |
| body_omega | rad/s | 7 | 4 | 12 | 0.5 |
| body_zeta | – | 0.9 | 0.5 | 1.2 | 0.05 |
| body_max_speed | m/s | 3.2 | 2 | 5 | 0.1 |
| body_lean | m | 0.05 | 0 | 0.15 | 0.01 |
| com_lookahead | s | 0.15 | 0.05 | 0.3 | 0.01 |
| turn_rate | rad/s | 3 | 1 | 8 | 0.25 |
| turn_min_speed | m/s | 0.4 | 0.1 | 1 | 0.05 |
| body_radius | m | 0.28 | 0.2 | 0.4 | 0.01 |
| support_margin | m | 0.12 | 0.05 | 0.25 | 0.01 |
| swing_grace | s | 0.6 | 0.2 | 1.5 | 0.05 |
| imb_gain_excess | 1/(m·s) | 3 | 1 | 8 | 0.25 |
| imb_gain_air | 1/s | 2.5 | 0 | 6 | 0.25 |
| air_grace | s | 0.15 | 0 | 0.4 | 0.01 |
| imb_decay_single | 1/s | 1.2 | 0.2 | 3 | 0.1 |
| imb_decay_double | 1/s | 2 | 0.5 | 4 | 0.1 |
| stumble_threshold | – | 0.6 | 0.3 | 0.9 | 0.05 |
| stumble_exit | – | 0.45 | 0.2 | 0.8 | 0.05 |
| fall_threshold | – | 1 | 0.5 | 1.5 | 0.05 |
| stumble_control_mult | – | 0.6 | 0.3 | 1 | 0.05 |
| fall_time | s | 1.2 | 0.5 | 3 | 0.1 |
| fall_friction | 1/s | 6 | 1 | 15 | 0.5 |
| getup_time | s | 0.5 | 0.2 | 1.5 | 0.05 |
| getup_imbalance | – | 0.2 | 0 | 0.5 | 0.05 |
| invuln_time | s | 0.8 | 0 | 2 | 0.1 |
| auto_step | bool | 1 | 0 | 1 | 1 |
| auto_step_delay | s | 0.4 | 0.1 | 1.5 | 0.05 |
| auto_step_time | s | 0.2 | 0.1 | 0.5 | 0.05 |
| ball_radius | m | 0.16 | 0.11 | 0.22 | 0.01 |
| ball_mass | kg | 0.45 | 0.3 | 1 | 0.05 |
| gravity | m/s² | 9.81 | 5 | 15 | 0.1 |
| ball_drag | 1/m | 0.015 | 0 | 0.05 | 0.001 |
| ball_roll_friction | – | 0.12 | 0.02 | 0.3 | 0.01 |
| ball_roll_damping | 1/s | 0.3 | 0 | 1 | 0.05 |
| ball_restitution_ground | – | 0.55 | 0.2 | 0.85 | 0.05 |
| ball_restitution_wall | – | 0.7 | 0.3 | 0.95 | 0.05 |
| kick_speed_min | m/s | 3.5 | 2 | 6 | 0.25 |
| kick_restitution | – | 0.6 | 0.3 | 1 | 0.05 |
| kick_power_mult | – | 1 | 0.5 | 1.5 | 0.05 |
| kick_speed_cap | m/s | 16 | 10 | 25 | 0.5 |
| kick_aim_blend | – | 0.3 | 0 | 1 | 0.05 |
| loft_gain | – | 2 | 0 | 4 | 0.1 |
| loft_max_deg | ° | 40 | 0 | 60 | 1 |
| kick_recoil_k | 1/(m/s) | 0.02 | 0 | 0.06 | 0.005 |
| dribble_restitution | – | 0.1 | 0 | 0.4 | 0.05 |
| dribble_speed_cap | m/s | 4 | 2 | 7 | 0.25 |
| foot_ball_cooldown | s | 0.12 | 0.05 | 0.3 | 0.01 |
| leg_radius | m | 0.08 | 0.05 | 0.12 | 0.01 |
| body_restitution | – | 0.2 | 0 | 0.6 | 0.05 |
| charge_min_speed | m/s | 1 | 0 | 3 | 0.1 |
| charge_imb_k | 1/(m/s) | 0.35 | 0 | 1 | 0.05 |
| charge_self_k | 1/(m/s) | 0.15 | 0 | 0.5 | 0.05 |
| brace_mult | – | 0.5 | 0.2 | 1 | 0.05 |
| tackle_imb_k | 1/(m/s) | 0.08 | 0 | 0.2 | 0.01 |
| tackle_planted_mult | – | 1.3 | 1 | 2 | 0.05 |
| clean_tackle_mult | – | 0.3 | 0 | 1 | 0.05 |
| clean_tackle_window | s | 0.15 | 0.05 | 0.4 | 0.01 |
| tackle_self_imb | – | 0.2 | 0 | 0.5 | 0.05 |
| pitch_length | m | 20 | 14 | 30 | 1 |
| pitch_width | m | 12 | 8 | 20 | 1 |
| goal_width | m | 3 | 2 | 5 | 0.1 |
| goal_height | m | 1.5 | 1 | 2.5 | 0.1 |
| wall_height | m | 4 | 2 | 8 | 0.5 |
| corner_chamfer | m | 1.5 | 0 | 3 | 0.25 |
| dizzy_input_delay_ms | ms | 120 | 0 | 300 | 10 |
| dizzy_drift_amp | m | 0.1 | 0 | 0.25 | 0.01 |
| dizzy_drift_freq_x | Hz | 0.37 | 0.05 | 1.5 | 0.01 |
| dizzy_drift_freq_y | Hz | 0.23 | 0.05 | 1.5 | 0.01 |
| dizzy_sway_amp | m | 0.08 | 0 | 0.2 | 0.01 |
| dizzy_sway_period | s | 0.5 | 0.2 | 2 | 0.05 |
| dizzy_fall_mult | – | 0.75 | 0.4 | 1 | 0.05 |
| dizzy_decay_mult | – | 0.7 | 0.3 | 1 | 0.05 |
| dizzy_ramp_time | s | 90 | 20 | 300 | 5 |
| dizzy_level_floor | – | 0.4 | 0 | 1 | 0.05 |

## Riesgos a validar en playtest

1. Marco local vs. cámara: con la cámara lateral, "arriba = adelante del personaje" se invierte al mirar a la izquierda. Por eso existe `input_frame`; hay que probar los dos.
2. Los umbrales de I están derivados a mano: hay que ajustar `imb_gain_excess`/`imb_decay_*` hasta que caminar sea estable y la pata coja o el sprint con frenazo no lo sean.
3. La vaselina por altura de contacto puede sentirse poco legible. Alternativa: que el loft dependa de |u| en el momento del contacto.
