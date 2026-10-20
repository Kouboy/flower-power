const gen = (seed, W = 440, H = 783, level = 0) => {
  const s = FP.state.createRun(seed, { W, H }); s.level = level; FP.level.generate(s); return s;
};
FP.test('level: déterministe', () => {
  const pick = s => JSON.stringify(s.world.solids.map(o => [o.kind, o.x, o.y, o.a, o.flip]));
  FP.assertEqual(pick(gen(1234)), pick(gen(1234)));
  FP.assert(pick(gen(1234)) !== pick(gen(1235)));
});
FP.test('level: aucun chevauchement visuel', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const so = gen(seed).world.solids;
    for (let i = 0; i < so.length; i++) for (let j = i + 1; j < so.length; j++)
      FP.assert(!FP.geom.convexPolysOverlap(so[i].footprint, so[j].footprint), `seed ${seed}: ${so[i].kind}/${so[j].kind}`);
  }
});
FP.test('level: chemin sûr dégagé', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const s = gen(seed), w = s.world;
    for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
      FP.assert(FP.level.distToSafePath(w, p.x, p.y) >= w.safeRadius, `seed ${seed}: ${o.kind}`);
  }
});
FP.test('level: obstacles dans le cadre', () => {
  const s = gen(1234), w = s.world;
  for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
    FP.assert(p.x >= 18 && p.x <= w.width - 18 && p.y >= w.surfaceY + 34 && p.y <= w.height - 100, o.kind);
});
FP.test('level: densité plausible, familles PNG uniquement', () => {
  const s = gen(1234);
  FP.assert(s.world.solids.length >= 8 && s.world.solids.length <= 14, String(s.world.solids.length));
  for (const o of s.world.solids) FP.assert(FP.catalog.has(o.kind) && o.kind !== 'trex_signature', o.kind);
});
FP.test('level: chemin sûr du fond vers la surface', () => {
  const w = gen(1234).world, p = w.safePath;
  FP.assertEqual(p[0].y, w.height - 54);
  FP.assertEqual(p[p.length - 1].y, w.surfaceY + 36);
  for (const n of p) FP.assert(n.x >= 52 && n.x <= w.width - 52, String(n.x));
});
FP.test('level: T-Rex signature une seule fois par run', () => {
  const s = FP.state.createRun(7, { W: 440, H: 783 });
  s.signature = { armed: true, spawned: false, targetLevel: 1 };
  s.level = 0; FP.level.generate(s);
  FP.assert(!s.world.solids.some(o => o.kind === 'trex_signature'), 'pas avant targetLevel');
  s.level = 1; FP.level.generate(s);
  FP.assertEqual(s.world.solids.filter(o => o.kind === 'trex_signature').length, 1);
  FP.assertEqual(s.signature.spawned, true);
  s.level = 2; FP.level.generate(s);
  FP.assert(!s.world.solids.some(o => o.kind === 'trex_signature'), 'jamais deux fois');
});
FP.test('level: fenêtre étroite ou très haute', () => {
  for (const [W, H] of [[300, 520], [300, 1200], [700, 900]]) {
    const s = gen(42, W, H);
    FP.assert(s.world.solids.length >= 1, `${W}x${H}`);
  }
});
FP.test('level: startRun arme le T-Rex de façon reproductible', () => {
  const a = FP.state.createRun(5, { W: 440, H: 783 }), b = FP.state.createRun(5, { W: 440, H: 783 });
  FP.level.startRun(a); FP.level.startRun(b);
  FP.assertEqual(JSON.stringify(a.signature), JSON.stringify(b.signature));
  FP.assert(a.signature.targetLevel >= 1 && a.signature.targetLevel <= 4);
});
