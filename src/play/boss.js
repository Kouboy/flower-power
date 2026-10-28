// play/boss.js — le boss : ses défenses (chaque tronçon prévient, frappe, se repose ; seul le coup est un obstacle), le perçage des points faibles, la trappe.
// Lit     : state.time, state.mode, state.plant.tip, state.world.bossLevel.{defenses,weak,trap}, state.bossFight.pierced, FP.config.boss.
// Écrit   : solide de chaque défense : off, collision (repère local, le long de +x), a, broadR ; state.bossFight (seul à l'écrire) ;
//           trap.solid.off et trap.openedAt (ouverture, à l'instant state.time) ; state.camera.shake, state.events (bossPierce, bossTrap) ; le score, par FP.scoring.awardFlat.
// Expose  : FP.boss.stageAt(i, t, pierced) → { stage: 'rest' | 'warn' | 'strike', k } (pur), FP.boss.update(state, dt),
//           FP.boss.reset(state) (nouveau boss : plus aucun point percé).
// Les points percés survivent à une mort (le niveau se régénère avec eux) ; seul reset les remet à zéro.
// Le cycle accélère de `speedup` par point percé ; la défense i est décalée de i quarts de période (jamais toutes en coup ensemble).
// Forme : piston = rectangle qui sort de la face ; jet = rectangle fin, plein dès k = .2 ; bras = barre qui pivote de la verticale à l'horizontale.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const JET_GROW = .2, JET_THIN = .7;   // part du coup où le jet se déploie ; épaisseur du jet (× thick)

  function stageAt(i, t, pierced) {
    const d = FP.config.boss.defense, f = Math.pow(1 - d.speedup, pierced);
    const P = d.period * f, W = d.warn * f, S = d.strike * f;
    const u = (((t + i * P / 4) % P) + P) % P;
    if (u < W) return { stage: 'warn', k: u / W };
    if (u < W + S) return { stage: 'strike', k: (u - W) / S };
    return { stage: 'rest', k: (u - W - S) / (P - W - S) };
  }

  const rect = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

  // Forme locale et angle d'une défense en coup. Le côté du couloir est à +x local quand a = 0 (side -1) ou a = π (side +1).
  function shape(df, k) {
    const d = FP.config.boss.defense, reach = df.reach, h = d.thick / 2, toward = df.side < 0 ? 0 : Math.PI;
    if (df.type === 'piston') return { a: toward, poly: rect(0, Math.max(1, reach * k), -h, h) };
    if (df.type === 'jet') return { a: toward, poly: rect(0, reach * Math.min(1, k / JET_GROW), -h * JET_THIN, h * JET_THIN) };
    // Bras : de la verticale (vers le haut, dans le flanc) à l'horizontale ; le côté épais reste dans le tronçon à k = 0.
    const a = -Math.PI / 2 + k * (df.side < 0 ? Math.PI / 2 : -Math.PI / 2);
    return { a, poly: df.side < 0 ? rect(0, reach, -d.thick, 0) : rect(0, reach, 0, d.thick) };
  }

  // La pointe passe à moins de weakHit d'un point faible intact : il est percé (une fois) ; le quatrième ouvre la trappe.
  function pierce(state, bl) {
    const c = FP.config.boss, tip = state.plant.tip, done = state.bossFight.pierced;
    for (const w of bl.weak) {
      if (done[w.i] || Math.hypot(tip.x - w.x, tip.y - w.y) >= c.weakHit) continue;
      done[w.i] = true;
      state.events.push({ type: 'bossPierce', i: w.i, x: w.x, y: w.y });
      FP.scoring.awardFlat(state, w.x, w.y, c.pierceBonus);
      state.camera.shake = Math.max(state.camera.shake, c.pierceShake);
    }
    if (done.every(Boolean) && !bl.trap.solid.off) { bl.trap.solid.off = true; bl.trap.openedAt = state.time; state.events.push({ type: 'bossTrap' }); }
  }

  function reset(state) { state.bossFight.pierced = Array(FP.config.boss.segments).fill(false); }

  function update(state) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    if (state.mode === 'playing') pierce(state, bl);
    const pierced = state.bossFight.pierced.filter(Boolean).length;
    for (const df of bl.defenses) {
      const o = df.solid, s = stageAt(df.i, state.time, pierced);
      o.off = s.stage !== 'strike';
      if (o.off) continue;
      const sh = shape(df, s.k);
      o.a = sh.a; o.collision = sh.poly;
      o.broadR = Math.max(...sh.poly.map(([px, py]) => Math.hypot(px, py)));
    }
  }

  FP.boss = { stageAt, update, reset };
})();
