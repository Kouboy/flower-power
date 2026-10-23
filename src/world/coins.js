// world/coins.js — circuits de pièces (v4.5.0) : chapelets posés à la génération du niveau.
// Lit     : state.seed, state.level, state.world.{width,height,viewH,surfaceY,safeRadius,safePath,solids,toxics,leaks},
//           FP.config.coins, FP.createRng, FP.level.pathXAt, FP.collision.{distanceTo,grazeBand}.
// Écrit   : state.world.coins ({ x, y, chain, rank, taken }) et state.world.chains ({ kind, anchor, total, got, missed, done }).
// Expose  : FP.coins.place(state), FP.coins.slices(world), FP.coins.shape(name, n, spacing, rng) (purs, testés).
// Tirage propre (graine ^ salt ^ niveau) : state.rng n'est jamais consommé, les niveaux restent ceux d'avant.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SHAPES = ['line', 'arc', 'zigzag'];

  // Tranches d'une hauteur d'écran, de la surface (marge comprise) jusqu'au-dessus de la graine.
  function slices(world) {
    const m = FP.config.coins.sliceMargin, top = world.surfaceY + m, bottom = world.height - m, out = [];
    for (let y = top; y < bottom; y += world.viewH) out.push({ top: y, bottom: Math.min(bottom, y + world.viewH) });
    return out;
  }

  // Motif relatif : n points espacés de `spacing`, du premier (en bas, rang 0) au dernier (en haut, y décroissant).
  function shape(name, n, spacing, rng) {
    const amp = spacing * (.5 + rng.next() * .5), side = rng.next() < .5 ? -1 : 1, out = [];
    for (let i = 0; i < n; i++) {
      const k = n > 1 ? i / (n - 1) : 0;
      const x = name === 'arc' ? side * amp * Math.sin(Math.PI * k) : (name === 'zigzag' ? side * amp * .5 * (i % 2 ? 1 : -1) : 0);
      out.push({ x, y: -i * spacing });
    }
    return out;
  }

  // Position dans une nappe : 0 au centre, 1 sur le bord de l'ellipse (repère tourné de la nappe).
  function ellipseK(t, x, y) {
    const dx = x - t.x, dy = y - t.y, ca = Math.cos(-t.a), sa = Math.sin(-t.a);
    return Math.hypot((dx * ca - dy * sa) / t.rx, (dx * sa + dy * ca) / t.ry);
  }

  // Une pièce est posable : dans le monde (marge), sous la surface, hors de tout obstacle, au plus au premier tiers d'une nappe.
  function fits(world, x, y) {
    const k = FP.config.coins;
    if (x < k.radius + k.edge || x > world.width - k.radius - k.edge || y <= world.surfaceY + k.sliceMargin || y >= world.height) return false;
    return world.solids.every(o => FP.collision.distanceTo(o, x, y) >= k.radius + 2) &&
      world.toxics.every(t => ellipseK(t, x, y) >= 1 - k.toxicBite);
  }

  // Plus longue suite de points consécutifs posables ; trop courte → rien (le chapelet est abandonné).
  function longestRun(world, pts) {
    let best = [], cur = [];
    for (const p of pts) { if (fits(world, p.x, p.y)) { cur.push(p); if (cur.length > best.length) best = cur; } else cur = []; }
    return best.length >= FP.config.coins.minChain ? best : [];
  }

  // Chapelet facile : le motif suit le chemin sûr ; chaque pièce s'écarte du chemin d'au plus sway × safeRadius,
  // et deux pièces voisines sont à `spacing` l'une de l'autre (on remonte le chemin pas à pas).
  function easyPoints(world, rng, slice, offset = 0) {
    const k = FP.config.coins, n = k.easy.min + Math.floor(rng.next() * (k.easy.max - k.easy.min + 1));
    const motif = shape(SHAPES[Math.floor(rng.next() * SHAPES.length)], n, k.spacing, rng);
    const lim = world.safeRadius * k.sway, lat = (i) => offset + Math.max(-lim, Math.min(lim, motif[i].x));
    let y = slice.bottom - rng.next() * Math.max(0, slice.bottom - slice.top - n * k.spacing);
    const pts = [{ x: FP.level.pathXAt(world, y) + lat(0), y }];
    for (let i = 1; i < n; i++) {
      const prev = pts[i - 1];
      let ny = prev.y, x = prev.x;
      while (Math.hypot(x - prev.x, ny - prev.y) < k.spacing && ny > slice.top - k.spacing * n) { ny -= .25; x = FP.level.pathXAt(world, ny) + lat(i); }
      pts.push({ x, y: ny });
    }
    return pts;
  }

  // Nombre de pièces d'un appât.
  const baitCount = (rng) => { const b = FP.config.coins.bait; return b.min + Math.floor(rng.next() * (b.max - b.min + 1)); };

  // Ligne de n pièces centrée en (cx, cy), le long de la direction (ux, uy), rang 0 en bas.
  function lineThrough(cx, cy, ux, uy, n) {
    const sp = FP.config.coins.spacing, pts = [];
    for (let i = 0; i < n; i++) { const d = (i - (n - 1) / 2) * sp; pts.push({ x: cx + ux * d, y: cy + uy * d }); }
    return pts.sort((a, b) => b.y - a.y);
  }

  // Longer : arc à mi-bande de frôlement d'un obstacle, du côté du chemin sûr, parcouru de bas en haut.
  function grazeArc(world, o, n) {
    const band = FP.collision.grazeBand(o), want = band * .5, sp = FP.config.coins.spacing;
    const side = FP.level.pathXAt(world, o.y) < o.x ? -1 : 1, curve = [];
    for (let a = Math.PI * .5; a >= -Math.PI * .5; a -= .06) {   // du bas (a = π/2) au haut (a = −π/2), côté choisi
      const ux = side * Math.cos(a), uy = Math.sin(a);
      let lo = 0, hi = o.broadR + band + 4;
      for (let it = 0; it < 11; it++) { const r = (lo + hi) / 2; if (FP.collision.distanceTo(o, o.x + ux * r, o.y + uy * r) < want) lo = r; else hi = r; }
      curve.push({ x: o.x + ux * hi, y: o.y + uy * hi });
    }
    const pts = [curve[0]];   // courbe parcourue par pas d'un demi-pixel : les coins vifs ne font pas sauter l'espacement
    for (let i = 1; i < curve.length; i++) {
      const p0 = curve[i - 1], p1 = curve[i], steps = Math.max(1, Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) * 2));
      for (let j = 1; j <= steps; j++) {
        const q = { x: p0.x + (p1.x - p0.x) * j / steps, y: p0.y + (p1.y - p0.y) * j / steps }, last = pts[pts.length - 1];
        if (Math.hypot(q.x - last.x, q.y - last.y) >= sp) pts.push(q);
      }
    }
    const skip = Math.max(0, Math.floor((pts.length - n) / 2));
    return pts.slice(skip, skip + n);
  }

  // Passer entre : deux obstacles côte à côte dont l'écart laisse passer la pousse ; ligne verticale au milieu.
  function gapLine(world, a, b, n) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, need = world.safeRadius;
    if (FP.collision.distanceTo(a, mx, my) < need || FP.collision.distanceTo(b, mx, my) < need) return [];
    return lineThrough(mx, my, 0, -1, n);
  }

  // Mordre : ligne verticale qui frôle la nappe en y entrant d'au plus toxicBite de son rayon.
  function toxicBite(world, t, side, n) {
    const k = FP.config.coins, span = (n - 1) * k.spacing / 2;
    for (let d = 0; d <= t.rx + t.ry; d += 1) {
      const x = t.x + side * d;
      let minK = Infinity;
      for (let y = t.y - span; y <= t.y + span; y += 2) minK = Math.min(minK, ellipseK(t, x, y));
      if (minK >= 1 - k.toxicBite + .02) return minK < 1 ? lineThrough(x, t.y, 0, -1, n) : [];
    }
    return [];
  }

  // Croiser : ligne en travers du trajet d'une limace, par son centre.
  const leakCross = (l, n) => lineThrough(l.x, l.y, -Math.sin(l.angle), Math.cos(l.angle), n);

  // Appât de la tranche : un ancrage tiré parmi les dangers présents ; aucun → chapelet décalé du chemin.
  function baitChain(world, rng, slice) {
    const inSlice = (o) => o.y >= slice.top && o.y < slice.bottom, n = baitCount(rng), options = [];
    const solids = world.solids.filter(inSlice);
    for (const o of solids) if (FP.collision.grazeBand(o) > 0) options.push(['graze', () => grazeArc(world, o, n)]);
    for (const a of solids) for (const b of solids) if (a !== b && a.x < b.x && Math.abs(a.y - b.y) < 60) options.push(['gap', () => gapLine(world, a, b, n)]);
    for (const t of world.toxics.filter(inSlice)) options.push(['toxic', () => toxicBite(world, t, FP.level.pathXAt(world, t.y) < t.x ? -1 : 1, n)]);
    for (const l of world.leaks.filter(inSlice)) options.push(['leak', () => leakCross(l, n)]);
    while (options.length) {
      const [anchor, build] = options.splice(Math.floor(rng.next() * options.length), 1)[0];
      const pts = longestRun(world, build());
      if (pts.length) return { anchor, pts };
    }
    const side = rng.next() < .5 ? -1 : 1;
    return { anchor: 'path', pts: longestRun(world, easyPoints(world, rng, slice, side * world.safeRadius * 1.5)) };
  }

  function addChain(world, kind, anchor, pts) {
    if (!pts.length) return;
    const chain = world.chains.length;
    world.chains.push({ kind, anchor, total: pts.length, got: 0, missed: false, done: false });
    pts.forEach((p, rank) => world.coins.push({ x: p.x, y: p.y, chain, rank, taken: false }));
  }

  function place(state) {
    const world = state.world, k = FP.config.coins;
    const rng = FP.createRng((state.seed ^ k.salt ^ Math.imul(state.level, 2654435761)) >>> 0);
    world.coins = []; world.chains = [];
    for (const slice of slices(world)) {
      addChain(world, 'easy', 'path', longestRun(world, easyPoints(world, rng, slice)));
      const bait = baitChain(world, rng, slice);
      addChain(world, 'bait', bait.anchor, bait.pts);
    }
  }

  FP.coins = { place, slices, shape };
})();
