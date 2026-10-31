// Apparence de chaque obstacle : teinte, luminosité, usure, enfouissement — pure, stable, variée.
const sameKind = (n) => Array.from({ length: n }, (_, i) => FP.catalog.makeSolid({ kind: 'extinguisher', x: 30 + i * 19.7, y: 400 + i * 53.1, a: 0, flip: 1 }));
FP.test('obstacles: un obstacle garde son apparence', () => { const o = sameKind(1)[0]; FP.assertEqual(JSON.stringify(FP.obstacles.look(o)), JSON.stringify(FP.obstacles.look({ ...o }))); });
FP.test('obstacles: des extincteurs qui ne sont pas des clones', () => { FP.assert(new Set(sameKind(20).map(o => JSON.stringify(FP.obstacles.look(o)))).size >= 12); });
FP.test('obstacles: environ la moitié enfouis (config.obstacles.bury)', () => {
  const r = FP.createRng(8), n = 300, k = FP.config.obstacles.bury.chance * 100; let b = 0;
  for (let i = 0; i < n; i++) b += FP.obstacles.look({ kind: 'tire', x: r.range(0, 440), y: r.range(0, 2000) }).bury < k ? 1 : 0;
  FP.assert(Math.abs(b / n - k / 100) < .1, String(b / n));
});
// v4.17.0 : enfouis assez profond (le pied des sprites PixelLab est une flaque) ; la hauteur de terre est tirée dans 0..1.
FP.test('obstacles: profondeur d’enfouissement stable, dans 0..1, variée', () => {
  const ds = sameKind(20).map(o => FP.obstacles.look(o).depth);
  FP.assert(ds.every(d => d >= 0 && d <= 1), ds.join());
  FP.assert(new Set(ds).size >= 10, 'variée');
});
FP.test('config: enfouissement assez profond pour se voir', () => {
  const b = FP.config.obstacles.bury;
  FP.assert(b.chance > .33 && b.depth[0] > .28 && b.depth[0] < b.depth[1] && b.depth[1] < .6, JSON.stringify(b));
});
