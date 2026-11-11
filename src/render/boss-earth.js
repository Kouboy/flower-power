// render/boss-earth.js — la machine surgit de la terre (v5.7.0, boss cohérent) : les bords extérieurs des murs (ceux qui ne donnent ni sur
// un couloir ni dans une salle) sont rongés de terre — frange irrégulière, mottes, racines — aux couleurs du sous-sol du milieu ; une poche de
// terre meuble couvre le dessus de la tête, là où la fleur éclot à la victoire. Purement visuel : aucun solide n'est touché.
// Lit     : state.{camera.y, run.milieu}, state.world.{viewH, bossLevel.{plan, walls, head, rooms}}, FP.config.{milieux, boss.earth (fringe,
//           clods, roots, pocket)}, FP.bossPlan.toWorld (trajets de référence, channelMin), FP.palette.milieux[id].strata, FP.px, FP.geom.sdPoly.
// Écrit   : rien dans l'état (la toile reçue ; les bords extérieurs, en cache par niveau).
// Expose  : FP.bossEarth.edges(bl, world) → [{ x0, y0, x1, y1, nx, ny (normale vers l'intérieur du mur) }] (pur, pixels du monde) ;
//           FP.bossEarth.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const PROBE = 4;   // px : un bord est extérieur si le point à PROBE px dehors n'est dans aucun solide

  const hash = (a, b) => { let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0; h ^= h >>> 15; return (Math.imul(h, 0x2c1b3c6d) >>> 0) / 4294967296; };
  const polyOf = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);
  const segDist = (x, y, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L)) : 0; return Math.hypot(a.x + t * dx - x, a.y + t * dy - y); };

  function edges(bl, world) {
    const placed = FP.bossPlan.toWorld(bl.plan, world), refs = Object.values(placed.paths), half = placed.channelMin / 2;
    const solids = [...bl.walls, bl.head.solid, ...bl.targets.map(t => t.solid)].map(polyOf);
    const near = (x, y) => { for (const r of refs) for (let i = 1; i < r.length; i++) if (segDist(x, y, r[i - 1], r[i]) < half) return true; return false; };
    const inRoom = (x, y) => bl.rooms.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1);
    const out = [];
    for (const w of bl.walls) {
      const P = polyOf(w);
      for (let i = 0; i < P.length; i++) {
        const [x0, y0] = P[i], [x1, y1] = P[(i + 1) % P.length], L = Math.hypot(x1 - x0, y1 - y0);
        if (L < 4) continue;
        let nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        if (FP.geom.sdPoly(mx + nx * PROBE, my + ny * PROBE, P) < 0) { nx = -nx; ny = -ny; }   // (nx, ny) vers le dehors du mur
        const ox = mx + nx * PROBE, oy = my + ny * PROBE;
        if (solids.some(s => FP.geom.sdPoly(ox, oy, s) < 0) || inRoom(ox, oy)) continue;
        let ok = true; for (let k = 0; k <= 4 && ok; k++) { const x = x0 + (x1 - x0) * k / 4, y = y0 + (y1 - y0) * k / 4; if (near(x, y) || inRoom(x + nx * PROBE, y + ny * PROBE)) ok = false; }
        if (ok) out.push({ x0, y0, x1, y1, nx: -nx, ny: -ny });
      }
    }
    return out;
  }

  let cache = null, cachedFor = null;
  function draw(g, state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return;
    if (cachedFor !== bl) { cache = edges(bl, w); cachedFor = bl; }
    const id = FP.config.milieux[state.run.milieu].id, S = FP.palette.milieux[id].strata, K = FP.config.boss.earth;
    const cam = FP.px.toArt(state.camera.y), H = Math.ceil(w.viewH / FP.px.SCALE), clay = S.clay, dark = S.humus[0];
    // Bords rongés : à chaque pixel du bord, une frange de terre de 1 à fringe px qui mord dans le mur ; des mottes ; quelques racines.
    for (const [n, e] of cache.entries()) {
      const ax = FP.px.toArt(e.x0), ay = FP.px.toArt(e.y0), bx = FP.px.toArt(e.x1), by = FP.px.toArt(e.y1), L = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
      if (Math.max(ay, by) + K.fringe < cam || Math.min(ay, by) - K.fringe > cam + H) continue;
      for (let s = 0; s <= L; s++) {
        const x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L - cam, r = hash(n * 977 + s, 3), deep = 1 + Math.floor(r * K.fringe);
        if (y < -K.fringe || y > H + K.fringe) continue;
        for (let k = 0; k < deep; k++) FP.px.rect(g, Math.round(x + e.nx * k), Math.round(y + e.ny * k), 1, 1, k === deep - 1 ? dark : clay[(s + k) % 4]);
        if (r < K.clods * .2) FP.px.rect(g, Math.round(x + e.nx * deep) - 1, Math.round(y + e.ny * deep) - 1, 2, 2, clay[3]);
      }
      for (let k = 0; k < K.roots; k++) {   // racine : un trait fin qui s'enfonce en biais dans le mur
        const s = Math.floor(hash(n, k + 7) * L), x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L - cam, len = 3 + Math.floor(hash(n, k + 11) * 4);
        FP.px.line(g, Math.round(x), Math.round(y), Math.round(x + (e.nx + e.ny * .6) * len), Math.round(y + (e.ny - e.nx * .6) * len), S.humus[3]);
      }
    }
    // Poche de terre au-dessus de la tête : une demi-ellipse de terre meuble posée sur le haut de la tête et les murs qui l'entourent.
    const h = bl.head.solid, top = h.y + Math.min(...h.collision.map(q => q[1])), cx = FP.px.toArt(h.x), cy = FP.px.toArt(top) - cam;
    const rx = Math.round(K.pocket / FP.px.SCALE), ry = Math.round(rx * .6);
    if (cy + 2 < 0 || cy - ry > H) return;
    for (let dy = -ry; dy <= 1; dy++) {
      const span = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      for (let dx = -span; dx <= span; dx++) {
        const r = hash(dx + 500, dy + 500);
        FP.px.rect(g, cx + dx, cy + dy, 1, 1, r < .15 ? dark : clay[Math.floor(r * 4)]);
      }
    }
  }

  FP.bossEarth = { edges, draw };
})();
