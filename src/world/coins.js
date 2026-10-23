// world/coins.js — circuits de pièces (v4.5.0) : chapelets posés à la génération du niveau.
// Lit     : state.seed, state.level, state.world.{width,height,viewH,surfaceY,safeRadius,safePath,solids},
//           FP.config.coins, FP.createRng, FP.level.pathXAt, FP.collision.distanceTo.
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

  // Une pièce est posable : dans le monde (marge), sous la surface, hors de tout obstacle.
  function fits(world, x, y) {
    const k = FP.config.coins;
    if (x < k.radius + k.edge || x > world.width - k.radius - k.edge || y <= world.surfaceY + k.sliceMargin || y >= world.height) return false;
    return world.solids.every(o => FP.collision.distanceTo(o, x, y) >= k.radius + 2);
  }

  // Plus longue suite de points consécutifs posables ; trop courte → rien (le chapelet est abandonné).
  function longestRun(world, pts) {
    let best = [], cur = [];
    for (const p of pts) { if (fits(world, p.x, p.y)) { cur.push(p); if (cur.length > best.length) best = cur; } else cur = []; }
    return best.length >= FP.config.coins.minChain ? best : [];
  }

  // Chapelet facile : le motif suit le chemin sûr ; chaque pièce s'écarte du chemin d'au plus sway × safeRadius,
  // et deux pièces voisines sont à `spacing` l'une de l'autre (on remonte le chemin pas à pas).
  function easyPoints(world, rng, slice) {
    const k = FP.config.coins, n = k.easy.min + Math.floor(rng.next() * (k.easy.max - k.easy.min + 1));
    const motif = shape(SHAPES[Math.floor(rng.next() * SHAPES.length)], n, k.spacing, rng);
    const lim = world.safeRadius * k.sway, lat = (i) => Math.max(-lim, Math.min(lim, motif[i].x));
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
    for (const slice of slices(world)) addChain(world, 'easy', 'path', longestRun(world, easyPoints(world, rng, slice)));
  }

  FP.coins = { place, slices, shape };
})();
