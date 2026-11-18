// render/lab-turret.js — les tourelles d'un module du Lab (v5.13.0), dessinées comme celles des boss : console rivetée jusqu'au mur de son
// côté, socle rond, canon qui pivote vers la pointe, lentille qui s'allume pendant la visée, ligne de visée (claire qui suit, rouge une fois
// figée), tirs. Appelée par FP.labRender.drawThreats pour chaque module (par-dessus tout).
// Lit     : state.{camera.y, plant.tip}, state.world.viewH, module.{turrets, walls, live.turret.shots}, FP.labTurret.pose,
//           FP.config.boss.{turret, shot.r}, FP.palette.boss.{milieux.friche, aim, shot}, FP.px, FP.geom.sdPoly.
// Écrit   : rien (la toile reçue ; le bout de chaque console en cache par module).
// Expose  : FP.labTurretView.draw(g, state, module).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const ARM = 140;   // longueur maximale d'une console (px)

  const arms = new WeakMap();   // module → Map(id → bout de console)
  // Bout de la console : le premier point dans un mur, à l'horizontale, du côté `side`.
  function armEnd(M, q) {
    if (!arms.has(M)) arms.set(M, new Map());
    const m = arms.get(M);
    if (m.has(q.id)) return m.get(q.id);
    let end = null;
    for (let d = 4; d <= ARM && !end; d += 2) { const x = q.x + q.side * d; if (M.walls.some(P => FP.geom.sdPoly(x, q.y, P) <= 0)) end = x; }
    m.set(q.id, end);
    return end;
  }

  function draw(g, state, M) {
    if (!M.turrets.length) return;
    const T = FP.config.boss.turret, C = FP.palette.boss.milieux.friche, A = FP.palette.boss.aim, cam = FP.px.toArt(state.camera.y), r = Math.floor(T.size / 2);
    const top = state.camera.y, H = state.world.viewH;
    for (const q of M.turrets) {
      if (q.y < top - 40 || q.y > top + H + 40) continue;
      const p = FP.labTurret.pose(state, M, q), x = FP.px.toArt(q.x), y = FP.px.toArt(q.y) - cam, end = armEnd(M, q);
      if (end !== null) { const ex = FP.px.toArt(end), xa = Math.min(ex, x), xb = Math.max(ex, x); FP.px.rect(g, xa, y - 2, xb - xa, 5, C.edge); FP.px.rect(g, xa, y - 1, xb - xa, 3, C.dark); for (let k = xa + 3; k < xb - 2; k += 6) FP.px.rect(g, k, y, 1, 1, C.rivet); }
      if (p.aim) {   // ligne de visée : du canon vers la cible, pointillée
        const tx = FP.px.toArt(p.aim.to.x), ty = FP.px.toArt(p.aim.to.y) - cam, n = Math.max(1, Math.round(Math.hypot(tx - x, ty - y) / 3));
        for (let k = 2; k < n; k += 2) FP.px.rect(g, Math.round(x + (tx - x) * k / n), Math.round(y + (ty - y) * k / n), 1, 1, p.aim.locked ? A[1] : A[0]);
      }
      FP.px.disc(g, x, y, r, C.edge); FP.px.disc(g, x, y, r - 1, C.dark); FP.px.disc(g, x, y, r - 4, C.light);
      const mx = Math.round(x + Math.cos(p.angle) * T.barrel), my = Math.round(y + Math.sin(p.angle) * T.barrel);
      FP.px.line(g, x, y, mx, my, C.edge, 3); FP.px.line(g, x, y, mx, my, C.body);
      if (p.aim) FP.px.disc(g, mx, my, 2, p.aim.locked ? A[1] : A[0]);
    }
    const S = FP.palette.boss.shot, sr = Math.max(1, Math.round(FP.config.boss.shot.r / FP.px.SCALE));
    for (const s of M.live.turret.shots) { FP.px.disc(g, FP.px.toArt(s.x), FP.px.toArt(s.y) - cam, sr + 1, S[0]); FP.px.disc(g, FP.px.toArt(s.x), FP.px.toArt(s.y) - cam, sr, S[1]); }
  }

  FP.labTurretView = { draw };
})();
