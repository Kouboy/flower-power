// Chapelets de pièces (world/coins.js) : posés à la génération du niveau, avec leur propre tirage.
const coinRun = (seed, level = 0) => { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; s.difficulty = level; FP.level.generate(s); return s; };
const chainCoins = (w, i) => w.coins.filter(c => c.chain === i).sort((a, b) => a.rank - b.rank);
FP.test('coins: chaque tranche a un chapelet facile', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    FP.assert(w.chains.filter(c => c.kind === 'easy').length >= FP.coins.slices(w).length, 'graine ' + seed);
  }
});
FP.test('coins: les faciles ondulent autour du chemin sûr', () => {
  const amp = FP.config.coins.wave[1];
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    w.chains.forEach((ch, i) => { if (ch.kind === 'easy') for (const c of chainCoins(w, i)) FP.assert(Math.abs(c.x - FP.level.pathXAt(w, c.y)) <= amp + .01, 'graine ' + seed); });
  }
});
// Traînées longues et sinueuses (v4.6.1) : la plupart font 10 pièces ou plus et passent des deux côtés du chemin.
FP.test('coins: des traînées faciles longues', () => {
  let n = 0, long = 0;
  for (let seed = 1; seed <= 30; seed++) for (const ch of coinRun(seed).world.chains) if (ch.kind === 'easy') { n++; if (ch.total >= 10) long++; }
  FP.assert(long / n >= .6, long + ' / ' + n);
});
FP.test('coins: les traînées faciles ondulent des deux côtés du chemin', () => {
  let n = 0, both = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const w = coinRun(seed).world;
    w.chains.forEach((ch, i) => { if (ch.kind !== 'easy' || ch.total < 8) return; n++;
      const off = chainCoins(w, i).map(c => c.x - FP.level.pathXAt(w, c.y));
      if (off.some(d => d > 8) && off.some(d => d < -8)) both++; });
  }
  FP.assert(n > 0 && both / n >= .7, both + ' / ' + n);
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
FP.test('coins: chapelets de 4 pièces au moins, espacées comme réglé', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = coinRun(seed).world;
    w.chains.forEach((ch, i) => {
      const cs = chainCoins(w, i);
      FP.assert(ch.total === cs.length && cs.length >= FP.config.coins.minChain, 'chapelet ' + cs.length);
      for (let j = 1; j < cs.length; j++) { const d = Math.hypot(cs[j].x - cs[j - 1].x, cs[j].y - cs[j - 1].y); const sp = FP.config.coins.spacing; FP.assert(d >= sp - 1 && d <= sp + 1 || cs[j].rank - cs[j - 1].rank > 1, 'écart ' + d); }
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
FP.test('coins: deux chapelets ne se chevauchent jamais', () => {
  const k = FP.config.coins;
  for (const [W, H] of [[440, 783], [412, 915]]) for (const level of [0, 4, 8]) for (let seed = 1; seed <= 15; seed++) {
    const s = FP.state.createRun(seed, { W, H }); s.level = level; s.difficulty = level; FP.level.generate(s);
    const cs = s.world.coins;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++)
      if (cs[i].chain !== cs[j].chain) FP.assert(Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y) > 2 * k.radius + 1, W + ' n' + level + ' g' + seed);
  }
});
// Répartition (v4.6.2) : rien juste au-dessus de la graine, densité homogène du haut au bas du niveau.
const startLine = (w) => w.height - FP.config.plant.seedOffset - FP.config.coins.startClear;
FP.test('coins: aucun jeton dans la zone de départ', () => {
  for (let seed = 1; seed <= 20; seed++) { const w = coinRun(seed).world; FP.assert(w.coins.every(c => c.y < startLine(w)), 'graine ' + seed); }
});
FP.test('coins: densité homogène du haut au bas du niveau', () => {
  for (const [W, H] of [[440, 783], [412, 915]]) {
    const thirds = [0, 0, 0];
    for (let seed = 1; seed <= 40; seed++) {
      // Les quatre milieux, tour à tour (v4.9.0).
      const s = FP.state.createRun(seed, { W, H }); s.run.milieu = seed % 4; FP.level.generate(s); const w = s.world, top = w.surfaceY + FP.config.coins.sliceMargin, span = startLine(w) - top;
      for (const c of w.coins) thirds[Math.min(2, Math.max(0, Math.floor((c.y - top) / span * 3)))]++;
    }
    FP.assert(Math.min(...thirds) >= .6 * Math.max(...thirds), W + '×' + H + ' : ' + thirds.join(' / '));
  }
});
