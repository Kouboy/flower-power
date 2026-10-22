// render/effects.js — effets visuels : chiffres ÉcoCrédits™, anneaux de frôlement, ramassage, rupture du bouclier,
// onde de spore, impact à la mort, anneau d'éclosion.
// Lit     : state.events (eco, pickup, bonusMissed, shieldBreak, bomb, death, blossom), state.time, state.mode, state.graze.active, state.plant.tip.
// Écrit   : state.fx.effects uniquement (réservé au rendu) ; l'aléatoire purement visuel utilise Math.random.
// Expose  : FP.effects.draw(actx, state) (repère d'art, caméra appliquée ici : anneaux, frôlements),
//           FP.effects.drawLabels(ctx, state) (couche nette, repère monde : chiffres « +Ɇ »).
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
      else if (e.type === 'blossom') fx.push({ type: 'bloom', x: e.x, y: e.y, t0, life: 1.18, r: 68 + 13 * (e.bonus || 0) });
    }
    state.fx.effects = state.fx.effects.filter(f => state.time - f.t0 < f.life);
  }

  // Anneau pixel qui s'estompe : les pixels disparaissent selon le motif de Bayer quand a baisse (pas de transparence).
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  function fadeRing(g, cx, cy, r, color, a, thick = 1, dotted = false) {
    const { px } = FP, steps = Math.max(8, Math.ceil(TAU * r * 1.4)), seen = new Set();
    for (let i = 0; i < steps; i++) {
      if (dotted && (i >> 2) % 2) continue;
      const an = i / steps * TAU, x = cx + Math.round(Math.cos(an) * r), y = cy + Math.round(Math.sin(an) * r), k = x + ',' + y;
      if (seen.has(k) || BAYER[y & 3][x & 3] >= a * 16) continue;
      seen.add(k); px.rect(g, x, y, thick, thick, color);
    }
  }

  // Score arcade (couche nette) : pas d'étiquette, juste un chiffre qui claque puis s'évapore.
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
  }

  // Anneau qui se resserre autour de la pointe, et anneau au point frôlé (pointillé pour un obstacle).
  function drawGrazes(g, state, oy) {
    const { px } = FP, tip = state.plant.tip;
    if (state.mode !== 'playing' || !tip) return;
    for (const r of state.graze.active.values()) {
      const leak = r.kind === 'leak';
      const pulse = .5 + .5 * Math.sin(state.time * (leak ? 20 : 18) + r.peak * (leak ? 5 : 7));
      const a = clamp(.16 + r.peak * (leak ? .72 : .68), 0, 1);
      const rad = (lerp(leak ? 29 : 27, leak ? 13 : 12, r.peak) + pulse * (leak ? 3 : 2.5)) / px.SCALE;
      fadeRing(g, px.toArt(tip.x), px.toArt(tip.y) - oy - 3, Math.round(rad), '#d8ff58', a, r.peak > .5 ? 2 : 1);
      fadeRing(g, px.toArt(r.lastX), px.toArt(r.lastY) - oy, Math.round((18 + r.peak * 15) / px.SCALE), '#c8ff70', a * .5, 1, !leak);
    }
  }

  const PICKUP = { water: '#93ddff', pollen: '#fff47c', spore: '#cfff68' };

  // Anneaux : k = progression de 0 à 1, a = 1 − k. Rayons en pixels d'art.
  function drawRing(g, e, t, oy) {
    const { px } = FP, k = clamp((t - e.t0) / e.life, 0, 1), a = 1 - k, s = px.SCALE;
    const cx = px.toArt(e.x), cy = px.toArt(e.y) - oy;
    if (e.type === 'eco') fadeRing(g, cx, cy, Math.round((12 + 28 * k) / s), '#d3ff66', a * .6);
    else if (e.type === 'pickup') fadeRing(g, cx, cy, Math.round((e.r + 28 * k) / s), PICKUP[e.kind] || PICKUP.pollen, a, k < .5 ? 2 : 1);
    else if (e.type === 'shieldBreak') {
      fadeRing(g, cx, cy, Math.round(e.r * (.72 + 1.18 * k) / s), '#c4ffde', a, k < .4 ? 2 : 1);
      for (let i = 0; i < 12; i++) {                                // éclats de membrane
        const ang = e.phase + i * TAU / 12, d = (10 + (28 + 10 * (i % 3)) * k) / s;
        if (BAYER[i & 3][(i >> 2) & 3] < a * 16) px.rect(g, cx + Math.round(Math.cos(ang) * d), cy + Math.round(Math.sin(ang) * d * .86), 2, 1, '#daffe5');
      }
    } else if (e.type === 'bomb') {
      const r = Math.round(e.r * (.18 + .82 * k) / s);
      fadeRing(g, cx, cy, r, '#d4ff9d', a, 2);
      fadeRing(g, cx, cy, Math.round(e.r / s), '#ffffd2', a * .55, 1, true);
      for (let i = 0; i < 20; i++) {                                // filaments de l'onde
        const ang = i * TAU / 20 + t * .65;
        if (i % 2 === 0 || a > .5) px.line(g, cx + Math.round(Math.cos(ang) * r * .2), cy + Math.round(Math.sin(ang) * r * .2), cx + Math.round(Math.cos(ang) * r * .7), cy + Math.round(Math.sin(ang) * r * .7), '#a6ff7a');
      }
    } else if (e.type === 'bloom') {
      const r = Math.round(e.r * (.35 + .75 * k) / s);
      fadeRing(g, cx, cy, r, '#ffee93', a, k < .4 ? 2 : 1);
      for (let i = 0; i < 10; i++) {
        const ang = i * TAU / 10 + t * .15;
        if (BAYER[i & 3][2] < a * 16) px.line(g, cx + Math.round(Math.cos(ang) * r * .4), cy + Math.round(Math.sin(ang) * r * .4), cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), '#fff0a0');
      }
    } else if (e.type === 'hit') fadeRing(g, cx, cy, Math.round(e.r * (.55 + 1.2 * k) / s), e.acid ? '#b45cff' : '#ff704e', a, k < .5 ? 3 : 2);
  }

  // Couche monde (pixels d'art) : anneaux et frôlements.
  function draw(g, state) {
    collect(state);
    const oy = FP.px.toArt(state.camera.y);
    drawGrazes(g, state, oy);
    for (const e of state.fx.effects) drawRing(g, e, state.time, oy);
  }

  // Couche nette (repère monde, après zoom et caméra) : les chiffres « +Ɇ », lisibles.
  function drawLabels(ctx, state) {
    for (const e of state.fx.effects) if (e.type === 'eco') drawEco(ctx, e, state.time);
  }

  FP.effects = { draw, drawLabels };
})();
