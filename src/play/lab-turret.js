// play/lab-turret.js — la tourelle des modules du Lab (v5.13.0 ; v5.14.0 : par module) : celle des boss, hors des boss. Sur l'horloge de son
// module (play/lab-hazards.js), à partir de son décalage puis à chaque période : elle vise la pointe pendant lab.turret.aim s (la ligne se
// fige boss.shot.lock s avant la fin), puis tire sa rafale (boss.shot.burst tirs espacés de burstGap, l'axe puis ± spread°), à
// lab.turret.speed px/s. Les tirs s'arrêtent dans le béton et les obstacles. Rien ne vit hors de la bande du module (pointe sortie), après une
// mort, ni d'un niveau à l'autre (nouveau niveau, nouveaux modules).
// Lit     : state.{mode, flow.freeze, plant.tip}, state.world.{width, height, solids, modules (top, bottom, turrets, live)},
//           FP.config.{lab.turret, boss.shot}, FP.collision.distanceTo.
// Écrit   : module.live.turret = { aims: { [id]: { n (cycle), aimed, locked, fired, lockedAt } }, shots: [{ x, y, vx, vy, solid }] } ;
//           solides 'shot' dans state.world.solids ; state.events (bossAim, bossLock, bossShot { turret, module } : les sons des boss).
// Expose  : FP.labTurret.update(state, dt), FP.labTurret.pose(state, module, q) → { angle, aim: null | { to, locked } } (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const BURST_ANGLES = [0, -1, 1];

  function shotSolid(x, y) {
    const r = FP.config.boss.shot.r, collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'shot', lab: true, x, y, a: 0, flip: 1, collision, broadR: r, flyoverEligible: false, grazeRadius: 0, off: false };
  }

  function clear(state, st) {
    const solids = state.world.solids;
    for (const s of st.shots) { const i = solids.indexOf(s.solid); if (i >= 0) solids.splice(i, 1); }
    st.shots = []; st.aims = {};
  }

  // Le béton et les obstacles arrêtent un tir (pas les autres tirs, ni le gaz).
  const blocked = (state, x, y) => state.world.solids.some(o => !o.off && o.kind !== 'shot' && o.kind !== 'pulse' &&
    (x - o.x) ** 2 + (y - o.y) ** 2 <= o.broadR * o.broadR && FP.collision.distanceTo(o, x, y) <= 0);

  // Pose (pour le dessin) : vers la pointe pendant la visée, vers le point figé ensuite ; au repos, vers l'intérieur du module.
  function pose(state, M, q) {
    const a = M.live.turret.aims[q.id], tip = state.plant.tip;
    const aiming = a && a.aimed && a.fired < FP.config.boss.shot.burst, to = aiming ? (a.locked ? a.lockedAt : tip) : null;
    return { angle: to ? Math.atan2(to.y - q.y, to.x - q.x) : (q.side < 0 ? 0 : Math.PI), aim: aiming && a.fired === 0 && to ? { to, locked: a.locked } : null };
  }

  function step(state, M, dt) {
    const st = M.live.turret, tip = state.plant.tip;
    if (state.mode !== 'playing' || !tip || tip.y < M.top || tip.y > M.bottom) { if (st.shots.length || Object.keys(st.aims).length) clear(state, st); return; }
    if (state.flow.freeze > 0 || !M.live.on) return;
    const C = FP.config.boss.shot, T = FP.config.lab.turret, w = state.world;
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.solid.x = s.x; s.solid.y = s.y;
      if (s.x < -C.r || s.x > w.width + C.r || s.y < -C.r || s.y > w.height + C.r || blocked(state, s.x, s.y)) {
        const j = w.solids.indexOf(s.solid); if (j >= 0) w.solids.splice(j, 1); st.shots.splice(i, 1);
      }
    }
    for (const q of M.turrets) {
      const local = M.live.t - q.offset;
      if (local < 0) continue;
      const n = Math.floor(local / q.period), cyc = local - n * q.period;
      let a = st.aims[q.id];
      if (!a || a.n !== n) a = st.aims[q.id] = { n, aimed: false, locked: false, fired: 0, lockedAt: null };
      if (!a.aimed) { a.aimed = true; state.events.push({ type: 'bossAim', turret: q.id, module: M.index }); }
      if (!a.locked && cyc >= T.aim - C.lock) { a.locked = true; a.lockedAt = { x: tip.x, y: tip.y }; state.events.push({ type: 'bossLock', turret: q.id, module: M.index }); }
      while (a.locked && a.fired < C.burst && cyc >= T.aim + a.fired * C.burstGap) {
        const ang = Math.atan2(a.lockedAt.y - q.y, a.lockedAt.x - q.x) + (BURST_ANGLES[a.fired % 3] || 0) * C.spread * Math.PI / 180;
        const solid = shotSolid(q.x, q.y);
        st.shots.push({ x: q.x, y: q.y, vx: T.speed * Math.cos(ang), vy: T.speed * Math.sin(ang), solid });
        w.solids.push(solid); a.fired += 1;
        state.events.push({ type: 'bossShot', turret: q.id, module: M.index });
      }
    }
  }

  function update(state, dt) {
    for (const M of state.world.modules || []) if (M.turrets.length) step(state, M, dt);
  }

  FP.labTurret = { update, pose };
})();
