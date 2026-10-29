const gen = (seed, W = 440, H = 783, level = 0) => {
  const s = FP.state.createRun(seed, { W, H }); s.level = level; s.difficulty = level; FP.level.generate(s); return s;
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
    s.signature = { armed: true, spawned: false, targetLevel: 1 }; s.level = 1; s.run.milieu = 3;   // le T-Rex vit au site nucléaire
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
  const s = FP.state.createRun(7, { W: 440, H: 783 }); s.run.milieu = 3;   // le T-Rex vit au site nucléaire
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
const meanSolids = (level) => { let n = 0; for (let seed = 1; seed <= 12; seed++) { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; s.difficulty = level; FP.level.startRun(s); n += s.world.solids.length; } return n / 12; };
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
    const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; s.difficulty = level; FP.level.startRun(s);
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
    const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = 3; s.difficulty = 3; FP.level.startRun(s);
    const w = s.world;
    for (const o of w.toxics) area[Math.min(2, Math.floor((o.y - w.surfaceY) / (w.height - w.surfaceY) * 3))] += Math.PI * o.rx * o.ry;
  }
  const total = area[0] + area[1] + area[2];
  FP.assert(area[0] / total >= .25, 'tiers de surface : ' + Math.round(area[0] / total * 100) + ' %');
  FP.assert(area[2] / total <= .42, 'tiers du fond : ' + Math.round(area[2] / total * 100) + ' %');
});
FP.test('level: le chemin sûr se resserre avec les niveaux, jusqu’à presque la largeur de la tête', () => {
  const r = (level) => { const s = FP.state.createRun(3, { W: 440, H: 783 }); s.level = level; s.difficulty = level; FP.level.generate(s); return s.world.safeRadius; };
  FP.assertEqual(r(0), 25); FP.assert(r(4) < 20 && r(4) > 17, String(r(4))); FP.assertEqual(r(8), 12); FP.assertEqual(r(20), 12);
});
// Franchissabilité à tous les niveaux (le chemin sûr se resserre) : géométrie réelle, pas la formule de placement.
const genAt = (seed, level, milieu = 0) => { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; s.difficulty = level; s.run.milieu = milieu; FP.level.generate(s); return s.world; };
const pathPoints = (w) => { const pts = [], P = w.safePath; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4); for (let k = 0; k <= n; k++) pts.push({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n }); } return pts; };
const LEVELS = [0, 4, 8, 12], SEEDS = [...Array(30).keys()].map(i => i + 1);
FP.test('level: à tous les niveaux, aucune nappe toxique ne recouvre le chemin sûr', () => {
  for (const level of LEVELS) for (const seed of SEEDS) {
    const w = genAt(seed, level, seed % 4), pts = pathPoints(w);   // les quatre milieux, tour à tour
    for (const o of w.toxics) {
      const ca = Math.cos(-o.a), sa = Math.sin(-o.a);
      for (const p of pts) { const dx = p.x - o.x, dy = p.y - o.y, u = (dx * ca - dy * sa) / o.rx, v = (dx * sa + dy * ca) / o.ry; FP.assert(u * u + v * v > 1, `niveau ${level}, graine ${seed}`); }
    }
  }
});
FP.test('level: à tous les niveaux, aucune limace ne touche le chemin sûr', () => {
  const h = FP.config.hazards;
  for (const level of LEVELS) for (const seed of SEEDS) {
    const w = genAt(seed, level, seed % 4), pts = pathPoints(w);   // les quatre milieux, tour à tour
    for (const l of w.leaks) {
      const ax = l.x - Math.cos(l.angle) * l.len / 2, ay = l.y - Math.sin(l.angle) * l.len / 2, bx = l.x + Math.cos(l.angle) * l.len / 2, by = l.y + Math.sin(l.angle) * l.len / 2;
      for (const p of pts) FP.assert(FP.geom.distPointToSegment(p.x, p.y, ax, ay, bx, by) > l.r + h.leakWobble + h.leakHitPad, `niveau ${level}, graine ${seed}`);
    }
  }
});
FP.test('level: à tous les niveaux, aucun déchet ne mord sur le chemin sûr', () => {
  for (const level of LEVELS) for (const seed of SEEDS) {
    const w = genAt(seed, level, seed % 4);   // les quatre milieux, tour à tour
    for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o)) FP.assert(FP.level.distToSafePath(w, p.x, p.y) >= w.safeRadius, `niveau ${level}, graine ${seed}, ${o.kind}`);
  }
});
// Difficulté par la forme du chemin (v4.8.0) : plus étroit et plus sinueux avec les niveaux, dangers plafonnés.
const swingOf = (w) => { const p = w.safePath; let lat = 0; for (let i = 1; i < p.length; i++) lat += Math.abs(p[i].x - p[i - 1].x); return lat / ((p[0].y - p[p.length - 1].y) / 1000); };
const meanOver = (level, f) => { let t = 0; for (let seed = 1; seed <= 12; seed++) t += f(genAt(seed, level)); return t / 12; };
FP.test('level: le chemin sûr serpente nettement plus avec les niveaux', () => {
  const a = meanOver(0, swingOf), b = meanOver(10, swingOf), c = meanOver(20, swingOf);
  FP.assert(b >= 1.45 * a, a.toFixed(0) + ' → ' + b.toFixed(0)); FP.assert(Math.abs(c - b) < .1 * b, 'palier : ' + b.toFixed(0) + ' / ' + c.toFixed(0));
});
FP.test('level: le chemin sûr reste suivable (aucun segment plus penché que maxSlope)', () => {
  const max = FP.config.level.safePath.maxSlope;
  for (const level of [0, 5, 10, 20]) for (const seed of SEEDS) {
    const p = genAt(seed, level).safePath;
    for (let i = 1; i < p.length; i++) FP.assert(Math.abs(p[i].x - p[i - 1].x) <= max * Math.abs(p[i].y - p[i - 1].y) + 1e-6, `niveau ${level}, graine ${seed}, segment ${i}`);
  }
});
FP.test('level: nappes et limaces plafonnées (14 et 7 environ), atteint vers le niveau 6', () => {
  const tox = (l) => meanOver(l, w => w.toxics.length), leaks = (l) => meanOver(l, w => w.leaks.length);
  FP.assert(tox(12) <= 15 && tox(20) <= 15, tox(12) + ' / ' + tox(20)); FP.assert(leaks(12) <= 8 && leaks(20) <= 8, leaks(12) + ' / ' + leaks(20));
  FP.assert(tox(6) >= 13, 'nappes au niveau 6 : ' + tox(6));
});
FP.test('level: dangers et déchets se rapprochent du chemin avec les niveaux', () => {
  const w0 = genAt(3, 0), w10 = genAt(3, 10), w20 = genAt(3, 20), hard = FP.config.level.safePath.hard;
  FP.assertEqual(w0.hazardRadius, FP.config.level.safePath.radiusBase); FP.assertEqual(w10.hazardRadius, hard.hazardRadius); FP.assertEqual(w20.hazardRadius, hard.hazardRadius);
  FP.assertEqual(w0.solidExtra, FP.config.level.fit.safeExtra); FP.assertEqual(w10.solidExtra, hard.solidExtra);
  for (const seed of SEEDS) { const w = genAt(seed, 10); for (const o of w.toxics) FP.assert(FP.level.distToSafePath(w, o.x, o.y) > w.hazardRadius + Math.max(o.rx, o.ry) * FP.config.level.toxics.safeK + FP.config.level.toxics.safeExtra, `graine ${seed}`); }
});
FP.test('level: la difficulté règle le chemin, pas le compteur de niveaux', () => {
  const at = (level, difficulty) => { const s = FP.state.createRun(5, { W: 440, H: 783 }); s.level = level; s.difficulty = difficulty; FP.level.generate(s); return s.world.safeRadius; };
  FP.assertEqual(at(10, 0), 25); FP.assertEqual(at(0, 10), 12);
});
