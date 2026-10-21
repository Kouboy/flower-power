// render/plant.js — tige, anciennes tiges, graine endormie, héros et guide du pointeur, en pixels d'art.
// Lit     : state.plant, state.input, state.mode, state.time, state.world.viewH, state.camera.y, FP.config.plant.control,
//           FP.px, FP.palette.{stem,seed}, FP.hero, FP.powerupsRender.drawShield.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.plantRender.draw(actx, state) (repère d'art, caméra appliquée ici), FP.plantRender.drawFinger(ctx, state) (couche nette).
// Porté de la v3.43.16 (drawTrail, drawPlant, drawPointer), redessiné en pixels pour la v4.1.0.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const LEAF_EVERY = 5;   // une feuille tous les 5 points de trace (≈ 43 px)

  // Trace en pixels d'art, sans doublons.
  function toArtPoints(points, oy) {
    const { px } = FP, out = [];
    for (const p of points) {
      const x = px.toArt(p.x), y = px.toArt(p.y) - oy, last = out[out.length - 1];
      if (!last || last.x !== x || last.y !== y) out.push({ x, y });
    }
    return out;
  }

  function stroke(g, pts, color, thick, dx = 0) {
    for (let i = 1; i < pts.length; i++) FP.px.line(g, pts[i - 1].x + dx, pts[i - 1].y, pts[i].x + dx, pts[i].y, color, thick);
  }

  // Tige courante : contour sombre, corps, reflet d'un pixel ; paires de feuilles fixes le long de la trace.
  function drawStem(g, points, oy, current) {
    if (points.length < 2) return;
    const c = FP.palette.stem, pts = toArtPoints(points, oy);
    if (pts.length < 2) return;
    stroke(g, pts, c.outline, current ? 4 : 3);
    stroke(g, pts, current ? c.body : c.old, 2);
    stroke(g, pts, current ? c.light : c.oldLight, 1, -1);
    if (!current) return;
    for (let i = LEAF_EVERY; i < points.length - 3; i += LEAF_EVERY) {
      const a = points[i - 1], b = points[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const side = (i / LEAF_EVERY) % 2 ? 1 : -1, nx = -(b.y - a.y) / len * side, ny = (b.x - a.x) / len * side;
      const x = FP.px.toArt(points[i].x) + Math.round(nx * 3), y = FP.px.toArt(points[i].y) - oy + Math.round(ny * 3);
      FP.px.rect(g, x - 2, y - 1, 4, 3, c.outline);
      FP.px.rect(g, x - 1, y - 1, 3, 2, c.leaf);
      FP.px.rect(g, x - 1, y - 1, 1, 1, c.light);
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
    for (const t of p.oldTrails) drawStem(g, t, oy, false);
    if (p.trail.length) drawStem(g, p.trail, oy, true);
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

  FP.plantRender = { draw, drawFinger };
})();
