// PROTOTYPE - NOT FOR PRODUCTION
// Question: ¿Es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar, con físicas torpes?
// Date: 2026-11-10
// The rival: plays through the same frame a pair of thumbs produces ({lx,ly,ld,rx,ry,rd}), sees
// only the present (delayed by its reaction time), and uses its own seeded stream.
// Built from design/bot-ai.md, adapted to the studio call that every body faces the ball.
'use strict';
(function () {
  const K = new Proxy({}, { get: (_, k) => CONFIG[k].value });
  const hyp = Math.hypot;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function createBot(preset, pid, seed) {
    const rng = Sim.stream(seed * 31 + pid * 977 + 5);
    const gauss = () => { const u = Math.max(1e-6, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const hist = []; // delayed observations
    const bot = {
      preset, state: 'CHASE', tick: 0, swing: 1, phase: 0, wait: 0, brace: 0,
      kick: null, last: null, lastOpTouch: -99, debug: {},
    };

    function toLocal(p, dx, dz) { // world vector → body frame (x right, y forward)
      const f = Sim.fwd(p), r = Sim.right(p);
      return [dx * r[0] + dz * r[1], dx * f[0] + dz * f[1]];
    }
    function out(frame, side, u) {
      if (side < 0) { frame.lx = u[0]; frame.ly = u[1]; frame.ld = 1; }
      else { frame.rx = u[0]; frame.ry = u[1]; frame.rd = 1; }
    }
    function lim(u, m = 1) { const l = hyp(u[0], u[1]); return l > m ? [u[0] / l * m, u[1] / l * m] : u; }

    // Walking: alternate feet towards a world point; speed 0..1.
    function gait(w, me, frame, tx, tz, speed, cad) {
      const dx = tx - me.x, dz = tz - me.z, d = hyp(dx, dz);
      if (d < 0.18 || speed <= 0) { bot.phase = 0; return; } // arrived: both feet down
      if (++bot.phase >= cad) { bot.phase = 0; bot.swing = -bot.swing; }
      const loc = toLocal(me, dx / d, dz / d);
      const stride = Math.min(speed, 0.4 + d * 0.6);
      const k = bot.phase / cad;
      const u = [loc[0] * (-0.35 + 1.35 * k) * stride, loc[1] * (-0.35 + 1.35 * k) * stride];
      // never swing a foot across the other one
      if (bot.swing < 0) u[0] = Math.min(u[0], 0.15); else u[0] = Math.max(u[0], -0.15);
      out(frame, bot.swing, lim(u));
    }

    function step(w) {
      const me = w.players[pid], op = w.players[1 - pid], b = w.ball, p = bot.preset;
      const frame = Sim.blankFrame();
      bot.tick++;
      hist.push({ bx: b.x, bz: b.z, bvx: b.vx, bvz: b.vz, ox: op ? op.x : 0, oz: op ? op.z : 0, olast: b.last, t: w.t });
      const lag = Math.round(p.react / (1000 / 60));
      while (hist.length > lag + 1) hist.shift();
      const o = hist[0];
      if (w.phase !== 'live') { bot.kick = null; bot.state = 'CHASE'; return frame; }
      // fallen: both thumbs down once it is allowed, after the reaction time
      if (me.st === 'fallen') {
        bot.kick = null; bot.state = 'RECOVER';
        if (me.tSt > K.fall_quick_getup + p.react / 1000) { frame.ld = frame.rd = 1; }
        return frame;
      }
      if (me.st === 'getup') return frame;
      const mareado = w.mareado;
      const leading = w.score[me.team] - w.score[1 - me.team] >= K.bot_lead_sloppy;
      const greed = p.greed + (mareado ? 0.1 : 0) + (leading ? 0.1 : 0);
      const mist = p.mist * (mareado ? 2 : 1) + (leading ? 0.05 : 0);
      if (bot.wait > 0) { bot.wait--; return frame; }
      // balance guard: plant both feet and let it settle
      const guard = K.bot_balance_guard - (mareado ? 0.15 : 0);
      if (bot.brace > 0) { bot.brace--; return frame; }
      if (me.I > guard && !(bot.kick && bot.kick.greedy)) { bot.brace = 8; bot.kick = null; return frame; }

      const attackX = (me.team === 0 ? 1 : -1) * K.pitch_length / 2, ownX = -attackX;
      // the ball as the bot believes it is: delayed, extrapolated a little
      const bx = o.bx + o.bvx * 0.25, bz = o.bz + o.bvz * 0.25;
      const dMe = hyp(me.x - b.x, me.z - b.z), dOp = op ? hyp(o.ox - o.bx, o.oz - o.bz) : 99;
      // quirk: Tito hesitates after the opponent touches the ball
      if (p.quirk === 'hesitate' && o.olast === (1 - pid) && b.lastT > bot.lastOpTouch + 0.5) { bot.lastOpTouch = b.lastT; bot.wait = 20; return frame; }

      // ---- brain, every bot_think_every ticks
      if (bot.tick % K.bot_think_every === 0 && !bot.kick) {
        let next = bot.state;
        if (bot.state === 'DEFEND' && dMe < dOp - 0.5) next = 'CHASE';
        else if (dOp < dMe - 1.0) next = 'DEFEND';
        else next = 'CHASE';
        if (p.quirk === 'wall' && o.olast === (1 - pid) && dOp < dMe + 0.5 && (o.bx - ownX) * (attackX - ownX) < 0.5 * (attackX - ownX) ** 2) next = 'DEFEND'; // falls back only with the ball in its half
        if (rng() < mist) { bot.wait = 10; }
        bot.state = next;
      }

      // ---- the kick planner owns the feet while a kick is on
      if (bot.kick) return doKick(w, me, frame, p);

      if (bot.state === 'DEFEND') {
        if (p.quirk === 'charge' && op && dOp < 1.2) { gait(w, me, frame, o.ox, o.oz, 1, p.cad); return frame; }
        const k = 0.6 + (0.35 - 0.6) * p.def;
        const jit = (1 - p.def) * 0.8;
        const gx = ownX + (bx - ownX) * k, gz = bz * k + (jit ? Math.sin(w.t * 1.3 + pid) * jit : 0);
        gait(w, me, frame, gx, gz, 0.9, p.cad);
        return frame;
      }
      // CHASE: get behind the ball on the line to the target
      const distGoal = hyp(attackX - bx, bz);
      let tx = attackX, tz = 0;
      const shoot = distGoal < p.shootR;
      const nearWall = Math.abs(bz) > K.pitch_width / 2 - 0.8 || Math.abs(bx) > K.pitch_length / 2 - 0.8;
      if (!shoot) { // dribble: aim 2.5 m ahead, toward goal and away from the rival
        const gx = attackX - bx, gz = -bz, gl = hyp(gx, gz) || 1;
        tx = bx + gx / gl * 2.5; tz = bz + gz / gl * 2.5;
        if (op && p.quirk !== 'cannon') tz += clamp(bz - o.oz, -1, 1) * 0.8;
      } else { // far post from where the rival stands, with aim error
        const post = (w.goalW / 2) * 0.7;
        tz = op && o.oz > 0 ? -post : post;
      }
      if (nearWall) { tx = bx * 0.4; tz = 0; } // stalemate breaker: play it back into the middle
      let ux = tx - bx, uz = tz - bz; const ul = hyp(ux, uz) || 1; ux /= ul; uz /= ul;
      const err = gauss() * p.aim * Math.PI / 180 * (shoot ? 1 : 0.5);
      const ca = Math.cos(err), sa = Math.sin(err);
      [ux, uz] = [ux * ca - uz * sa, ux * sa + uz * ca];
      const ax = bx - ux * 0.5, az = bz - uz * 0.5; // approach point behind the ball
      const front = (me.x - bx) * ux + (me.z - bz) * uz > -0.15;
      if (front) { // go round the ball on the short side
        const px = -uz, pz = ux, side = ((me.x - bx) * px + (me.z - bz) * pz) >= 0 ? 1 : -1;
        gait(w, me, frame, bx - ux * 0.7 + px * 0.9 * side, bz - uz * 0.7 + pz * 0.9 * side, 1, p.cad);
        return frame;
      }
      const dA = hyp(me.x - ax, me.z - az);
      if (!shoot && dA < 0.5 && dMe < 1.0) { // dribble: walk through the ball, each step pushes it
        gait(w, me, frame, bx + ux * 1.2, bz + uz * 1.2, p.quirk === 'dribbler' ? 0.85 : 0.7, p.cad);
        return frame;
      }
      if (dA < 0.28 && dMe < 0.9) {
        const greedy = shoot && rng() < greed;
        const feint = p.quirk === 'feint' && shoot && op && hyp(op.x - b.x, op.z - b.z) < 2.5 && rng() < 0.25; // a feint needs someone to fool
        const power = shoot ? (greedy ? 1 : p.power) : 0.18 + rng() * 0.12;
        const loc = toLocal(me, b.x - me.x, b.z - me.z);
        bot.kick = { phase: 'settle', t: 0, ux, uz, power, greedy, feint, side: loc[0] >= 0 ? 1 : -1,
          bx0: b.x, bz0: b.z, wind: Math.round((8 + 6 * power) * (greedy ? 1.4 : 1)) };
        return frame;
      }
      gait(w, me, frame, ax, az, Math.min(1, 0.55 + dA * 0.4), p.cad);
      return frame;
    }

    function doKick(w, me, frame, p) {
      const k = bot.kick, b = w.ball;
      k.t++;
      if (hyp(b.x - k.bx0, b.z - k.bz0) > 0.8 || b.last === 1 - pid && b.lastT > w.t - 0.1) { bot.kick = null; return frame; }
      const loc = toLocal(me, k.ux, k.uz);
      if (k.phase === 'settle') { if (k.t >= 4) { k.phase = 'wind'; k.t = 0; } return frame; }
      if (k.phase === 'wind') {
        const depth = 0.35 + 0.65 * k.power;
        out(frame, k.side, lim([-loc[0] * depth, -loc[1] * depth]));
        if (k.t >= k.wind) {
          if (k.feint) { bot.kick = null; bot.wait = 0; return frame; } // the feint: pull out of it
          k.phase = 'strike'; k.t = 0;
        }
        return frame;
      }
      if (k.phase === 'strike') {
        out(frame, k.side, lim([loc[0], loc[1]]));
        if (k.t >= 5) { k.phase = 'recover'; k.t = 0; }
        return frame;
      }
      if (k.t >= 10) bot.kick = null; // recover: both feet down
      return frame;
    }

    bot.step = step;
    return bot;
  }

  window.Bot = { createBot };
})();
