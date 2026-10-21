// render/powerups.js — récompenses de flyover (naissance, glyphes) et membrane du bouclier organique.
// Lit     : state.time, state.mode, state.world.{bonuses,viewH}, state.camera.y, state.plant.tip, state.power.shield,
//           FP.config.soil.viewPad.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.powerupsRender.drawBonuses(ctx, state), FP.powerupsRender.drawShield(ctx, state).
// Porté de la v3.43.16 (drawBonuses, drawBonusManifestation, drawBonusGlyph, drawAssetSource/Spore/Pollen, drawOrganicShield).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp } = FP.math;

  // Poche d'eau prise entre deux racines : bonus organique, pas jeton flottant.
  function drawSource(ctx) {
    ctx.strokeStyle = '#4e3925'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-22, -16); ctx.quadraticCurveTo(-15, -2, -17, 18); ctx.moveTo(21, -17); ctx.quadraticCurveTo(13, -3, 17, 18); ctx.stroke();
    ctx.fillStyle = '#3d2e20'; ctx.beginPath(); ctx.ellipse(0, 10, 19, 9, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-5, -4, 2, 0, 0, 20); g.addColorStop(0, '#efffff'); g.addColorStop(.46, '#7ee0f3'); g.addColorStop(1, '#2b8ba0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -15); ctx.quadraticCurveTo(17, -3, 14, 9); ctx.quadraticCurveTo(7, 19, -7, 15); ctx.quadraticCurveTo(-18, 6, -10, -6); ctx.quadraticCurveTo(-5, -13, 0, -15); ctx.fill();
    ctx.strokeStyle = '#173e48'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#e9ffff'; ctx.beginPath(); ctx.ellipse(-5, -5, 4, 2, -.5, 0, TAU); ctx.fill();
  }

  function drawSpore(ctx, t) {
    ctx.fillStyle = '#efe7d3'; ctx.beginPath(); ctx.ellipse(0, -9, 18, 11, 0, Math.PI, 0, true); ctx.fill(); ctx.strokeStyle = '#111b11'; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = '#ddd4b8'; ctx.beginPath(); ctx.roundRect(-7, 0, 14, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#95bf4f'; for (const [x, y] of [[-9, -11], [0, -14], [8, -10], [12, -5], [-2, -7]]) { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(220,255,196,.95)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + t * .75; ctx.beginPath(); ctx.moveTo(0, 10); ctx.quadraticCurveTo(Math.cos(a) * 12, 19 + Math.sin(a) * 5, Math.cos(a) * 28, 30 + Math.sin(a) * 10); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(174,255,122,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 5, 28 + Math.sin(t * 4) * 3, 0, TAU); ctx.stroke();
  }

  function drawPollen(ctx, t) {
    ctx.strokeStyle = '#253612'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 18); ctx.quadraticCurveTo(-2, 8, 0, -3); ctx.stroke();
    ctx.fillStyle = '#4d7a33';
    ctx.beginPath(); ctx.moveTo(-7, 10); ctx.quadraticCurveTo(-15, 8, -12, 0); ctx.quadraticCurveTo(-5, 2, -2, 9); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#203010'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, 10); ctx.quadraticCurveTo(15, 8, 12, 0); ctx.quadraticCurveTo(5, 2, 2, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0d65a'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(12, -9, 9, 4); ctx.quadraticCurveTo(2, 15, -9, 4); ctx.quadraticCurveTo(-12, -9, 0, -16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#261913'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.ellipse(0, -1, 4, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,235,120,.92)';
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * .8; ctx.beginPath(); ctx.arc(Math.cos(a) * 12, Math.sin(a) * 9 - 5, 1.7, 0, TAU); ctx.fill(); }
  }

  function drawGlyph(ctx, b, t, scale, alpha) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
    ctx.translate(0, b.forming > 0 ? 0 : Math.sin(t * 3 + b.phase) * 2);
    if (b.type === 'water') drawSource(ctx);
    else if (b.type === 'spore') drawSpore(ctx, t);
    else drawPollen(ctx, t);
    ctx.restore();
  }

  const TINT = { spore: ['#cfff68', 'rgba(202,255,105,.88)'], pollen: ['#fff0a2', 'rgba(255,239,154,.90)'], water: ['#9de7ff', 'rgba(163,231,255,.88)'] };

  // Filament qui semble extraire la récompense de l'obstacle puis la condense devant la pousse.
  function drawForming(ctx, b, t) {
    const p = clamp(1 - b.forming / Math.max(.01, b.formMax), 0, 1);
    const ox = b.originX, oy = b.originY, bx = (ox + b.x) * .5 + (b.x - ox) * .08, by = (oy + b.y) * .5 - 18;
    ctx.save();
    ctx.strokeStyle = `rgba(210,255,126,${.14 + .36 * Math.sin(p * Math.PI)})`; ctx.lineWidth = 1.3 + 1.1 * (1 - p);
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.quadraticCurveTo(bx, by, b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 5; i++) {
      const u = clamp(p * 1.35 - i * .13, 0, 1);
      if (u <= 0) continue;
      const om = 1 - u;
      ctx.globalAlpha = .26 + .62 * u; ctx.fillStyle = TINT[b.type][0];
      ctx.beginPath(); ctx.arc(om * om * ox + 2 * om * u * bx + u * u * b.x, om * om * oy + 2 * om * u * by + u * u * b.y, 1.7 + 2.1 * u, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = .55 + .35 * p; ctx.strokeStyle = TINT[b.type][1]; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, 24 * (1 - p) + 9, 0, TAU); ctx.stroke();
    ctx.restore();
    const appear = clamp((p - .42) / .58, 0, 1);
    if (appear > 0) drawGlyph(ctx, b, t, .22 + .78 * (1 - Math.pow(1 - appear, 2)), appear);
  }

  const POCKET = { water: 'rgba(124,220,255,.18)', spore: 'rgba(173,255,137,.18)', pollen: 'rgba(255,237,148,.18)' };

  function drawBonuses(ctx, state) {
    const pad = FP.config.soil.viewPad + 100, top = state.camera.y - pad, bottom = state.camera.y + state.world.viewH + pad;
    for (const b of state.world.bonuses) {
      if (b.y < top || b.y > bottom) continue;
      if (b.forming > 0) { drawForming(ctx, b, state.time); continue; }
      ctx.save(); ctx.globalAlpha = .34;
      const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 38);
      g.addColorStop(0, POCKET[b.type]); g.addColorStop(.62, 'rgba(255,237,168,.06)'); g.addColorStop(1, 'rgba(255,237,168,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, 38, 0, TAU); ctx.fill();
      ctx.restore();
      drawGlyph(ctx, b, state.time, 1, 1);
    }
  }

  // Membrane irrégulière, aqueuse et végétale : volontairement pas une bulle sci-fi parfaite.
  function drawShield(ctx, state) {
    const tip = state.plant.tip, t = state.time;
    if (state.mode !== 'playing' || !tip || !state.power.shield) return;
    const r = 23.5 + (.5 + .5 * Math.sin(t * 4.2)) * 1.25;
    ctx.save(); ctx.translate(tip.x, tip.y);
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = i * TAU / 18, wob = 1 + Math.sin(a * 3 + t * 2.0) * .035 + Math.sin(a * 5 - t * 1.5) * .024;
      const x = Math.cos(a) * r * wob, y = Math.sin(a) * r * wob * .91;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(133,224,194,.115)'; ctx.fill();
    ctx.strokeStyle = 'rgba(181,246,215,.86)'; ctx.lineWidth = 2.15; ctx.stroke();
    // Nervures assez grosses pour survivre sur smartphone.
    ctx.strokeStyle = 'rgba(229,255,229,.38)'; ctx.lineWidth = 1.25; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = -1.12 + i * .74 + Math.sin(t * .8 + i) * .05;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 4);
      ctx.quadraticCurveTo(Math.cos(a + .30) * r * .58, Math.sin(a + .30) * r * .42, Math.cos(a) * r * .84, Math.sin(a) * r * .76);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(223,255,229,.68)'; ctx.beginPath(); ctx.ellipse(-r * .35, -r * .42, 2.5, 4.5, -.55, 0, TAU); ctx.fill();
    ctx.restore();
  }

  FP.powerupsRender = { drawBonuses, drawShield };
})();
