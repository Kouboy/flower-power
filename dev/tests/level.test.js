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
FP.test('level: obstacles identifiables (rognés de quelques px au plus)', () => {
  for (const seed of [1, 2, 3, 1234]) {
    const s = gen(seed), w = s.world;
    for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
      FP.assert(p.x >= -8 && p.x <= w.width + 8 && p.y >= w.surfaceY + 34 && p.y <= w.height - 100, `${seed} ${o.kind}`);
  }
});
FP.test('level: le T-Rex signature trouve sa place sur écran étroit', () => {
  let placed = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = FP.state.createRun(seed, { W: 360, H: 780 });
    s.signature = { armed: true, spawned: false, targetLevel: 1 }; s.level = 1;
    FP.level.generate(s);
    if (s.world.solids.some(o => o.kind === 'trex_signature')) placed++;
  }
  FP.assert(placed >= 15, `placé ${placed}/20`);
});
FP.test('level: densité plausible, familles PNG uniquement', () => {
  const s = gen(1234);
  FP.assert(s.world.solids.length >= 12 && s.world.solids.length <= 22, String(s.world.solids.length));   // v4.1.0 : plus dense
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
FP.test('level: toxiques et limaces générés et déterministes', () => {
  const pick = s => JSON.stringify([s.world.toxics.map(o => [o.x, o.y, o.rx]), s.world.leaks.map(l => [l.x, l.y, l.len])]);
  const a = gen(1234), b = gen(1234);
  FP.assertEqual(pick(a), pick(b));
  FP.assert(a.world.toxics.length >= 3, String(a.world.toxics.length));
  FP.assert(a.world.leaks.length >= 1, String(a.world.leaks.length));
});
FP.test('level: chemin sûr hors des toxiques', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const o of w.toxics) FP.assert(FP.level.distToSafePath(w, o.x, o.y) > w.safeRadius + Math.max(o.rx, o.ry) * .62 + 4, `${seed}`);
  }
});
FP.test('level: limaces n’obstruent pas le chemin', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const l of w.leaks) for (let i = 0; i <= 8; i++) {
      const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k, y = l.y + Math.sin(l.angle) * l.len * k;
      FP.assert(FP.level.distToSafePath(w, x, y) >= w.safeRadius * .58 + l.r, `${seed}`);
    }
  }
});
FP.test('level: nappes et limaces assez visibles pour être anticipées', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const o of w.toxics) FP.assert((Math.min(w.width, o.x + o.rx) - Math.max(0, o.x - o.rx)) / (2 * o.rx) >= .5, 'toxique ' + seed);
    for (const l of w.leaks) {
      let inside = 0;
      for (let i = 0; i <= 8; i++) {
        const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k, y = l.y + Math.sin(l.angle) * l.len * k;
        if (x >= 0 && x <= w.width) inside++;
        FP.assert(y > w.surfaceY + 48 && y < w.height - 116, 'limace y ' + seed);
      }
      FP.assert(inside / 9 >= .5 && l.x >= 24 && l.x <= w.width - 24, 'limace ' + seed);
    }
  }
});
FP.test('level: des trajets de limaces peuvent dépasser du cadre', () => {
  let out = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const w = gen(seed, 440, 783, 8).world;
    for (const l of w.leaks) for (let i = 0; i <= 8; i++) {
      const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k;
      if (x < 24 || x > w.width - 24) out++;
    }
  }
  FP.assert(out > 0, 'aucun trajet ne dépasse');
});
// Difficulté v4.1.0 : plus dense dès le premier passage, et une rampe qui se sent (moyenne sur 12 graines, fenêtre 440 × 783).
const meanSolids = (level) => { let n = 0; for (let seed = 1; seed <= 12; seed++) { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; FP.level.startRun(s); n += s.world.solids.length; } return n / 12; };
FP.test('level: premier niveau plus dense', () => { const m = meanSolids(0); FP.assert(m >= 14, 'moyenne ' + m); });
FP.test('level: la densité monte nettement avec les niveaux', () => { const a = meanSolids(0), b = meanSolids(4); FP.assert(b >= a + 2.5, a + ' → ' + b); });   // le terrain plafonne vers 20 obstacles
FP.test('level: les obstacles d’un niveau n’ont pas tous la même taille', () => {
  const s = FP.state.createRun(21, { W: 440, H: 783 }); FP.level.startRun(s);
  const widths = new Set(s.world.solids.filter(o => !o.signature).map(o => Math.round(o.w)));
  FP.assert(widths.size >= 4, String([...widths]));
});
// Nappes toxiques v4.2.2 : plus nombreuses, plus grandes, et qui se multiplient avec les niveaux (moyenne sur 12 graines).
const toxicCover = (level) => {
  let n = 0, cov = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; FP.level.startRun(s);
    n += s.world.toxics.length; cov += s.world.toxics.reduce((a, o) => a + Math.PI * o.rx * o.ry, 0) / (s.world.width * (s.world.height - s.world.surfaceY));
  }
  return { n: n / 12, cov: cov / 12 };
};
FP.test('level: des nappes toxiques nombreuses dès le premier niveau', () => {
  const t = toxicCover(0);
  FP.assert(t.n >= 8 && t.cov >= .08, t.n + ' nappes, ' + (t.cov * 100).toFixed(1) + ' %');
});
FP.test('level: les nappes toxiques se multiplient vite avec les niveaux', () => {
  const a = toxicCover(0), b = toxicCover(6);
  FP.assert(b.n >= a.n + 4 && b.cov >= a.cov + .04, a.n + ' → ' + b.n);
});
FP.test('level: les nappes toxiques se répartissent sur toute la hauteur, surface comprise', () => {
  const area = [0, 0, 0];
  for (let seed = 1; seed <= 12; seed++) {
    const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = 3; FP.level.startRun(s);
    const w = s.world;
    for (const o of w.toxics) area[Math.min(2, Math.floor((o.y - w.surfaceY) / (w.height - w.surfaceY) * 3))] += Math.PI * o.rx * o.ry;
  }
  const total = area[0] + area[1] + area[2];
  FP.assert(area[0] / total >= .25, 'tiers de surface : ' + Math.round(area[0] / total * 100) + ' %');
  FP.assert(area[2] / total <= .42, 'tiers du fond : ' + Math.round(area[2] / total * 100) + ' %');
});
FP.test('level: le chemin sûr se resserre avec les niveaux, jusqu’à presque la largeur de la tête', () => {
  const r = (level) => { const s = FP.state.createRun(3, { W: 440, H: 783 }); s.level = level; FP.level.generate(s); return s.world.safeRadius; };
  FP.assertEqual(r(0), 25); FP.assert(r(4) < 20 && r(4) > 17, String(r(4))); FP.assertEqual(r(8), 12); FP.assertEqual(r(20), 12);
});
