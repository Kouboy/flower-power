// play/boss-threats.js — les défenses signature des salles de boss (v5.1.0) : quand la pointe entre dans une salle, un long
// avertissement, puis un coup sur la moitié de la salle où elle se trouvait ; on l'évite en se déplaçant (la tige ne s'arrête jamais).
// Lit     : state.{mode, flow.freeze, plant.tip, bossFight.destroyed}, state.world.bossLevel.rooms[].{x0,y0,x1,y1,zone}, FP.config.boss.defense.
// Écrit   : state.bossThreats.rooms[id] = { stage: 'idle'|'warn'|'strike'|'rest', t, half: -1 (gauche) | 1 (droite) } (seul ; vidé par
//           world/boss.js à chaque génération), la zone (solide 'defense') de chaque salle : off sauf pendant le coup, polygone = moitié visée ;
//           state.events (bossWarn { room, half } à chaque avertissement, bossStrike { room, half } à chaque coup : le dessin et le son sont ailleurs).
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

  function update(state, dt) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    if (state.mode !== 'playing') { quiet(state, bl); return; }
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
  }

  FP.bossThreats = { update, timing, roomAt };
})();
