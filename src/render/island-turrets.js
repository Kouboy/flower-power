// render/island-turrets.js — les tourelles enfouies des îlots (v5.17.0) : une motte de terre, la trappe de tôle du biome (celle des boss)
// et un canon court qui suit la pointe ; pendant la visée, sa lentille s'allume et la ligne de visée des boss part de la bouche (orange qui
// suit, rouge une fois figée) ; les tirs sont les impulsions dans la terre des boss (FP.bossRender.shot).
// Lit     : state.{camera.y, time, plant.tip}, state.world.{turrets, turretShots, solids, viewH, milieu}, FP.islandTurrets.pose,
//           FP.config.braid.islands.turret.r, FP.palette.boss.{milieux, aim, pulse.dirt}, FP.bossRender.{aimLine, shot}, FP.px.
// Écrit   : rien (la toile reçue).
// Expose  : FP.islandTurretView.drawBody(g, state) (avec les obstacles), FP.islandTurretView.drawThreats(g, state) (visée et tirs, par-dessus tout).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const BARREL = 5;   // dépassement du canon hors de la trappe (px d'art)

  const seen = (state, q) => state.world.solids.includes(q.solid) && q.y > state.camera.y - 40 && q.y < state.camera.y + state.world.viewH + 40;
  const muzzle = (q, angle, r) => ({ x: q.x + Math.cos(angle) * (r + BARREL) * FP.px.SCALE, y: q.y + Math.sin(angle) * (r + BARREL) * FP.px.SCALE });

  function drawBody(g, state) {
    const w = state.world, C = FP.palette.boss.milieux[w.milieu] || FP.palette.boss.milieux.friche, D = FP.palette.boss.pulse.dirt, A = FP.palette.boss.aim;
    const cam = FP.px.toArt(state.camera.y), r = Math.round(FP.px.toArt(FP.config.braid.islands.turret.r));
    for (const q of w.turrets) {
      if (!seen(state, q)) continue;
      const p = FP.islandTurrets.pose(state, q), x = FP.px.toArt(q.x), y = FP.px.toArt(q.y) - cam, m = muzzle(q, p.angle, r);
      const mx = FP.px.toArt(m.x), my = FP.px.toArt(m.y) - cam;
      FP.px.disc(g, x, y + 1, r + 3, D[1]); FP.px.disc(g, x, y, r + 2, D[0]);   // la motte
      FP.px.disc(g, x, y, r, C.edge); FP.px.disc(g, x, y, r - 1, C.dark); FP.px.disc(g, x, y, r - 3, C.light);   // la trappe
      FP.px.line(g, x, y, mx, my, C.edge, 3); FP.px.line(g, x, y, mx, my, C.body);   // le canon
      FP.px.rect(g, x, y, 1, 1, C.rivet);
      if (p.aim) FP.px.disc(g, mx, my, 2, p.aim.locked ? A[1] : A[0]);   // la lentille, pendant la visée
    }
  }

  function drawThreats(g, state) {
    const w = state.world, cam = FP.px.toArt(state.camera.y), r = Math.round(FP.px.toArt(FP.config.braid.islands.turret.r));
    for (const q of w.turrets) {
      if (!seen(state, q)) continue;
      const p = FP.islandTurrets.pose(state, q);
      if (p.aim) FP.bossRender.aimLine(g, muzzle(q, p.angle, r), p.aim.to, p.aim.locked, cam);
    }
    for (const s of w.turretShots) FP.bossRender.shot(g, s, cam, state.time);
  }

  FP.islandTurretView = { drawBody, drawThreats };
})();
