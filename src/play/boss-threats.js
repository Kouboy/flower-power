// play/boss-threats.js — les défenses signature des salles de boss (v5.1.0) : quand la pointe entre dans une salle, un long
// avertissement, puis un coup sur la moitié de la salle où elle se trouvait ; on l'évite en se déplaçant (la tige ne s'arrête jamais).
// v5.1.0 (suite) : tirs visés — à chaque boss (v5.5.0 ; avant, à partir du boss 2), une tourelle suit la pointe (ligne de visée), fige la ligne peu avant de tirer, puis un
// projectile rapide part le long de la ligne figée : on l'évite en virant après le figement. v5.3.1 : la tourelle vise pendant le repos de
// la défense de sa salle, la pointe encore dedans ou déjà sortie (le coup, puis le tir).
// Lit     : state.{mode, flow.freeze, world.bossLevel.head.solid.off, plant.tip, run.milieu, bossFight.destroyed}, state.world.{width,height,bossLevel.{rooms[].{x0,y0,x1,y1,zone,turrets},turrets[],walls,targets,plates,head}},
//           FP.config.{boss.defense, boss.shot, boss.ramp[id].{strike,rest,speedup,shot}, milieux}, FP.collision.distanceTo.
// Écrit   : state.bossThreats.{aim: { turret, t, lockedAt: null | { x, y } } | null, cooldown (s), shots: [{ x, y, vx, vy, solid }]} ; solides 'shot'
//           (octogone de rayon shot.r) ajoutés à state.world.solids tant que le tir vole, retirés à la sortie du cadre, dans une pièce du boss
//           (paroi, cible, plaque ou tête qui n'est pas tombée), à la mort et à la génération ;
//           state.bossThreats.rooms[id] = { stage: 'idle'|'warn'|'strike'|'rest', t, half: -1 (gauche) | 1 (droite) } (seul ; vidé par
//           world/boss.js à chaque génération), la zone (solide 'defense') de chaque salle : off sauf pendant le coup, polygone = moitié visée ;
//           state.events (bossWarn { room, half } à chaque avertissement, bossStrike { room, half } à chaque coup ; bossAim / bossLock / bossShot { turret } : le dessin et le son sont ailleurs).
// Expose  : FP.bossThreats.update(state, dt), FP.bossThreats.timing(destroyedCount, id) → { warn, strike, rest } (pur ; id : milieu du boss,
//             coup, repos et accélération propres à chaque boss — config.boss.ramp —, avertissement commun).
// Hors niveau de boss, hors mode playing, et dès que la tête est transpercée (le boss meurt : sa cinématique, puis ses ruines) : tout repasse
// au repos, visée et tirs effacés ; pendant l'arrêt sur image (flow.freeze) rien ne progresse.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function timing(n, id) {
    const d = FP.config.boss.defense, r = FP.config.boss.ramp[id], k = Math.pow(1 - r.speedup, n);
    return { warn: Math.max(d.warnMin, d.warn * k), strike: r.strike * k, rest: r.rest * k };
  }

  const bossId = (state) => FP.config.milieux[state.run.milieu].id;

  const inside = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

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

  // Un projectile s'arrête dans une pièce du boss (paroi, cible, plaque, tête) qui n'est pas tombée : il ne traverse rien.
  function blocked(bl, x, y) {
    const hit = (o) => !o.off && (x - o.x) * (x - o.x) + (y - o.y) * (y - o.y) <= o.broadR * o.broadR && FP.collision.distanceTo(o, x, y) <= 0;
    if (hit(bl.head.solid)) return true;
    for (const o of bl.walls) if (hit(o)) return true;
    for (const t of bl.targets) if (hit(t.solid)) return true;
    for (const p of bl.plates) if (hit(p.solid)) return true;
    return false;
  }

  function clearShots(state) {
    while (state.bossThreats.shots.length) dropShot(state, 0);
    state.bossThreats.aim = null;
  }

  function fire(state, tur, to) {
    const cfg = FP.config.boss.ramp[bossId(state)].shot, dx = to.x - tur.x, dy = to.y - tur.y, len = Math.hypot(dx, dy) || 1, th = state.bossThreats;
    const solid = shotSolid(tur.x, tur.y);
    th.shots.push({ x: tur.x, y: tur.y, vx: cfg.speed * dx / len, vy: cfg.speed * dy / len, solid });
    state.world.solids.push(solid);
    th.aim = null; th.cooldown = cfg.gap;
    state.events.push({ type: 'bossShot', turret: tur.id });
  }

  // Une visée à la fois, jamais pendant le délai entre tirs (v5.3.1 : commencée avec l'avertissement, elle était annulée par le coup juste avant
  // de tirer) : la tourelle la plus proche parmi les salles au repos (un repos suit toujours un coup, donc un passage de la tige) vise la tige
  // où qu'elle soit, dans la salle ou déjà sortie (tir dans le dos), jusqu'au tir. Commencée au repos, la visée (track = 1 s) finit avant le
  // coup suivant (avertissement d'au moins warnMin = 1 s après le repos).
  function shoot(state, bl, tip, dt) {
    const cfg = FP.config.boss.shot, th = state.bossThreats, w = state.world;
    for (let i = th.shots.length - 1; i >= 0; i--) {
      const s = th.shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.solid.x = s.x; s.solid.y = s.y;
      if (s.x < -cfg.r || s.x > w.width + cfg.r || s.y < -cfg.r || s.y > w.height + cfg.r || blocked(bl, s.x, s.y)) dropShot(state, i);
    }
    th.cooldown = Math.max(0, th.cooldown - dt);
    const a = th.aim;
    if (a) {
      const tur = bl.turrets.find(q => q.id === a.turret);
      a.t += dt;
      if (!a.lockedAt && a.t >= cfg.track - cfg.lock) { a.lockedAt = { x: tip.x, y: tip.y }; state.events.push({ type: 'bossLock', turret: tur.id }); }
      if (a.t >= cfg.track) fire(state, tur, a.lockedAt);
      return;
    }
    if (!tip || th.cooldown > 0) return;
    let best = null, bd = Infinity;
    for (const q of bl.turrets) {
      const e = state.bossThreats.rooms[q.room];
      if (!e || e.stage !== 'rest') continue;
      const d = Math.hypot(q.x - tip.x, q.y - tip.y);
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) return;
    th.aim = { turret: best.id, t: 0, lockedAt: null };
    state.events.push({ type: 'bossAim', turret: best.id });
  }

  function update(state, dt) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    if (state.mode !== 'playing' || bl.head.solid.off) { quiet(state, bl); clearShots(state); return; }
    if (state.flow.freeze > 0) return;
    const tip = state.plant.tip, tm = timing(state.bossFight.destroyed.filter(Boolean).length, bossId(state));
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

  FP.bossThreats = { update, timing };
})();
