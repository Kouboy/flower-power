// render/lab-turret.js — la tourelle des modules de l'Encounter Lab (v5.13.0), dessinée comme celle des boss : console rivetée jusqu'au mur
// de son côté, socle rond, canon qui pivote vers la pointe, lentille qui s'allume pendant la visée, ligne de visée (claire qui suit, rouge
// une fois figée), tirs. Appelée par FP.labRender.drawThreats (par-dessus tout).
// Lit     : state.{camera.y, plant.tip, labTurret.shots}, state.world.{viewH, labLevel.{turrets, walls}}, FP.labTurret.pose,
//           FP.config.boss.{turret, shot.r}, FP.palette.boss.{milieux.friche, aim, shot}, FP.px, FP.geom.sdPoly.
// Écrit   : rien (la toile reçue ; le bout de chaque console en cache par niveau).
// Expose  : FP.labTurretView.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const ARM = 140;   // longueur maximale d'une console (px)

  let armFor = null; const arms = new Map();
  // Bout de la console : le premier point dans un mur, à l'horizontale, du côté `side`.
  function armEnd(L, q) {
    if (armFor !== L) { arms.clear(); armFor = L; }
    if (arms.has(q.id)) return arms.get(q.id);
    let end = null;
    for (let d = 4; d <= ARM && !end; d += 2) { const x = q.x + q.side * d; if (L.walls.some(P => FP.geom.sdPoly(x, q.y, P) <= 0)) end = x; }
    arms.set(q.id, end);
    return end;
  }

  function draw(g, state) {
    const L = state.world.labLevel;
    if (!L || !L.turrets || !L.turrets.length) return;
    const T = FP.config.boss.turret, M = FP.palette.boss.milieux.friche, A = FP.palette.boss.aim, cam = FP.px.toArt(state.camera.y), r = Math.floor(T.size / 2);
    const top = state.camera.y, H = state.world.viewH;
    for (const q of L.turrets) {
      if (q.y < top - 40 || q.y > top + H + 40) continue;
      const p = FP.labTurret.pose(state, q), x = FP.px.toArt(q.x), y = FP.px.toArt(q.y) - cam, end = armEnd(L, q);
      if (end !== null) { const ex = FP.px.toArt(end), xa = Math.min(ex, x), xb = Math.max(ex, x); FP.px.rect(g, xa, y - 2, xb - xa, 5, M.edge); FP.px.rect(g, xa, y - 1, xb - xa, 3, M.dark); for (let k = xa + 3; k < xb - 2; k += 6) FP.px.rect(g, k, y, 1, 1, M.rivet); }
      if (p.aim) {   // ligne de visée : du canon vers la cible, pointillée
        const tx = FP.px.toArt(p.aim.to.x), ty = FP.px.toArt(p.aim.to.y) - cam, n = Math.max(1, Math.round(Math.hypot(tx - x, ty - y) / 3));
        for (let k = 2; k < n; k += 2) FP.px.rect(g, Math.round(x + (tx - x) * k / n), Math.round(y + (ty - y) * k / n), 1, 1, p.aim.locked ? A[1] : A[0]);
      }
      FP.px.disc(g, x, y, r, M.edge); FP.px.disc(g, x, y, r - 1, M.dark); FP.px.disc(g, x, y, r - 4, M.light);
      const mx = Math.round(x + Math.cos(p.angle) * T.barrel), my = Math.round(y + Math.sin(p.angle) * T.barrel);
      FP.px.line(g, x, y, mx, my, M.edge, 3); FP.px.line(g, x, y, mx, my, M.body);
      if (p.aim) FP.px.disc(g, mx, my, 2, p.aim.locked ? A[1] : A[0]);
    }
    const st = state.labTurret, S = FP.palette.boss.shot, sr = Math.max(1, Math.round(FP.config.boss.shot.r / FP.px.SCALE));
    if (st && st.level === L) for (const s of st.shots) { FP.px.disc(g, FP.px.toArt(s.x), FP.px.toArt(s.y) - cam, sr + 1, S[0]); FP.px.disc(g, FP.px.toArt(s.x), FP.px.toArt(s.y) - cam, sr, S[1]); }
  }

  FP.labTurretView = { draw };
})();
