// PROTOTYPE - NOT FOR PRODUCTION
// Question: ¿Es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar, con físicas torpes?
// Date: 2026-11-10
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
// Sources: design/physics-controls.md (§9 tuning table), design/game-design.md, design/bot-ai.md,
// design/ux.md, design/art-direction.md. Values that differ from a doc say why.
window.CONFIG = {
  seed: 1, // every gameplay random call reads a seeded stream, never Math.random (?seed= overrides)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- The feel that matters most: feet, balance, kick ------------------------------------
  foot_reach: { value: 0.6, min: 0.35, max: 0.8, step: 0.05 },        // m, |u|=1 reach from the hip (spec 0.55; longer stride for a 16 m cage)
  foot_rest_offset: { value: 0.15, min: 0.08, max: 0.25, step: 0.01 }, // m, lateral hip offset of each foot
  foot_omega: { value: 25, min: 10, max: 40, step: 1 },               // rad/s, swing spring stiffness
  foot_zeta: { value: 0.8, min: 0.4, max: 1.2, step: 0.05 },          // swing damping ratio
  foot_max_speed: { value: 10, min: 5, max: 15, step: 0.5 },          // m/s, foot speed cap
  kick_speed_min: { value: 3.5, min: 2, max: 6, step: 0.25 },         // m/s, foot speed that counts as a kick
  kick_restitution: { value: 0.6, min: 0.3, max: 1, step: 0.05 },     // ball speed = (1+e)·foot normal speed
  kick_power_mult: { value: 1, min: 0.5, max: 1.5, step: 0.05 },
  kick_speed_cap: { value: 17, min: 10, max: 25, step: 0.5 },         // m/s (61 km/h)
  support_margin: { value: 0.12, min: 0.05, max: 0.25, step: 0.01 },  // m, around the feet
  imb_gain_excess: { value: 3, min: 1, max: 8, step: 0.25 },          // 1/(m·s)
  imb_decay_single: { value: 1.2, min: 0.2, max: 3, step: 0.1 },      // 1/s on one foot
  imb_decay_double: { value: 2, min: 0.5, max: 4, step: 0.1 },        // 1/s on both feet
  fall_threshold: { value: 1, min: 0.5, max: 1.5, step: 0.05 },

  // ---- Input ------------------------------------------------------------------------------
  touch_radius_px: { value: 70, min: 40, max: 120, step: 5 },         // CSS px of drag for |u|=1
  input_deadzone: { value: 0.12, min: 0, max: 0.3, step: 0.01 },
  key_ramp_rate: { value: 10, min: 4, max: 20, step: 1 },             // 1/s, keyboard foot target ramp
  key_kick_charge_time: { value: 0.6, min: 0.2, max: 1.2, step: 0.05 }, // s to full wind-up holding F / Shift
  key_kick_follow_time: { value: 0.22, min: 0.1, max: 0.5, step: 0.01 }, // s the foot stays up after the kick key

  // ---- Foot -------------------------------------------------------------------------------
  foot_radius: { value: 0.09, min: 0.06, max: 0.14, step: 0.01 },     // m, contact sphere
  foot_lift_height: { value: 0.07, min: 0.02, max: 0.15, step: 0.01 }, // m
  foot_lift_rate: { value: 0.8, min: 0.3, max: 2, step: 0.1 },        // m/s
  plant_speed_max: { value: 1.5, min: 0.5, max: 3, step: 0.1 },       // m/s, foot lands below this
  plant_timeout: { value: 0.08, min: 0.04, max: 0.3, step: 0.01 },    // s (spec 0.15: too slow for quick thumbs, feet never landed)
  leg_stretch_max: { value: 0.8, min: 0.6, max: 1.0, step: 0.05 },    // m, a planted foot past this pops up (splits)

  // ---- Body and balance -------------------------------------------------------------------
  body_omega: { value: 7, min: 4, max: 12, step: 0.5 },               // rad/s, pelvis spring to the support
  body_zeta: { value: 0.9, min: 0.5, max: 1.2, step: 0.05 },
  body_max_speed: { value: 3.2, min: 2, max: 5, step: 0.1 },          // m/s
  swing_lean: { value: 0.45, min: 0, max: 0.8, step: 0.05 },          // on one foot, the body follows the lifted foot this far: reach out and you tip
  one_foot_time: { value: 1.2, min: 0.4, max: 3, step: 0.1 },         // s on one foot before the wobble starts
  one_foot_wobble: { value: 0.35, min: 0, max: 1.5, step: 0.05 },     // imbalance per s after that
  body_lean: { value: 0.05, min: 0, max: 0.15, step: 0.01 },          // m, forward lean
  com_lookahead: { value: 0.15, min: 0.05, max: 0.3, step: 0.01 },    // s, projected centre of mass
  turn_rate: { value: 4, min: 1, max: 8, step: 0.25 },                // rad/s, body turns to face the ball
  face_ball_min_dist: { value: 0.7, min: 0.3, max: 1.5, step: 0.05 }, // m, closer than this the facing holds
  body_radius: { value: 0.28, min: 0.2, max: 0.4, step: 0.01 },       // m
  swing_grace: { value: 0.6, min: 0.2, max: 1.5, step: 0.05 },        // s a lifted foot still counts as support
  imb_gain_air: { value: 2.5, min: 0, max: 6, step: 0.25 },           // 1/s with no foot down
  air_grace: { value: 0.15, min: 0, max: 0.4, step: 0.01 },           // s
  stumble_threshold: { value: 0.6, min: 0.3, max: 0.9, step: 0.05 },
  stumble_exit: { value: 0.45, min: 0.2, max: 0.8, step: 0.05 },
  stumble_control_mult: { value: 0.6, min: 0.3, max: 1, step: 0.05 },
  fall_time: { value: 1.2, min: 0.5, max: 3, step: 0.1 },             // s on the ground
  fall_quick_getup: { value: 0.5, min: 0.2, max: 1.2, step: 0.05 },   // s before both thumbs can get you up
  fall_friction: { value: 6, min: 1, max: 15, step: 0.5 },            // 1/s
  getup_time: { value: 0.5, min: 0.2, max: 1.5, step: 0.05 },         // s
  getup_imbalance: { value: 0.2, min: 0, max: 0.5, step: 0.05 },
  invuln_time: { value: 0.8, min: 0, max: 2, step: 0.1 },             // s after getting up
  auto_step: { value: 1, min: 0, max: 1, step: 1 },                   // assist: a resting body re-plants a foot
  auto_step_delay: { value: 0.4, min: 0.1, max: 1.5, step: 0.05 },    // s
  auto_step_time: { value: 0.2, min: 0.1, max: 0.5, step: 0.05 },     // s
  assist_fall_mult: { value: 1.4, min: 1, max: 2, step: 0.05 },       // fall threshold × this with "Asistencia de equilibrio"

  // ---- Ball -------------------------------------------------------------------------------
  ball_radius: { value: 0.18, min: 0.11, max: 0.22, step: 0.01 },     // m (toy scale: physics said 0.16, art 0.22)
  gravity: { value: 9.81, min: 5, max: 15, step: 0.1 },               // m/s²
  ball_drag: { value: 0.015, min: 0, max: 0.05, step: 0.001 },        // 1/m
  ball_roll_friction: { value: 0.12, min: 0.02, max: 0.3, step: 0.01 },
  ball_roll_damping: { value: 0.3, min: 0, max: 1, step: 0.05 },      // 1/s
  ball_restitution_ground: { value: 0.55, min: 0.2, max: 0.85, step: 0.05 },
  ball_restitution_wall: { value: 0.7, min: 0.3, max: 0.95, step: 0.05 },
  kick_aim_blend: { value: 0.35, min: 0, max: 1, step: 0.05 },        // how much the foot's swing direction steers the ball
  loft_gain: { value: 1.6, min: 0, max: 4, step: 0.1 },               // contact low on the ball = chip
  loft_max_deg: { value: 35, min: 0, max: 60, step: 1 },              // °
  kick_recoil_k: { value: 0.02, min: 0, max: 0.06, step: 0.005 },     // imbalance per m/s of kick
  dribble_restitution: { value: 0.1, min: 0, max: 0.4, step: 0.05 },
  dribble_speed_cap: { value: 4.5, min: 2, max: 7, step: 0.25 },      // m/s
  foot_ball_cooldown: { value: 0.12, min: 0.05, max: 0.3, step: 0.01 }, // s per foot
  leg_radius: { value: 0.08, min: 0.05, max: 0.12, step: 0.01 },      // m

  // ---- Contact between players -------------------------------------------------------------
  body_restitution: { value: 0.2, min: 0, max: 0.6, step: 0.05 },
  charge_min_speed: { value: 1, min: 0, max: 3, step: 0.1 },          // m/s
  charge_imb_k: { value: 0.35, min: 0, max: 1, step: 0.05 },
  charge_self_k: { value: 0.15, min: 0, max: 0.5, step: 0.05 },
  brace_mult: { value: 0.5, min: 0.2, max: 1, step: 0.05 },           // both feet down halves a charge
  tackle_imb_k: { value: 0.08, min: 0, max: 0.2, step: 0.01 },
  tackle_planted_mult: { value: 1.3, min: 1, max: 2, step: 0.05 },
  clean_tackle_mult: { value: 0.3, min: 0, max: 1, step: 0.05 },
  clean_tackle_window: { value: 0.15, min: 0.05, max: 0.4, step: 0.01 }, // s
  tackle_self_imb: { value: 0.2, min: 0, max: 0.5, step: 0.05 },

  // ---- Arena and match (studio call: 16 × 10 m, see brief) ----------------------------------
  pitch_length: { value: 16, min: 12, max: 30, step: 1 },             // m, goal to goal
  pitch_width: { value: 10, min: 8, max: 20, step: 1 },               // m
  goal_width: { value: 3, min: 2, max: 5, step: 0.1 },                // m
  goal_height: { value: 1.6, min: 1, max: 2.5, step: 0.1 },           // m
  goal_depth: { value: 1, min: 0.5, max: 2, step: 0.1 },              // m
  wall_height: { value: 4, min: 2, max: 8, step: 0.5 },               // m, cage net roof
  board_height: { value: 1, min: 0.5, max: 1.5, step: 0.1 },          // m, the low boards
  corner_chamfer: { value: 1.2, min: 0, max: 3, step: 0.25 },         // m
  match_time: { value: 180, min: 30, max: 600, step: 10 },            // s
  goals_to_win: { value: 3, min: 1, max: 9, step: 1 },
  golden_widen_step: { value: 0.5, min: 0, max: 1, step: 0.1 },       // m wider every golden_widen_every s
  golden_widen_every: { value: 30, min: 10, max: 60, step: 5 },       // s
  golden_widen_max: { value: 5, min: 3, max: 8, step: 0.5 },          // m
  kickoff_taker_dist: { value: 1.6, min: 0.8, max: 4, step: 0.1 },    // m from the ball, the side that conceded
  kickoff_other_dist: { value: 4, min: 2, max: 7, step: 0.25 },       // m
  countdown_time: { value: 2.4, min: 0.5, max: 4, step: 0.1 },        // s, "3, 2, 1, ¡YA!"
  goal_pause_time: { value: 2.6, min: 1, max: 5, step: 0.1 },         // s of celebration before the kickoff
  stuck_time: { value: 8, min: 3, max: 15, step: 0.5 },               // s the ball barely moves → neutral drop
  stuck_radius: { value: 0.8, min: 0.3, max: 2, step: 0.1 },          // m

  // ---- Modo Mareado (both players, never ranked) -------------------------------------------
  dizzy_input_delay_ms: { value: 120, min: 0, max: 300, step: 10 },
  dizzy_drift_amp: { value: 0.12, min: 0, max: 0.25, step: 0.01 },    // m
  dizzy_drift_freq_x: { value: 0.43, min: 0.05, max: 1.5, step: 0.01 }, // Hz (left 2.3 s, right 3.1 s periods in game design)
  dizzy_drift_freq_y: { value: 0.32, min: 0.05, max: 1.5, step: 0.01 }, // Hz
  dizzy_sway_amp: { value: 0.08, min: 0, max: 0.2, step: 0.01 },      // m on the projected centre of mass
  dizzy_sway_period: { value: 0.5, min: 0.2, max: 2, step: 0.05 },    // s
  dizzy_fall_mult: { value: 0.7, min: 0.4, max: 1, step: 0.05 },      // thresholds × this at full dizziness
  dizzy_decay_mult: { value: 0.7, min: 0.3, max: 1, step: 0.05 },
  dizzy_ramp_time: { value: 90, min: 20, max: 300, step: 5 },         // s to full dizziness; a goal resets it
  dizzy_level_floor: { value: 0.45, min: 0, max: 1, step: 0.05 },
  dizzy_stumble_min: { value: 6, min: 2, max: 20, step: 0.5 },        // s between random stumbles
  dizzy_stumble_max: { value: 10, min: 3, max: 30, step: 0.5 },
  dizzy_stumble_impulse: { value: 1.5, min: 0, max: 4, step: 0.1 },   // m/s pushed into the pelvis
  dizzy_cross_every: { value: 20, min: 8, max: 60, step: 1 },         // s between "pies cruzados"
  dizzy_cross_time: { value: 3, min: 1, max: 8, step: 0.5 },          // s the feet stay swapped
  dizzy_cross_warn: { value: 1, min: 0.3, max: 3, step: 0.1 },        // s warning before
  dizzy_cam_roll_deg: { value: 3, min: 0, max: 8, step: 0.5 },        // ° camera roll (off with "Reducir movimiento")
  dizzy_cam_roll_hz: { value: 0.5, min: 0.1, max: 1.5, step: 0.05 },

  // ---- Camera -------------------------------------------------------------------------------
  cam_height: { value: 2.15, min: 0.8, max: 4, step: 0.05 },          // m, over-the-shoulder
  cam_back: { value: 3.7, min: 1.5, max: 7, step: 0.1 },              // m behind the player
  cam_side: { value: 0.8, min: 0, max: 1, step: 0.05 },              // m to the right: the shoulder
  cam_look_ahead: { value: 2.8, min: 0.5, max: 5, step: 0.1 },        // m in front of the player the camera aims at
  cam_fov: { value: 62, min: 45, max: 85, step: 1 },                  // °
  cam_fp_fov: { value: 80, min: 60, max: 100, step: 1 },              // ° first person ("Vista Botines")
  cam_fp_pitch_deg: { value: 32, min: 10, max: 60, step: 1 },         // ° down, so the boots are in view
  cam_follow: { value: 6, min: 1, max: 15, step: 0.5 },               // 1/s camera smoothing

  // ---- Look and feedback --------------------------------------------------------------------
  trail_speed_min: { value: 7, min: 3, max: 15, step: 0.5 },          // m/s, ball trail above this
  footprint_fade: { value: 3, min: 0.5, max: 8, step: 0.25 },         // s, chalk footprints (signature)
  shake_on_kick: { value: 0.06, min: 0, max: 0.3, step: 0.01 },       // m camera shake per hard kick
  big_kick_speed: { value: 12, min: 6, max: 20, step: 0.5 },          // m/s that earns "¡PUM!"

  // The Liga de Barrio: names and silhouettes from art direction, presets and quirks from the bot
  // design. react ms, aim ° σ, cad ticks/step, power 0..1, greed, def, mist, shootR m.
  rivals: [
    { id: 'tito', name: 'Tito Bombo', blurb: 'Lento. Duda cada vez que tocas el balón.', react: 500, aim: 18, cad: 16, power: 0.55, greed: 0.05, def: 0.2, mist: 0.15, shootR: 6, quirk: 'hesitate' },
    { id: 'rulos', name: 'La Rulos', blurb: 'Regatea siempre. Solo tira de cerca.', react: 350, aim: 12, cad: 11, power: 0.5, greed: 0.08, def: 0.35, mist: 0.1, shootR: 4.5, quirk: 'dribbler' },
    { id: 'ramiro', name: 'Don Ramiro', blurb: 'Tira desde lejos... y se cae.', react: 300, aim: 10, cad: 13, power: 1, greed: 0.35, def: 0.4, mist: 0.08, shootR: 11, quirk: 'cannon' },
    { id: 'mamut', name: 'Mamut', blurb: 'Un muro. Vuelve atrás en cuanto pierde el balón.', react: 250, aim: 8, cad: 12, power: 0.75, greed: 0.05, def: 0.85, mist: 0.06, shootR: 7, quirk: 'wall' },
    { id: 'chispa', name: 'Chispa', blurb: 'Rápida y pesada: carga con el hombro.', react: 200, aim: 6, cad: 9, power: 0.85, greed: 0.2, def: 0.55, mist: 0.05, shootR: 8, quirk: 'charge' },
    { id: 'capitana', name: 'La Capitana', blurb: 'La jefa. Amaga y te deja sentado.', react: 120, aim: 3, cad: 8, power: 0.95, greed: 0.02, def: 0.9, mist: 0.02, shootR: 9, quirk: 'feint' },
  ],
  bot_balance_guard: { value: 0.55, min: 0.2, max: 0.9, step: 0.05 }, // bots brace when imbalance passes this
  bot_think_every: { value: 6, min: 1, max: 20, step: 1 },            // ticks between decisions
  bot_lead_sloppy: { value: 2, min: 1, max: 5, step: 1 },             // goals ahead before a bot gets sloppy
};
