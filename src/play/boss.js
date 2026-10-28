// play/boss.js — le boss : ses défenses (chaque tronçon prévient, frappe, se repose ; seul le coup est un obstacle), le perçage des points faibles, la trappe.
// Lit     : state.time, state.mode, state.plant.tip, state.world.bossLevel.{defenses,weak,trap}, state.bossFight.{pierced,phase}, FP.config.boss, FP.scoring.awardFlat.
// Écrit   : solide de chaque défense : off, collision (repère local, le long de +x), a, broadR ; state.bossFight.{pierced,phase} (seul à l'écrire) ;
//           trap.solid.off et trap.openedAt (ouverture, à l'instant state.time) ; state.camera.shake, state.events (bossPierce, bossTrap) ; le score, par FP.scoring.awardFlat.
// Expose  : FP.boss.stageAt(i, phase) → { stage: 'rest' | 'warn' | 'strike', k } (pur ; phase = state.bossFight.phase, en cycles), FP.boss.update(state, dt),
//           FP.boss.reset(state) (nouveau boss : plus aucun point percé, phase à zéro).
// Les points percés survivent à une mort (le niveau se régénère avec eux) ; seul reset les remet à zéro.
// Le cycle accélère de `speedup` par point percé : la phase (en cycles) avance de dt / période, sans jamais sauter — un perçage
// raccourcit ce qui reste de l'étape en cours, il ne fait pas tomber une défense en coup. La défense i est décalée de i quarts de cycle.
// Forme : piston = rectangle qui sort de la face ; jet = rectangle fin, plein dès k = .2 ; bras = barre qui pivote de la verticale à l'horizontale.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const JET_GROW = .2, JET_THIN = .7;   // part du coup où le jet se déploie ; épaisseur du jet (× thick)

  // Étape de la défense i à la phase donnée : les parts du cycle (avertissement, coup, repos) ne dépendent pas de la vitesse.
  function stageAt(i, phase) {
    const d = FP.config.boss.defense, W = d.warn / d.period, S = d.strike / d.period;
    const u = (((phase + i / 4) % 1) + 1) % 1;
    if (u < W) return { stage: 'warn', k: u / W };
    if (u < W + S) return { stage: 'strike', k: (u - W) / S };
    return { stage: 'rest', k: (u - W - S) / (1 - W - S) };
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

  function reset(state) { state.bossFight.pierced = Array(FP.config.boss.segments).fill(false); state.bossFight.phase = 0; }

  function update(state, dt) {
    const bl = state.world.bossLevel, bf = state.bossFight, d = FP.config.boss.defense;
    if (!bl) return;
    if (state.mode === 'playing') pierce(state, bl);
    bf.phase = (bf.phase + dt / (d.period * Math.pow(1 - d.speedup, bf.pierced.filter(Boolean).length))) % 1;
    for (const df of bl.defenses) {
      const o = df.solid, s = stageAt(df.i, bf.phase);
      o.off = s.stage !== 'strike';
      if (o.off) continue;
      const sh = shape(df, s.k);
      o.a = sh.a; o.collision = sh.poly;
      o.broadR = Math.max(...sh.poly.map(([px, py]) => Math.hypot(px, py)));
    }
  }

  FP.boss = { stageAt, update, reset };
})();
