// play/lab-turret.js — la tourelle des modules de l'Encounter Lab (v5.13.0) : celle des boss, hors des boss. Sur l'horloge du module
// (play/lab-hazards.js), à partir de son décalage puis à chaque période : elle vise la pointe pendant lab.turret.aim s (la ligne se fige
// boss.shot.lock s avant la fin), puis tire sa rafale (boss.shot.burst tirs espacés de burstGap, l'axe puis ± spread°), à lab.turret.speed px/s.
// Les tirs s'arrêtent dans le béton et les obstacles. Rien ne vit hors du module (pointe sortie), après une mort, ni d'un niveau à l'autre.
// Lit     : state.{mode, flow.freeze, plant.tip, labClock}, state.world.{width, height, solids, labLevel.{top, bottom, turrets}},
//           FP.config.{lab.turret, boss.shot}, FP.collision.distanceTo.
// Écrit   : state.labTurret = { level, aims: { [id]: { n (cycle), aimed, locked, fired, lockedAt } }, shots: [{ x, y, vx, vy, solid }] } ;
//           solides 'shot' dans state.world.solids ; state.events (bossAim, bossLock, bossShot { turret } : les sons des boss).
// Expose  : FP.labTurret.update(state, dt), FP.labTurret.pose(state, q) → { angle, aim: null | { to, locked } } (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const BURST_ANGLES = [0, -1, 1];

  const fresh = (level) => ({ level, aims: {}, shots: [] });

  function shotSolid(x, y) {
    const r = FP.config.boss.shot.r, collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'shot', lab: true, x, y, a: 0, flip: 1, collision, broadR: r, flyoverEligible: false, grazeRadius: 0, off: false };
  }

  function clear(state) {
    const st = state.labTurret, solids = state.world.solids;
    for (const s of st.shots) { const i = solids.indexOf(s.solid); if (i >= 0) solids.splice(i, 1); }
    st.shots = []; st.aims = {};
  }

  // Le béton et les obstacles arrêtent un tir (pas les autres tirs, ni le gaz).
  const blocked = (state, x, y) => state.world.solids.some(o => !o.off && o.kind !== 'shot' && o.kind !== 'pulse' &&
    (x - o.x) ** 2 + (y - o.y) ** 2 <= o.broadR * o.broadR && FP.collision.distanceTo(o, x, y) <= 0);

  // Pose (pour le dessin) : vers la pointe pendant la visée, vers le point figé ensuite ; au repos, vers l'intérieur du module.
  function pose(state, q) {
    const st = state.labTurret, a = st && st.level === state.world.labLevel ? st.aims[q.id] : null, tip = state.plant.tip;
    const aiming = a && a.aimed && a.fired < FP.config.boss.shot.burst, to = aiming ? (a.locked ? a.lockedAt : tip) : null;
    return { angle: to ? Math.atan2(to.y - q.y, to.x - q.x) : (q.side < 0 ? 0 : Math.PI), aim: aiming && a.fired === 0 && to ? { to, locked: a.locked } : null };
  }

  function update(state, dt) {
    const L = state.world.labLevel;
    if (!L || !L.turrets) return;
    if (!state.labTurret || state.labTurret.level !== L) state.labTurret = fresh(L);
    const st = state.labTurret, tip = state.plant.tip, clock = state.labClock;
    if (state.mode !== 'playing' || !tip || tip.y < L.top || tip.y > L.bottom) { if (st.shots.length || Object.keys(st.aims).length) clear(state); return; }
    if (state.flow.freeze > 0 || !clock || !clock.on) return;
    const C = FP.config.boss.shot, T = FP.config.lab.turret, w = state.world;
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.solid.x = s.x; s.solid.y = s.y;
      if (s.x < -C.r || s.x > w.width + C.r || s.y < -C.r || s.y > w.height + C.r || blocked(state, s.x, s.y)) {
        const j = w.solids.indexOf(s.solid); if (j >= 0) w.solids.splice(j, 1); st.shots.splice(i, 1);
      }
    }
    for (const q of L.turrets) {
      const local = clock.t - q.offset;
      if (local < 0) continue;
      const n = Math.floor(local / q.period), cyc = local - n * q.period;
      let a = st.aims[q.id];
      if (!a || a.n !== n) a = st.aims[q.id] = { n, aimed: false, locked: false, fired: 0, lockedAt: null };
      if (!a.aimed) { a.aimed = true; state.events.push({ type: 'bossAim', turret: q.id }); }
      if (!a.locked && cyc >= T.aim - C.lock) { a.locked = true; a.lockedAt = { x: tip.x, y: tip.y }; state.events.push({ type: 'bossLock', turret: q.id }); }
      while (a.locked && a.fired < C.burst && cyc >= T.aim + a.fired * C.burstGap) {
        const ang = Math.atan2(a.lockedAt.y - q.y, a.lockedAt.x - q.x) + (BURST_ANGLES[a.fired % 3] || 0) * C.spread * Math.PI / 180;
        const solid = shotSolid(q.x, q.y);
        st.shots.push({ x: q.x, y: q.y, vx: T.speed * Math.cos(ang), vy: T.speed * Math.sin(ang), solid });
        w.solids.push(solid); a.fired += 1;
        state.events.push({ type: 'bossShot', turret: q.id });
      }
    }
  }

  FP.labTurret = { update, pose };
})();
