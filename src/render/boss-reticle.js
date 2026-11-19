// render/boss-reticle.js — le réticule doré des points faibles repérés (v5.16.0) : quatre coins qui se referment sur la silhouette de la cible en
// boss.spot.close s au repérage (play/boss-spot.js), puis restent posés, discrets, tant qu'elle est intacte et à l'écran ; or clair et or
// sombre (la couleur de ce qui rapporte, jamais le rouge des menaces). Appelé par FP.bossRender.drawThreats.
// Lit     : state.{time, camera.y, bossSpot.at, bossFight.{destroyed, headOpen}}, state.world.{viewH, bossLevel.{targets, head}},
//           (collision, x, y, off de chaque cible), FP.config.boss.spot.close, FP.palette.boss.reticle, FP.px.
// Écrit   : rien (la toile reçue).
// Expose  : FP.bossReticle.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const ARM = 4;   // longueur d'un coin (px d'art)

  // Coins d'un cadre centré en (x, y), de demi-largeur rx et demi-hauteur ry (px d'art).
  function corners(g, x, y, rx, ry, C) {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = x + sx * rx, cy = y + sy * ry;
      FP.px.rect(g, Math.min(cx, cx - sx * ARM), cy, ARM + 1, 1, C); FP.px.rect(g, cx, Math.min(cy, cy - sy * ARM), 1, ARM + 1, C);
    }
  }

  function draw(g, state) {
    const bl = state.world.bossLevel, sp = state.bossSpot;
    if (!bl || !sp || sp.level !== bl) return;
    const P = FP.palette.boss.reticle, cam = FP.px.toArt(state.camera.y), top = state.camera.y, H = state.world.viewH, close = FP.config.boss.spot.close;
    const one = (id, o) => {
      const at = sp.at[id];
      if (at === undefined || o.off || o.y + o.broadR < top || o.y - o.broadR > top + H) return;
      // Le cadre épouse la silhouette de la cible (sa collision), à 3 px d'art près ; il part deux fois plus grand et se referme.
      const xs = o.collision.map(([a, b]) => a), ys = o.collision.map(([a, b]) => b);
      const k = Math.min(1, (state.time - at) / close), grow = 2 - (1 - (1 - k) * (1 - k));
      const rx = Math.round((FP.px.toArt((Math.max(...xs) - Math.min(...xs)) / 2) + 3) * grow), ry = Math.round((FP.px.toArt((Math.max(...ys) - Math.min(...ys)) / 2) + 3) * grow);
      const x = FP.px.toArt(o.x + (Math.max(...xs) + Math.min(...xs)) / 2), y = FP.px.toArt(o.y + (Math.max(...ys) + Math.min(...ys)) / 2) - cam;
      corners(g, x + 1, y + 1, rx, ry, P[1]); corners(g, x, y, rx, ry, P[0]);   // l'ombre, puis l'or
      if (k < 1) FP.px.rect(g, x, y, 1, 1, P[0]);   // le point visé, pendant que le réticule se referme
    };
    bl.targets.forEach((t, i) => { if (!state.bossFight.destroyed[i]) one(i, t.solid); });
    if (state.bossFight.headOpen) one('head', bl.head.solid);
  }

  FP.bossReticle = { draw };
})();
