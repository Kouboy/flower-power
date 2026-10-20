const hzRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('hazards: vitesse bornée', () => {
  const s = hzRun(); s.plant.stemCount = 50; s.score.flowers = 50; s.plant.stemAge = 500;
  FP.assertEqual(FP.hazards.leakSpeedScale(s), 2.45);
});
FP.test('hazards: la limace parcourt son trajet', () => {
  const s = hzRun(), l = s.world.leaks[0], seen = [];
  for (let i = 0; i < 600; i++) { s.time += 1 / 60; FP.hazards.update(s, 1 / 60); seen.push(Math.hypot(l.cx - l.x, l.cy - l.y)); }
  FP.assert(Math.max(...seen) > l.len * .4 && Math.max(...seen) <= l.len * .5 + 1e-6, String(Math.max(...seen)));
});
FP.test('hazards: intensité toxique', () => {
  const o = { x: 100, y: 100, rx: 40, ry: 30, a: 0 };
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 100, 100), 1);
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 141, 100), 0);
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 139, 100), .18);
});
FP.test('hazards: le flash de contact s’éteint', () => {
  const s = hzRun(), l = s.world.leaks[0]; l.hitFlash = .18;
  FP.hazards.update(s, .1); FP.assert(Math.abs(l.hitFlash - .08) < 1e-9);
  FP.hazards.update(s, .1); FP.assertEqual(l.hitFlash, 0);
});
