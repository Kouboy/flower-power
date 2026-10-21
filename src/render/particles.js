// render/particles.js — particules : gerbes nées des événements, terre et éclats derrière la pointe.
// Lit     : state.events (eco, bomb, shieldBreak, pickup, death, toxicEnter, bloom), state.time, state.mode, state.plant,
//           state.camera.y, state.world.{surfaceY,viewH}, FP.plant.speed.
// Écrit   : state.fx.particles uniquement (réservé au rendu) ; aléatoire visuel via Math.random.
// Expose  : FP.particles.draw(ctx, state) (repère monde).
// Porté de la v3.43.16 (flashParticles, emitGrowthDebris, particleBudget, mise à jour des particules dans update(), drawParticles).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const TAU = FP.TAU;
  const { clamp, lerp } = FP.math;
  const rand = (a, b) => a + (b - a) * Math.random();

  let lastTime = null, debrisTimer = 0;

  // En haut de l'écran on voit plus de fleurs et d'effets : on baisse le plafond.
  function budget(state) {
    const tip = state.plant.tip;
    return state.mode === 'bloom' || (tip && tip.y - state.camera.y < 160) ? 84 : 128;
  }

  function burst(state, x, y, type, count) {
    const list = state.fx.particles, n = Math.min(count, Math.max(0, budget(state) - list.length));
    for (let i = 0; i < n; i++) {
      list.push({ x, y, vx: rand(-85, 85), vy: rand(-125, 45), life: rand(.35, .98), r: rand(1.2, 3.8), type, rot: rand(0, TAU), spin: rand(-5, 5) });
    }
  }

  function fromEvents(state) {
    for (const e of state.events) {
      switch (e.type) {
        case 'eco': burst(state, e.x, e.y, 'eco', e.flat ? 16 + Math.min(36, Math.floor(e.amount / 700)) : 10 + Math.min(22, e.combo * 3)); break;
        case 'bomb': burst(state, e.x, e.y, 'bomb', 96); break;
        case 'shieldBreak': burst(state, e.x, e.y, 'shield', 46); break;
        case 'pickup': burst(state, e.x, e.y, e.kind === 'water' ? 'water' : 'bud', e.kind === 'water' ? 34 : 36); break;
        case 'toxicEnter': burst(state, e.x, e.y, 'acid', 8); break;
        case 'death':
          // v3 : le lixiviat et la brûlure ajoutaient leur propre gerbe acide avant celle de la mort.
          if (e.cause === 'leak') burst(state, e.x, e.y, 'acid', 28);
          if (e.cause === 'toxic') burst(state, e.x, e.y, 'acid', 30);
          burst(state, e.x, e.y, e.cause === 'solid' ? 'impact' : 'acid', 38);
          break;
        case 'bloom': burst(state, e.x, e.y, 'petal', Math.min(92, 58 + 12 * (e.bonus || 0))); break;
      }
    }
  }

  // La pointe qui creuse projette de la terre et des éclats vers l'arrière, moins près de la surface.
  function growthDebris(state, dt) {
    const p = state.plant, tip = p.tip;
    if (state.mode !== 'playing' || !tip) return;
    debrisTimer -= dt;
    if (debrisTimer > 0) return;
    const k = clamp(FP.plant.speed(state) / 190, 0, 1), near = tip.y < state.world.surfaceY + 150;
    debrisTimer = lerp(.095, .052, k) * (near ? 1.42 : 1) * rand(.72, 1.28);
    const list = state.fx.particles, room = Math.max(0, budget(state) - list.length);
    const count = Math.min(room, near ? Math.max(1, Math.floor(1 + k * 1.2)) : 2 + Math.floor(k * 3));
    const nx = -p.dir.y, ny = p.dir.x;
    for (let i = 0; i < count; i++) {
      const side = rand(-1, 1), back = rand(35, 96);
      list.push({
        x: tip.x + nx * side * rand(2, 8) - p.dir.x * rand(0, 5), y: tip.y + ny * side * rand(2, 8) - p.dir.y * rand(0, 5),
        vx: -p.dir.x * back + nx * side * rand(18, 58), vy: -p.dir.y * back + ny * side * rand(18, 48) + rand(12, 46),
        life: rand(.28, .62), r: rand(1.0, 3.2), type: Math.random() < .24 ? 'chip' : 'soil', rot: rand(0, TAU), spin: rand(-8, 8)
      });
    }
  }

  function step(state, dt) {
    const list = state.fx.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 70 * dt;
      if (q.life <= 0) list.splice(i, 1);
    }
  }

  const COLORS = { water: '#93ddff', bud: '#cfff9a', acid: '#d8ff58', bomb: '#a6ff7a', impact: '#ff815f' };

  function drawOne(ctx, q) {
    const a = clamp(q.life, 0, 1);
    ctx.save(); ctx.globalAlpha = a; ctx.translate(q.x, q.y); ctx.rotate(q.rot + q.spin * (1 - a));
    if (q.type === 'petal') { ctx.fillStyle = '#fff1a6'; ctx.beginPath(); ctx.ellipse(0, 0, q.r * 1.1, q.r * 2.2, 0, 0, TAU); ctx.fill(); }
    else if (q.type === 'eco') {
      ctx.fillStyle = '#cfff78'; ctx.fillRect(-q.r, -q.r, q.r * 2, q.r * 2);
      ctx.strokeStyle = 'rgba(37,65,16,.7)'; ctx.lineWidth = .8; ctx.strokeRect(-q.r, -q.r, q.r * 2, q.r * 2);
    } else if (q.type === 'soil') {
      ctx.fillStyle = 'rgba(151,104,62,.82)'; ctx.beginPath(); ctx.ellipse(0, 0, q.r * 1.35, q.r * .78, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(65,38,22,.38)'; ctx.lineWidth = .7; ctx.stroke();
    } else if (q.type === 'chip') {
      ctx.fillStyle = 'rgba(91,61,40,.88)'; ctx.fillRect(-q.r * 1.1, -q.r * .7, q.r * 2.2, q.r * 1.4);
      ctx.strokeStyle = 'rgba(35,22,14,.42)'; ctx.lineWidth = .7; ctx.strokeRect(-q.r * 1.1, -q.r * .7, q.r * 2.2, q.r * 1.4);
    } else if (q.type === 'shield') {
      ctx.fillStyle = 'rgba(202,255,222,.92)';
      ctx.beginPath(); ctx.moveTo(-q.r * 1.4, 0); ctx.quadraticCurveTo(0, -q.r, q.r * 1.6, 0); ctx.quadraticCurveTo(0, q.r * .8, -q.r * 1.4, 0); ctx.fill();
    } else {
      ctx.fillStyle = COLORS[q.type] || '#d0bc86'; ctx.beginPath(); ctx.arc(0, 0, q.r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function draw(ctx, state) {
    // Temps écoulé depuis la frame précédente (borné : retour d'onglet, nouveau run).
    const dt = lastTime === null ? 0 : clamp(state.time - lastTime, 0, .05);
    lastTime = state.time;
    fromEvents(state);
    growthDebris(state, dt);
    step(state, dt);
    const top = state.camera.y - 42, bottom = state.camera.y + state.world.viewH + 42;
    for (const q of state.fx.particles) if (q.y >= top && q.y <= bottom) drawOne(ctx, q);
  }

  FP.particles = { draw };
})();
