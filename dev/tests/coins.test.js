// Chapelets de pièces (world/coins.js) : posés à la génération du niveau, avec leur propre tirage.
const coinRun = (seed, level = 0) => { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; FP.level.generate(s); return s; };
const chainCoins = (w, i) => w.coins.filter(c => c.chain === i).sort((a, b) => a.rank - b.rank);
FP.test('coins: chaque tranche a un chapelet facile', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    FP.assert(w.chains.filter(c => c.kind === 'easy').length >= FP.coins.slices(w).length, 'graine ' + seed);
  }
});
FP.test('coins: les faciles suivent le chemin sûr', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    w.chains.forEach((ch, i) => { if (ch.kind === 'easy') for (const c of chainCoins(w, i)) FP.assert(FP.level.distToSafePath(w, c.x, c.y) <= w.safeRadius + .01, 'graine ' + seed); });
  }
});
FP.test('coins: aucune pièce dans un obstacle ni hors du monde', () => {
  const k = FP.config.coins;
  for (const level of [0, 4, 8]) for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed, level).world;
    for (const c of w.coins) {
      FP.assert(c.x >= k.radius + 4 && c.x <= w.width - k.radius - 4, 'x ' + c.x);
      FP.assert(c.y > w.surfaceY + k.sliceMargin, 'y ' + c.y);
      for (const o of w.solids) FP.assert(FP.collision.distanceTo(o, c.x, c.y) >= k.radius + 2, 'dans ' + o.kind);
    }
  }
});
FP.test('coins: chapelets de 4 pièces au moins, espacées de 18', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    w.chains.forEach((ch, i) => {
      const cs = chainCoins(w, i);
      FP.assert(ch.total === cs.length && cs.length >= FP.config.coins.minChain, 'chapelet ' + cs.length);
      for (let j = 1; j < cs.length; j++) { const d = Math.hypot(cs[j].x - cs[j - 1].x, cs[j].y - cs[j - 1].y); FP.assert(d >= 17 && d <= 19 || cs[j].rank - cs[j - 1].rank > 1, 'écart ' + d); }
    });
  }
});
FP.test('coins: même graine, mêmes pièces', () => FP.assertEqual(JSON.stringify(coinRun(7).world.coins), JSON.stringify(coinRun(7).world.coins)));
FP.test('coins: state.rng intact', () => {
  const a = coinRun(5), keep = FP.coins.place;
  FP.coins.place = () => {};
  try { const b = coinRun(5); FP.assertEqual(a.rng.next(), b.rng.next()); } finally { FP.coins.place = keep; }
});
// Appâts : près d'un danger de la tranche (longer, passer entre, mordre une nappe, croiser une limace).
const ellipseK = (t, x, y) => { const dx = x - t.x, dy = y - t.y, ca = Math.cos(-t.a), sa = Math.sin(-t.a); const u = dx * ca - dy * sa, v = dx * sa + dy * ca; return Math.hypot(u / t.rx, v / t.ry); };
FP.test('coins: chaque tranche a un appât', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    FP.assert(w.chains.filter(c => c.kind === 'bait').length >= FP.coins.slices(w).length, 'graine ' + seed);
  }
});
FP.test('coins: les appâts graze restent dans la bande de frôlement', () => {
  let seen = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const w = coinRun(seed, 4).world;
    w.chains.forEach((ch, i) => { if (ch.anchor === 'graze') for (const c of chainCoins(w, i)) { seen++; FP.assert(w.solids.some(o => { const d = FP.collision.distanceTo(o, c.x, c.y); return d > 0 && d <= FP.collision.grazeBand(o); }), 'graine ' + seed); } });
  }
  FP.assert(seen > 0, 'aucun appât graze');
});
FP.test('coins: un appât toxic mord au plus un tiers de la nappe', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const w = coinRun(seed, 4).world;
    for (const c of w.coins) for (const t of w.toxics) FP.assert(ellipseK(t, c.x, c.y) >= 1 - FP.config.coins.toxicBite - .01, 'graine ' + seed + ' : ' + ellipseK(t, c.x, c.y).toFixed(2));
  }
});
FP.test('coins: au moins trois sortes d’appâts sur 30 graines', () => {
  const kinds = new Set();
  for (let seed = 1; seed <= 30; seed++) for (const ch of coinRun(seed, 4).world.chains) if (ch.kind === 'bait') kinds.add(ch.anchor);
  FP.assert(kinds.size >= 3, [...kinds].join());
});
