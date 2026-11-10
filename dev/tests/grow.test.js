// Niveaux qui s'agrandissent avec la vitesse (v5.3.0) : la hauteur d'un niveau suit la vitesse de lancement de la pousse.
// Utilise flowRun, bloomNow, advance, skipShop (flow.test.js) et killNow (milieux.test.js).
const growRun = (W, stems, flowers, seed = 7) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s);
  s.plant.stemCount = stems; s.score.flowers = flowers;
  FP.level.generate(s);
  return s;
};
const H0of = (s) => FP.state.worldHeightFor(s.world.viewH);

FP.test('grow: premier niveau à la hauteur actuelle', () => {
  const s = FP.state.createRun(7, { W: 440, H: 783 });
  FP.level.startRun(s);
  FP.assertEqual(s.world.height, Math.max(783 + 620, Math.floor(783 * 2.35)));
  FP.assertEqual(s.world.growK, 1);
});
FP.test('grow: la hauteur suit la vitesse de lancement', () => {
  const s = growRun(440, 4, 2), r = FP.level.heightFor(s);
  FP.assert(Math.abs(r.k - 156 / 120) < 1e-9, String(r.k));   // pousse n° 5 : 120 + 6·4 + 6·2
  FP.assertEqual(s.world.height, Math.round(H0of(s) * r.k));
  let prev = 0;
  for (const n of [0, 2, 5, 9]) { const k = FP.level.heightFor(growRun(440, n, 0)).k; FP.assert(k > prev || (k === 1 && prev === 0), n + ' ' + k); prev = k; }
  FP.assert(FP.level.heightFor(growRun(440, 3, 4)).k > FP.level.heightFor(growRun(440, 3, 1)).k, 'les fleurs comptent');
});
FP.test('grow: plafond à growMax', () => {
  // La vitesse plafonne à speed.max : le facteur réel culmine à max / base (≈ 2,17), growMax (2,2) reste un garde-fou.
  const s = growRun(440, 40, 10), c = FP.config.plant.speed, top = Math.min(c.max / c.base, 2.2);
  FP.assertEqual(FP.config.world.growMax, 2.2);
  FP.assert(Math.abs(s.world.growK - top) < 1e-9, String(s.world.growK));
  FP.assertEqual(s.world.height, Math.round(H0of(s) * top));
  const saved = c.max; c.max = 400;
  try { FP.assertEqual(FP.level.heightFor(s).k, 2.2, 'plafonné par growMax'); } finally { c.max = saved; }
});
FP.test('grow: durée de traversée à peu près constante', () => {
  const a = growRun(440, 0, 0), b = growRun(440, 40, 10);
  const ta = (a.world.height - a.world.surfaceY) / FP.config.plant.speed.base;
  const tb = (b.world.height - b.world.surfaceY) / FP.config.plant.speed.max;
  FP.assert(Math.abs(tb / ta - 1) < .1, ta + ' / ' + tb);
});
FP.test('grow: figée pendant un niveau, recalculée à la génération suivante', () => {
  const s = flowRun(), h1 = s.world.height;
  for (let i = 0; i < 180; i++) FP.plant.update(s, 1 / 60);
  FP.assertEqual(s.world.height, h1, 'figée pendant la pousse');
  s.score.flowers = 6;
  bloomNow(s); advance(s, 8); skipShop(s);
  FP.assertEqual(s.world.height, Math.round(H0of(s) * FP.level.heightFor(s).k), 'après éclosion');
  FP.assert(s.world.height > h1, 'plus haut après éclosion');
  const h2 = s.world.height; s.score.flowers = 12;
  killNow(s);
  FP.assert(s.world.height > h2, 'recalculée après une mort');
});
FP.test('grow: après un changement de hauteur, la pousse repart du fond, caméra en bas', () => {
  const s = flowRun(); s.score.flowers = 10;
  bloomNow(s); advance(s, 8); skipShop(s);
  FP.assert(s.world.growK > 1);
  FP.assertEqual(s.plant.seed.y, s.world.height - FP.config.plant.seedOffset);
  FP.assertEqual(s.camera.y, Math.max(0, s.world.height - s.world.viewH));
});
FP.test('grow: redimensionnement — le niveau en cours garde sa hauteur, le suivant suit la nouvelle vue', () => {
  const s = growRun(440, 4, 0), h = s.world.height, k = s.world.growK;
  FP.state.applyView(s, { W: 440, H: 900 });
  FP.assertEqual(s.world.height, h);
  FP.level.generate(s);
  FP.assertEqual(s.world.height, Math.round(FP.state.worldHeightFor(900) * k));
});
FP.test('grow: le niveau de boss prend aussi la hauteur calculée', () => {
  const s = growRun(360, 12, 4);
  s.run.boss = true; s.run.milieu = 1; FP.level.generate(s);
  FP.assert(s.world.bossLevel, 'niveau de boss');
  FP.assertEqual(s.world.height, Math.round(H0of(s) * FP.level.heightFor(s).k));
  FP.assert(s.world.growK > 1);
});
// Densité constante par écran (v5.3.0) : un niveau plus haut contient proportionnellement plus de choses.
const growAt = (W, stems, seed, difficulty, milieu = 0) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  s.plant.stemCount = stems; s.score.flowers = stems ? 10 : 0; s.level = difficulty; s.difficulty = difficulty; s.run.milieu = milieu;
  FP.level.generate(s);
  return s.world;
};
const perScreen = (w, n) => n / (w.height - w.surfaceY);
FP.test('grow: densité par écran stable entre k = 1 et k max', () => {
  const sum = { k1: {}, kMax: {} };
  for (const [key, stems] of [['k1', 0], ['kMax', 40]]) for (let seed = 1; seed <= 12; seed++) {
    const w = growAt(440, stems, seed, 3);
    const counts = { solids: w.solids.filter(o => !o.signature).length, toxics: w.toxics.length, leaks: w.leaks.length, coins: w.coins.length };
    for (const [n, c] of Object.entries(counts)) sum[key][n] = (sum[key][n] || 0) + perScreen(w, c) / 12;
  }
  FP.assert(growAt(440, 40, 1, 3).growK > 2, 'facteur max atteint');
  for (const n of ['solids', 'toxics', 'leaks', 'coins']) {
    // Jetons : un chapelet par tranche d'une hauteur d'écran, nombre de tranches arrondi (world/coins.js) ; l'arrondi pèse plus sur un niveau court.
    const r = sum.kMax[n] / sum.k1[n], tol = n === 'coins' ? .2 : .15;
    FP.assert(Math.abs(r - 1) < tol, n + ' : ' + r.toFixed(3));
  }
});
FP.test('grow: au facteur max, règles des niveaux tenues', () => {
  const h = FP.config.hazards;
  for (const W of [280, 440]) for (let seed = 1; seed <= 8; seed++) {
    const w = growAt(W, 40, seed, 6, seed % 4), so = w.solids, tag = W + ' / ' + seed;
    for (let i = 0; i < so.length; i++) for (let j = i + 1; j < so.length; j++)
      FP.assert(!FP.geom.convexPolysOverlap(so[i].footprint, so[j].footprint), 'chevauchement ' + tag);
    for (const o of so) for (const p of FP.catalog.visibleFootprint(o)) FP.assert(FP.level.distToSafePath(w, p.x, p.y) >= w.safeRadius, 'chemin ' + tag + ' ' + o.kind);
    for (const o of w.toxics) FP.assert(FP.level.distToSafePath(w, o.x, o.y) > w.safeRadius, 'nappe ' + tag);
    for (const l of w.leaks) {
      const ends = [-.5, .5].map(q => ({ x: l.x + Math.cos(l.angle) * l.len * q, y: l.y + Math.sin(l.angle) * l.len * q }));
      const free = (e) => FP.level.distToSafePath(w, e.x, e.y) > l.r + h.leakWobble + h.leakHitPad;
      FP.assert(l.crossing ? ends.some(free) : ends.every(free), 'limace ' + tag);
    }
  }
});
FP.test('grow: au facteur max, le T-Rex trouve sa place', () => {
  let placed = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = FP.state.createRun(seed, { W: 360, H: 640 });
    s.signature = { armed: true, spawned: false, targetLevel: 1 }; s.level = 1; s.run.milieu = 3; s.plant.stemCount = 40;
    FP.level.generate(s);
    if (s.world.solids.some(o => o.kind === 'trex_signature')) placed++;
  }
  FP.assert(placed >= 15, `placé ${placed}/20`);
});
