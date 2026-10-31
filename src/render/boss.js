// render/boss.js — le boss, provisoire (v5.1.0 : formes simples dessinées par le code, sans image) : parois, cibles, tête, plaques du blindage.
// Lit     : state.{time,camera.y,run.milieu}, state.world.{viewH,bossLevel.{walls,targets,head,plates}} (x, y, collision, off de chaque solide),
//           FP.config.milieux, FP.palette.boss, FP.px.
// Écrit   : rien dans l'état (la toile reçue uniquement).
// Expose  : FP.bossRender.draw(g, state) — repère d'art, la caméra est appliquée ici ; rien hors niveau de boss.
// Cible détruite (off) : épave sombre qui fume ; plaque tombée (off) : rien ; tête à nu (plus aucune plaque) : lueur qui pulse.
// Ne touche pas au DOM au chargement : chargeable dans dev/check.html.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Solide → polygone en pixels d'art (caméra appliquée).
  const artPoly = (o, cam) => o.collision.map(([x, y]) => [FP.px.toArt(o.x + x), FP.px.toArt(o.y + y) - cam]);

  // Polygone quelconque (concave compris), rempli rangée par rangée (règle pair-impair) ; inset rogne chaque bout de rangée
  // et les rangées du haut et du bas (contour d'autant de pixels laissé à la couleur d'en dessous).
  function fillPoly(g, pts, color, inset = 0) {
    let lo = Infinity, hi = -Infinity;
    for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
    for (let y = Math.ceil(lo) + inset; y <= Math.floor(hi) - inset; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        if ((p[1] <= y + .5) === (q[1] <= y + .5)) continue;
        xs.push(p[0] + (y + .5 - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const a = Math.round(xs[k]) + inset, b = Math.round(xs[k + 1]) - inset;
        if (b > a) FP.px.rect(g, a, y, b - a, 1, color);
      }
    }
  }

  // Boîte d'un polygone en pixels d'art.
  function box(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }

  // Paroi : contour, reflet, liseré d'ombre à 3 pixels du bord, corps, rivets réguliers le long du haut.
  function wall(g, pts, M) {
    fillPoly(g, pts, M.edge);
    fillPoly(g, pts, M.light, 1);
    fillPoly(g, pts, M.dark, 2);
    fillPoly(g, pts, M.body, 3);
    const b = box(pts);
    for (let x = Math.ceil(b.x0) + 4; x < b.x1 - 4; x += 9) FP.px.rect(g, x, Math.ceil(b.y0) + 2, 1, 1, M.rivet);
  }

  // Cible intacte : bloc incandescent qui pulse ; détruite : épave sombre d'où monte de la fumée.
  function target(g, pts, off, t, M) {
    const P = FP.palette.boss, b = box(pts), cx = Math.round((b.x0 + b.x1) / 2);
    fillPoly(g, pts, M.edge);
    if (off) {
      fillPoly(g, pts, P.hole, 1);
      for (let j = 0; j < 3; j++) {
        const rise = (t * 9 + j * 6) % 18;
        FP.px.disc(g, cx + Math.round(Math.sin(t * 2 + j * 2.1) * 2), Math.round(b.y0) - rise, rise < 9 ? 1 : 2, P.smoke[rise < 9 ? 0 : 1]);
      }
      return;
    }
    fillPoly(g, pts, P.weak[1], 1);
    fillPoly(g, pts, P.weak[0], 2 + Math.round((Math.sin(t * 6) + 1) / 2));
  }

  // Tête : bloc sombre tant qu'elle est blindée ; à nu, une lueur pulse au centre.
  function head(g, pts, open, t, M) {
    const P = FP.palette.boss, b = box(pts), cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2);
    fillPoly(g, pts, M.edge);
    fillPoly(g, pts, open ? P.glow[0] : M.dark, 1);
    if (!open) return;
    const r = 2 + Math.round((Math.sin(t * 5) + 1) * 1.5);
    FP.px.disc(g, cx, cy, r + 1, P.glow[1]); FP.px.disc(g, cx, cy, r, P.weak[1]); FP.px.disc(g, cx, cy, Math.max(1, r - 2), P.weak[0]);
  }

  // Plaque du blindage : tôle claire au contour sombre, deux rivets.
  function plate(g, pts) {
    const P = FP.palette.boss, b = box(pts);
    fillPoly(g, pts, P.plate[1]);
    fillPoly(g, pts, P.plate[0], 1);
    if (b.x1 - b.x0 > 6 && b.y1 - b.y0 > 4) for (const x of [Math.ceil(b.x0) + 2, Math.floor(b.x1) - 3]) FP.px.rect(g, x, Math.ceil(b.y0) + 2, 1, 1, P.plate[1]);
  }

  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    const cam = FP.px.toArt(state.camera.y), top = state.camera.y, H = w.viewH, t = state.time;
    const M = FP.palette.boss.milieux[FP.config.milieux[state.run.milieu].id];
    const seen = (o) => o.y + o.broadR >= top && o.y - o.broadR <= top + H;
    for (const o of bl.walls) if (seen(o)) wall(g, artPoly(o, cam), M);
    for (const tg of bl.targets) if (seen(tg.solid)) target(g, artPoly(tg.solid, cam), tg.solid.off, t, M);
    const open = bl.plates.every(p => p.solid.off);
    if (seen(bl.head.solid)) head(g, artPoly(bl.head.solid, cam), open, t, M);
    for (const p of bl.plates) if (!p.solid.off && seen(p.solid)) plate(g, artPoly(p.solid, cam));
  }

  FP.bossRender = { draw };
})();
