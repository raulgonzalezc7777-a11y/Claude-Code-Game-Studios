// PROTOTYPE - NOT FOR PRODUCTION
// Question: ¿Es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar, con físicas torpes?
// Date: 2026-11-10
// The match simulation: deterministic on a fixed 1/60 s step, seeded streams, no Math.random and no
// clock. Built from design/physics-controls.md; every number is read live from config.js.
// Ground plane is XZ, Y up. Team 0 defends the goal at -x and attacks +x.
'use strict';
(function () {
  const K = new Proxy({}, { get: (_, k) => CONFIG[k].value });
  const DT = 1 / 60;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const hyp = Math.hypot;

  function stream(s) { // mulberry32: one independent seeded stream per use
    let a = s | 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  // Distance from point (px,pz) to segment (ax,az)-(bx,bz).
  function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = l2 > 1e-9 ? clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1) : 0;
    return hyp(px - (ax + dx * t), pz - (az + dz * t));
  }

  function makeFoot(side) {
    return { side, x: 0, z: 0, y: 0, vx: 0, vz: 0, px: 0, pz: 0, py: 0, st: 'planted', t: 0, cool: 0,
      forced: 0, ftx: 0, ftz: 0, tackleCool: 0, kickT: 0 };
  }
  function makePlayer(id, team) {
    return {
      id, team, x: 0, z: 0, vx: 0, vz: 0, th: 0, I: 0, st: 'stand', tSt: 0, invuln: 0, tAir: 0, idle: 0,
      feet: [makeFoot(-1), makeFoot(1)], fallX: 1, fallZ: 0, gx: 0, gz: 0, cx: 0, cz: 0, lastBall: -99,
      delay: [], swayA: [0, 0], swayB: [0, 0], swayT: 0, stumbleT: 0, input: blankFrame(),
      stats: { shots: 0, onTarget: 0, falls: 0, maxShot: 0, touches: 0, steps: 0, goals: 0 },
    };
  }
  function blankFrame() { return { lx: 0, ly: 0, ld: 0, rx: 0, ry: 0, rd: 0 }; }
  const q8 = v => Math.round(clamp(v, -1, 1) * 127) / 127; // int8 frames: replayable

  function fwd(p) { return [Math.cos(p.th), Math.sin(p.th)]; }
  function right(p) { return [-Math.sin(p.th), Math.cos(p.th)]; }

  function placePlayer(p, x, z, th) {
    p.x = x; p.z = z; p.vx = 0; p.vz = 0; p.th = th; p.I = 0; p.st = 'stand'; p.tSt = 0; p.invuln = 0;
    p.tAir = 0; p.idle = 0; p.delay.length = 0;
    const r = right(p);
    for (const f of p.feet) {
      f.x = f.px = x + r[0] * f.side * K.foot_rest_offset; f.z = f.pz = z + r[1] * f.side * K.foot_rest_offset;
      f.y = f.py = 0; f.vx = f.vz = 0; f.st = 'planted'; f.t = 0; f.cool = 0; f.forced = 0;
    }
  }

  // ---- World ------------------------------------------------------------------------------
  // opts: { seed, mareado, assist: [bool,bool], solo, noBall }
  function createWorld(opts) {
    const seed = opts.seed | 0;
    const w = {
      t: 0, tick: 0, opts, mareado: !!opts.mareado, solo: !!opts.solo,
      rngMatch: stream(seed * 7 + 1), rngSway: [stream(seed * 13 + 2), stream(seed * 17 + 3)],
      players: [makePlayer(0, 0)], score: [0, 0],
      ball: { x: 0, y: K.ball_radius, z: 0, vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 0, last: -1, lastT: -99, active: !opts.noBall, spin: 0 },
      phase: 'countdown', phaseT: 0, clock: K.match_time, golden: false, goldenT: 0, goalW: K.goal_width,
      kickoffBy: 0, lastGoal: null, over: false, winner: -1, events: [], stuckS: [], stuckT: 0,
      dizzy: 0, crossT: 0, crossed: false, crossWarn: false, phase0: [0, 0, 0, 0],
    };
    if (!w.solo) w.players.push(makePlayer(1, 1));
    for (let i = 0; i < 4; i++) w.phase0[i] = w.rngMatch() * TAU;
    for (const p of w.players) p.stumbleT = K.dizzy_stumble_min + w.rngSway[p.id]() * (K.dizzy_stumble_max - K.dizzy_stumble_min);
    kickoff(w, 0);
    return w;
  }

  function kickoff(w, taker) {
    const b = w.ball;
    b.x = 0; b.z = 0; b.y = K.ball_radius; b.vx = b.vy = b.vz = 0; b.px = b.x; b.py = b.y; b.pz = b.z; b.last = -1;
    for (const p of w.players) {
      const d = w.solo ? 3 : (p.team === taker ? K.kickoff_taker_dist : K.kickoff_other_dist);
      const sx = p.team === 0 ? -1 : 1;
      placePlayer(p, sx * d, 0, p.team === 0 ? 0 : Math.PI);
    }
    w.kickoffBy = taker; w.stuckS.length = 0; w.stuckT = 0;
    w.phase = 'countdown'; w.phaseT = 0;
  }

  function dizzyScale(w) { return w.mareado ? K.dizzy_level_floor + (1 - K.dizzy_level_floor) * w.dizzy : 0; }

  // ---- Input stage: delay, crossed feet (Modo Mareado) --------------------------------------
  function takeInput(w, p, raw) {
    let f = { lx: q8(raw.lx), ly: q8(raw.ly), ld: raw.ld ? 1 : 0, rx: q8(raw.rx), ry: q8(raw.ry), rd: raw.rd ? 1 : 0 };
    if (w.mareado) {
      p.delay.push(f);
      const D = Math.round(K.dizzy_input_delay_ms * dizzyScale(w) * 0.06);
      while (p.delay.length > D + 1) p.delay.shift();
      f = p.delay[0];
      if (w.crossed) f = { lx: f.rx, ly: f.ry, ld: f.rd, rx: f.lx, ry: f.ly, rd: f.ld };
    }
    return f;
  }

  // ---- Feet -----------------------------------------------------------------------------------
  function updateFeet(w, p, f) {
    const fw = fwd(p), rt = right(p), s = dizzyScale(w);
    const L2 = K.pitch_length / 2 - 0.12, W2 = K.pitch_width / 2 - 0.12;
    const omega = K.foot_omega * (p.st === 'stumble' ? K.stumble_control_mult : 1), zeta = K.foot_zeta;
    for (const ft of p.feet) {
      ft.px = ft.x; ft.pz = ft.z; ft.py = ft.y;
      ft.cool = Math.max(0, ft.cool - DT); ft.tackleCool = Math.max(0, ft.tackleCool - DT);
      if (p.st === 'fallen') { ft.vx *= 0.8; ft.vz *= 0.8; ft.y = Math.max(0, ft.y - 0.02); continue; }
      if (p.st === 'getup') { // feet tuck back under the hips
        const tx = p.x + rt[0] * ft.side * K.foot_rest_offset, tz = p.z + rt[1] * ft.side * K.foot_rest_offset;
        ft.x += (tx - ft.x) * 0.18; ft.z += (tz - ft.z) * 0.18; ft.y = 0; ft.vx = ft.vz = 0; ft.st = 'planted';
        continue;
      }
      const left = ft.side < 0;
      const down = left ? f.ld : f.rd;
      let ux = left ? f.lx : f.rx, uy = left ? f.ly : f.ry;
      let tx, tz, swinging = false;
      if (down) {
        swinging = true; ft.forced = 0;
        let lx = ft.side * K.foot_rest_offset + ux * K.foot_reach, ly = uy * K.foot_reach;
        if (s > 0) { // drift: each foot wanders on its own slow sine
          const ph = left ? 0 : 2;
          lx += K.dizzy_drift_amp * s * Math.sin(TAU * K.dizzy_drift_freq_x * w.t + w.phase0[ph]);
          ly += K.dizzy_drift_amp * s * Math.sin(TAU * K.dizzy_drift_freq_y * w.t + w.phase0[ph + 1]);
        }
        tx = p.x + rt[0] * lx + fw[0] * ly; tz = p.z + rt[1] * lx + fw[1] * ly;
      } else if (ft.forced > 0) { // assist or over-stretch: a short synthetic step
        swinging = true; ft.forced -= DT; tx = ft.ftx; tz = ft.ftz;
      }
      if (swinging) {
        if (ft.st !== 'swing') { ft.st = 'swing'; ft.t = 0; }
        tx = clamp(tx, -L2, L2); tz = clamp(tz, -W2, W2);
        const ax = omega * omega * (tx - ft.x) - 2 * zeta * omega * ft.vx;
        const az = omega * omega * (tz - ft.z) - 2 * zeta * omega * ft.vz;
        ft.vx += ax * DT; ft.vz += az * DT;
        const sp = hyp(ft.vx, ft.vz);
        if (sp > K.foot_max_speed) { ft.vx *= K.foot_max_speed / sp; ft.vz *= K.foot_max_speed / sp; }
        ft.x += ft.vx * DT; ft.z += ft.vz * DT;
        ft.y = Math.min(K.foot_lift_height, ft.y + K.foot_lift_rate * DT);
        ft.t += DT;
        if (sp > K.kick_speed_min) ft.kickT = w.t;
      } else {
        if (ft.st === 'swing') { ft.st = 'planting'; ft.t = 0; }
        if (ft.st === 'planting') { // follow-through on its own inertia, then down
          ft.vx *= Math.exp(-6 * DT); ft.vz *= Math.exp(-6 * DT);
          ft.x += ft.vx * DT; ft.z += ft.vz * DT; ft.t += DT;
          ft.y = Math.max(0, ft.y - K.foot_lift_rate * 2 * DT);
          if (hyp(ft.vx, ft.vz) < K.plant_speed_max || ft.t >= K.plant_timeout) {
            ft.st = 'planted'; ft.y = 0; ft.vx = ft.vz = 0; p.stats.steps++;
            w.events.push({ type: 'plant', pid: p.id, side: ft.side, x: ft.x, z: ft.z, th: p.th });
          }
        } else { ft.vx = ft.vz = 0; ft.y = 0; }
      }
      ft.x = clamp(ft.x, -L2, L2); ft.z = clamp(ft.z, -W2, W2);
      // Over-stretch: a planted foot left too far behind pops up (the splits)
      if (ft.st === 'planted' && hyp(ft.x - p.x, ft.z - p.z) > K.leg_stretch_max && p.st !== 'getup') {
        ft.forced = 0.22; ft.ftx = p.x + rt[0] * ft.side * K.foot_rest_offset; ft.ftz = p.z + rt[1] * ft.side * K.foot_rest_offset;
        if (p.invuln <= 0) p.I += 0.25;
      }
    }
  }

  // ---- Pelvis, facing --------------------------------------------------------------------------
  function updateBody(w, p) {
    p.invuln = Math.max(0, p.invuln - DT);
    if (p.st === 'fallen') {
      const k = Math.exp(-K.fall_friction * DT); p.vx *= k; p.vz *= k;
      p.x += p.vx * DT; p.z += p.vz * DT; return;
    }
    const fw = fwd(p);
    const planted = p.feet.filter(f => f.st === 'planted');
    if (planted.length) {
      let cx = 0, cz = 0;
      for (const f of planted) { cx += f.x; cz += f.z; }
      cx /= planted.length; cz /= planted.length;
      if (planted.length === 1) { // weight shifts toward the lifted foot: reaching out tips you over
        const lift = p.feet.find(f => f.st !== 'planted');
        let dx = lift.x - cx, dz = lift.z - cz; const df = dx * fw[0] + dz * fw[1];
        if (df < 0) { dx -= fw[0] * df; dz -= fw[1] * df; } // a wind-up behind keeps the weight on the standing foot
        cx += dx * K.swing_lean; cz += dz * K.swing_lean;
      }
      const tx = cx + fw[0] * K.body_lean, tz = cz + fw[1] * K.body_lean;
      const wb = K.body_omega, zb = K.body_zeta;
      p.vx += (wb * wb * (tx - p.x) - 2 * zb * wb * p.vx) * DT;
      p.vz += (wb * wb * (tz - p.z) - 2 * zb * wb * p.vz) * DT;
    }
    const sp = hyp(p.vx, p.vz);
    if (sp > K.body_max_speed) { p.vx *= K.body_max_speed / sp; p.vz *= K.body_max_speed / sp; }
    p.x += p.vx * DT; p.z += p.vz * DT;
    // Facing: the body always turns to face the ball (studio call, see brief), at turn_rate
    const b = w.ball;
    let target = p.team === 0 ? 0 : Math.PI;
    if (b.active) {
      const dx = b.x - p.x, dz = b.z - p.z;
      if (hyp(dx, dz) > K.face_ball_min_dist) target = Math.atan2(dz, dx); else target = p.th;
    }
    const d = angDiff(p.th, target), m = K.turn_rate * DT * (p.st === 'getup' ? 0.3 : 1);
    p.th += clamp(d, -m, m);
  }

  // ---- Balance ---------------------------------------------------------------------------------
  function updateBalance(w, p, f) {
    p.tSt += DT;
    const s = dizzyScale(w);
    const assist = w.opts.assist && w.opts.assist[p.id] ? K.assist_fall_mult : 1;
    const thrMul = (1 - (1 - K.dizzy_fall_mult) * s) * assist;
    const decMul = 1 - (1 - K.dizzy_decay_mult) * s;
    if (p.st === 'fallen') {
      const both = f.ld && f.rd;
      if (p.tSt >= K.fall_time || (both && p.tSt >= K.fall_quick_getup)) { p.st = 'getup'; p.tSt = 0; w.events.push({ type: 'getup', pid: p.id }); }
      return;
    }
    if (p.st === 'getup') {
      if (p.tSt >= K.getup_time) { p.st = 'stand'; p.tSt = 0; p.I = K.getup_imbalance; p.invuln = K.invuln_time; }
      return;
    }
    // Sway (Mareado): smooth seeded wobble of the projected centre of mass
    let sx = 0, sz = 0;
    if (s > 0) {
      p.swayT += DT;
      if (p.swayT >= K.dizzy_sway_period) {
        p.swayT = 0; p.swayA = p.swayB;
        const r = w.rngSway[p.id];
        p.swayB = [(2 * r() - 1) * K.dizzy_sway_amp * s, (2 * r() - 1) * K.dizzy_sway_amp * s];
      }
      const k = smooth(clamp(p.swayT / K.dizzy_sway_period, 0, 1));
      sx = p.swayA[0] + (p.swayB[0] - p.swayA[0]) * k; sz = p.swayA[1] + (p.swayB[1] - p.swayA[1]) * k;
      p.stumbleT -= DT;
      if (p.stumbleT <= 0) { // random stumble: a shove from nowhere
        const r = w.rngSway[p.id], a = r() * TAU;
        p.vx += Math.cos(a) * K.dizzy_stumble_impulse; p.vz += Math.sin(a) * K.dizzy_stumble_impulse;
        p.stumbleT = K.dizzy_stumble_min + r() * (K.dizzy_stumble_max - K.dizzy_stumble_min);
        w.events.push({ type: 'stumble', pid: p.id });
      }
    }
    const gx = p.x + p.vx * K.com_lookahead + sx, gz = p.z + p.vz * K.com_lookahead + sz;
    p.gx = gx; p.gz = gz;
    const sup = p.feet.filter(ft => ft.st === 'planted' || ft.st === 'planting' || (ft.st === 'swing' && ft.t < K.swing_grace));
    const plantedN = p.feet.filter(ft => ft.st === 'planted').length;
    let e = 0;
    if (sup.length === 2) {
      e = Math.max(0, segDist(gx, gz, sup[0].x, sup[0].z, sup[1].x, sup[1].z) - K.support_margin);
      p.cx = (sup[0].x + sup[1].x) / 2; p.cz = (sup[0].z + sup[1].z) / 2;
    } else if (sup.length === 1) {
      e = Math.max(0, hyp(gx - sup[0].x, gz - sup[0].z) - K.support_margin);
      p.cx = sup[0].x; p.cz = sup[0].z;
    } else { p.cx = p.x; p.cz = p.z; }
    if (sup.length === 0) p.tAir += DT; else p.tAir = 0;
    p.oneFoot = plantedN === 1 ? (p.oneFoot || 0) + DT : 0;
    let dI = K.imb_gain_excess * e + (sup.length === 0 && p.tAir > K.air_grace ? K.imb_gain_air : 0);
    if (p.oneFoot > K.one_foot_time) dI += K.one_foot_wobble;
    if (e === 0 && plantedN > 0 && !(p.oneFoot > K.one_foot_time)) dI -= (plantedN === 1 ? K.imb_decay_single : K.imb_decay_double) * decMul;
    p.I = Math.max(0, p.I + dI * DT);
    // Auto-step assist: a resting body with a bad stance re-plants one foot by itself
    const rest = !f.ld && !f.rd;
    p.idle = rest ? p.idle + DT : 0;
    if (K.auto_step && rest && p.idle >= K.auto_step_delay && plantedN === 2) {
      const spread = hyp(p.feet[0].x - p.feet[1].x, p.feet[0].z - p.feet[1].z);
      if (e > 0 || p.I > 0.25 || spread < 0.15 || spread > 0.6) {
        const rt = right(p);
        let far = p.feet[0], fd = -1;
        for (const ft of p.feet) { const d = hyp(ft.x - gx, ft.z - gz); if (d > fd) { fd = d; far = ft; } }
        far.forced = K.auto_step_time;
        far.ftx = gx + rt[0] * far.side * K.foot_rest_offset; far.ftz = gz + rt[1] * far.side * K.foot_rest_offset;
        p.idle = 0;
      }
    }
    const fallThr = K.fall_threshold * thrMul;
    if (p.I >= fallThr) {
      let dx = gx - p.cx, dz = gz - p.cz, l = hyp(dx, dz);
      if (l < 1e-3) { dx = p.vx; dz = p.vz; l = hyp(dx, dz); }
      if (l < 1e-3) { dx = Math.cos(p.th); dz = Math.sin(p.th); l = 1; }
      p.fallX = dx / l; p.fallZ = dz / l;
      p.st = 'fallen'; p.tSt = 0; p.stats.falls++;
      for (const ft of p.feet) { ft.st = 'planted'; ft.forced = 0; }
      w.events.push({ type: 'fall', pid: p.id, x: p.x, z: p.z });
      return;
    }
    if (p.st === 'stand' && p.I >= K.stumble_threshold * thrMul) p.st = 'stumble';
    else if (p.st === 'stumble' && p.I < K.stumble_exit * thrMul) p.st = 'stand';
  }

  // ---- Ball --------------------------------------------------------------------------------------
  function updateBall(w) {
    const b = w.ball, r = K.ball_radius, g = K.gravity;
    b.px = b.x; b.py = b.y; b.pz = b.z;
    if (!b.active) return;
    b.vy -= g * DT;
    const sp = hyp(b.vx, b.vy, b.vz);
    if (sp > 0) { const k = 1 - Math.min(0.5, K.ball_drag * sp * DT); b.vx *= k; b.vy *= k; b.vz *= k; }
    b.x += b.vx * DT; b.y += b.vy * DT; b.z += b.vz * DT;
    if (b.y <= r + 0.001) { // ground: bounce, then roll
      b.y = r;
      if (b.vy < 0) {
        if (b.vy < -1.2) w.events.push({ type: 'bounce', v: -b.vy, x: b.x, z: b.z });
        b.vy = -K.ball_restitution_ground * b.vy; if (b.vy < 0.5) b.vy = 0;
      }
      const h = hyp(b.vx, b.vz);
      if (h > 0) {
        const dec = Math.min(h, K.ball_roll_friction * g * DT);
        b.vx -= b.vx / h * dec; b.vz -= b.vz / h * dec;
        const k = 1 - K.ball_roll_damping * DT; b.vx *= k; b.vz *= k;
      }
    }
    if (b.y > K.wall_height - r) { b.y = K.wall_height - r; b.vy = -Math.abs(b.vy) * K.ball_restitution_wall; }
    arenaBall(w);
  }

  function bounceN(w, b, nx, nz, e, kind) { // reflect the ball off a vertical surface with normal n
    const vn = b.vx * nx + b.vz * nz;
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx; b.vz -= (1 + e) * vn * nz; b.vx *= 0.92; b.vz *= 0.92;
      if (-vn > 1.5) w.events.push({ type: kind, v: -vn, x: b.x, z: b.z, y: b.y });
    }
  }

  function arenaBall(w) {
    const b = w.ball, r = K.ball_radius;
    const L2 = K.pitch_length / 2, W2 = K.pitch_width / 2, gw = w.goalW / 2, gh = K.goal_height, gd = K.goal_depth;
    const inMouthZ = Math.abs(b.z) < gw - r * 0.1, low = b.y < gh - r * 0.2;
    const inside = Math.abs(b.x) <= L2;
    if (inside) {
      // side walls
      if (b.z > W2 - r) { b.z = W2 - r; bounceN(w, b, 0, -1, K.ball_restitution_wall, 'wall'); }
      if (b.z < -W2 + r) { b.z = -W2 + r; bounceN(w, b, 0, 1, K.ball_restitution_wall, 'wall'); }
      // end walls outside the mouth
      if (!(inMouthZ && low)) {
        if (b.x > L2 - r) { b.x = L2 - r; bounceN(w, b, -1, 0, K.ball_restitution_wall, 'wall'); }
        if (b.x < -L2 + r) { b.x = -L2 + r; bounceN(w, b, 1, 0, K.ball_restitution_wall, 'wall'); }
      }
      // chamfered corners
      const c = K.corner_chamfer;
      if (c > 0) {
        const sx = Math.sign(b.x) || 1, sz = Math.sign(b.z) || 1;
        const d = (Math.abs(b.x) + Math.abs(b.z) - (L2 + W2 - c)) / Math.SQRT2;
        if (d > -r) {
          const nx = -sx / Math.SQRT2, nz = -sz / Math.SQRT2, push = d + r;
          b.x += nx * push; b.z += nz * push; bounceN(w, b, nx, nz, K.ball_restitution_wall, 'wall');
        }
      }
    } else {
      // inside a goal box: soft nets
      const sx = Math.sign(b.x);
      if (b.z > gw - r) { b.z = gw - r; bounceN(w, b, 0, -1, 0.1, 'net'); }
      if (b.z < -gw + r) { b.z = -gw + r; bounceN(w, b, 0, 1, 0.1, 'net'); }
      if (Math.abs(b.x) > L2 + gd - r) { b.x = sx * (L2 + gd - r); bounceN(w, b, -sx, 0, 0.1, 'net'); }
      if (b.y > gh - r) { b.y = gh - r; b.vy = -Math.abs(b.vy) * 0.1; }
    }
    // posts and crossbars
    const pr = 0.06;
    for (const ex of [-L2, L2]) {
      for (const ez of [-gw, gw]) {
        if (b.y < gh + r) {
          const dx = b.x - ex, dz = b.z - ez, d = hyp(dx, dz);
          if (d < pr + r && d > 1e-6) {
            const nx = dx / d, nz = dz / d; b.x = ex + nx * (pr + r); b.z = ez + nz * (pr + r);
            bounceN(w, b, nx, nz, 0.75, 'post');
          }
        }
      }
      if (Math.abs(b.z) < gw) { // crossbar along z at height gh
        const dx = b.x - ex, dy = b.y - gh, d = hyp(dx, dy);
        if (d < pr + r && d > 1e-6) {
          const nx = dx / d, ny = dy / d; b.x = ex + nx * (pr + r); b.y = gh + ny * (pr + r);
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 1.75 * vn * nx; b.vy -= 1.75 * vn * ny; if (-vn > 1.5) w.events.push({ type: 'post', v: -vn, x: b.x, z: b.z, y: b.y }); }
        }
      }
    }
  }

  // ---- Foot and ball (swept sphere test, so a 10 m/s foot never tunnels) -------------------------
  function footBall(w, p, ft) {
    const b = w.ball; if (!b.active || p.st === 'fallen') return;
    const fr = K.foot_radius, R = fr + K.ball_radius;
    const c0x = ft.px, c0y = ft.py + fr, c0z = ft.pz, c1x = ft.x, c1y = ft.y + fr, c1z = ft.z;
    const r0x = b.px - c0x, r0y = b.py - c0y, r0z = b.pz - c0z;
    const r1x = b.x - c1x, r1y = b.y - c1y, r1z = b.z - c1z;
    const dx = r1x - r0x, dy = r1y - r0y, dz = r1z - r0z;
    const A = dx * dx + dy * dy + dz * dz, B = 2 * (r0x * dx + r0y * dy + r0z * dz), C = r0x * r0x + r0y * r0y + r0z * r0z - R * R;
    let t = -1;
    if (C <= 0) t = 0;
    else if (A > 1e-12) { const disc = B * B - 4 * A * C; if (disc >= 0) { const tt = (-B - Math.sqrt(disc)) / (2 * A); if (tt >= 0 && tt <= 1) t = tt; } }
    if (t < 0) return;
    let nx = r0x + dx * t, ny = r0y + dy * t, nz = r0z + dz * t;
    let nl = hyp(nx, ny, nz); if (nl < 1e-6) { nx = Math.cos(p.th); ny = 0; nz = Math.sin(p.th); nl = 1; }
    nx /= nl; ny /= nl; nz /= nl;
    // separate: the ball sits on the foot's surface at the end of the tick
    b.x = c1x + nx * R * 1.001; b.y = Math.max(K.ball_radius, c1y + ny * R * 1.001); b.z = c1z + nz * R * 1.001;
    const vn = (ft.vx - b.vx) * nx + (0 - b.vy) * ny + (ft.vz - b.vz) * nz;
    if (vn <= 0 || ft.cool > 0) return;
    const fsp = hyp(ft.vx, ft.vz);
    const ny2 = clamp(ny * K.loft_gain, 0, Math.sin(K.loft_max_deg * Math.PI / 180));
    let dirx = nx, diry = ny2, dirz = nz;
    if (fsp > 1e-3) { // the swing steers the ball
      const k = K.kick_aim_blend;
      dirx = nx * (1 - k) + (ft.vx / fsp) * k; dirz = nz * (1 - k) + (ft.vz / fsp) * k; diry = ny2;
    }
    const dl = hyp(dirx, diry, dirz) || 1; dirx /= dl; diry /= dl; dirz /= dl;
    const kick = fsp >= K.kick_speed_min && ft.st !== 'planted';
    let dv, cap;
    if (kick) { dv = (1 + K.kick_restitution) * vn * K.kick_power_mult * (p.st === 'stumble' ? 0.5 : 1); cap = K.kick_speed_cap; }
    else { dv = (1 + K.dribble_restitution) * vn; cap = K.dribble_speed_cap; }
    b.vx += dv * dirx; b.vy += dv * diry; b.vz += dv * dirz;
    const sp = hyp(b.vx, b.vy, b.vz);
    if (sp > cap) { const k = cap / sp; b.vx *= k; b.vy *= k; b.vz *= k; }
    ft.cool = K.foot_ball_cooldown; b.last = p.id; b.lastT = w.t; p.lastBall = w.t; p.stats.touches++;
    const out = Math.min(sp, cap);
    if (kick) {
      if (p.invuln <= 0) p.I += K.kick_recoil_k * dv;
      if (out > 6) {
        p.stats.shots++;
        p.stats.maxShot = Math.max(p.stats.maxShot, out);
        // on target: does the line cross the goal mouth it attacks?
        const gx = (p.team === 0 ? 1 : -1) * K.pitch_length / 2;
        if ((gx - b.x) * b.vx > 0) {
          const tt = (gx - b.x) / b.vx, zz = b.z + b.vz * tt;
          if (Math.abs(zz) < w.goalW / 2) p.stats.onTarget++;
        }
      }
      w.events.push({ type: 'kick', pid: p.id, side: ft.side, speed: out, x: b.x, y: b.y, z: b.z, dx: dirx, dz: dirz });
    } else w.events.push({ type: 'touch', pid: p.id, speed: out, x: b.x, z: b.z });
  }

  function bodyBall(w, p) {
    const b = w.ball; if (!b.active) return;
    const r = K.ball_radius;
    const fallen = p.st === 'fallen';
    const br = K.body_radius * (fallen ? 1.3 : 1);
    const cx = fallen ? p.x + p.fallX * 0.45 : p.x, cz = fallen ? p.z + p.fallZ * 0.45 : p.z;
    const top = fallen ? 0.45 : 1.15, bottom = fallen ? 0 : 0.3;
    if (b.y - r > top || b.y + r < bottom) return;
    const dx = b.x - cx, dz = b.z - cz, d = hyp(dx, dz);
    if (d >= br + r || d < 1e-6) return;
    const nx = dx / d, nz = dz / d;
    b.x = cx + nx * (br + r); b.z = cz + nz * (br + r);
    const rvx = b.vx - p.vx, rvz = b.vz - p.vz, vn = rvx * nx + rvz * nz;
    if (vn < 0) { b.vx -= 1.4 * vn * nx; b.vz -= 1.4 * vn * nz; if (-vn > 2) w.events.push({ type: 'bodyhit', pid: p.id, v: -vn }); }
  }

  // ---- Players against each other ------------------------------------------------------------------
  function bodyBody(w, A, B) {
    const rA = K.body_radius * (A.st === 'fallen' ? 1.3 : 1), rB = K.body_radius * (B.st === 'fallen' ? 1.3 : 1);
    const dx = B.x - A.x, dz = B.z - A.z, d = hyp(dx, dz);
    if (d >= rA + rB || d < 1e-6) return;
    const nx = dx / d, nz = dz / d, pen = rA + rB - d;
    A.x -= nx * pen / 2; A.z -= nz * pen / 2; B.x += nx * pen / 2; B.z += nz * pen / 2;
    const s = -((B.vx - A.vx) * nx + (B.vz - A.vz) * nz);
    if (s <= 0) return;
    const j = (1 + K.body_restitution) * s / 2;
    A.vx -= j * nx; A.vz -= j * nz; B.vx += j * nx; B.vz += j * nz;
    const over = Math.max(0, s - K.charge_min_speed);
    if (over <= 0) return;
    // who charged: the one moving into the other harder takes less
    const aIn = A.vx * nx + A.vz * nz, bIn = -(B.vx * nx + B.vz * nz);
    const [atk, vic] = aIn >= bIn ? [A, B] : [B, A];
    const braced = vic.feet.every(f => f.st === 'planted');
    if (vic.invuln <= 0 && vic.st !== 'fallen') vic.I += K.charge_imb_k * over * (braced ? K.brace_mult : 1);
    if (atk.invuln <= 0 && atk.st !== 'fallen') atk.I += K.charge_self_k * over;
    w.events.push({ type: 'charge', v: s, x: (A.x + B.x) / 2, z: (A.z + B.z) / 2 });
  }

  function footLeg(w, A, B) { // a fast foot into the other player's leg: a tackle
    if (A.st === 'fallen' || B.st === 'fallen') return;
    for (const ft of A.feet) {
      if (ft.st !== 'swing' || ft.tackleCool > 0) continue;
      const sp = hyp(ft.vx, ft.vz); if (sp < K.kick_speed_min) continue;
      for (const leg of B.feet) {
        const rt = right(B);
        const hx = B.x + rt[0] * leg.side * 0.11, hz = B.z + rt[1] * leg.side * 0.11;
        const d = segDist(ft.x, ft.z, leg.x, leg.z, hx, hz);
        if (d < K.foot_radius + K.leg_radius) {
          const clean = w.t - A.lastBall < K.clean_tackle_window ? K.clean_tackle_mult : 1;
          if (B.invuln <= 0) B.I += K.tackle_imb_k * sp * (leg.st === 'planted' ? K.tackle_planted_mult : 1) * clean;
          if (A.invuln <= 0) A.I += K.tackle_self_imb;
          ft.tackleCool = 0.4;
          w.events.push({ type: 'tackle', pid: A.id, vic: B.id, x: leg.x, z: leg.z, v: sp });
          break;
        }
      }
    }
  }

  function arenaPlayer(p) {
    const r = K.body_radius, L2 = K.pitch_length / 2 - r, W2 = K.pitch_width / 2 - r, c = K.corner_chamfer;
    if (p.x > L2) { p.x = L2; p.vx = Math.min(0, p.vx); }
    if (p.x < -L2) { p.x = -L2; p.vx = Math.max(0, p.vx); }
    if (p.z > W2) { p.z = W2; p.vz = Math.min(0, p.vz); }
    if (p.z < -W2) { p.z = -W2; p.vz = Math.max(0, p.vz); }
    if (c > 0) {
      const sx = Math.sign(p.x) || 1, sz = Math.sign(p.z) || 1;
      const d = (Math.abs(p.x) + Math.abs(p.z) - (L2 + W2 + 2 * r - c - r * Math.SQRT2)) / Math.SQRT2;
      if (d > 0) { p.x -= sx * d / Math.SQRT2; p.z -= sz * d / Math.SQRT2; }
    }
  }

  // ---- Goals, clock, stalemates --------------------------------------------------------------------
  function checkGoal(w) {
    const b = w.ball, L2 = K.pitch_length / 2;
    if (!b.active || w.phase !== 'live') return;
    if (Math.abs(b.x) > L2 + K.ball_radius && Math.abs(b.z) < w.goalW / 2 && b.y < K.goal_height) {
      const scorer = b.x > 0 ? 0 : 1; // the +x goal is team 1's
      w.score[scorer]++;
      const byOwn = b.last >= 0 && w.players[b.last] && w.players[b.last].team !== scorer;
      if (w.players[scorer]) w.players[scorer].stats.goals++;
      const sp = hyp(b.vx, b.vy, b.vz);
      w.lastGoal = { team: scorer, own: byOwn, speed: sp };
      w.phase = 'goal'; w.phaseT = 0; w.dizzy = 0;
      w.events.push({ type: 'goal', team: scorer, own: byOwn, speed: sp });
    }
  }

  function stuck(w) {
    const b = w.ball; if (!b.active || w.phase !== 'live' || w.solo) return;
    w.stuckT += DT;
    if (w.stuckT >= 0.5) {
      w.stuckT = 0; w.stuckS.push([b.x, b.z]);
      const n = Math.round(K.stuck_time / 0.5);
      while (w.stuckS.length > n) w.stuckS.shift();
      if (w.stuckS.length === n) {
        let far = 0; for (const s of w.stuckS) far = Math.max(far, hyp(s[0] - b.x, s[1] - b.z));
        if (far < K.stuck_radius) { // neutral drop in the centre
          b.x = 0; b.z = 0; b.y = 2.2; b.vx = b.vz = 0; b.vy = 0; b.last = -1;
          w.stuckS.length = 0; w.events.push({ type: 'drop' });
        }
      }
    }
  }

  function updateMatch(w) {
    w.phaseT += DT;
    if (w.phase === 'countdown') {
      if (w.phaseT >= (w.score[0] + w.score[1] > 0 || w.golden ? 0.9 : K.countdown_time)) { w.phase = 'live'; w.phaseT = 0; w.events.push({ type: 'whistle' }); }
    } else if (w.phase === 'live') {
      if (w.solo) return;
      if (w.golden) {
        w.goldenT += DT;
        w.goalW = Math.min(K.golden_widen_max, K.goal_width + Math.floor(w.goldenT / K.golden_widen_every) * K.golden_widen_step);
      } else {
        w.clock = Math.max(0, w.clock - DT);
        if (w.clock <= 0) {
          if (w.score[0] !== w.score[1]) endMatch(w);
          else { w.golden = true; w.goldenT = 0; w.events.push({ type: 'golden' }); }
        }
      }
      if (w.mareado) {
        w.dizzy = Math.min(1, w.dizzy + DT / K.dizzy_ramp_time);
        w.crossT += DT;
        const every = K.dizzy_cross_every;
        if (!w.crossed && !w.crossWarn && w.crossT >= every - K.dizzy_cross_warn) { w.crossWarn = true; w.events.push({ type: 'crosswarn' }); }
        if (!w.crossed && w.crossT >= every) { w.crossed = true; w.crossWarn = false; w.events.push({ type: 'cross' }); }
        if (w.crossed && w.crossT >= every + K.dizzy_cross_time) { w.crossed = false; w.crossT = 0; w.events.push({ type: 'uncross' }); }
      }
    } else if (w.phase === 'goal') {
      if (w.phaseT >= K.goal_pause_time) {
        if (w.solo) { w.phase = 'done'; return; }
        if (w.score[0] >= K.goals_to_win || w.score[1] >= K.goals_to_win || w.golden) endMatch(w);
        else { kickoff(w, w.lastGoal.team === 0 ? 1 : 0); w.crossed = false; w.crossT = 0; }
      }
    }
  }
  function endMatch(w) {
    w.phase = 'over'; w.over = true; w.winner = w.score[0] > w.score[1] ? 0 : w.score[1] > w.score[0] ? 1 : -1;
    w.events.push({ type: 'over', winner: w.winner });
  }

  // ---- One step ------------------------------------------------------------------------------------
  // inputs: one raw frame per player ({lx,ly,ld,rx,ry,rd}); bots and people produce the same thing.
  function step(w, inputs) {
    const live = w.phase === 'live';
    const frames = w.players.map((p, i) => {
      const raw = live ? (inputs[i] || blankFrame()) : blankFrame();
      // a fallen player may still press both thumbs to get up (live only)
      const f = takeInput(w, p, raw);
      p.input = f;
      return f;
    });
    for (let i = 0; i < w.players.length; i++) updateFeet(w, w.players[i], frames[i]);
    for (const p of w.players) updateBody(w, p);
    updateBall(w);
    if (live || w.phase === 'goal') {
      for (const p of w.players) for (const ft of p.feet) footBall(w, p, ft);
      for (const p of w.players) bodyBall(w, p);
    }
    if (w.players.length === 2) {
      bodyBody(w, w.players[0], w.players[1]);
      if (live) { footLeg(w, w.players[0], w.players[1]); footLeg(w, w.players[1], w.players[0]); }
    }
    for (const p of w.players) arenaPlayer(p);
    checkGoal(w);
    for (let i = 0; i < w.players.length; i++) updateBalance(w, w.players[i], frames[i]);
    stuck(w);
    updateMatch(w);
    w.t += DT; w.tick++;
  }

  window.Sim = { createWorld, makePlayer, step, kickoff, placePlayer, blankFrame, stream, fwd, right, angDiff, DT, dizzyScale };
})();
