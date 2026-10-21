// render/plant.js — tige, anciennes tiges, graine endormie, héros et guide du pointeur, en pixels d'art.
// Lit     : state.plant, state.input, state.mode, state.time, state.world.viewH, state.camera.y, FP.config.plant.control,
//           FP.px, FP.palette.{stem,seed,strataTone}, FP.soil.surfaceTop, FP.geom.clampUpAngle, FP.hero, FP.powerupsRender.drawShield.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.plantRender.draw(actx, state) (repère d'art, caméra appliquée ici), FP.plantRender.drawFinger(ctx, state) (couche nette),
//           FP.plantRender.buried(x, y, old) — portion de tige recouverte de terre (pure, testée).
// Porté de la v3.43.16 (drawTrail, drawPlant, drawPointer), redessiné en pixels pour la v4.1.0.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const LEAF_EVERY = 5;   // une feuille tous les 5 points de trace (≈ 43 px)

  // --- Enfouissement : la tige fouit, la terre la recouvre par endroits ---------------------------

  const ROOT = '#7a6248', MYCELIUM = '#d8cfbe';
  const CELL = 10;                         // taille (px monde) des portions recouvertes ou non

  // Empreinte stable (finaliseur de MurmurHash3) de deux entiers : ne dépend que de la position, pas de l'ordre des points.
  function mix(a, b, salt) {
    let h = (Math.imul(a, 0x9e3779b1) + Math.imul(b, 0x85ebca77) + Math.imul(salt, 0xc2b2ae3d)) | 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  const cellHash = (x, y, salt) => mix(Math.floor(x / CELL), Math.floor(y / CELL), salt);

  // Mottes réparties, jamais groupées : par groupe de 4 cases d'une colonne, une case recouverte (tige courante, 25 %),
  // ou une à deux cases laissées visibles (anciennes tiges, ≈ 60 %).
  function buried(x, y, old) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), group = Math.floor(cy / 4), slot = ((cy % 4) + 4) % 4, h = mix(cx, group, 1);
    if (!old) return slot === h % 4;
    return slot !== h % 4 && slot !== (h >>> 2) % 4;
  }

  // Profondeur relative (0 = surface, 1 = fond) pour choisir la teinte de terre.
  const depthOf = (world, y) => Math.max(0, Math.min(.999, (y - FP.soil.surfaceTop(world)) / (world.height - FP.soil.surfaceTop(world))));

  // Tige : tunnel remué derrière la pointe, racines, corps, mottes qui la recouvrent, mycélium au premier plan.
  // Seuls les segments visibles sont dessinés.
  function drawStem(g, points, oy, current, world, viewH) {
    if (points.length < 2) return;
    const { px, palette } = FP, c = palette.stem, top = oy - 8, bottom = oy + viewH + 8;
    const seg = [];
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1], p1 = points[i], y0 = px.toArt(p0.y) - oy, y1 = px.toArt(p1.y) - oy;
      if (Math.max(y0, y1) + oy < top || Math.min(y0, y1) + oy > bottom) continue;
      const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      seg.push({ i, p0, p1, a: [px.toArt(p0.x), y0], b: [px.toArt(p1.x), y1], nx: -(p1.y - p0.y) / len, ny: (p1.x - p0.x) / len, mx: (p0.x + p1.x) / 2, my: (p0.y + p1.y) / 2 });
    }
    if (!seg.length) return;
    const n = points.length, line = (q, col, t, dx = 0) => px.line(g, q.a[0] + dx, q.a[1], q.b[0] + dx, q.b[1], col, t);
    // Tunnel : sur les 7 derniers segments, de la terre remuée de part et d'autre.
    if (current) for (const q of seg) if (q.i > n - 8) {
      const d = depthOf(world, q.my), ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy;
      for (const side of [-1, 1]) for (let k = 3; k <= 4; k++) px.rect(g, ax + Math.round(q.nx * k * side), ay + Math.round(q.ny * k * side), 1, 1, palette.strataTone(d, k === 3 ? 0 : 3));
    }
    // Racines fines qui partent de la tige dans la terre.
    for (const q of seg) {
      const h = cellHash(q.mx, q.my, 2);
      if (h % 9) continue;
      const side = h & 16 ? 1 : -1, len = 3 + (h >>> 5) % 4, ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy;
      const ex = ax + Math.round(q.nx * side * (len + 2)), ey = ay + Math.round(q.ny * side * (len + 2)) + 1;
      px.line(g, ax + Math.round(q.nx * side * 2), ay + Math.round(q.ny * side * 2), ex, ey, ROOT);
      px.rect(g, ex + side, ey + 1, 1, 1, ROOT);
    }
    for (const q of seg) line(q, c.outline, current ? 4 : 3);
    for (const q of seg) line(q, current ? c.body : c.old, 2);
    for (const q of seg) line(q, current ? c.light : c.oldLight, 1, -1);
    if (current) {
      for (let i = LEAF_EVERY; i < n - 3; i += LEAF_EVERY) {
        const p = points[i], ay = px.toArt(p.y) - oy;
        if (ay < -4 || ay > viewH / px.SCALE + 4 || buried(p.x, p.y, false)) continue;
        const a = points[i - 1], b = points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const side = (i / LEAF_EVERY) % 2 ? 1 : -1, nx = -(b.y - a.y) / len * side, ny = (b.x - a.x) / len * side;
        const x = px.toArt(p.x) + Math.round(nx * 3), y = ay + Math.round(ny * 3);
        px.rect(g, x - 2, y - 1, 4, 3, c.outline);
        px.rect(g, x - 1, y - 1, 3, 2, c.leaf);
        px.rect(g, x - 1, y - 1, 1, 1, c.light);
      }
    }
    // Mottes : la terre recouvre la tige par endroits (jamais sur les derniers segments, la pointe reste visible).
    for (const q of seg) {
      if (current && q.i > n - 10) continue;
      if (!buried(q.mx, q.my, !current)) continue;
      const d = depthOf(world, q.my), ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy, h = cellHash(q.mx, q.my, 3);
      px.rect(g, ax - 3, ay - 2, 7, 4, palette.strataTone(d, 2));
      px.rect(g, ax - 2, ay - 3, 5, 1, palette.strataTone(d, 1));
      px.rect(g, ax - 2 + (h % 4), ay - 1, 1, 1, palette.strataTone(d, 0));
      px.rect(g, ax - 4, ay - 1 + (h >>> 3) % 2, 1, 2, palette.strataTone(d, 3));
      px.rect(g, ax + 4, ay - 1 + (h >>> 4) % 2, 1, 2, palette.strataTone(d, 3));
    }
    // Mycélium pâle, en pointillés, qui passe devant la tige.
    for (const q of seg) {
      const h = cellHash(q.mx, q.my, 4);
      if (h % 13) continue;
      const ax = px.toArt(q.mx), ay = px.toArt(q.my) - oy, tilt = ((h >>> 6) % 3) - 1;
      for (let k = -6; k <= 6; k += 2) px.rect(g, ax + Math.round(q.nx * k), ay + Math.round(q.ny * k) + Math.round(k * tilt / 4), 1, 1, MYCELIUM);
    }
  }

  // Graine du fond : elle dort en attendant le lancement.
  function drawSeed(g, seed, oy) {
    const { px } = FP, c = FP.palette.seed, ax = px.toArt(seed.x), ay = px.toArt(seed.y) - oy;
    px.disc(g, ax, ay, 7, c.outline);
    px.disc(g, ax, ay, 6, c.body);
    px.rect(g, ax + 1, ay - 3, 4, 8, c.shade);
    px.rect(g, ax - 4, ay - 4, 2, 3, c.light);
    px.rect(g, ax - 3, ay - 1, 2, 1, c.outline); px.rect(g, ax + 1, ay - 1, 2, 1, c.outline);   // yeux fermés
    px.rect(g, ax - 1, ay + 2, 2, 1, c.outline);
  }

  // Guide : cible devant la pointe et trajectoire prévue, en pointillés de pixels.
  function drawGuide(g, state, oy) {
    const { px } = FP, p = state.plant, c = FP.config.plant.control;
    const y01 = clamp(state.input.y / state.world.viewH, 0, 1);
    const gx = p.guide.x, gy = p.tip.y - lerp(c.lookAheadTop, c.lookAheadBottom, y01);
    px.ring(g, px.toArt(gx), px.toArt(gy) - oy, 8 + Math.round(Math.sin(state.time * 7)), '#f4e6a8');
    let x = p.tip.x, y = p.tip.y, vx = p.dir.x, vy = p.dir.y;
    for (let i = 0; i < 16; i++) {
      const turn = clamp((gx - x) / c.turnDivisor, -1, 1);
      let v = FP.geom.clampUpAngle(turn * c.turnGain * lerp(c.sharpTop, c.sharpBottom, y01), c.desiredY, 89);
      vx = lerp(vx, v.x, .16); vy = lerp(vy, v.y, .16);
      v = FP.geom.clampUpAngle(vx, vy, 89); vx = v.x; vy = v.y;
      x += vx * 9; y += vy * 9;
      if (i % 2 === 1) px.rect(g, px.toArt(x), px.toArt(y) - oy, 1, 1, '#b8a870');
    }
  }

  function draw(g, state) {
    const { px } = FP, p = state.plant, camY = state.camera.y, oy = px.toArt(camY);
    for (const t of p.oldTrails) drawStem(g, t, oy, false, state.world, state.world.viewH);
    if (p.trail.length) drawStem(g, p.trail, oy, true, state.world, state.world.viewH);
    const seedVisible = p.seed.y + 38 >= camY - 70 && p.seed.y - 38 <= camY + state.world.viewH + 70;
    if (seedVisible && !(p.tip && Math.hypot(p.tip.x - p.seed.x, p.tip.y - p.seed.y) < 24)) drawSeed(g, p.seed, oy);
    const alive = state.mode === 'playing' || state.mode === 'dying' || state.mode === 'over';
    if (alive && p.tip) {
      if (state.mode === 'playing') FP.powerupsRender.drawShield(g, state);   // membrane sous la tête, comme en v3
      FP.hero.draw(g, state, px.toArt(p.tip.x), px.toArt(p.tip.y) - oy - 3, p.dir);
      if (state.mode === 'playing' && state.input.down) drawGuide(g, state, oy);
    }
  }

  // Cercle sous le doigt (couche nette, repère écran) : plein quand on pilote, discret sinon.
  function drawFinger(ctx, state) {
    const i = state.input;
    if (!i.active || state.mode !== 'playing') return;
    ctx.save();
    ctx.globalAlpha = i.down ? .95 : .22;
    ctx.strokeStyle = i.down ? '#fff0ad' : 'rgba(255,240,173,.4)'; ctx.lineWidth = i.down ? 2 : 1;
    ctx.beginPath(); ctx.arc(i.screenX, i.y, 22 + Math.sin(state.time * 7) * 2, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  FP.plantRender = { draw, drawFinger, buried };
})();
