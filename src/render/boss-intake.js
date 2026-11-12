// render/boss-intake.js — la bouche d'aspiration des boss (v5.9.0, retour de jeu : « le couloir du début ne se rattache pas au boss ») :
// les deux murs de l'entrée (plans : intake) deviennent la prise d'air de la machine. Tôles rivetées sur leurs faces, dents d'aspiration
// sur les lèvres de la gorge (les bords qui la regardent), grille au pied de la gorge ; leurs tuyaux montent vers le cœur (plans : pipes,
// render/boss-pipes.js). Purement visuel : la géométrie et les collisions ne changent pas.
// Lit     : state.{camera.y, run.milieu}, state.world.{viewH, bossLevel.{walls (intake, off), head.solid.off}}, FP.config.{milieux,
//           boss.intake (teeth, plateGap)}, FP.palette.boss.{milieux[id], intake (tooth, grille)}, FP.bossSkin.spans, FP.px, FP.geom.sdPoly.
// Écrit   : rien dans l'état (la toile reçue ; les lèvres en cache par niveau de boss).
// Expose  : FP.bossIntake.lips(bl) → [{ wall: i, x0, y0, x1, y1, nx, ny (normale vers la gorge) }] (pur, pixels du monde) ;
//           FP.bossIntake.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const PROBE = 4, MIN_LEN = 12;   // px : un bord donne sur la gorge si le point à PROBE px dehors n'est dans aucun mur ; bords trop courts ignorés

  const polyOf = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);

  // Le milieu de la gorge : entre les deux murs de l'entrée, à mi-largeur de leurs boîtes.
  function throat(bl) {
    const W = bl.walls.filter(w => w.intake);
    if (W.length < 2) return null;
    const box = (w) => { const xs = polyOf(w).map(p => p[0]); return [Math.min(...xs), Math.max(...xs)]; };
    const [a, b] = W.map(box).sort((p, q) => p[0] - q[0]);
    return (Math.min(a[1], b[1]) + Math.max(a[0], b[0])) / 2;
  }

  function lips(bl) {
    const out = [], cx = throat(bl);
    if (cx === null) return out;
    const all = bl.walls.map(polyOf);
    for (const [wi, w] of bl.walls.entries()) {
      if (!w.intake) continue;
      const P = all[wi];
      for (let i = 0; i < P.length; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], L = Math.hypot(x1 - x0, y1 - y0);
        if (L < MIN_LEN) continue;
        let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        if (FP.geom.sdPoly(mx + nx * PROBE, my + ny * PROBE, P) < 0) { nx = -nx; ny = -ny; }   // vers le dehors du mur
        if (Math.abs(nx) < .5 || Math.sign(nx) !== Math.sign(cx - mx)) continue;   // une face qui regarde la gorge
        if (all.some(p => FP.geom.sdPoly(mx + nx * PROBE, my + ny * PROBE, p) < 0)) continue;
        out.push({ wall: wi, x0, y0, x1, y1, nx, ny });
      }
    }
    return out;
  }

  // Tôles : une couture tous les plateGap px d'art, rivets de part et d'autre.
  function plates(g, pts, M, K) {
    const top = Math.min(...pts.map(p => p[1]));
    FP.bossSkin.spans(pts, 2, (y, a, b) => {
      if ((y - Math.round(top)) % K.plateGap) return;
      FP.px.rect(g, Math.ceil(a) + 1, y, Math.floor(b - a) - 2, 1, M.edge);
      for (let x = Math.ceil(a) + 3; x < b - 3; x += 6) { FP.px.rect(g, x, y - 2, 1, 1, M.rivet); FP.px.rect(g, x, y + 2, 1, 1, M.rivet); }
    });
  }

  // Dents d'aspiration : des crocs triangulaires plantés dans la lèvre, pointés vers la gorge.
  function teeth(g, l, cam, M, T, K) {
    const ax = FP.px.toArt(l.x0), ay = FP.px.toArt(l.y0) - cam, bx = FP.px.toArt(l.x1), by = FP.px.toArt(l.y1) - cam;
    for (let k = 0; k < K.teeth; k++) {
      const s = (k + .5) / K.teeth, x = ax + (bx - ax) * s, y = ay + (by - ay) * s;
      for (let d = 0; d < 4; d++) {   // de la base (3 px de large) à la pointe (1 px), le long de la normale
        const w = Math.max(1, 3 - d), px = Math.round(x + l.nx * d - (w >> 1) * Math.abs(l.ny)), py = Math.round(y + l.ny * d - (w >> 1) * Math.abs(l.nx));
        FP.px.rect(g, px, py, Math.abs(l.nx) > .5 ? 1 : w, Math.abs(l.nx) > .5 ? w : 1, d === 3 ? M.edge : T.tooth);
      }
    }
  }

  // Grille : des barreaux au pied de la gorge, entre les deux murs, sur leur bas.
  function grille(g, bl, cam, T, M) {
    const W = bl.walls.filter(w => w.intake && !w.off).map(polyOf);
    if (W.length < 2) return;
    const yb = Math.min(...W.map(p => Math.max(...p.map(q => q[1])))), cx = throat(bl);
    const mid = (p) => (Math.min(...p.map(q => q[0])) + Math.max(...p.map(q => q[0]))) / 2;   // côté d'un mur : le centre de sa boîte
    const xa = Math.max(...W.filter(p => mid(p) < cx).map(p => Math.max(...p.filter(q => Math.abs(q[1] - yb) < 6).map(q => q[0]).concat([-Infinity]))));
    const xb = Math.min(...W.filter(p => mid(p) >= cx).map(p => Math.min(...p.filter(q => Math.abs(q[1] - yb) < 6).map(q => q[0]).concat([Infinity]))));
    if (!isFinite(xa) || !isFinite(xb) || xb <= xa) return;
    const x0 = FP.px.toArt(xa), x1 = FP.px.toArt(xb), y = FP.px.toArt(yb) - cam - 3;
    FP.px.rect(g, x0, y, x1 - x0, 1, M.edge); FP.px.rect(g, x0, y + 3, x1 - x0, 1, M.edge);
    for (let x = x0 + 1; x < x1; x += 3) FP.px.rect(g, x, y + 1, 1, 2, T.grille);
  }

  let cache = null, cachedFor = null;
  function draw(g, state) {
    const bl = state.world.bossLevel;
    if (!bl || bl.head.solid.off) return;   // boss transpercé : sa bouche tombe avec ses parois
    if (cachedFor !== bl) { cache = lips(bl); cachedFor = bl; }
    const id = FP.config.milieux[state.run.milieu].id, M = FP.palette.boss.milieux[id], T = FP.palette.boss.intake, K = FP.config.boss.intake;
    const cam = FP.px.toArt(state.camera.y), H = Math.ceil(state.world.viewH / FP.px.SCALE);
    const seen = (pts) => Math.max(...pts.map(p => p[1])) >= 0 && Math.min(...pts.map(p => p[1])) <= H;
    for (const w of bl.walls) {
      if (!w.intake || w.off) continue;
      const pts = w.collision.map(([x, y]) => [FP.px.toArt(w.x + x), FP.px.toArt(w.y + y) - cam]);
      if (seen(pts)) plates(g, pts, M, K);
    }
    for (const l of cache) if (!bl.walls[l.wall].off) teeth(g, l, cam, M, T, K);
    grille(g, bl, cam, T, M);
  }

  FP.bossIntake = { lips, draw };
})();
