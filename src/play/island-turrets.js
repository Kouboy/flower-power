// play/island-turrets.js — les tourelles enfouies des îlots (v5.17.0, spec docs/superpowers/specs/2026-11-19-tresse-ilots-design.md),
// posées par world/islands.js : celles des boss, hors des boss. Quand la pointe est à portée (braid.islands.turret.range) et la tourelle
// à l'écran, elle vise boss.shot.track s (la visée se fige boss.shot.lock s avant la fin), puis tire sa rafale (boss.shot.burst tirs
// espacés de burstGap, l'axe puis ± spread°) à turret.speed px/s, et attend turret.gap s. Les tirs s'arrêtent dans les obstacles ; rien
// ne vit hors du jeu (mort, éclosion, boutique). Une tourelle nettoyée par la spore (son solide a quitté world.solids) se tait.
// Lit     : state.{mode, flow.freeze, plant.tip, camera.y}, state.world.{turrets, turretShots, solids, viewH, width, height},
//           FP.config.{braid.islands.turret, boss.shot}, FP.collision.distanceTo.
// Écrit   : turret.{aim: { t, lockedAt } | null, burst: { to, n, t } | null, cooldown} ; state.world.turretShots ([{ x, y, vx, vy, solid }]) ;
//           solides 'shot' dans state.world.solids tant qu'un tir vole ; state.events (bossAim, bossLock, bossShot { turret: index, island: true } :
//           les sons des tourelles des boss).
// Expose  : FP.islandTurrets.update(state, dt), FP.islandTurrets.pose(state, q) → { angle, aim: null | { to, locked } } (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const BURST_ANGLES = [0, -1, 1];

  function shotSolid(x, y) {
    const r = FP.config.boss.shot.r, collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'shot', turret: true, x, y, a: 0, flip: 1, collision, broadR: r, flyoverEligible: false, grazeRadius: 0, off: false };
  }

  const alive = (w, q) => w.solids.includes(q.solid);
  function drop(w, i) {
    const j = w.solids.indexOf(w.turretShots[i].solid);
    if (j >= 0) w.solids.splice(j, 1);
    w.turretShots.splice(i, 1);
  }
  // Les obstacles arrêtent un tir (pas les tourelles, d'où il part, ni les autres tirs).
  const blocked = (w, x, y) => w.solids.some(o => !o.off && o.kind !== 'shot' && o.kind !== 'turret' &&
    (x - o.x) ** 2 + (y - o.y) ** 2 <= o.broadR * o.broadR && FP.collision.distanceTo(o, x, y) <= 0);

  function fire(state, q, i) {
    const C = FP.config.boss.shot, b = q.burst, solid = shotSolid(q.x, q.y);
    const a = Math.atan2(b.to.y - q.y, b.to.x - q.x) + (BURST_ANGLES[b.n % BURST_ANGLES.length] || 0) * C.spread * Math.PI / 180, v = FP.config.braid.islands.turret.speed;
    state.world.turretShots.push({ x: q.x, y: q.y, vx: v * Math.cos(a), vy: v * Math.sin(a), solid });
    state.world.solids.push(solid); b.n += 1;
    state.events.push({ type: 'bossShot', turret: i, island: true });
  }

  function update(state, dt) {
    const w = state.world;
    if (!w.turrets.length && !w.turretShots.length) return;
    if (state.mode !== 'playing') { while (w.turretShots.length) drop(w, 0); for (const q of w.turrets) { q.aim = null; q.burst = null; } return; }
    if (state.flow.freeze > 0) return;
    const C = FP.config.boss.shot, T = FP.config.braid.islands.turret, tip = state.plant.tip, top = state.camera.y;
    for (let i = w.turretShots.length - 1; i >= 0; i--) {
      const s = w.turretShots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.solid.x = s.x; s.solid.y = s.y;
      if (!w.solids.includes(s.solid) || s.x < -C.r || s.x > w.width + C.r || s.y < -C.r || s.y > w.height + C.r || blocked(w, s.x, s.y)) drop(w, i);
    }
    w.turrets.forEach((q, i) => {
      if (!alive(w, q)) { q.aim = null; q.burst = null; return; }
      if (q.burst) q.burst.t += dt;
      if (q.aim) {
        q.aim.t += dt;
        if (!q.aim.lockedAt && q.aim.t >= C.track - C.lock) { q.aim.lockedAt = { x: tip.x, y: tip.y }; state.events.push({ type: 'bossLock', turret: i, island: true }); }
        if (q.aim.t >= C.track) { q.burst = { to: q.aim.lockedAt, n: 0, t: 0 }; q.aim = null; }
      } else if (!q.burst) {
        q.cooldown = Math.max(0, q.cooldown - dt);
        const seen = q.y > top && q.y < top + w.viewH, near = Math.hypot(tip.x - q.x, tip.y - q.y) < T.range;
        if (q.cooldown <= 0 && seen && near) { q.aim = { t: 0, lockedAt: null }; state.events.push({ type: 'bossAim', turret: i, island: true }); }
      }
      if (q.burst) {
        while (q.burst.n < C.burst && q.burst.t >= q.burst.n * C.burstGap) fire(state, q, i);
        if (q.burst.n >= C.burst) { q.burst = null; q.cooldown = T.gap; }
      }
    });
  }

  // Pose (pour le dessin) : le canon suit la pointe, puis le point figé jusqu'à la fin de la rafale ; la visée se voit avant le premier tir.
  // Sans pointe (avant le départ, entre deux vies), il regarde vers le haut.
  function pose(state, q) {
    const tip = state.plant.tip, to = q.burst ? q.burst.to : q.aim && q.aim.lockedAt ? q.aim.lockedAt : tip;
    if (!to) return { angle: -Math.PI / 2, aim: null };
    return { angle: Math.atan2(to.y - q.y, to.x - q.x), aim: q.aim ? { to, locked: !!q.aim.lockedAt } : null };
  }

  FP.islandTurrets = { update, pose };
})();
