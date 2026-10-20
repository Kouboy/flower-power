// render/plant.js — tige, anciennes traces, graine, bourgeon terminal et guide du pointeur.
// Lit     : state.plant, state.input, state.mode, state.time, state.world.viewH, state.camera.y, FP.config.plant.control.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.plantRender.draw(ctx, state) (repère monde), FP.plantRender.drawFinger(ctx, state) (repère écran).
// Porté de la v3.43.16 (drawTrail, drawPlant, drawPointer).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;

  function trace(ctx, points, step) {
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += step) ctx.lineTo(points[i].x, points[i].y);
    const last = points[points.length - 1]; ctx.lineTo(last.x, last.y);
  }

  // Petites mouchetures, taches et feuilles primitives le long de la tige courante.
  function drawStemDetails(ctx, points, alpha) {
    const n = points.length;
    const frame = (i) => {
      const p = points[i], a = points[Math.max(0, i - 2)] || p, b = points[Math.min(n - 1, i + 2)] || p;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      return { p, dx, dy, nx: -dy / d, ny: dx / d, tx: dx / d, ty: dy / d };
    };
    if (n > 14) {
      for (let i = Math.max(8, n - 190); i < n - 5; i += 9) {
        const { p, nx, ny, tx, ty, dx, dy } = frame(i);
        const shift = ((i * 13) % 7) - 3, side = (i % 4) < 2 ? 1 : -1, off = side * (.65 + (i % 3) * .22);
        const gx = p.x + nx * off + tx * shift * .10, gy = p.y + ny * off + ty * shift * .10;
        ctx.fillStyle = `rgba(74,96,45,${.22 * alpha})`;
        ctx.beginPath(); ctx.arc(gx, gy, .72 + (i % 3) * .14, 0, TAU); ctx.fill();
        if (i % 18 === 0) {
          ctx.strokeStyle = `rgba(58,76,36,${.20 * alpha})`; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(gx - tx * 1.2, gy - ty * 1.2); ctx.lineTo(gx + tx * 1.1, gy + ty * 1.1); ctx.stroke();
        }
        if (i % 27 === 0) {
          ctx.fillStyle = `rgba(214,228,142,${.16 * alpha})`;
          ctx.beginPath(); ctx.ellipse(p.x - nx * .9, p.y - ny * .9, .9, .55, Math.atan2(dy, dx), 0, TAU); ctx.fill();
        }
      }
    }
    if (n > 18) {
      for (let i = Math.max(10, n - 180); i < n - 8; i += 18) {
        const { p, nx, ny, dx, dy } = frame(i), wob = ((i * 17) % 5) - 2;
        ctx.fillStyle = `rgba(84,104,49,${.16 * alpha})`;
        ctx.beginPath(); ctx.ellipse(p.x + nx * (1.2 + wob * .08), p.y + ny * (1.2 + wob * .08), 1.6, 1.1, Math.atan2(dy, dx), 0, TAU); ctx.fill();
        if (i % 36 === 0) {
          ctx.fillStyle = `rgba(208,225,136,${.12 * alpha})`;
          ctx.beginPath(); ctx.ellipse(p.x - nx * 1.4, p.y - ny * 1.4, 1.2, .9, Math.atan2(dy, dx), 0, TAU); ctx.fill();
        }
      }
    }
    if (n > 34) {
      for (let i = Math.max(18, n - 156); i < n - 18; i += 44) {
        const a = points[i - 2] || points[i], b = points[i + 2] || points[i];
        const normal = Math.atan2(b.y - a.y, b.x - a.x) + ((i % 88 === 0) ? -1.08 : 1.08);
        ctx.save(); ctx.translate(points[i].x, points[i].y); ctx.rotate(normal);
        ctx.fillStyle = `rgba(142,182,87,${.82 * alpha})`; ctx.strokeStyle = `rgba(38,52,27,${.72 * alpha})`; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.ellipse(5.4, 0, 4.8, 2.8, .10, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = `rgba(203,224,136,${.24 * alpha})`;
        ctx.beginPath(); ctx.ellipse(5.9, -.2, 1.8, .9, .12, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  // Contour sombre, chair végétale mate, nervure claire : le langage des sprites.
  function drawTrail(ctx, points, alpha, current, nearTop) {
    if (points.length < 2) return;
    const n = points.length;
    const step = current ? (nearTop ? (n > 220 ? 4 : (n > 130 ? 3 : 2)) : (n > 320 ? 3 : (n > 190 ? 2 : 1))) : 1;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const layers = current
      ? [[`rgba(34,46,24,${.98 * alpha})`, 10.6], [`rgba(82,104,53,${.42 * alpha})`, 8.4], [`rgba(120,165,73,${.98 * alpha})`, 6.15], [`rgba(205,223,128,${.66 * alpha})`, 1.45]]
      : [[`rgba(43,52,33,${.34 * alpha})`, 5.4], [`rgba(70,82,57,${.20 * alpha})`, 4.1], [`rgba(92,122,68,${.35 * alpha})`, 2.9], [`rgba(177,192,128,${.18 * alpha})`, .9]];
    for (const [color, width] of layers) { ctx.strokeStyle = color; ctx.lineWidth = width; trace(ctx, points, step); ctx.stroke(); }
    if (current) drawStemDetails(ctx, points, alpha);
    ctx.restore();
  }

  function drawSeed(ctx, seed) {
    ctx.save(); ctx.translate(seed.x, seed.y); ctx.rotate(-.18);
    ctx.fillStyle = '#c59d65'; ctx.strokeStyle = '#4b3828'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(0, 0, 12.2, 16.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8e6b44'; ctx.beginPath(); ctx.ellipse(2.4, 0, 5.8, 10.1, .04, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(100,73,45,.55)'; ctx.beginPath(); ctx.ellipse(-4.6, 3.7, 4.6, 7.2, -.28, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(238,215,159,.56)'; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.arc(-1.4, -1.2, 8.0, -1.62, 1.08); ctx.stroke();
    ctx.strokeStyle = 'rgba(77,56,36,.42)'; ctx.lineWidth = 1.0; ctx.beginPath(); ctx.moveTo(-1.2, -9.2); ctx.quadraticCurveTo(-4.2, 0, -1.2, 8.7); ctx.stroke();
    ctx.restore();
  }

  // Bourgeon terminal charnu et nervuré.
  function drawBud(ctx, tip, dir) {
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(Math.atan2(dir.x, -dir.y));
    ctx.fillStyle = '#627d42'; ctx.strokeStyle = '#314223'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.ellipse(-7, 3, 4.1, 7.2, -.74, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(7, 3.4, 3.9, 6.8, .74, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a6c66f'; ctx.strokeStyle = '#354727'; ctx.lineWidth = 2.3;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, -3, 6.2, 6.4); ctx.quadraticCurveTo(0, 11, -6.2, 6.4); ctx.quadraticCurveTo(-9, -3, 0, -11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(95,125,59,.42)'; ctx.beginPath(); ctx.ellipse(0, 3.4, 3.6, 5.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(229,236,160,.62)'; ctx.lineWidth = 1.05; ctx.beginPath(); ctx.moveTo(0, -7.8); ctx.lineTo(0, 6.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(203,214,141,.36)'; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(-2.1, 1.8, -1.6, 5.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.quadraticCurveTo(2.0, 1.5, 1.5, 5.4); ctx.stroke();
    ctx.restore();
  }

  // Guide (repère monde) : cible devant la pointe et trajectoire prévue en pointillés.
  function drawGuide(ctx, state) {
    const p = state.plant, c = FP.config.plant.control;
    const y01 = clamp(state.input.y / state.world.viewH, 0, 1);
    const gx = p.guide.x, gy = p.tip.y - lerp(c.lookAheadTop, c.lookAheadBottom, y01);
    const pulse = Math.sin(state.time * 7);
    ctx.save();
    ctx.strokeStyle = '#fff0ad'; ctx.lineWidth = 2;
    ctx.globalAlpha = .24; ctx.beginPath(); ctx.moveTo(p.tip.x, p.tip.y); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.globalAlpha = .55; ctx.strokeStyle = 'rgba(255,240,173,.72)';
    ctx.beginPath(); ctx.arc(gx, gy, 16 + pulse * 1.5, 0, TAU); ctx.stroke();
    ctx.globalAlpha = .24; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(p.tip.x, p.tip.y);
    let px = p.tip.x, py = p.tip.y, vx = p.dir.x, vy = p.dir.y;
    for (let i = 0; i < 16; i++) {
      const turn = clamp((gx - px) / c.turnDivisor, -1, 1);
      let v = FP.geom.clampUpAngle(turn * c.turnGain * lerp(c.sharpTop, c.sharpBottom, y01), c.desiredY, 89);
      vx = lerp(vx, v.x, .16); vy = lerp(vy, v.y, .16);
      v = FP.geom.clampUpAngle(vx, vy, 89); vx = v.x; vy = v.y;
      px += vx * 9; py += vy * 9; ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  function draw(ctx, state) {
    const p = state.plant, camY = state.camera.y;
    p.oldTrails.forEach((t, i) => drawTrail(ctx, t, .38 + .36 * (i + 1) / Math.max(1, p.oldTrails.length), false, false));
    if (p.trail.length) drawTrail(ctx, p.trail, 1, true, p.tip && p.tip.y - camY < 160);
    const seedVisible = p.seed.y + 38 >= camY - 70 && p.seed.y - 38 <= camY + state.world.viewH + 70;
    if (seedVisible) drawSeed(ctx, p.seed);
    if (state.mode === 'playing' && p.tip) {
      drawBud(ctx, p.tip, p.dir);
      if (state.input.down) drawGuide(ctx, state);
    }
  }

  // Cercle sous le doigt (repère écran) : plein quand on pilote, discret sinon.
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
