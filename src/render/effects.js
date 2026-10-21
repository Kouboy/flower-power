// render/effects.js — effets visuels : chiffres ÉcoCrédits™ qui claquent, anneaux de frôlement.
// Lit     : state.events (eco), state.time, state.mode, state.graze.active, state.plant.tip.
// Écrit   : state.fx.effects uniquement (réservé au rendu) ; l'aléatoire purement visuel utilise Math.random.
// Expose  : FP.effects.draw(ctx, state) (repère monde).
// Porté de la v3.43.16 (branche « eco » de drawEffects, drawGrazeFeedback).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const SIGIL = 'Ɇ';
  const FONT = 'system-ui,-apple-system,Segoe UI,sans-serif';
  const rand = (a, b) => a + (b - a) * Math.random();

  // Chaque gain de la frame devient un chiffre flottant horodaté.
  function collect(state) {
    for (const e of state.events) {
      if (e.type !== 'eco') continue;
      state.fx.effects.push({
        type: 'eco', x: e.x, y: e.y, amount: e.amount, combo: e.combo, t0: state.time, life: 1.22,
        vx: rand(-22, 22), vy: rand(-27, -13), angle: rand(-.34, .34), spin: rand(-.32, .32)
      });
    }
    state.fx.effects = state.fx.effects.filter(f => state.time - f.t0 < f.life);
  }

  // Score arcade : pas d'étiquette, juste un chiffre qui claque puis s'évapore.
  function drawEco(ctx, e, t) {
    const k = clamp((t - e.t0) / e.life, 0, 1);
    const rise = 1 - Math.pow(1 - k, 2.2);
    const x = e.x + e.vx * rise, y = e.y + e.vy * rise - 10 * rise;
    const pop = k < .16 ? lerp(.52, 1.48, k / .16) : (k < .36 ? lerp(1.48, .92, (k - .16) / .20) : lerp(.92, .72, (k - .36) / .64));
    const fade = k < .38 ? 1 : Math.pow(1 - (k - .38) / .62, 1.15);
    const wob = Math.sin(k * TAU * 1.8 + e.angle * 9) * .035;
    const txt = '+' + e.amount.toLocaleString('fr-FR') + SIGIL;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(e.angle + e.spin * k + wob); ctx.scale(pop, pop);
    ctx.globalAlpha = .95 * fade; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `950 20px ${FONT}`; ctx.lineWidth = 4.2;
    ctx.strokeStyle = `rgba(18,31,7,${.86 * fade})`; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#d8ff58'; ctx.fillText(txt, 0, 0);
    ctx.globalAlpha = .42 * fade; ctx.strokeStyle = '#f2ffb0'; ctx.lineWidth = 1.1; ctx.strokeText(txt, 0, 0);
    if (e.combo > 1) {
      ctx.globalAlpha = .72 * fade; ctx.font = `900 9px ${FONT}`; ctx.lineWidth = 2.4;
      const c = 'x' + e.combo;
      ctx.strokeStyle = `rgba(18,31,7,${.75 * fade})`; ctx.strokeText(c, 0, 16);
      ctx.fillStyle = '#fff3a4'; ctx.fillText(c, 0, 16);
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = `rgba(211,255,102,${.42 * fade})`; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.arc(e.x, e.y, 12 + 28 * k, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // Anneau qui se resserre autour de la pointe, et anneau au point frôlé (pointillé pour un obstacle).
  function drawGrazes(ctx, state) {
    const tip = state.plant.tip;
    if (state.mode !== 'playing' || !tip) return;
    ctx.save();
    for (const g of state.graze.active.values()) {
      const leak = g.kind === 'leak';
      const pulse = .5 + .5 * Math.sin(state.time * (leak ? 20 : 18) + g.peak * (leak ? 5 : 7));
      const a = clamp(.16 + g.peak * (leak ? .72 : .68), 0, 1);
      ctx.globalAlpha = a;
      ctx.strokeStyle = leak ? 'rgba(216,255,88,.95)' : 'rgba(216,255,88,.92)';
      ctx.lineWidth = (leak ? 1.3 : 1.2) + g.peak * (leak ? 3.2 : 3.0);
      ctx.beginPath(); ctx.arc(tip.x, tip.y, lerp(leak ? 29 : 27, leak ? 13 : 12, g.peak) + pulse * (leak ? 3 : 2.5), 0, TAU); ctx.stroke();
      if (leak) {
        ctx.globalAlpha = a * .36; ctx.strokeStyle = 'rgba(190,255,94,.72)';
        ctx.beginPath(); ctx.arc(g.lastX, g.lastY, 18 + g.peak * 14, 0, TAU); ctx.stroke();
      } else {
        ctx.globalAlpha = a * .46; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(g.lastX, g.lastY, 18 + g.peak * 16, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  function draw(ctx, state) {
    collect(state);
    drawGrazes(ctx, state);
    for (const e of state.fx.effects) if (e.type === 'eco') drawEco(ctx, e, state.time);
  }

  FP.effects = { draw };
})();
