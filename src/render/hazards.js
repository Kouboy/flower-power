// render/hazards.js — nappes toxiques, limaces de lixiviat et anneau d'exposition, en pixels d'art.
// Lit     : state.time, state.mode, state.world.{toxics,leaks,viewH}, state.camera.y, state.plant.{tip,toxicTimer},
//           FP.config.{soil,toxic}, FP.px, FP.palette.{toxic,slug}, FP.hazards.leakHeading.
// Écrit   : o._px sur chaque nappe — cache de rendu uniquement, jamais lu par la simulation.
// Expose  : FP.hazardsRender.{drawBase, drawLeaks, drawOverlay, drawExposure}(actx, state) — repère d'art, caméra appliquée ici.
// Porté de la v3.43.16 (drawToxicZoneBase, limaces de drawHazards, drawToxicZoneOverlay, anneau toxique de drawShieldGauge).
// Couleurs : FP.palette.toxic et FP.palette.slug (violet chimique), réservées aux dangers.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp } = FP.math;
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  function inView(state, y0, y1) {
    const pad = FP.config.soil.viewPad, top = state.camera.y - pad, bottom = state.camera.y + state.world.viewH + pad;
    return y1 >= top && y0 <= bottom;
  }

  // Champ d'une nappe en coordonnées locales (repère monde, nappe non tournée) : < 1 dedans, plus petit = plus profond.
  function field(o, lx, ly) {
    let m = (lx / (o.rx * 1.08)) ** 2 + (ly / (o.ry * 1.02)) ** 2;
    for (const q of o.lobes) {
      const cx = Math.cos(q.a) * o.rx * q.r, cy = Math.sin(q.a) * o.ry * q.r;
      m = Math.min(m, ((lx - cx) / (o.rx * q.sx)) ** 2 + ((ly - cy) / (o.ry * q.sy)) ** 2);
    }
    return m;
  }

  // Deux images par nappe (pulsation) et une pellicule, en pixels d'art, rotation comprise. Calculées une fois.
  function build(o) {
    const s = FP.px.SCALE, R = Math.ceil(Math.max(o.rx, o.ry) * 1.25 / s) + 2;
    const ca = Math.cos(-o.a), sa = Math.sin(-o.a), size = 2 * R + 1;
    const mk = () => { const c = document.createElement('canvas'); c.width = size; c.height = size; return c; };
    const base = [mk(), mk()], film = mk();
    const gb = base.map(c => c.getContext('2d')), gf = film.getContext('2d');
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const wx = (x - R) * s, wy = (y - R) * s, lx = wx * ca - wy * sa, ly = wx * sa + wy * ca;
        const m = field(o, lx, ly);
        if (m >= 1) continue;
        const b = BAYER[y & 3][x & 3];
        // Bord clairsemé, cœur plus dense ; la pulsation fait varier la densité (8 ↔ 10 niveaux).
        [6, 8].forEach((lv, i) => {
          const level = m > .7 ? lv - 3 : (m > .3 ? lv : lv + 3);
          if (b < level) { gb[i].fillStyle = m < .3 && b < 3 ? FP.palette.toxic.light : (m < .7 ? FP.palette.toxic.mid : FP.palette.toxic.dark); gb[i].fillRect(x, y, 1, 1); }
        });
        if (m < .8 && b < 2) { gf.fillStyle = FP.palette.toxic.glow; gf.fillRect(x, y, 1, 1); }
      }
    }
    // Mouchetures claires et sombres, fixes.
    for (const q of o.specks) {
      const wx = q.x * o.rx, wy = q.y * o.ry, cx = Math.cos(o.a), sx = Math.sin(o.a);
      const x = R + Math.round((wx * cx - wy * sx) / s), y = R + Math.round((wx * sx + wy * cx) / s);
      for (const g of gb) { g.fillStyle = q.light ? FP.palette.toxic.glow : FP.palette.toxic.ink; g.fillRect(x, y, 1, 1); }
    }
    o._px = { base, film, R };
    return o._px;
  }

  function drawBase(g, state) {
    const { px } = FP, oy = px.toArt(state.camera.y), t = state.time;
    for (const o of state.world.toxics) {
      const pad = Math.max(o.rx, o.ry) + 90;
      if (!inView(state, o.y - pad, o.y + pad)) continue;
      const c = o._px || build(o), phase = (t / 1.2 + o.pulse) % 1 < .5 ? 0 : 1;
      const ax = px.toArt(o.x) - c.R, ay = px.toArt(o.y) - oy - c.R;
      g.drawImage(c.base[phase], ax, ay);
      // Deux bulles qui clignotent.
      if (Math.sin(t * 1.8 + o.pulse) > .2) px.ring(g, ax + c.R - Math.round(o.rx * .1), ay + c.R - Math.round(o.ry * .08), 2, FP.palette.toxic.glow);
      if (Math.sin(t * 1.8 + o.pulse + 2) > .4) px.ring(g, ax + c.R + Math.round(o.rx * .11), ay + c.R + Math.round(o.ry * .06), 1, FP.palette.toxic.glow);
    }
  }

  function drawOverlay(g, state) {
    const { px } = FP, oy = px.toArt(state.camera.y);
    for (const o of state.world.toxics) {
      const pad = Math.max(o.rx, o.ry) + 90;
      if (!inView(state, o.y - pad, o.y + pad)) continue;
      const c = o._px || build(o);
      g.drawImage(c.film, px.toArt(o.x) - c.R, px.toArt(o.y) - oy - c.R);
    }
  }

  // Sillon visqueux le long du trajet, puis limace orientée selon le trajet (clear, fat, debris).
  function drawTrack(g, l, oy, flash) {
    const { px } = FP, ca = Math.cos(l.angle), sa = Math.sin(l.angle), na = -sa, nb = ca, pts = [];
    for (let i = 0; i <= 10; i++) {
      const q = i / 10 - .5, wob = Math.sin(i * 1.7 + l.phase) * 3.2;
      pts.push([px.toArt(l.x + ca * l.len * q + na * wob), px.toArt(l.y + sa * l.len * q + nb * wob) - oy]);
    }
    for (let i = 1; i < pts.length; i++) px.line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], flash ? FP.palette.toxic.glow : FP.palette.toxic.dark, 3);
    for (let i = 1; i < pts.length; i += 2) px.line(g, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], FP.palette.toxic.ink, 1);
  }

  function drawSlug(g, l, oy, flash, t) {
    const { px } = FP, s = px.SCALE, r = l.r / s, cx = px.toArt(l.cx), cy = px.toArt(l.cy) - oy;
    const ang = l.angle + Math.sin(t * 3 + l.phase) * .08, ca = Math.cos(ang), sa = Math.sin(ang);
    const rx = r * (l.morph === 'fat' ? 1.38 : (l.morph === 'clear' ? 1.32 : 1.22)), ry = r * (l.morph === 'fat' ? .78 : .63) + Math.sin(t * 8 + l.phase) * .4;
    const R = Math.ceil(rx) + 2, body = flash ? FP.palette.slug.flash : (l.morph === 'clear' ? FP.palette.slug.clear : FP.palette.slug.body);
    const inside = (x, y, k) => { const u = (x * ca + y * sa) / (rx + k), v = (-x * sa + y * ca) / (ry + k); return u * u + v * v <= 1; };
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      if (inside(x, y, 0)) px.rect(g, cx + x, cy + y, 1, 1, (-x * sa + y * ca) > ry * .35 ? FP.palette.slug.shade : body);
      else if (inside(x, y, 1)) px.rect(g, cx + x, cy + y, 1, 1, FP.palette.slug.outline);
    }
    // La tête (antennes, taches) passe du côté où la limace avance : miroir le long du trajet, l'ombre du corps reste en bas.
    const dir = FP.hazards.leakHeading(l), at = (u, v) => [cx + Math.round(dir * u * ca - v * sa), cy + Math.round(dir * u * sa + v * ca)];
    for (const [u, v] of [[-rx * .3, -ry * .4], [rx * .2, -ry * .3]]) { const [x, y] = at(u, v); px.rect(g, x, y, 1, 1, FP.palette.slug.spot); }
    if (l.morph === 'debris') { const [x, y] = at(-rx * .1, 0); px.rect(g, x, y, 2, 1, '#d2b84c'); px.rect(g, x + 2, y + 1, 1, 1, '#6b91a1'); }
    // Deux antennes très bêtes, donc menaçantes à leur manière.
    for (const v of [-.6, .5]) { const [x0, y0] = at(rx * .7, v * ry * .6), [x1, y1] = at(rx + 2, v * (ry + 2)); px.line(g, x0, y0, x1, y1, FP.palette.slug.outline); px.rect(g, x1, y1, 1, 1, FP.palette.slug.eye); }
  }

  function drawLeaks(g, state) {
    const oy = FP.px.toArt(state.camera.y);
    for (const l of state.world.leaks) {
      const span = l.len * .5 + l.r + 90;
      if (!inView(state, l.y - span, l.y + span)) continue;
      const flash = clamp(l.hitFlash * 5, 0, 1) > .5;
      drawTrack(g, l, oy, flash);
      drawSlug(g, l, oy, flash, state.time);
    }
  }

  // Anneau qui se remplit pendant l'exposition (brûlure à 100 %), tracé pixel par pixel.
  function drawExposure(g, state) {
    const { px } = FP, p = state.plant;
    if (state.mode !== 'playing' || !p.tip) return;
    const frac = clamp(p.toxicTimer / FP.config.toxic.burnAt, 0, 1);
    if (frac <= .015) return;
    const cx = px.toArt(p.tip.x), cy = px.toArt(p.tip.y) - px.toArt(state.camera.y) - 3, r = 14;
    px.ring(g, cx, cy, r + 1, FP.palette.toxic.ink, 4);
    const steps = Math.ceil(TAU * r * 1.5 * frac);
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + TAU * frac * i / Math.max(1, steps);
      px.rect(g, cx + Math.round(Math.cos(a) * r) - 1, cy + Math.round(Math.sin(a) * r) - 1, 2, 2, FP.palette.toxic.light);
    }
  }

  FP.hazardsRender = { drawBase, drawLeaks, drawOverlay, drawExposure };
})();
