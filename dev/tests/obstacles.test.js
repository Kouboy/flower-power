// Apparence de chaque obstacle : teinte, luminosité, usure, enfouissement — pure, stable, variée.
const sameKind = (n) => Array.from({ length: n }, (_, i) => FP.catalog.makeSolid({ kind: 'extinguisher', x: 30 + i * 19.7, y: 400 + i * 53.1, a: 0, flip: 1 }));
FP.test('obstacles: un obstacle garde son apparence', () => { const o = sameKind(1)[0]; FP.assertEqual(JSON.stringify(FP.obstacles.look(o)), JSON.stringify(FP.obstacles.look({ ...o }))); });
FP.test('obstacles: des extincteurs qui ne sont pas des clones', () => { FP.assert(new Set(sameKind(20).map(o => JSON.stringify(FP.obstacles.look(o)))).size >= 12); });
FP.test('obstacles: environ un tiers à moitié enfouis', () => {
  const r = FP.createRng(8), n = 300; let b = 0;
  for (let i = 0; i < n; i++) b += FP.obstacles.look({ kind: 'tire', x: r.range(0, 440), y: r.range(0, 2000) }).buried ? 1 : 0;
  FP.assert(b / n >= .2 && b / n <= .45, String(b / n));
});
// Obstacles PixelLab (v4.17.0) : enfouis plus souvent et plus profond ; la hauteur de terre est tirée dans 0..1.
FP.test('obstacles: profondeur d’enfouissement stable, dans 0..1, variée', () => {
  const ds = sameKind(20).map(o => FP.obstacles.look(o).depth);
  FP.assert(ds.every(d => d >= 0 && d <= 1), ds.join());
  FP.assert(new Set(ds).size >= 10, 'variée');
});
FP.test('config: les obstacles PixelLab sont plus enfouis que le tiers des PNG', () => {
  const b = FP.config.obstacles.pixelBury;
  FP.assert(b.chance > .33 && b.depth[0] > .28 && b.depth[0] < b.depth[1] && b.depth[1] < .6, JSON.stringify(b));
  FP.assertEqual(FP.catalog.pixelAssets(window.FLOWER_POWER_PIXEL_ASSETS, FP.catalog.filterAssets(window.FLOWER_POWER_AUTHORED_ASSETS)).duck.pixel, true);
});
// Obstacles dessinés (v4.14.0) : une variante par obstacle, une case de grille par pixel peint.
FP.test('obstacles: la variante d’un obstacle est stable et dans 0..3', () => {
  const seen = new Set();
  for (const o of sameKind(40)) { const v = FP.obstacles.variantOf(o); FP.assert(v >= 0 && v <= 3 && v === FP.obstacles.variantOf({ ...o })); seen.add(v); }
  FP.assert(seen.size >= 3, String(seen.size));
});
FP.test('obstacles: cells liste chaque case peinte de la grille', () => {
  const g = FP.drawn.grid(3, 3);
  for (const [x, y] of [[0, 0], [1, 1], [2, 2], [0, 2], [2, 0]]) g.set(x, y, '#123456');
  const c = FP.obstacles.cells(g);
  FP.assertEqual(c.length, 5); FP.assertEqual(JSON.stringify(c[0]), JSON.stringify([0, 0, '#123456']));
});
