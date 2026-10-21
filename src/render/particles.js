// render/particles.js — particules : gerbes nées des événements, terre et éclats derrière la pointe.
// Lit     : state.events (eco, bomb, shieldBreak, pickup, death, toxicEnter, bloom, growthTick), state.time, state.mode,
//           state.plant.{tip,dir}, state.camera.y, state.world.viewH.
// Écrit   : state.fx.particles uniquement (réservé au rendu) ; aléatoire visuel via Math.random.
// Expose  : FP.particles.draw(actx, state) (repère d'art, caméra appliquée ici).
// Porté de la v3.43.16 (flashParticles, emitGrowthDebris, particleBudget, mise à jour des particules dans update(), drawParticles).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const rand = (a, b) => a + (b - a) * Math.random();

  let lastTime = null;

  // En haut de l'écran on voit plus de fleurs et d'effets : on baisse le plafond.
  function budget(state) {
    const tip = state.plant.tip;
    return state.mode === 'bloom' || (tip && tip.y - state.camera.y < 160) ? 84 : 128;
  }

  function burst(state, x, y, type, count) {
    const list = state.fx.particles, n = Math.min(count, Math.max(0, budget(state) - list.length));
    for (let i = 0; i < n; i++) {
      list.push({ x, y, vx: rand(-85, 85), vy: rand(-125, 45), life: rand(.35, .98), r: rand(1.2, 3.8), type });
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
        case 'growthTick': growthDebris(state, e.k, e.near); break;
      }
    }
  }

  // À chaque battement de croissance, la pointe projette de la terre et des éclats vers l'arrière, moins près de la surface.
  function growthDebris(state, k, near) {
    const p = state.plant, tip = p.tip;
    if (!tip) return;
    const list = state.fx.particles, room = Math.max(0, budget(state) - list.length);
    const count = Math.min(room, near ? Math.max(1, Math.floor(1 + k * 1.2)) : 2 + Math.floor(k * 3));
    const nx = -p.dir.y, ny = p.dir.x;
    for (let i = 0; i < count; i++) {
      const side = rand(-1, 1), back = rand(35, 96);
      list.push({
        x: tip.x + nx * side * rand(2, 8) - p.dir.x * rand(0, 5), y: tip.y + ny * side * rand(2, 8) - p.dir.y * rand(0, 5),
        vx: -p.dir.x * back + nx * side * rand(18, 58), vy: -p.dir.y * back + ny * side * rand(18, 48) + rand(12, 46),
        life: rand(.28, .62), r: rand(1.0, 3.2), type: Math.random() < .24 ? 'chip' : 'soil'
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

  const COLORS = { water: '#93ddff', bud: '#cfff9a', acid: '#b45cff', bomb: '#a6ff7a', impact: '#ff815f', petal: '#fff1a6', eco: '#cfff78', soil: '#7a5436', chip: '#4a3020', shield: '#caffde' };

  // Carré de 1 à 2 pixels d'art : il rétrécit en fin de vie au lieu de devenir transparent.
  function drawOne(g, q, oy) {
    const { px } = FP, size = q.life > .3 && q.r > 2.2 ? 2 : 1;
    px.rect(g, px.toArt(q.x), px.toArt(q.y) - oy, size, size, COLORS[q.type] || '#d0bc86');
  }

  function draw(g, state) {
    // Temps écoulé depuis la frame précédente (borné : retour d'onglet, nouveau run).
    const dt = lastTime === null ? 0 : clamp(state.time - lastTime, 0, .05);
    lastTime = state.time;
    step(state, dt);
    fromEvents(state);
    const top = state.camera.y - 42, bottom = state.camera.y + state.world.viewH + 42, oy = FP.px.toArt(state.camera.y);
    for (const q of state.fx.particles) if (q.y >= top && q.y <= bottom) drawOne(g, q, oy);
  }

  FP.particles = { draw };
})();
