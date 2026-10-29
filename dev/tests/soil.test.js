// Grain noir de la terre : même tramage que le halo des obstacles, réparti par petites touches.
FP.test('soil: le grain est stable pour un même pixel et une même graine', () => {
  for (let i = 0; i < 200; i++) FP.assertEqual(FP.soil.grainAt(i * 7, i * 13, 42), FP.soil.grainAt(i * 7, i * 13, 42));
});
FP.test('soil: le grain reste par petites touches (3 à 10 % des pixels)', () => {
  let n = 0; const W = 220, H = 600;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (FP.soil.grainAt(x, y, 7)) n++;
  const share = n / (W * H); FP.assert(share >= .03 && share <= .10, String(share));
});
FP.test('soil: le grain change avec la graine du niveau', () => {
  let diff = 0; for (let i = 0; i < 2000; i++) if (FP.soil.grainAt(i % 220, (i / 220) | 0, 1) !== FP.soil.grainAt(i % 220, (i / 220) | 0, 2)) diff++;
  FP.assert(diff > 20, String(diff));
});
FP.test('soil: le décor ne change pas à l’éclosion, seulement au niveau suivant', () => {
  const s = FP.state.createRun(5, { W: 360, H: 640 }); FP.level.generate(s);
  const before = FP.soil.seedOf(s);
  s.level += 2;   // l'éclosion avance le compteur (pollen compris) avant le fondu
  FP.assertEqual(FP.soil.seedOf(s), before);
  FP.level.generate(s);   // le fondu génère le niveau suivant
  FP.assert(FP.soil.seedOf(s) !== before);
});
