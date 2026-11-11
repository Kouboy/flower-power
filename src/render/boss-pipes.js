// render/boss-pipes.js — les tuyaux de la machine (v5.7.0, boss cohérent) : de chaque pompe (cible) jusqu'au cœur (tête), plus une liaison,
// tracés dans les plans (assets/boss/plans.js, bossLevel.pipes). Fonte rouillée dessinée par le code (corps, reflet, ombre, colliers aux
// coudes, rouille), par-dessus les murs mais jamais sur la pompe ni sur la tête ; un flux vert toxique y circule de la pompe vers le cœur.
// Pompe cassée (cible off, y compris dès la génération quand elle l'a été à une tentative précédente) : le tuyau est rompu à la sortie de
// la pompe, son flux s'arrête et il fuit (gouttes qui tombent).
// Lit     : state.{time, camera.y}, state.world.{viewH, bossLevel.{pipes, targets, head}}, FP.config.boss.pipes (width, flowSpeed, pulseGap,
//           leakRate), FP.palette.boss.{pipe, flow}, FP.px, FP.geom.sdPoly.
// Écrit   : rien dans l'état (la toile reçue ; les points de chaque tuyau, en cache par niveau).
// Expose  : FP.bossPipes.pulses(pipe, t, alive) → [{ x, y }] (pur, pixels du monde : pulsations à l'instant t, aucune si !alive) ;
//           FP.bossPipes.distTo(pipe, q) → distance du point q au tuyau (pur) ; FP.bossPipes.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const GAP = 6, DROPS = 4, FALL = 34;   // rupture (px d'art sans tuyau à la sortie de la pompe), gouttes en vol, chute d'une goutte (px d'art)

  const segs = (p) => { const out = []; let s = 0; for (let i = 1; i < p.pts.length; i++) { const a = p.pts[i - 1], b = p.pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push({ a, b, L, s }); s += L; } return out; };
  const length = (p) => segs(p).reduce((n, q) => n + q.L, 0);
  function pointAt(p, s) {
    for (const q of segs(p)) if (s <= q.s + q.L || q === segs(p)[segs(p).length - 1]) { const t = q.L ? Math.min(1, Math.max(0, (s - q.s) / q.L)) : 0; return { x: q.a[0] + (q.b[0] - q.a[0]) * t, y: q.a[1] + (q.b[1] - q.a[1]) * t }; }
    return { x: p.pts[0][0], y: p.pts[0][1] };
  }
  function distTo(p, q) {
    let d = Infinity;
    for (const { a, b, L } of segs(p)) { const t = L ? Math.max(0, Math.min(1, ((q.x - a[0]) * (b[0] - a[0]) + (q.y - a[1]) * (b[1] - a[1])) / (L * L))) : 0; d = Math.min(d, Math.hypot(a[0] + t * (b[0] - a[0]) - q.x, a[1] + t * (b[1] - a[1]) - q.y)); }
    return d;
  }
  function pulses(p, t, alive) {
    if (!alive) return [];
    const C = FP.config.boss.pipes, L = length(p), out = [];
    for (let s = ((t * C.flowSpeed) % C.pulseGap + C.pulseGap) % C.pulseGap; s < L; s += C.pulseGap) out.push(pointAt(p, s));
    return out;
  }

  // Points de chaque tuyau, un par pixel d'art, hors de sa pompe et de la tête : { x, y (art, monde), nx, ny (normale), s (abscisse, px monde),
  // corner (coude) } ; plus la sortie de la pompe (premier point dehors).
  const polyOf = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);
  let cache = null, cachedFor = null;
  function layout(bl) {
    if (cachedFor === bl) return cache;
    const head = polyOf(bl.head.solid), step = FP.px.SCALE;
    cache = bl.pipes.map(p => {
      const own = p.target >= 0 ? polyOf(bl.targets[p.target].solid) : null, pts = [];
      for (const [k, q] of segs(p).entries()) {
        const nx = -(q.b[1] - q.a[1]) / (q.L || 1), ny = (q.b[0] - q.a[0]) / (q.L || 1);
        for (let d = 0; d < q.L; d += step) {
          const x = q.a[0] + (q.b[0] - q.a[0]) * d / q.L, y = q.a[1] + (q.b[1] - q.a[1]) * d / q.L;
          if ((own && FP.geom.sdPoly(x, y, own) < 0) || FP.geom.sdPoly(x, y, head) < 0) continue;
          pts.push({ x: FP.px.toArt(x), y: FP.px.toArt(y), nx, ny, s: q.s + d, corner: k > 0 && d === 0 });
        }
      }
      return { pipe: p, pts, exit: pts.find(q => q.s > 0) || null };
    });
    cachedFor = bl;
    return cache;
  }

  // Tranche du tuyau au point q : reflet d'un côté, ombre de l'autre, corps entre les deux, un peu de rouille.
  function slice(g, q, w, P, i) {
    const h = Math.floor(w / 2);
    for (let k = -h; k < w - h; k++) {
      const c = k === -h ? P.light : k === w - h - 1 ? P.dark : ((i * 7 + k * 13) % 23 === 0 ? P.rust : P.body);
      FP.px.rect(g, Math.round(q.x + q.nx * k), Math.round(q.y + q.ny * k), 1, 1, c);
    }
  }

  function draw(g, state) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    const C = FP.config.boss.pipes, P = FP.palette.boss.pipe, F = FP.palette.boss.flow, t = state.time;
    const cam = FP.px.toArt(state.camera.y), H = Math.ceil(state.world.viewH / FP.px.SCALE), w = C.width;
    const seen = (y) => y - cam >= -w && y - cam <= H + w;
    for (const L of layout(bl)) {
      const alive = L.pipe.target < 0 || !bl.targets[L.pipe.target].solid.off, gap = alive ? 0 : GAP * FP.px.SCALE;
      const from = L.exit ? L.exit.s : 0;
      for (const [i, q] of L.pts.entries()) {
        if (q.s < from + gap || !seen(q.y)) continue;
        slice(g, { ...q, y: q.y - cam }, w, P, i);
        if (q.corner) { FP.px.rect(g, q.x - Math.floor(w / 2) - 1, q.y - cam - Math.floor(w / 2) - 1, w + 2, w + 2, P.joint); FP.px.rect(g, q.x, q.y - cam, 1, 1, P.light); }
      }
      if (alive) {
        for (const p of pulses(L.pipe, t, true)) {
          const x = FP.px.toArt(p.x), y = FP.px.toArt(p.y) - cam;
          if (y < -2 || y > H + 2) continue;
          FP.px.rect(g, x - 1, y - 1, 2, 2, F[0]); FP.px.rect(g, x, y, 1, 1, F[1]);
        }
      } else if (L.exit && seen(L.exit.y)) {   // fuite : des gouttes tombent de la rupture, à leakRate par seconde
        const e = L.exit;
        for (let k = 0; k < DROPS; k++) {
          const ph = ((t * C.leakRate / DROPS + k / DROPS) % 1 + 1) % 1, x = e.x + ((k * 5) % 3) - 1, y = e.y - cam + Math.round(ph * ph * FALL);
          FP.px.rect(g, x, y, 1, 2, F[k % 2]);
        }
        FP.px.rect(g, e.x - 1, e.y - cam - 1, 3, 3, F[1]);   // le bout rompu qui suinte
      }
    }
  }

  FP.bossPipes = { pulses, distTo, draw };
})();
