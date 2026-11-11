// PROTOTYPE - NOT FOR PRODUCTION
// Question: ¿Es divertido y dominable jugar al fútbol 1 contra 1 controlando cada pie con un pulgar, con físicas torpes?
// Date: 2026-11-10
// Everything you see, built from three.js primitives (no model or image files), following
// design/art-direction.md: plastic toys with big boots, a neighbourhood cage at golden hour,
// chalk footprints in team colour as the signature. Reads the simulation, never writes it.
'use strict';
(function () {
  const K = new Proxy({}, { get: (_, k) => CONFIG[k].value });
  const hyp = Math.hypot;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const INK = 0x1E1A2E, PAPER = 0xFFF6E5;
  const TEAM = [
    { shirt: 0xFFA51F, dark: 0xD97706, bootL: 0xFF7A1A, bootR: 0xFFD23F, css: '#FFA51F' },
    { shirt: 0x3346C8, dark: 0x1F2A8A, bootL: 0x3346C8, bootR: 0x5468E0, css: '#3346C8' },
  ];
  // The roster (art-direction.md §4): every one has its own silhouette, not a recolour.
  const ROSTER = {
    chuta: { name: 'Chuta', skin: 0xE2A877, hair: 0x3B2A20, scale: 1, torsoX: 1, torsoY: 1, head: 1, legs: 1 },
    tito: { name: 'Tito Bombo', skin: 0xF6D2B0, hat: 0xE84A3C, scale: 1, torsoX: 1.35, torsoY: 1, head: 1, legs: 1 },
    rulos: { name: 'La Rulos', skin: 0x7A4A2C, hair: 0x2A1A14, band: 0xFFD23F, scale: 1, torsoX: 0.85, torsoY: 1, head: 1, legs: 1 },
    ramiro: { name: 'Don Ramiro', skin: 0xE2A877, hat: 0x5A4636, tache: 0xD9D4CC, scale: 0.9, torsoX: 1.1, torsoY: 1, head: 1, legs: 0.95 },
    mamut: { name: 'Mamut', skin: 0xF6D2B0, hat: 0x2FB8A8, pom: 0xFFF6E5, scale: 1.15, torsoX: 1.3, torsoY: 1.1, head: 0.8, legs: 1 },
    chispa: { name: 'Chispa', skin: 0xB9784A, hair: 0x7CFF4F, scale: 1, torsoX: 0.95, torsoY: 1, head: 1, legs: 1.25 },
    capitana: { name: 'La Capitana', skin: 0xF6D2B0, hair: 0xC2462E, band: 0xFFD23F, scale: 1, torsoX: 1, torsoY: 1, head: 1, legs: 1.05 },
  };

  let THREEok = typeof THREE !== 'undefined';
  let renderer, scene, camera, cheap = false, gradientMap, faceCanvas, wireTex, fineWireTex, soleTex;
  let arena = null, arenaKey = '', chars = [], ballObj, trail, fx, camState, figureRow = null;
  let viewT = 0;

  // ---- Materials ---------------------------------------------------------------------------
  function toon(color, extra) {
    return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap }, extra || {}));
  }
  function basic(color, extra) { return new THREE.MeshBasicMaterial(Object.assign({ color }, extra || {})); }
  function lambert(color, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})); }
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function shade(hex, k) { // darken (k<1) or lighten (k>1) a colour
    const c = new THREE.Color(hex); c.multiplyScalar(k); return c;
  }

  // ---- The face atlas: 8 expressions drawn in code (art-direction.md §3) ----------------------
  function drawFaces() {
    return canvasTex(512, 256, (g) => {
      g.clearRect(0, 0, 512, 256);
      const ink = '#1E1A2E', cheek = 'rgba(255,143,163,0.6)';
      const cell = (i, fn) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); fn(); g.restore(); };
      const eyeO = (x, y) => { g.fillStyle = ink; g.beginPath(); g.ellipse(x, y, 7.5, 12, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 2.5, y - 4.5, 3, 0, 7); g.fill(); };
      const cheeks = () => { g.fillStyle = cheek; g.beginPath(); g.ellipse(34, 72, 9, 6, 0, 0, 7); g.ellipse(94, 72, 9, 6, 0, 0, 7); g.fill(); };
      g.lineCap = 'round'; g.lineJoin = 'round';
      cell(0, () => { eyeO(46, 54); eyeO(82, 54); cheeks(); g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(64, 76, 13, 0.25, Math.PI - 0.25); g.stroke(); });
      cell(1, () => { g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(38, 56); g.lineTo(54, 56); g.moveTo(74, 56); g.lineTo(90, 56); g.stroke(); cheeks(); g.beginPath(); g.arc(64, 76, 13, 0.25, Math.PI - 0.25); g.stroke(); });
      cell(2, () => {
        g.strokeStyle = ink; g.lineWidth = 6;
        g.beginPath(); g.moveTo(38, 46); g.lineTo(54, 55); g.lineTo(38, 63); g.moveTo(90, 46); g.lineTo(74, 55); g.lineTo(90, 63); g.stroke();
        cheeks(); g.fillStyle = ink; g.beginPath(); g.moveTo(46, 76); g.lineTo(82, 76); g.arc(64, 76, 18, 0, Math.PI); g.fill();
        g.fillStyle = '#FF6B81'; g.beginPath(); g.ellipse(64, 88, 9, 5, 0, 0, 7); g.fill();
      });
      for (const [i, rot] of [[3, 0], [4, Math.PI]]) cell(i, () => {
        g.strokeStyle = ink; g.lineWidth = 4;
        for (const ex of [46, 82]) { g.beginPath(); for (let a = 0; a < 14; a += 0.3) { const r = a * 0.95; const x = ex + Math.cos(a + rot) * r, y = 54 + Math.sin(a + rot) * r; a === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
        g.lineWidth = 5; g.beginPath(); for (let x = 44; x <= 84; x += 2) { const y = 84 + Math.sin((x - 44) / 5 + rot) * 4; x === 44 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
        cheeks();
      });
      cell(5, () => {
        g.strokeStyle = ink; g.lineWidth = 6;
        for (const ex of [46, 82]) { g.beginPath(); g.moveTo(ex - 9, 45); g.lineTo(ex + 9, 63); g.moveTo(ex + 9, 45); g.lineTo(ex - 9, 63); g.stroke(); }
        g.lineWidth = 5; g.beginPath(); g.arc(64, 84, 7, 0, 7); g.stroke();
      });
      cell(6, () => {
        g.strokeStyle = ink; g.lineWidth = 6;
        g.beginPath(); g.moveTo(37, 60); g.lineTo(46, 47); g.lineTo(55, 60); g.moveTo(73, 60); g.lineTo(82, 47); g.lineTo(91, 60); g.stroke();
        cheeks(); g.fillStyle = ink; g.beginPath(); g.moveTo(40, 72); g.lineTo(88, 72); g.arc(64, 72, 24, 0, Math.PI); g.fill();
        g.fillStyle = '#FF6B81'; g.beginPath(); g.ellipse(64, 88, 12, 7, 0, 0, 7); g.fill();
      });
      cell(7, () => {
        g.strokeStyle = ink; g.lineWidth = 5;
        g.beginPath(); g.moveTo(36, 40); g.lineTo(54, 46); g.moveTo(92, 40); g.lineTo(74, 46); g.stroke();
        g.fillStyle = ink; for (const ex of [46, 82]) { g.beginPath(); g.ellipse(ex, 58, 8, 6, 0, 0, Math.PI); g.fill(); }
        g.lineWidth = 4; g.beginPath(); for (let x = 48; x <= 80; x += 2) { const y = 86 + Math.sin((x - 48) / 2.2) * 2.5; x === 48 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
      });
    });
  }

  // ---- A character ----------------------------------------------------------------------------
  // The legs are drawn from the simulated feet by two-bone IK; the upper body rides the pelvis.
  const Y = new THREE.Vector3(0, 1, 0);
  function makeChar(id, team, isHuman) {
    const d = ROSTER[id], T = TEAM[team], S = d.scale;
    const o = { id, team, def: d, isHuman, faceI: 0, blinkAt: 2 + (id.length % 3), tail: 0, tailV: 0, fallK: 0 };
    const root = new THREE.Group(); scene.add(root); o.root = root;
    const upper = new THREE.Group(); root.add(upper); o.upper = upper;
    o.mats = [];
    const m = (c, extra) => { const mm = toon(c, extra); o.mats.push(mm); return mm; };
    const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(geo, mat); me.position.set(x, y, z); me.castShadow = !cheap; parent.add(me); return me; };
    const shirt = m(T.shirt), skin = m(d.skin), shorts = m(0xF4F1E6);
    // upper body, local origin at the hip joint
    mesh(new THREE.CylinderGeometry(0.2 * d.torsoX * S, 0.22 * d.torsoX * S, 0.12 * S, 12), shorts, upper, 0, 0.04 * S, 0);
    const torso = mesh(new THREE.CapsuleGeometry(0.21 * S, 0.1 * S, 4, 10), shirt, upper, 0, 0.21 * S * d.torsoY, 0);
    torso.scale.set(d.torsoX, d.torsoY, 1);
    // chest emblem: disc for team A, triangle for team B (shape repeats the colour)
    const emb = team === 0 ? new THREE.CircleGeometry(0.055 * S, 16) : new THREE.CircleGeometry(0.07 * S, 3);
    const embM = mesh(emb, m(0xFFFFFF), upper, 0, 0.27 * S * d.torsoY, 0.215 * S + 0.002);
    if (team === 1) embM.rotation.z = Math.PI / 2;
    const headY = (0.43 + (d.torsoY - 1) * 0.12) * S, hr = 0.19 * S * d.head;
    const head = new THREE.Group(); head.position.set(0, headY, 0); upper.add(head); o.head = head;
    mesh(new THREE.SphereGeometry(hr, 16, 12), skin, head).scale.set(1.05, 1, 1);
    o.faceTex = faceCanvas.clone(); o.faceTex.needsUpdate = true;
    o.faceTex.repeat.set(0.25, 0.5);
    const face = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.012, 14, 10, Math.PI / 2 - 0.95, 1.9, 0.75, 1.35),
      new THREE.MeshBasicMaterial({ map: o.faceTex, transparent: true, alphaTest: 0.5 }));
    face.scale.set(1.05, 1, 1); head.add(face); o.mats.push(face.material);
    // arms: mitten hands, decorative
    o.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.24 * S * d.torsoX, 0.37 * S * d.torsoY, 0); upper.add(sh);
      mesh(new THREE.CapsuleGeometry(0.06 * S, 0.16 * S, 3, 8), shirt, sh, 0, -0.12 * S, 0);
      mesh(new THREE.SphereGeometry(0.075 * S, 10, 8), skin, sh, 0, -0.27 * S, 0);
      sh.rotation.z = s * 0.25; o.arms.push(sh);
    }
    // ---- silhouettes
    const hair = d.hair != null ? m(d.hair) : null;
    if (id === 'chuta') { // the swirl: a curved cone on the crown
      const c = mesh(new THREE.ConeGeometry(0.05, 0.16, 8), hair, head, 0.02, hr * 0.95, -0.02); c.rotation.z = -0.55; c.rotation.x = -0.3;
      const cap = mesh(new THREE.SphereGeometry(hr * 1.03, 14, 8, 0, Math.PI * 2, 0, 1.0), hair, head); cap.scale.set(1.05, 1, 1); cap.rotation.x = -0.25;
    }
    if (id === 'tito') { // cap on backwards
      const hm = m(d.hat);
      const cap = mesh(new THREE.SphereGeometry(hr * 1.05, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hm, head, 0, 0.02, 0); cap.scale.set(1.05, 0.8, 1.05);
      const visor = mesh(new THREE.CylinderGeometry(0.13 * S, 0.13 * S, 0.02, 14, 1, false, 0, Math.PI), hm, head, 0, 0.04, -hr * 0.85); visor.rotation.y = Math.PI / 2;
    }
    if (id === 'rulos') { // afro cloud twice the head's width
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, rr = 0.09 + (i % 3) * 0.015;
        mesh(new THREE.SphereGeometry(rr * S, 10, 8), hair, head, Math.cos(a) * hr * 0.95, hr * 0.55 + Math.sin(a * 2) * 0.03, Math.sin(a) * hr * 0.75 - 0.03);
      }
      mesh(new THREE.SphereGeometry(0.13 * S, 10, 8), hair, head, 0, hr * 0.85, -0.02);
      const band = mesh(new THREE.TorusGeometry(hr * 1.0, 0.02, 6, 20), m(d.band), head, 0, hr * 0.42, 0); band.rotation.x = Math.PI / 2 + 0.25;
    }
    if (id === 'ramiro') { // beret, moustache, belly
      const b = mesh(new THREE.CylinderGeometry(0.21 * S, 0.2 * S, 0.045, 18), m(d.hat), head, 0.02, hr * 0.92, -0.01); b.rotation.z = 0.12;
      mesh(new THREE.SphereGeometry(0.03, 6, 6), m(d.hat), head, 0.02, hr * 0.92 + 0.04, 0);
      const tm = m(d.tache);
      for (const s of [-1, 1]) { const t = mesh(new THREE.CapsuleGeometry(0.022, 0.06, 3, 6), tm, head, s * 0.045, -0.035, hr * 0.93); t.rotation.z = s * 1.2; }
      mesh(new THREE.SphereGeometry(0.16 * S, 14, 10), shirt, upper, 0, 0.13 * S, 0.1 * S);
    }
    if (id === 'mamut') { // wool hat and pompom on a small head over square shoulders
      const hm = m(d.hat);
      const hat = mesh(new THREE.SphereGeometry(hr * 1.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hm, head, 0, hr * 0.1, 0); hat.scale.set(1.05, 1.15, 1.05);
      mesh(new THREE.TorusGeometry(hr * 1.06, 0.035, 6, 18), hm, head, 0, hr * 0.12, 0).rotation.x = Math.PI / 2;
      mesh(new THREE.SphereGeometry(0.07, 10, 8), m(d.pom), head, 0, hr * 1.25, 0);
    }
    if (id === 'chispa') { // a crest of five cones
      for (let i = 0; i < 5; i++) {
        const c = mesh(new THREE.ConeGeometry(0.035, 0.14 - Math.abs(i - 2) * 0.02, 6), hair, head, 0, hr * 0.92 + Math.cos((i - 2) * 0.35) * 0.02, (i - 2) * 0.07);
        c.rotation.x = (i - 2) * 0.35;
      }
    }
    if (id === 'capitana') { // high ponytail on a spring, armband, sunglasses
      const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.07 * (1 - t * 0.4) + 0.005, -t * 0.28)); }
      const tailG = new THREE.Group(); tailG.position.set(0, hr * 0.75, -hr * 0.65); head.add(tailG); o.tailG = tailG;
      mesh(new THREE.LatheGeometry(pts, 10), hair, tailG);
      const cap = mesh(new THREE.SphereGeometry(hr * 1.03, 14, 8, 0, Math.PI * 2, 0, 1.15), hair, head); cap.scale.set(1.05, 1, 1); cap.rotation.x = -0.3;
      const gm = m(INK);
      for (const s of [-1, 1]) { const g = mesh(new THREE.CircleGeometry(0.045, 14), gm, head, s * 0.07, 0.02, hr * 1.02); g.rotation.y = s * 0.35; }
      mesh(new THREE.BoxGeometry(0.1, 0.012, 0.01), gm, head, 0, 0.03, hr * 1.04);
      mesh(new THREE.CylinderGeometry(0.067 * S, 0.067 * S, 0.05, 10), m(d.band), o.arms[1], 0, -0.08 * S, 0);
    }
    // ---- legs: thigh + shin + big outlined boot (30 % of the height)
    o.thigh = 0.25 * S * d.legs; o.shin = 0.25 * S * d.legs; o.ankleH = 0.12 * S; o.hipBase = o.ankleH + (o.thigh + o.shin) * 0.97;
    o.legs = [];
    const outline = basic(INK, { side: THREE.BackSide });
    for (const side of [-1, 1]) {
      const bootC = side < 0 ? T.bootL : T.bootR;
      const L = { side };
      L.thighM = mesh(new THREE.CapsuleGeometry(0.075 * S, o.thigh, 3, 8), skin, root);
      L.shinG = new THREE.Group(); root.add(L.shinG);
      L.shinM = mesh(new THREE.CapsuleGeometry(0.058 * S, o.shin, 3, 8), m(0xFFFFFF), L.shinG);
      mesh(new THREE.CylinderGeometry(0.062 * S, 0.062 * S, 0.035, 10), m(T.dark), L.shinG, 0, o.shin * 0.25, 0);
      const boot = new THREE.Group(); root.add(boot); L.boot = boot;
      const bootM = m(bootC);
      const bg = new THREE.CapsuleGeometry(0.1 * S, 0.16 * S, 4, 10);
      const bm = mesh(bg, bootM, boot, 0, 0.07 * S, 0.06 * S); bm.rotation.x = Math.PI / 2; bm.scale.set(1, 1, 0.7);
      const bo = new THREE.Mesh(bg, outline); bo.rotation.x = Math.PI / 2; bo.position.copy(bm.position); bo.scale.set(1.08, 1.06, 0.78); boot.add(bo);
      mesh(new THREE.SphereGeometry(0.085 * S, 10, 8), m(shade(bootC, 0.7)), boot, 0, 0.065 * S, 0.19 * S).scale.set(1, 0.7, 1);
      mesh(new THREE.BoxGeometry(0.21 * S, 0.035, 0.34 * S), m(0xFFFFFF), boot, 0, 0.0175, 0.06 * S);
      o.legs.push(L);
    }
    // ground mark under the player: ring (team A) or three triangles (team B)
    const markM = basic(T.shirt, { transparent: true, opacity: 0.85, depthWrite: false });
    if (team === 0) { const r = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.44, 28), markM); r.rotation.x = -Math.PI / 2; o.mark = r; }
    else {
      o.mark = new THREE.Group();
      for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.CircleGeometry(0.09, 3), markM); t.rotation.x = -Math.PI / 2; t.rotation.z = i * 2.094; const a = i * 2.094; t.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42); o.mark.add(t); }
    }
    o.mark.position.y = 0.012; scene.add(o.mark);
    o.blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18), basic(INK, { transparent: true, opacity: 0.32, depthWrite: false }));
    o.blob.rotation.x = -Math.PI / 2; o.blob.position.y = 0.008; o.blob.visible = cheap; scene.add(o.blob);
    // stunned stars and a bird, orbiting the head while down
    o.stars = new THREE.Group(); scene.add(o.stars); o.stars.visible = false;
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.025 : 0.06; i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const starM = basic(0xFFD23F, { side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.ShapeGeometry(starShape), starM); o.stars.add(s); }
    const bird = new THREE.Group(); o.stars.add(bird); o.bird = bird;
    const wingG = new THREE.BufferGeometry(); wingG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.07, 0.02, 0, 0.02, 0, 0.04], 3));
    const birdM = basic(INK, { side: THREE.DoubleSide });
    o.wings = [new THREE.Mesh(wingG, birdM), new THREE.Mesh(wingG, birdM)]; o.wings[1].scale.x = -1;
    bird.add(o.wings[0], o.wings[1]);
    return o;
  }

  function setFace(o, i) {
    if (o.faceI === i) return; o.faceI = i;
    o.faceTex.offset.set((i % 4) * 0.25, i < 4 ? 0.5 : 0);
  }

  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _ax = new THREE.Vector3();
  function placeSeg(meshObj, ax, ay, az, bx, by, bz) {
    meshObj.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    _v.set(bx - ax, by - ay, bz - az); const l = _v.length(); if (l < 1e-5) return; _v.divideScalar(l);
    meshObj.quaternion.setFromUnitVectors(Y, _v);
  }

  function syncChar(o, p, w, dt, info) {
    const S = o.def.scale;
    const fallen = p.st === 'fallen', getup = p.st === 'getup';
    // how far down the body is: 1 lying, 0 standing
    const targetK = fallen ? 1 : getup ? 1 - clamp(p.tSt / K.getup_time, 0, 1) : 0;
    o.fallK += (targetK - o.fallK) * Math.min(1, dt * (fallen ? 9 : 14));
    const fk = o.fallK;
    const th = p.th, fx = Math.cos(th), fz = Math.sin(th), rx = -fz, rz = fx;
    // hip height drops when the feet spread (the legs cannot stretch further)
    let maxH = 0;
    for (const ft of p.feet) {
      const hx = p.x + rx * ft.side * 0.11 * S, hz = p.z + rz * ft.side * 0.11 * S;
      maxH = Math.max(maxH, hyp(ft.x - hx, ft.z - hz));
    }
    const chain = (o.thigh + o.shin) * 0.99;
    let hipY = o.ankleH + Math.sqrt(Math.max(chain * chain - maxH * maxH, (chain * 0.45) ** 2));
    hipY = Math.min(o.hipBase, hipY);
    hipY = hipY * (1 - fk) + 0.2 * fk;
    const ox = p.fallX * 0.35 * fk, oz = p.fallZ * 0.35 * fk;
    o.upper.position.set(p.x + ox, hipY, p.z + oz);
    // lean towards where balance is going; lie down when fallen
    let lx = p.gx - p.cx, lz = p.gz - p.cz; const ll = hyp(lx, lz);
    const leanA = Math.min(0.4, p.I * 0.28 + ll * 0.5) * (1 - fk);
    if (ll > 1e-4) { lx /= ll; lz /= ll; } else { lx = fx; lz = fz; }
    const tiltX = fk > 0.01 ? p.fallX : lx, tiltZ = fk > 0.01 ? p.fallZ : lz;
    const tiltA = leanA + fk * 1.45;
    _q.setFromAxisAngle(Y, Math.PI / 2 - th);
    _ax.set(tiltZ, 0, -tiltX).normalize();
    _q2.setFromAxisAngle(_ax, tiltA);
    o.upper.quaternion.copy(_q2).multiply(_q);
    // arms swing against the feet, flail when wobbling
    const wob = p.st === 'stumble' || fk > 0.05 ? 1 : 0;
    for (let i = 0; i < 2; i++) {
      const ft = p.feet[i], lf = (ft.x - p.x) * fx + (ft.z - p.z) * fz;
      const swing = clamp(-lf * 1.6, -0.9, 0.9);
      const flail = wob * Math.sin(viewT * 18 + i * 2) * 0.9;
      o.arms[i].rotation.x = swing + flail * 0.5;
      o.arms[i].rotation.z = (i ? 1 : -1) * (0.25 + wob * 1.1 + Math.abs(flail) * 0.3 + p.I * 0.4);
    }
    // legs by two-bone IK, knee pointing forward
    for (let i = 0; i < 2; i++) {
      const ft = p.feet[i], L = o.legs[i];
      // the hip joint in the world, following the (possibly lying) upper body
      _v.set(-ft.side * 0.11 * S, -0.02, 0).applyQuaternion(o.upper.quaternion).add(o.upper.position);
      const hx = _v.x, hy = _v.y, hz = _v.z;
      const ax = ft.x, ay = o.ankleH * (1 - fk * 0.5) + ft.y, az = ft.z;
      let dx = ax - hx, dy = ay - hy, dz = az - hz; let dl = hyp(dx, dy, dz);
      const l1 = o.thigh, l2 = o.shin;
      const dd = clamp(dl, 0.05, (l1 + l2) * 0.999);
      dx /= dl || 1; dy /= dl || 1; dz /= dl || 1;
      const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      // pole: forward of the body (and up when lying)
      let px = fx + p.fallX * fk, py = 0.25 + fk, pz = fz + p.fallZ * fk;
      const pd = px * dx + py * dy + pz * dz; px -= pd * dx; py -= pd * dy; pz -= pd * dz;
      const pl = hyp(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl;
      const kx = hx + dx * a + px * h, ky = hy + dy * a + py * h, kz = hz + dz * a + pz * h;
      const ex = hx + dx * dd, ey = hy + dy * dd, ez = hz + dz * dd; // ankle actually reached
      placeSeg(L.thighM, hx, hy, hz, kx, ky, kz);
      placeSeg(L.shinG, kx, ky, kz, ex, ey, ez);
      L.boot.position.set(ax, ft.y + (fk > 0.5 ? 0.02 : 0), az);
      // boots point where the body faces; a kicking boot pitches its toe up
      const sp = hyp(ft.vx, ft.vz);
      L.boot.rotation.set(0, Math.PI / 2 - th, 0);
      L.boot.rotateX(-clamp(sp * 0.05, 0, 0.45) * (ft.st === 'swing' ? 1 : 0));
    }
    // ground marks, shadow blob, stars
    o.mark.position.x = p.x; o.mark.position.z = p.z; o.mark.rotation.y = viewT * 0.5;
    o.blob.position.x = p.x + ox; o.blob.position.z = p.z + oz; o.blob.scale.set(1 + fk * 0.6, 1 + fk * 0.6, 1);
    o.stars.visible = fk > 0.4;
    if (o.stars.visible) {
      _v.set(0, 0, 0); o.head.getWorldPosition(_v);
      o.stars.position.set(_v.x, _v.y + 0.25, _v.z);
      o.stars.children.forEach((s, j) => {
        const a = viewT * 4 * Math.PI + j * 2.094;
        s.position.set(Math.cos(a) * 0.25, Math.sin(a * 0.5) * 0.03, Math.sin(a) * 0.25);
        s.rotation.y = -a; s.rotation.z = a;
      });
      const ba = viewT * 3 + 1; o.bird.position.set(Math.cos(-ba) * 0.32, 0.1, Math.sin(-ba) * 0.32); o.bird.rotation.y = ba;
      o.wings[0].rotation.x = Math.sin(viewT * 30) * 0.7; o.wings[1].rotation.x = Math.sin(viewT * 30) * 0.7;
    }
    // ponytail spring
    if (o.tailG) {
      const acc = clamp(-(p.vx * fx + p.vz * fz) * 0.4, -1, 1);
      o.tailV += ((acc - o.tail) * 60 - o.tailV * 6) * dt; o.tail += o.tailV * dt;
      o.tailG.rotation.x = -0.5 + o.tail * 0.6 + Math.sin(viewT * 9) * 0.04;
    }
    // the face
    let fi = 0;
    const kicked = p.feet.some(ft => w.t - ft.kickT < 0.25);
    if (w.phase === 'goal' && w.lastGoal) fi = w.lastGoal.team === p.team ? 6 : 7;
    else if (fk > 0.3) fi = 5;
    else if (w.mareado && Sim.dizzyScale(w) > 0.3) fi = Math.floor(viewT * 6) % 2 ? 3 : 4;
    else if (kicked || p.st === 'stumble') fi = 2;
    else {
      o.blinkAt -= dt;
      if (o.blinkAt < 0) { fi = 1; if (o.blinkAt < -0.12) o.blinkAt = 3 + ((viewT * 7.3 + o.id.length) % 2); }
    }
    setFace(o, fi);
    // see-through when the own body hides the ball from the shoulder camera
    if (o.isHuman) {
      const bdx = w.ball.x - p.x, bdz = w.ball.z - p.z, ahead = bdx * Math.cos(p.th) + bdz * Math.sin(p.th);
      const hide = info.camMode === 'shoulder' && w.ball.active && ahead > -0.3 && hyp(bdx, bdz) < 3;
      const op = hide ? 0.32 : 1;
      for (const mm of o.mats) { if (mm.opacity !== op) { mm.opacity = op; mm.transparent = op < 1 || mm.map != null; mm.depthWrite = op >= 1; } }
    }
  }

  function removeChar(o) {
    for (const obj of [o.root, o.upper, o.mark, o.blob, o.stars]) { scene.remove(obj); if (obj.parent) obj.parent.remove(obj); }
  }

  // ---- Ball ------------------------------------------------------------------------------------
  function makeBall() {
    const r = K.ball_radius;
    const geo = new THREE.IcosahedronGeometry(r, 2);
    const pos = geo.attributes.position, n = pos.count, cols = new Float32Array(n * 3);
    const phi = (1 + Math.sqrt(5)) / 2, V = [];
    for (const [a, b] of [[1, phi], [-1, phi], [1, -phi], [-1, -phi]]) { V.push([0, a, b], [a, b, 0], [b, 0, a]); }
    for (const v of V) { const l = hyp(...v); v[0] /= l; v[1] /= l; v[2] /= l; }
    for (let i = 0; i < n; i += 3) {
      let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < 3; j++) { cx += pos.getX(i + j); cy += pos.getY(i + j); cz += pos.getZ(i + j); }
      const l = hyp(cx, cy, cz); cx /= l; cy /= l; cz /= l;
      let best = 0; for (const v of V) best = Math.max(best, v[0] * cx + v[1] * cy + v[2] * cz);
      const c = best > 0.94 ? new THREE.Color(0x2B2B3A) : new THREE.Color(0xFFFFFF);
      for (let j = 0; j < 3; j++) { cols[(i + j) * 3] = c.r; cols[(i + j) * 3 + 1] = c.g; cols[(i + j) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const ball = new THREE.Mesh(geo, toon(0xFFFFFF, { vertexColors: true }));
    ball.castShadow = !cheap;
    const ol = new THREE.Mesh(geo, basic(INK, { side: THREE.BackSide })); ol.scale.setScalar(1.07); ball.add(ol);
    scene.add(ball);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(r * 1.1, 16), basic(INK, { transparent: true, opacity: 0.35, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; scene.add(blob);
    return { mesh: ball, blob, r };
  }

  // ---- The arena: cage, boards, goals, neighbourhood (rebuilt when its sizes change) -------------
  function buildArena(goalW) {
    if (arena) { scene.remove(arena); }
    arena = new THREE.Group(); scene.add(arena);
    const L = K.pitch_length, W = K.pitch_width, L2 = L / 2, W2 = W / 2, c = K.corner_chamfer;
    const H = K.wall_height, bh = K.board_height, gh = K.goal_height, gd = K.goal_depth, gw2 = goalW / 2;
    // ground: cement all round, the pitch on top with stripes and chalk lines in one texture
    const cement = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), lambert(0xB8B0A4));
    cement.rotation.x = -Math.PI / 2; cement.receiveShadow = !cheap; arena.add(cement);
    const texW = 1024, texH = Math.round(1024 * W / L);
    const pitchTex = canvasTex(texW, texH, (g, w, h) => {
      const sx = w / L, sz = h / W;
      g.fillStyle = '#B8B0A4'; g.fillRect(0, 0, w, h);
      g.save(); g.beginPath(); // the chamfered playing area
      g.moveTo(c * sx, 0); g.lineTo(w - c * sx, 0); g.lineTo(w, c * sz); g.lineTo(w, h - c * sz); g.lineTo(w - c * sx, h); g.lineTo(c * sx, h); g.lineTo(0, h - c * sz); g.lineTo(0, c * sz); g.closePath(); g.clip();
      const n = Math.round(L / 2);
      for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#379E50' : '#3FAE5A'; g.fillRect(i * w / n, 0, w / n + 1, h); }
      g.restore();
      g.strokeStyle = '#F4F1E6'; g.lineWidth = 0.08 * sx; const lw = 0.08 * sx / 2;
      g.beginPath(); g.moveTo(c * sx, lw); g.lineTo(w - c * sx, lw); g.lineTo(w - lw, c * sz); g.lineTo(w - lw, h - c * sz); g.lineTo(w - c * sx, h - lw); g.lineTo(c * sx, h - lw); g.lineTo(lw, h - c * sz); g.lineTo(lw, c * sz); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 1.5 * sx, 0, 7); g.stroke();
      g.fillStyle = '#F4F1E6'; g.beginPath(); g.arc(w / 2, h / 2, 0.12 * sx, 0, 7); g.fill();
      for (const e of [0, 1]) { // areas 2.5 m deep, 5 m wide
        const x0 = e ? w - 2.5 * sx : 0; g.strokeRect(x0, h / 2 - 2.5 * sz, 2.5 * sx, 5 * sz);
        g.beginPath(); g.arc(e ? w - 3.3 * sx : 3.3 * sx, h / 2, 0.1 * sx, 0, 7); g.fill();
      }
    });
    pitchTex.anisotropy = 4;
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(L, W), lambert(0xFFFFFF, { map: pitchTex }));
    pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.003; pitch.receiveShadow = !cheap; arena.add(pitch);
    // boards: segments in cream, the team half tinted with its colour
    const segs = [];
    const addRun = (x0, z0, x1, z1) => { const l = hyp(x1 - x0, z1 - z0), n = Math.max(1, Math.round(l / 2)); for (let i = 0; i < n; i++) segs.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, x0 + (x1 - x0) * (i + 1) / n, z0 + (z1 - z0) * (i + 1) / n]); };
    for (const s of [-1, 1]) {
      addRun(-L2 + c, s * W2, L2 - c, s * W2);
      addRun(s * L2, -W2 + c, s * L2, -gw2); addRun(s * L2, gw2, s * L2, W2 - c);
      addRun(s * (L2 - c), W2, s * L2, W2 - c); addRun(s * (L2 - c), -W2, s * L2, -W2 + c);
    }
    const boardGeo = new THREE.BoxGeometry(1, bh, 0.12);
    const boards = new THREE.InstancedMesh(boardGeo, lambert(0xFFFFFF), segs.length);
    const mtx = new THREE.Matrix4(), col = new THREE.Color();
    segs.forEach((sg, i) => {
      const [x0, z0, x1, z1] = sg, l = hyp(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const nx = Math.sign(mx) * (Math.abs(mx) > L2 - c - 0.01 ? 1 : 0), nz = Math.sign(mz) * (Math.abs(mz) > W2 - c - 0.01 ? 1 : 0);
      const nl = hyp(nx, nz) || 1;
      mtx.compose(new THREE.Vector3(mx + nx / nl * 0.06, bh / 2, mz + nz / nl * 0.06), new THREE.Quaternion().setFromAxisAngle(Y, -Math.atan2(z1 - z0, x1 - x0)), new THREE.Vector3(l + 0.02, 1, 1));
      boards.setMatrixAt(i, mtx);
      const painted = i % 2 === 0;
      col.set(0xE8E0D0); if (painted) col.lerp(new THREE.Color(mx < 0 ? TEAM[0].shirt : TEAM[1].shirt), 0.4);
      boards.setColorAt(i, col);
    });
    boards.castShadow = boards.receiveShadow = !cheap; arena.add(boards);
    // cage posts and wire mesh above the boards
    const postPts = [];
    for (const sg of segs) postPts.push([sg[0], sg[1]]);
    const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, H, 6), lambert(0x5B6470), postPts.length);
    postPts.forEach((pp, i) => { const nx = Math.sign(pp[0]) * 0.13 * (Math.abs(pp[0]) > L2 - c ? 1 : 0), nz = Math.sign(pp[1]) * 0.13 * (Math.abs(pp[1]) > W2 - c ? 1 : 0); mtx.makeTranslation(pp[0] + nx, H / 2, pp[1] + nz); posts.setMatrixAt(i, mtx); });
    arena.add(posts);
    const wireM = new THREE.MeshBasicMaterial({ map: wireTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, color: 0x5B6470, depthWrite: false });
    const netPlane = (x0, z0, x1, z1, y0, y1) => {
      const l = hyp(x1 - x0, z1 - z0), h = y1 - y0; if (l < 0.05 || h < 0.05) return;
      const t = wireTex.clone(); t.needsUpdate = true; t.repeat.set(l / 0.3, h / 0.3);
      const m = wireM.clone(); m.map = t;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(l, h), m);
      pl.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); pl.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      arena.add(pl);
    };
    for (const s of [-1, 1]) {
      netPlane(-L2 + c, s * W2 + s * 0.13, L2 - c, s * W2 + s * 0.13, bh, H);
      netPlane(s * L2 + s * 0.13, -W2 + c, s * L2 + s * 0.13, -gw2, bh, H);
      netPlane(s * L2 + s * 0.13, gw2, s * L2 + s * 0.13, W2 - c, bh, H);
      netPlane(s * L2 + s * 0.13, -gw2, s * L2 + s * 0.13, gw2, gh + gd * 0, H);
      netPlane(s * (L2 - c), W2 + 0.13, s * L2 + s * 0.09, W2 - c + 0.09, bh, H);
      netPlane(s * (L2 - c), -W2 - 0.13, s * L2 + s * 0.09, -W2 + c - 0.09, bh, H);
    }
    // goals: white posts, crossbar in the colour of the team that defends it, soft nets
    arena.userData.nets = [];
    for (const [s, team] of [[-1, 0], [1, 1]]) {
      const gx = s * L2, g = new THREE.Group(); arena.add(g);
      const postM = toon(0xFFFFFF), barM = toon(TEAM[team].shirt);
      for (const zz of [-gw2, gw2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, gh, 10), postM); p.position.set(gx, gh / 2, zz); p.castShadow = !cheap; g.add(p); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, goalW + 0.12, 10), barM); bar.rotation.x = Math.PI / 2; bar.position.set(gx, gh, 0); bar.castShadow = !cheap; g.add(bar);
      const netM = new THREE.MeshBasicMaterial({ map: fineWireTex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0xFFFFFF, depthWrite: false });
      const mk = (w, h, rep) => { const t = fineWireTex.clone(); t.needsUpdate = true; t.repeat.set(w / 0.15, h / 0.15); const m = netM.clone(); m.map = t; return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); };
      const back = mk(goalW, gh); back.position.set(gx + s * gd, gh / 2, 0); back.rotation.y = Math.PI / 2; g.add(back);
      for (const zz of [-gw2, gw2]) { const sd = mk(gd, gh); sd.position.set(gx + s * gd / 2, gh / 2, zz); g.add(sd); }
      const top = mk(gd, goalW); top.rotation.x = Math.PI / 2; top.position.set(gx + s * gd / 2, gh, 0); g.add(top);
      // a dark floor inside the goal so the mouth reads
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(gd, goalW), lambert(0x2E7A44)); fl.rotation.x = -Math.PI / 2; fl.position.set(gx + s * gd / 2, 0.004, 0); g.add(fl);
      arena.userData.nets.push({ back, s, base: gx + s * gd, wob: 0 });
    }
    // the neighbourhood: two layers of flat buildings with lit windows, a water tank, a clothesline
    const rr = Sim.stream(4242);
    const nearM = basic(0x8C6FA8), farM = basic(0xB7A3CF, { fog: true }), winM = basic(0xFFE08A);
    const winGeo = new THREE.PlaneGeometry(0.7, 0.9), windows = [];
    const ring = (rad, hMin, hMax, mat, wins) => {
      for (let a = 0; a < Math.PI * 2; a += 0.0) {
        const wdt = 5 + rr() * 6, h = hMin + rr() * (hMax - hMin);
        const ang = a + (wdt / 2) / rad;
        const b = new THREE.Mesh(new THREE.BoxGeometry(wdt, h, 4), mat);
        b.position.set(Math.cos(ang) * rad, h / 2, Math.sin(ang) * rad * 0.75); b.rotation.y = -ang + Math.PI / 2;
        arena.add(b);
        if (wins) {
          for (let wy = 2; wy < h - 1; wy += 2.2) for (let wx = -wdt / 2 + 1; wx < wdt / 2 - 0.6; wx += 1.6) {
            if (rr() < 0.45) continue;
            const m = new THREE.Matrix4(), q = b.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI));
            const off = new THREE.Vector3(wx, wy - h / 2, -2.01).applyQuaternion(b.quaternion);
            m.compose(new THREE.Vector3().copy(b.position).add(off), q, new THREE.Vector3(1, 1, 1));
            windows.push(m);
          }
        }
        a += wdt / rad + 0.05;
      }
    };
    ring(26, 5, 13, nearM, true); ring(48, 12, 26, farM, false);
    const winMesh = new THREE.InstancedMesh(winGeo, winM, windows.length); windows.forEach((m, i) => winMesh.setMatrixAt(i, m)); arena.add(winMesh);
    // water tank on a roof
    const tank = new THREE.Group(); tank.position.set(-14, 9, -19); arena.add(tank);
    const tm = basic(0x6E5A8A);
    const at = (geo, x, y, z) => { const me = new THREE.Mesh(geo, tm); me.position.set(x, y, z); tank.add(me); };
    at(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 14), 0, 2.6, 0);
    at(new THREE.ConeGeometry(1.5, 0.9, 14), 0, 4.25, 0);
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) at(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5), a, 0.7, b);
    // clothesline behind the far boards
    const cz = -(W2 + 3.2), poleM = lambert(0x5B6470);
    for (const xx of [-5, 5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), poleM); p.position.set(xx, 1.6, cz); arena.add(p); }
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 10, 4), basic(INK)); line.rotation.z = Math.PI / 2; line.position.set(0, 3.05, cz); arena.add(line);
    [0xFF4D6D, 0xFFD23F, 0x2FB8A8, 0xFFF6E5, 0x7CFF4F].forEach((cc, i) => {
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), lambert(cc, { side: THREE.DoubleSide })); cl.position.set(-3.6 + i * 1.8, 2.62, cz); arena.add(cl);
      arena.userData.cloth = arena.userData.cloth || []; arena.userData.cloth.push(cl);
    });
  }

  // ---- Effects (pooled, no new textures at run time) --------------------------------------------
  function makeFx() {
    const f = { puffs: [], rings: [], dust: [], prints: [], pums: [], confetti: null, conf: [], shake: 0 };
    const puffG = new THREE.SphereGeometry(1, 8, 6);
    for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(puffG, basic(0xFFFFFF, { transparent: true, depthWrite: false })); m.visible = false; scene.add(m); f.puffs.push({ m, t: 9, vx: 0, vy: 0, vz: 0, size: 0.2, life: 0.25 }); }
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(puffG, basic(0xD8C8A8, { transparent: true, depthWrite: false })); m.visible = false; scene.add(m); f.dust.push({ m, t: 9, vx: 0, vz: 0 }); }
    const ringG = new THREE.RingGeometry(0.8, 1, 24);
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(ringG, basic(0xFFFFFF, { transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.visible = false; scene.add(m); f.rings.push({ m, t: 9 }); }
    const printG = new THREE.PlaneGeometry(0.13, 0.27);
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(printG, basic(0xFFFFFF, { map: soleTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); f.prints.push({ m, t: 99 }); }
    const pumTex = canvasTex(256, 128, (g) => {
      g.font = '900 78px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 14; g.strokeStyle = '#1E1A2E'; g.lineJoin = 'round'; g.strokeText('¡PUM!', 128, 66); g.fillStyle = '#FFD23F'; g.fillText('¡PUM!', 128, 66);
    });
    for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pumTex, transparent: true, depthTest: false })); s.visible = false; scene.add(s); f.pums.push({ s, t: 9 }); }
    const confG = new THREE.PlaneGeometry(0.06, 0.1);
    f.confetti = new THREE.InstancedMesh(confG, basic(0xFFFFFF, { side: THREE.DoubleSide }), 70); f.confetti.count = 0; scene.add(f.confetti);
    for (let i = 0; i < 70; i++) f.conf.push({ x: 0, y: -9, z: 0, vx: 0, vy: 0, vz: 0, r: 0, vr: 0, c: new THREE.Color() });
    f.confT = 9;
    // ball trail: a ribbon over the last 12 positions
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    const idx = []; for (let i = 0; i < 11; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } tg.setIndex(idx);
    f.trail = new THREE.Mesh(tg, basic(0xFFFFFF, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    f.trail.frustumCulled = false; scene.add(f.trail); f.trailPts = [];
    return f;
  }
  const rngFx = (() => { let s = 77; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); // looks only, never gameplay

  function fxEvent(e, w) {
    const f = fx;
    if (e.type === 'kick') {
      const big = e.speed >= K.big_kick_speed;
      for (let i = 0, n = big ? 8 : 4; i < n; i++) {
        const p = f.puffs.find(q => q.t >= q.life); if (!p) break;
        const a = rngFx() * Math.PI * 2;
        p.t = 0; p.life = 0.25 + rngFx() * 0.1; p.size = big ? 0.28 : 0.16;
        p.m.position.set(e.x, e.y, e.z); p.vx = Math.cos(a) * 1.5; p.vy = 0.5 + rngFx(); p.vz = Math.sin(a) * 1.5; p.m.visible = true;
      }
      const r = f.rings.find(q => q.t > 0.3); if (r) { r.t = 0; r.m.position.set(e.x, e.y, e.z); r.m.lookAt(e.x + e.dx, e.y, e.z + e.dz); r.m.visible = true; }
      if (big) { const s = f.pums.find(q => q.t > 0.7) || f.pums[0]; s.t = 0; s.s.position.set(e.x, e.y + 0.6, e.z); s.s.visible = true; f.shake = Math.max(f.shake, K.shake_on_kick * 2); }
      else f.shake = Math.max(f.shake, K.shake_on_kick * 0.5);
    } else if (e.type === 'fall') {
      for (let i = 0; i < 6; i++) { const d = f.dust.find(q => q.t > 0.45); if (!d) break; const a = rngFx() * Math.PI * 2; d.t = 0; d.m.position.set(e.x, 0.05, e.z); d.vx = Math.cos(a) * 1.6; d.vz = Math.sin(a) * 1.6; d.m.visible = true; }
    } else if (e.type === 'plant') {
      const p = f.prints.reduce((a, b) => (b.t > a.t ? b : a));
      const pl = w.players[e.pid]; const team = pl ? pl.team : 0;
      p.t = 0; p.m.position.set(e.x + Math.cos(e.th) * 0.06, 0.006, e.z + Math.sin(e.th) * 0.06); p.m.rotation.z = -e.th - Math.PI / 2;
      p.m.material.color.set(TEAM[team].shirt); p.m.scale.x = e.side; p.m.visible = true;
    } else if (e.type === 'goal') {
      const sx = e.team === 0 ? K.pitch_length / 2 : -K.pitch_length / 2;
      const cols = [TEAM[e.team].shirt, 0xFFFFFF, 0xFFD23F];
      f.confT = 0; f.confetti.count = f.conf.length;
      f.conf.forEach((c, i) => { c.x = sx - Math.sign(sx) * 0.5; c.y = 1 + rngFx(); c.z = (rngFx() - 0.5) * 3; c.vx = -Math.sign(sx) * (1 + rngFx() * 3); c.vy = 3 + rngFx() * 4; c.vz = (rngFx() - 0.5) * 5; c.r = rngFx() * 6; c.vr = (rngFx() - 0.5) * 20; c.c.set(cols[i % 3]); f.confetti.setColorAt(i, c.c); });
      if (f.confetti.instanceColor) f.confetti.instanceColor.needsUpdate = true;
      const net = arena.userData.nets.find(n => Math.sign(n.s) === Math.sign(sx)); if (net) net.wob = 1;
      f.shake = Math.max(f.shake, 0.15);
    } else if (e.type === 'post') f.shake = Math.max(f.shake, 0.05);
  }

  const _m4 = new THREE.Matrix4(), _e = new THREE.Euler(), _sc = new THREE.Vector3(1, 1, 1);
  function fxUpdate(dt, w) {
    const f = fx;
    for (const p of f.puffs) if (p.t < p.life) { p.t += dt; const k = p.t / p.life; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt; p.m.scale.setScalar(Math.max(0.001, p.size * Math.sqrt(k))); p.m.material.opacity = 1 - k; if (p.t >= p.life) p.m.visible = false; }
    for (const d of f.dust) if (d.t < 0.45) { d.t += dt; const k = d.t / 0.45; d.m.position.x += d.vx * dt; d.m.position.z += d.vz * dt; d.vx *= 0.92; d.vz *= 0.92; d.m.scale.setScalar(0.06 + 0.1 * k); d.m.material.opacity = 0.9 * (1 - k); if (d.t >= 0.45) d.m.visible = false; }
    for (const r of f.rings) if (r.t < 0.3) { r.t += dt; const k = r.t / 0.3; r.m.scale.setScalar(0.1 + 0.45 * k); r.m.material.opacity = 0.9 * (1 - k); if (r.t >= 0.3) r.m.visible = false; }
    for (const s of f.pums) if (s.t < 0.7) { s.t += dt; const k = s.t / 0.7; const sc = (k < 0.15 ? k / 0.15 * 1.2 : 1.2 - (k - 0.15) * 0.3) * 0.9; s.s.scale.set(sc, sc / 2, 1); s.s.position.y += dt * 0.6; s.s.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; if (s.t >= 0.7) s.s.visible = false; }
    const fade = K.footprint_fade;
    for (const p of f.prints) if (p.t < fade) { p.t += dt; p.m.material.opacity = 0.7 * (1 - p.t / fade); if (p.t >= fade) p.m.visible = false; }
    if (f.confT < 2.5) {
      f.confT += dt;
      f.conf.forEach((c, i) => { c.vy -= 6 * dt; c.vx *= 0.99; c.vz *= 0.99; c.x += c.vx * dt; c.y = Math.max(0.02, c.y + c.vy * dt); c.z += c.vz * dt; c.r += c.vr * dt; _e.set(c.r, c.r * 0.7, c.r * 0.3); _q.setFromEuler(_e); const s = c.y <= 0.02 ? 0.6 : 1; _sc.set(s, s, s); _v.set(c.x, c.y, c.z); _m4.compose(_v, _q, _sc); f.confetti.setMatrixAt(i, _m4); });
      f.confetti.instanceMatrix.needsUpdate = true;
      if (f.confT >= 2.5) f.confetti.count = 0;
    }
    for (const n of arena.userData.nets) if (n.wob > 0.01) { n.wob *= Math.exp(-3 * dt); n.back.position.x = n.base + n.s * Math.sin(viewT * 30) * 0.15 * n.wob; } else n.back.position.x = n.base;
    if (arena.userData.cloth) arena.userData.cloth.forEach((cl, i) => { cl.rotation.x = Math.sin(viewT * 2 + i) * 0.15; });
    // trail
    const b = w.ball, sp = hyp(b.vx, b.vy, b.vz);
    f.trailPts.unshift([b.x, b.y, b.z]); if (f.trailPts.length > 12) f.trailPts.length = 12;
    const show = b.active && sp > K.trail_speed_min && f.trailPts.length >= 2;
    f.trail.visible = show;
    if (show) {
      const pa = f.trail.geometry.attributes.position;
      for (let i = 0; i < 12; i++) {
        const p = f.trailPts[Math.min(i, f.trailPts.length - 1)], q = f.trailPts[Math.min(i + 1, f.trailPts.length - 1)];
        let dx = p[0] - q[0], dz = p[2] - q[2]; const l = hyp(dx, dz) || 1; dx /= l; dz /= l;
        const wdt = 0.13 * (1 - i / 12);
        pa.setXYZ(i * 2, p[0] - dz * wdt, p[1], p[2] + dx * wdt); pa.setXYZ(i * 2 + 1, p[0] + dz * wdt, p[1], p[2] - dx * wdt);
      }
      pa.needsUpdate = true;
      const last = b.last >= 0 && w.players[b.last] ? w.players[b.last].team : -1;
      f.trail.material.color.set(last >= 0 ? TEAM[last].shirt : 0xFFFFFF);
    }
    f.shake = Math.max(0, f.shake - dt * 0.6);
  }

  // ---- Camera ----------------------------------------------------------------------------------------
  function updateCamera(w, dt, info) {
    const cs = camState, mode = info.camMode;
    const follow = 1 - Math.exp(-K.cam_follow * dt);
    let px, py, pz, lx, ly, lz, fov = K.cam_fov;
    if ((mode === 'shoulder' || mode === 'fp') && w.players[0]) {
      const p = w.players[0], fx = Math.cos(p.th), fz = Math.sin(p.th);
      if (mode === 'fp') {
        const pit = K.cam_fp_pitch_deg * Math.PI / 180;
        px = p.x + fx * 0.05; py = 1.02 * ROSTER.chuta.scale; pz = p.z + fz * 0.05;
        lx = px + fx * Math.cos(pit); ly = py - Math.sin(pit); lz = pz + fz * Math.cos(pit);
        fov = K.cam_fp_fov;
        cs.px = px; cs.py = py; cs.pz = pz; cs.lx = lx; cs.ly = ly; cs.lz = lz; // first person never lags
      } else {
        const rx = -fz, rz = fx;
        px = p.x - fx * K.cam_back + rx * K.cam_side; py = K.cam_height; pz = p.z - fz * K.cam_back + rz * K.cam_side;
        lx = p.x + fx * K.cam_look_ahead; ly = 0.35; lz = p.z + fz * K.cam_look_ahead;
        // keep the camera inside the cage, a little
        const L2 = K.pitch_length / 2 + 2, W2 = K.pitch_width / 2 + 2; px = clamp(px, -L2, L2); pz = clamp(pz, -W2, W2);
      }
    } else if (mode === 'figures') {
      px = 0; py = 1.25; pz = 5.2; lx = 0; ly = 0.72; lz = 0; fov = 40;
      cs.px = px; cs.py = py; cs.pz = pz; cs.lx = lx; cs.ly = ly; cs.lz = lz;
    } else { // broadcast: the touchline camera, for the title and results
      const b = w.ball;
      px = b.x * 0.55; py = 7.5; pz = K.pitch_width / 2 + 7.5; lx = b.x * 0.75; ly = 0; lz = b.z * 0.3;
      fov = 48;
    }
    if (cs.px === undefined || info.snapCam) { cs.px = px; cs.py = py; cs.pz = pz; cs.lx = lx; cs.ly = ly; cs.lz = lz; }
    cs.px += (px - cs.px) * follow; cs.py += (py - cs.py) * follow; cs.pz += (pz - cs.pz) * follow;
    cs.lx += (lx - cs.lx) * follow * 1.4; cs.ly += (ly - cs.ly) * follow * 1.4; cs.lz += (lz - cs.lz) * follow * 1.4;
    const sh = fx.shake * (info.reduceMotion ? 0.3 : 1);
    camera.position.set(cs.px + Math.sin(viewT * 47) * sh, cs.py + Math.sin(viewT * 61) * sh, cs.pz + Math.cos(viewT * 53) * sh);
    camera.lookAt(cs.lx, cs.ly, cs.lz);
    if (w.mareado && (mode === 'shoulder' || mode === 'fp') && !info.reduceMotion && info.camRoll) {
      camera.rotateZ(Math.sin(viewT * Math.PI * 2 * K.dizzy_cam_roll_hz) * K.dizzy_cam_roll_deg * Math.PI / 180 * (0.4 + Sim.dizzyScale(w)));
    }
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // ---- Public ----------------------------------------------------------------------------------------
  function init(canvas, opts) {
    if (!THREEok) return false;
    cheap = !!opts.cheap;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !cheap, powerPreference: 'high-performance' });
    renderer.setPixelRatio(cheap ? 0.5 : Math.min(devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = !cheap; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6EC6FF'); gr.addColorStop(0.62, '#FFD6A0'); gr.addColorStop(1, '#FFC48A'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    scene.fog = new THREE.Fog(0xFFD6A0, 38, 95);
    camera = new THREE.PerspectiveCamera(K.cam_fov, 16 / 9, 0.05, 200);
    const gm = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
    gradientMap = new THREE.DataTexture(gm, 3, 1, THREE.RGBAFormat); gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter; gradientMap.generateMipmaps = false; gradientMap.needsUpdate = true;
    faceCanvas = drawFaces();
    const wire = (n, lw) => canvasTex(32, 32, (g) => { g.clearRect(0, 0, 32, 32); g.strokeStyle = '#fff'; g.lineWidth = lw; g.beginPath(); g.moveTo(0, 16); g.lineTo(16, 0); g.lineTo(32, 16); g.lineTo(16, 32); g.closePath(); g.stroke(); });
    wireTex = wire(32, 2.2); wireTex.wrapS = wireTex.wrapT = THREE.RepeatWrapping;
    fineWireTex = wire(32, 2.6); fineWireTex.wrapS = fineWireTex.wrapT = THREE.RepeatWrapping;
    soleTex = canvasTex(64, 128, (g) => { // a boot sole silhouette with studs
      g.clearRect(0, 0, 64, 128); g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(32, 38, 24, 34, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(32, 98, 18, 24, 0, 0, 7); g.fill();
      g.globalCompositeOperation = 'destination-out';
      for (const [x, y] of [[22, 22], [42, 22], [18, 44], [46, 44], [32, 58], [24, 96], [40, 96]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    });
    const hemi = new THREE.HemisphereLight(0xCFE8FF, 0x6A8F4E, 2.2); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xFFE2B8, 2.6);
    sun.position.set(-9, 11, 7); sun.castShadow = !cheap;
    sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = -13; sc.right = 13; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    fx = makeFx(); ballObj = makeBall(); camState = {};
    arenaKey = ''; resize();
    return true;
  }
  function resize() {
    if (!renderer) return;
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // cast: [{id, team, human}] per player of the world
  function setCast(cast) {
    for (const o of chars) removeChar(o);
    chars = cast.map(c => makeChar(c.id, c.team, c.human));
  }

  function sync(w, dt, info) {
    if (!renderer) return;
    viewT += dt;
    const key = [K.pitch_length, K.pitch_width, K.goal_height, K.goal_depth, K.wall_height, K.board_height, K.corner_chamfer, w.goalW].join(',');
    if (key !== arenaKey) { arenaKey = key; buildArena(w.goalW); }
    for (const e of info.events) fxEvent(e, w);
    chars.forEach((o, i) => { const p = w.players[i]; if (p) syncChar(o, p, w, dt, info); });
    const b = w.ball, bm = ballObj.mesh;
    bm.visible = ballObj.blob.visible = b.active;
    if (Math.abs(ballObj.r - K.ball_radius) > 1e-4) { const s = K.ball_radius / ballObj.r; bm.scale.setScalar(s); }
    bm.position.set(b.x, b.y, b.z);
    const sp = hyp(b.vx, b.vz);
    if (sp > 0.01) { _ax.set(b.vz, 0, -b.vx).normalize(); _q.setFromAxisAngle(_ax, sp * dt / K.ball_radius); bm.quaternion.premultiply(_q); }
    ballObj.blob.position.set(b.x, 0.01, b.z); const hk = clamp(1 - (b.y - K.ball_radius) / 3, 0.3, 1); ballObj.blob.scale.set(hk, hk, 1); ballObj.blob.material.opacity = 0.35 * hk;
    fxUpdate(dt, w);
    updateCamera(w, dt, info);
  }

  // the figures line-up: every character side by side (?scene=figures)
  function showFigures(w, dt) {
    if (!figureRow) {
      const ids = Object.keys(ROSTER);
      figureRow = Sim.createWorld({ seed: 1, solo: true, noBall: true });
      figureRow.players = ids.map((id, i) => { const p = Sim.makePlayer(i, i === 0 ? 0 : 1); Sim.placePlayer(p, (i - (ids.length - 1) / 2) * 0.95, 0, Math.PI / 2); return p; });
      figureRow.ball.active = true; figureRow.ball.x = -2.85; figureRow.ball.z = 0.7; figureRow.ball.y = K.ball_radius;
      setCast(ids.map((id, i) => ({ id, team: i === 0 ? 0 : 1, human: false })));
    }
    return figureRow;
  }
  function screenOf(i, hY) { // where a character's head is on screen, in CSS px
    const o = chars[i]; if (!o) return null;
    _v.set(0, 0, 0); o.head.getWorldPosition(_v); _v.y += hY; _v.project(camera);
    return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight };
  }
  function worldToScreen(x, y, z) { _v.set(x, y, z).project(camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, behind: _v.z > 1 }; }
  function render() { if (renderer) renderer.render(scene, camera); }

  window.View = { init, resize, setCast, sync, render, showFigures, screenOf, worldToScreen, ROSTER, TEAM, get ok() { return !!renderer; } };
})();
