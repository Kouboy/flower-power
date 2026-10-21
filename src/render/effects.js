// render/effects.js — effets visuels : chiffres ÉcoCrédits™, anneaux de frôlement, ramassage, rupture du bouclier,
// onde de spore, impact à la mort, anneau d'éclosion.
// Lit     : state.events (eco, pickup, bonusMissed, shieldBreak, bomb, death, bloom), state.time, state.mode, state.graze.active, state.plant.tip.
// Écrit   : state.fx.effects uniquement (réservé au rendu) ; l'aléatoire purement visuel utilise Math.random.
// Expose  : FP.effects.draw(ctx, state) (repère monde).
// Porté de la v3.43.16 (drawEffects : eco, pickup, shieldBreak, bomb, hit, bloom ; drawGrazeFeedback).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const SIGIL = 'Ɇ';
  const FONT = 'system-ui,-apple-system,Segoe UI,sans-serif';
  const rand = (a, b) => a + (b - a) * Math.random();

  // Chaque événement visuel de la frame devient un effet horodaté.
  function collect(state) {
    const t0 = state.time, fx = state.fx.effects;
    for (const e of state.events) {
      if (e.type === 'eco') {
        const flat = !!e.flat;   // gain de spore : un peu plus lent et plus ample
        fx.push({
          type: 'eco', x: e.x, y: e.y, amount: e.amount, combo: e.combo, t0, life: flat ? 1.28 : 1.22,
          vx: flat ? rand(-24, 24) : rand(-22, 22), vy: flat ? rand(-31, -16) : rand(-27, -13),
          angle: flat ? rand(-.32, .32) : rand(-.34, .34), spin: flat ? rand(-.30, .30) : rand(-.32, .32)
        });
      } else if (e.type === 'pickup') fx.push({ type: 'pickup', kind: e.kind, x: e.x, y: e.y, t0, life: .55, r: 16 });
      else if (e.type === 'bonusMissed') fx.push({ type: 'pickup', kind: e.kind, x: e.x, y: e.y, t0, life: .26, r: 11 });   // v3 : fondu bref
      else if (e.type === 'shieldBreak') fx.push({ type: 'shieldBreak', x: e.x, y: e.y, t0, life: .62, r: 31, phase: rand(0, TAU) });
      else if (e.type === 'bomb') fx.push({ type: 'bomb', x: e.x, y: e.y, t0, life: .98, r: e.r });
      else if (e.type === 'death') fx.push({ type: 'hit', acid: e.cause !== 'solid', x: e.x, y: e.y, t0, life: .42, r: 28 });
      else if (e.type === 'bloom') fx.push({ type: 'bloom', x: e.x, y: e.y, t0, life: 1.18, r: 68 + 13 * (e.bonus || 0) });
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

  const PICKUP = { water: '147,221,255', pollen: '255,244,124' };

  // Anneaux : k = progression de 0 à 1, a = 1 − k.
  function drawRing(ctx, e, t) {
    const k = clamp((t - e.t0) / e.life, 0, 1), a = 1 - k;
    ctx.save();
    if (e.type === 'pickup') {
      const r = e.r + 28 * k, col = PICKUP[e.kind] || PICKUP.pollen;
      ctx.strokeStyle = `rgba(${col},${.92 * a})`; ctx.lineWidth = 3 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${.10 * a})`; ctx.beginPath(); ctx.arc(e.x, e.y, r * .62, 0, TAU); ctx.fill();
    } else if (e.type === 'shieldBreak') {
      const r = e.r * (.72 + 1.18 * k);
      ctx.strokeStyle = `rgba(196,255,222,${.86 * a})`; ctx.lineWidth = 2.8 * (1 - k) + .9;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(135,235,199,${.07 * a})`; ctx.beginPath(); ctx.arc(e.x, e.y, r * .72, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(218,255,229,${.80 * a})`;
      for (let i = 0; i < 12; i++) {
        const ang = e.phase + i * TAU / 12, d = 10 + (28 + 10 * (i % 3)) * k;
        ctx.save(); ctx.translate(e.x + Math.cos(ang) * d, e.y + Math.sin(ang) * d * .86); ctx.rotate(ang + k * 1.8);
        ctx.beginPath(); ctx.moveTo(-4, -1); ctx.quadraticCurveTo(0, -4, 5, 0); ctx.quadraticCurveTo(0, 3, -4, 1); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (e.type === 'bomb') {
      const r = e.r * (.18 + .82 * k);
      const g = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, Math.max(2, r));
      g.addColorStop(0, `rgba(207,255,111,${.30 * a})`); g.addColorStop(.55, `rgba(119,255,76,${.18 * a})`);
      g.addColorStop(.82, `rgba(63,255,129,${.08 * a})`); g.addColorStop(1, 'rgba(110,255,90,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(212,255,157,${.95 * a})`; ctx.lineWidth = 4 * (1 - k) + 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = `rgba(255,255,210,${.55 * a})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(226,255,204,${.48 * a})`; ctx.lineWidth = 1.4;
      for (let i = 0; i < 20; i++) {
        const ang = i * TAU / 20 + t * .65, end = r * .72;
        ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * r * .16, e.y + Math.sin(ang) * r * .16);
        ctx.quadraticCurveTo(e.x + Math.cos(ang + .25) * end * .58, e.y + Math.sin(ang + .25) * end * .58, e.x + Math.cos(ang) * end, e.y + Math.sin(ang) * end);
        ctx.stroke();
      }
    } else if (e.type === 'bloom') {
      const r = e.r * (.35 + .75 * k);
      ctx.strokeStyle = `rgba(255,238,147,${.88 * a})`; ctx.lineWidth = 4 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .55 * a; ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const ang = i * TAU / 10 + t * .15;
        ctx.beginPath(); ctx.moveTo(e.x + Math.cos(ang) * r * .38, e.y + Math.sin(ang) * r * .38); ctx.lineTo(e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r); ctx.stroke();
      }
    } else if (e.type === 'hit') {
      const r = e.r * (.55 + 1.2 * k), col = e.acid ? '217,255,88' : '255,112,78';
      ctx.strokeStyle = `rgba(${col},${.95 * a})`; ctx.lineWidth = 5 * (1 - k) + 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(${col},${.18 * a})`; ctx.beginPath(); ctx.arc(e.x, e.y, r * .72, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, state) {
    collect(state);
    drawGrazes(ctx, state);
    for (const e of state.fx.effects) {
      if (e.type === 'eco') drawEco(ctx, e, state.time);
      else drawRing(ctx, e, state.time);
    }
  }

  FP.effects = { draw };
})();
