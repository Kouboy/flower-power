// Encounter Lab (v5.12.0, spec docs/superpowers/specs/2026-11-16-encounter-lab-design.md) : 6 micro-circuits faits à la main, un par
// niveau (?lab=N), deux sols (argile, sable), une impulsion montante, une mesure par circuit.
const LAB_IDS = ['slalom', 'slalom-argile', 'rigole', 'fourche', 'cheminee', 'combine'];
const LAB_WIDTHS = [280, 300, 360, 440];
const labRun = (n, W = 360) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = n; FP.level.startRun(s); s.mode = 'playing';
  return s;
};
const labEach = (fn) => { for (const W of LAB_WIDTHS) LAB_IDS.forEach((id, i) => fn({ s: labRun(i + 1, W), W, id, n: i + 1, at: `${id} W=${W}` })); };
const labPolys = (s) => s.world.solids.filter(o => o.kind === 'lab').map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));
const labSamples = (pts) => { const out = []; for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 20; k++) out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 20, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 20 }); return out; };

FP.test('lab: 6 circuits, dans l’ordre de la spec', () => {
  FP.assertEqual(window.FLOWER_POWER_LAB.map(c => c.id).join(), LAB_IDS.join());
  for (const c of window.FLOWER_POWER_LAB) FP.assert(c.height >= .5 && c.height <= 1.5, c.id + ' : hauteur ' + c.height);
});

FP.test('lab: le slalom argile reprend le tracé du slalom nu', () => {
  const [a, b] = window.FLOWER_POWER_LAB;
  FP.assertEqual(JSON.stringify(b.walls), JSON.stringify(a.walls)); FP.assertEqual(JSON.stringify(b.path), JSON.stringify(a.path));
  FP.assertEqual(a.soils.length, 0); FP.assert(b.soils.length > 0 && b.soils.every(z => z.kind === 'argile'), 'argile seulement');
});

FP.test('lab: chaque circuit se traverse', () => {
  labEach(({ s, at }) => {
    const L = s.world.labLevel, walls = labPolys(s), half = L.channelMin / 2;
    for (const path of [L.path, ...L.alt]) {
      FP.assert(path[0].y > L.bottom && path[path.length - 1].y < L.top, 'du dessous au-dessus du circuit ' + at);
      for (const q of labSamples(path)) for (const P of walls) FP.assert(FP.geom.sdPoly(q.x, q.y, P) >= half - 1e-6, `trajet à ${FP.geom.sdPoly(q.x, q.y, P).toFixed(1)} px d'un mur en (${q.x | 0},${q.y | 0}) ` + at);
    }
  });
});

FP.test('lab: tout dans la bande sûre', () => {
  labEach(({ s, W, at }) => {
    const L = s.world.labLevel, m = FP.camera.safeX(W), r = FP.config.coins.radius, inBand = (x, pad = 0) => x - pad >= m - 1e-6 && x + pad <= W - m + 1e-6;
    for (const z of L.soils) FP.assert(z.poly.every(([x]) => inBand(x)), 'sol ' + at);
    for (const l of L.lanes) FP.assert(inBand(l.x0) && inBand(l.x1), 'voie ' + at);
    for (const c of s.world.coins) FP.assert(inBand(c.x, r), 'pièce ' + at);
    for (const path of [L.path, ...L.alt]) for (const q of path.slice(1, -1)) FP.assert(inBand(q.x), 'trajet ' + at);
  });
});

FP.test('lab: sols et voies attendus', () => {
  const kinds = (c) => [...new Set(c.soils.map(z => z.kind))].sort().join();
  const C = Object.fromEntries(window.FLOWER_POWER_LAB.map(c => [c.id, c]));
  FP.assertEqual(kinds(C.slalom), ''); FP.assertEqual(kinds(C['slalom-argile']), 'argile'); FP.assertEqual(kinds(C.rigole), 'sable');
  FP.assertEqual(kinds(C.fourche), 'argile,sable'); FP.assertEqual(kinds(C.combine), 'argile,sable');
  FP.assert(C.fourche.coins.length > 0, 'pièces de la fourche');
  const s = labRun(4), L = s.world.labLevel, sand = L.soils.find(z => z.kind === 'sable');
  FP.assert(s.world.coins.every(c => FP.geom.sdPoly(c.x, c.y, sand.poly) <= 0), 'les pièces de la fourche sont côté sable');
  FP.assertEqual(C.cheminee.lanes.length, 2); FP.assertEqual(JSON.stringify(C.cheminee.pulse.lanes), '[0,1]');
  FP.assertEqual(C.combine.pulse.lanes.length, 1); FP.assert(C.combine.pulse.slow < 1, 'impulsion plus lente'); FP.assert(C.combine.coins.length > 0, 'tentation');
  for (const id of ['slalom', 'slalom-argile', 'rigole', 'fourche']) FP.assertEqual(C[id].pulse, null, id);
});

FP.test('lab: hauteur du niveau', () => {
  labEach(({ s, at }) => {
    const w = s.world, L = w.labLevel, c = window.FLOWER_POWER_LAB.find(q => q.id === L.circuit.id);
    FP.assertEqual(w.height, FP.labLevel.heightFor(c, w), at);
    FP.assert(Math.abs(w.height - FP.config.plant.seedOffset - L.bottom - w.viewH / 2) < 1e-6, 'demi-écran libre au départ ' + at);
    FP.assert(Math.abs(L.top - w.surfaceY - w.viewH / 2) < 1e-6, 'demi-écran jusqu’à la surface ' + at);
    FP.assertEqual(w.toxics.length + w.leaks.length + w.bonuses.length, 0, 'rien au hasard ' + at);
    FP.assert(w.solids.every(o => o.kind === 'lab'), 'seuls les murs du circuit ' + at);
  });
});
