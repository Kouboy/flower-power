// Apparence de chaque obstacle : teinte, luminosité, usure, enfouissement — pure, stable, variée.
const sameKind = (n) => Array.from({ length: n }, (_, i) => FP.catalog.makeSolid({ kind: 'extinguisher', x: 30 + i * 19.7, y: 400 + i * 53.1, a: 0, flip: 1 }));
FP.test('obstacles: un obstacle garde son apparence', () => { const o = sameKind(1)[0]; FP.assertEqual(JSON.stringify(FP.obstacles.look(o)), JSON.stringify(FP.obstacles.look({ ...o }))); });
FP.test('obstacles: des extincteurs qui ne sont pas des clones', () => { FP.assert(new Set(sameKind(20).map(o => JSON.stringify(FP.obstacles.look(o)))).size >= 12); });
FP.test('obstacles: environ un tiers à moitié enfouis', () => {
  const r = FP.createRng(8), n = 300; let b = 0;
  for (let i = 0; i < n; i++) b += FP.obstacles.look({ kind: 'tire', x: r.range(0, 440), y: r.range(0, 2000) }).buried ? 1 : 0;
  FP.assert(b / n >= .2 && b / n <= .45, String(b / n));
});
