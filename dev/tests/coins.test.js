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
