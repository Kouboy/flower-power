// play/boss-threats.js — les défenses signature des salles de boss (v5.1.0) : quand la pointe entre dans une salle, un long
// avertissement, puis un coup sur la moitié de la salle où elle se trouvait ; on l'évite en se déplaçant (la tige ne s'arrête jamais).
// v5.1.0 (suite) : tirs visés — à partir du boss 2, une tourelle de la salle de la pointe la suit (ligne de visée), fige la ligne peu
// avant de tirer, puis un projectile rapide part le long de la ligne figée : on l'évite en virant après le figement.
// Lit     : state.{mode, flow.freeze, plant.tip, run.milieu, bossFight.destroyed}, state.world.{width,height,bossLevel.{rooms[].{x0,y0,x1,y1,zone,turrets},turrets[]}},
//           FP.config.{boss.defense, boss.shot, boss.shooters, milieux}.
// Écrit   : state.bossThreats.{aim: { turret, t, lockedAt: null | { x, y } } | null, cooldown (s), shots: [{ x, y, vx, vy, solid }]} ; solides 'shot'
//           (octogone de rayon shot.r) ajoutés à state.world.solids tant que le tir vole, retirés à la sortie du cadre / mort / génération ;
//           state.bossThreats.rooms[id] = { stage: 'idle'|'warn'|'strike'|'rest', t, half: -1 (gauche) | 1 (droite) } (seul ; vidé par
//           world/boss.js à chaque génération), la zone (solide 'defense') de chaque salle : off sauf pendant le coup, polygone = moitié visée ;
//           state.events (bossWarn { room, half } à chaque avertissement, bossStrike { room, half } à chaque coup ; bossAim / bossLock / bossShot { turret } : le dessin et le son sont ailleurs).
// Expose  : FP.bossThreats.update(state, dt), FP.bossThreats.timing(destroyedCount) → { warn, strike, rest } (pur),
//           FP.bossThreats.roomAt(bossLevel, x, y) → salle | null (pur).
// Hors niveau de boss, hors mode playing : tout repasse au repos ; pendant l'arrêt sur image (flow.freeze) rien ne progresse.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function timing(n) {
    const d = FP.config.boss.defense, k = Math.pow(1 - d.speedup, n);
    return { warn: Math.max(d.warnMin, d.warn * k), strike: d.strike * k, rest: d.rest * k };
  }

  const inside = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

  function roomAt(bl, x, y) {
    if (!bl) return null;
    for (const r of bl.rooms) if (inside(r, x, y)) return r;
    return null;
  }

  // Zone = moitié `half` de la salle (de son milieu à son bord), pleine hauteur ; broadR et centre suivent.
  function aim(r, half) {
    const mid = (r.x0 + r.x1) / 2, xa = half < 0 ? r.x0 : mid, xb = half < 0 ? mid : r.x1, z = r.zone;
    z.x = (xa + xb) / 2; z.y = (r.y0 + r.y1) / 2;
    const hw = (xb - xa) / 2, hh = (r.y1 - r.y0) / 2;
    z.collision = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    z.broadR = Math.hypot(hw, hh);
  }

  function quiet(state, bl) {
    for (const r of bl.rooms) r.zone.off = true;
    for (const id in state.bossThreats.rooms) { const e = state.bossThreats.rooms[id]; e.stage = 'idle'; e.t = 0; }
  }

  function wake(state, r, e, tip) {
    e.stage = 'warn'; e.t = 0; e.half = tip.x < (r.x0 + r.x1) / 2 ? -1 : 1;
    state.events.push({ type: 'bossWarn', room: r.id, half: e.half });
  }

  // Projectile : octogone de rayon shot.r, solide 'shot' (non protégé du survol, sans effleurement) posé dans world.solids tant qu'il vole.
  function shotSolid(x, y) {
    const r = FP.config.boss.shot.r, collision = [];
    for (let i = 0; i < 8; i++) collision.push([r * Math.cos(i * Math.PI / 4), r * Math.sin(i * Math.PI / 4)]);
    return { kind: 'shot', boss: true, x, y, a: 0, flip: 1, collision, broadR: r, flyoverEligible: false, grazeRadius: 0, off: false };
  }

  function dropShot(state, k) {
    const th = state.bossThreats, i = state.world.solids.indexOf(th.shots[k].solid);
    if (i >= 0) state.world.solids.splice(i, 1);
    th.shots.splice(k, 1);
  }

  function clearShots(state) {
    while (state.bossThreats.shots.length) dropShot(state, 0);
    state.bossThreats.aim = null;
  }

  function fire(state, tur, to) {
    const cfg = FP.config.boss.shot, dx = to.x - tur.x, dy = to.y - tur.y, len = Math.hypot(dx, dy) || 1, th = state.bossThreats;
    const solid = shotSolid(tur.x, tur.y);
    th.shots.push({ x: tur.x, y: tur.y, vx: cfg.speed * dx / len, vy: cfg.speed * dy / len, solid });
    state.world.solids.push(solid);
    th.aim = null; th.cooldown = cfg.gap;
    state.events.push({ type: 'bossShot', turret: tur.id });
  }

  // Une visée à la fois : tourelle de la salle de la pointe (la plus proche), jamais pendant le coup de la défense ni le délai entre tirs.
  function shoot(state, bl, tip, dt) {
    const cfg = FP.config.boss.shot, th = state.bossThreats, w = state.world;
    for (let i = th.shots.length - 1; i >= 0; i--) {
      const s = th.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.solid.x = s.x; s.solid.y = s.y;
      if (s.x < -cfg.r || s.x > w.width + cfg.r || s.y < -cfg.r || s.y > w.height + cfg.r) dropShot(state, i);
    }
    th.cooldown = Math.max(0, th.cooldown - dt);
    if (!FP.config.boss.shooters.includes(FP.config.milieux[state.run.milieu].id)) return;
    const room = tip ? roomAt(bl, tip.x, tip.y) : null, a = th.aim;
    if (a) {
      const tur = bl.turrets.find(q => q.id === a.turret);
      const st = state.bossThreats.rooms[tur.room];
      // pointe sortie de la salle, ou coup de la défense qui commence : visée annulée sans tir (un tir déjà parti continue)
      if (!room || room.id !== tur.room || (st && st.stage === 'strike')) { th.aim = null; return; }
      a.t += dt;
      if (!a.lockedAt && a.t >= cfg.track - cfg.lock) { a.lockedAt = { x: tip.x, y: tip.y }; state.events.push({ type: 'bossLock', turret: tur.id }); }
      if (a.t >= cfg.track) fire(state, tur, a.lockedAt);
      return;
    }
    const e = room && state.bossThreats.rooms[room.id];
    if (!room || th.cooldown > 0 || (e && e.stage === 'strike')) return;
    let best = null, bd = Infinity;
    for (const q of bl.turrets) {
      const d = q.room === room.id ? Math.hypot(q.x - tip.x, q.y - tip.y) : Infinity;
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) return;
    th.aim = { turret: best.id, t: 0, lockedAt: null };
    state.events.push({ type: 'bossAim', turret: best.id });
  }

  function update(state, dt) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    if (state.mode !== 'playing') { quiet(state, bl); clearShots(state); return; }
    if (state.flow.freeze > 0) return;
    const tip = state.plant.tip, tm = timing(state.bossFight.destroyed.filter(Boolean).length);
    for (const r of bl.rooms) {
      const e = state.bossThreats.rooms[r.id] || (state.bossThreats.rooms[r.id] = { stage: 'idle', t: 0, half: 1 });
      const here = !!tip && inside(r, tip.x, tip.y);
      if (e.stage === 'idle') { if (here) wake(state, r, e, tip); continue; }
      e.t += dt;
      if (e.stage === 'warn' && e.t >= tm.warn) {
        if (!here) { e.stage = 'idle'; e.t = 0; continue; }       // la pointe est partie : pas de coup
        e.stage = 'strike'; e.t = 0; aim(r, e.half); r.zone.off = false;
        state.events.push({ type: 'bossStrike', room: r.id, half: e.half });
      } else if (e.stage === 'strike' && e.t >= tm.strike) {
        e.stage = 'rest'; e.t = 0; r.zone.off = true;
      } else if (e.stage === 'rest' && e.t >= tm.rest) {
        if (here) wake(state, r, e, tip); else { e.stage = 'idle'; e.t = 0; }
      }
    }
    shoot(state, bl, tip, dt);
  }

  FP.bossThreats = { update, timing, roomAt };
})();
