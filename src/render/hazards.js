// render/hazards.js — nappes toxiques, limaces de lixiviat et anneau d'exposition.
// Lit     : state.time, state.mode, state.world.{toxics,leaks,viewH}, state.camera.y, state.plant.{tip,toxicTimer},
//           FP.config.{soil,toxic}.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.hazardsRender.{drawBase, drawLeaks, drawOverlay, drawExposure}(ctx, state).
// Porté de la v3.43.16 (drawToxicZoneBase, limaces de drawHazards, drawToxicZoneOverlay, anneau toxique de drawShieldGauge).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp } = FP.math;

  function inView(state, y0, y1) {
    const pad = FP.config.soil.viewPad, top = state.camera.y - pad, bottom = state.camera.y + state.world.viewH + pad;
    return y1 >= top && y0 <= bottom;
  }

  // Sous-couche de la nappe, dans la terre : halo, lobes, cœur, mouchetures, deux bulles.
  function drawToxicBase(ctx, o, t) {
    const breathe = .94 + Math.sin(t * 1.15 + o.pulse) * .035;
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
    ctx.globalAlpha = .72 + breathe * .08;
    ctx.fillStyle = 'rgba(121,145,48,.12)'; ctx.beginPath(); ctx.ellipse(0, 0, o.rx * 1.24, o.ry * 1.20, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(145,177,55,.13)';
    for (const q of o.lobes) {
      ctx.beginPath(); ctx.ellipse(Math.cos(q.a) * o.rx * q.r, Math.sin(q.a) * o.ry * q.r, o.rx * q.sx, o.ry * q.sy, q.a * .22, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(105,137,39,.17)'; ctx.beginPath(); ctx.ellipse(0, 1, o.rx * .80, o.ry * .72, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(180,207,67,.15)'; ctx.beginPath(); ctx.ellipse(-o.rx * .12, -o.ry * .08, o.rx * .47, o.ry * .38, .14, 0, TAU); ctx.fill();
    for (const q of o.specks) {
      ctx.fillStyle = q.light ? 'rgba(205,229,92,.30)' : 'rgba(42,55,23,.25)';
      ctx.beginPath(); ctx.arc(q.x * o.rx, q.y * o.ry, q.r, 0, TAU); ctx.fill();
    }
    // Deux bulles discrètes, animées en alpha seulement.
    ctx.globalAlpha = .22 + .08 * Math.sin(t * 1.8 + o.pulse); ctx.strokeStyle = 'rgba(211,232,103,.48)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-o.rx * .20, -o.ry * .16, 3.1, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(o.rx * .22, o.ry * .12, 2.2, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // Pellicule légère devant les sprites, pour mieux les enrober.
  function drawToxicOverlay(ctx, o, t) {
    const breathe = .94 + Math.sin(t * 1.15 + o.pulse) * .035;
    ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.a);
    ctx.globalAlpha = .18 + breathe * .06;
    ctx.fillStyle = 'rgba(191,226,82,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, o.rx * .92, o.ry * .84, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(109,144,39,.20)';
    for (const q of o.lobes) {
      const r = Math.max(.18, q.r - .05);
      ctx.beginPath(); ctx.ellipse(Math.cos(q.a) * o.rx * r, Math.sin(q.a) * o.ry * r, o.rx * q.sx * .72, o.ry * q.sy * .72, q.a * .18, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(216,240,116,.20)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(-o.rx * .06, -o.ry * .03, o.rx * .56, o.ry * .46, .18, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // Sillon visqueux le long du trajet (pas un rail d'interface).
  function drawTrack(ctx, l, flash) {
    const ca = Math.cos(l.angle), sa = Math.sin(l.angle), na = -sa, nb = ca;
    ctx.globalAlpha = .74;
    ctx.strokeStyle = flash ? 'rgba(230,255,96,.62)' : 'rgba(83,109,38,.36)';
    ctx.lineWidth = 8 + flash * 3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const q = i / 10 - .5, wob = Math.sin(i * 1.7 + l.phase) * 3.2;
      const x = l.x + ca * l.len * q + na * wob, y = l.y + sa * l.len * q + nb * wob;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(22,31,10,.42)'; ctx.lineWidth = 2.1;
    ctx.beginPath(); ctx.moveTo(l.x - ca * l.len * .5, l.y - sa * l.len * .5); ctx.lineTo(l.x + ca * l.len * .5, l.y + sa * l.len * .5); ctx.stroke();
  }

  // Corps de limace chimique, orienté selon le trajet ; trois variantes (clear, fat, debris).
  function drawSlug(ctx, l, flash, t) {
    const r = l.r, wig = Math.sin(t * 8 + l.phase) * 2.2;
    ctx.translate(l.cx, l.cy); ctx.rotate(l.angle + Math.sin(t * 3 + l.phase) * .08);
    ctx.fillStyle = flash ? 'rgba(245,255,98,.96)' : (l.morph === 'clear' ? 'rgba(157,214,78,.72)' : 'rgba(142,202,58,.90)');
    const rx = r * (l.morph === 'fat' ? 1.38 : (l.morph === 'clear' ? 1.32 : 1.22));
    const ry = r * (l.morph === 'fat' ? .78 : .63) + wig * .18;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(72,99,29,.92)';
    ctx.beginPath(); ctx.ellipse(-r * .42, -r * .05, r * .46, r * .28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(223,255,132,.82)';
    for (const [sx, sy, sr] of [[-r * .32, -r * .34, 2.3], [r * .18, -r * .28, 1.9], [r * .44, .12, 2.1]]) {
      ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    }
    if (l.morph === 'debris') {
      // Fragments pris dans le lixiviat : languette, bouchon, microplastique.
      ctx.fillStyle = '#d2b84c'; ctx.beginPath(); ctx.roundRect(-r * .18, -3, 7, 5, 1.5); ctx.fill();
      ctx.fillStyle = '#6b91a1'; ctx.beginPath(); ctx.arc(r * .25, 2.5, 3.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d07e62'; ctx.beginPath(); ctx.moveTo(-r * .48, 2); ctx.lineTo(-r * .31, -4); ctx.lineTo(-r * .24, 4); ctx.closePath(); ctx.fill();
    }
    // Deux antennes très bêtes, donc menaçantes à leur manière.
    ctx.strokeStyle = 'rgba(201,255,103,.86)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * .55, -r * .16); ctx.quadraticCurveTo(r * .86, -r * .48, r * 1.04, -r * .70);
    ctx.moveTo(r * .58, r * .08); ctx.quadraticCurveTo(r * .92, r * .26, r * 1.12, r * .43);
    ctx.stroke();
    ctx.fillStyle = 'rgba(26,36,12,.72)';
    ctx.beginPath(); ctx.arc(r * 1.07, -r * .72, 1.8, 0, TAU); ctx.arc(r * 1.15, r * .43, 1.8, 0, TAU); ctx.fill();
  }

  function drawBase(ctx, state) {
    for (const o of state.world.toxics) {
      const pad = Math.max(o.rx, o.ry) + 90;
      if (inView(state, o.y - pad, o.y + pad)) drawToxicBase(ctx, o, state.time);
    }
  }

  function drawLeaks(ctx, state) {
    for (const l of state.world.leaks) {
      const span = l.len * .5 + l.r + 90;
      if (!inView(state, l.y - span, l.y + span)) continue;
      const flash = clamp(l.hitFlash * 5, 0, 1);
      ctx.save();
      drawTrack(ctx, l, flash);
      drawSlug(ctx, l, flash, state.time);
      ctx.restore();
    }
  }

  function drawOverlay(ctx, state) {
    for (const o of state.world.toxics) {
      const pad = Math.max(o.rx, o.ry) + 90;
      if (inView(state, o.y - pad, o.y + pad)) drawToxicOverlay(ctx, o, state.time);
    }
  }

  // Anneau qui se remplit pendant l'exposition (brûlure à 100 %).
  function drawExposure(ctx, state) {
    const p = state.plant;
    if (state.mode !== 'playing' || !p.tip) return;
    const frac = clamp(p.toxicTimer / FP.config.toxic.burnAt, 0, 1);
    if (frac <= .015) return;
    const { x, y } = p.tip, r = 28;
    ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = .96;
    ctx.strokeStyle = 'rgba(23,31,11,.54)'; ctx.lineWidth = 5.2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(211,255,84,.96)'; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
    ctx.strokeStyle = 'rgba(18,24,8,.50)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  FP.hazardsRender = { drawBase, drawLeaks, drawOverlay, drawExposure };
})();
