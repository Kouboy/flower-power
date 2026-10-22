const hzRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('hazards: vitesse bornée', () => {
  const s = hzRun(); s.plant.stemCount = 50; s.score.flowers = 50; s.plant.stemAge = 500;
  FP.assertEqual(FP.hazards.leakSpeedScale(s), 1 + FP.config.hazards.leakScaleMax);
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
FP.test('hazards: vitesse réelle plafonnée même en fin de longue partie', () => {
  const s = hzRun(), h = FP.config.hazards;
  s.plant.stemCount = 8; s.score.flowers = 5; s.plant.stemAge = 0; s.time = 180;
  let maxStep = 0;
  for (let i = 0; i < 1200; i++) {
    const before = s.world.leaks.map(l => [l.cx, l.cy]);
    s.time += 1 / 60; s.plant.stemAge += 1 / 60; FP.hazards.update(s, 1 / 60);
    s.world.leaks.forEach((l, j) => {
      const limit = l.len * .5 * l.rate * h.leakRateK * (1 + h.leakScaleMax) / 60;
      maxStep = Math.max(maxStep, Math.hypot(l.cx - before[j][0], l.cy - before[j][1]) / Math.max(1e-9, limit));
    });
  }
  FP.assert(maxStep <= 1.0001, 'vitesse / plafond = ' + maxStep.toFixed(2));
});
FP.test('hazards: position initiale cohérente (pas de saut à la première frame)', () => {
  const s = hzRun(), l = s.world.leaks[0], c0 = [l.cx, l.cy];
  FP.hazards.update(s, 1 / 60);
  FP.assert(Math.hypot(l.cx - c0[0], l.cy - c0[1]) < 3, String(Math.hypot(l.cx - c0[0], l.cy - c0[1])));
});
FP.test('hazards: une limace regarde toujours dans le sens où elle avance', () => {
  const s = FP.state.createRun(8, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  const l = s.world.leaks[0]; l.angle = .4; s.world.leaks = [l];
  FP.hazards.update(s, 1 / 60);   // première position sur le va-et-vient (celle de la génération est le centre du trajet)
  let flips = 0, last = null;
  for (let i = 0; i < 400; i++) {
    const x0 = l.cx, y0 = l.cy;
    FP.hazards.update(s, 1 / 60); s.time += 1 / 60;
    if (x0 === undefined) continue;
    const moved = (l.cx - x0) * Math.cos(l.angle) + (l.cy - y0) * Math.sin(l.angle);
    if (Math.abs(moved) < 1e-3) continue;   // au point de rebroussement
    FP.assertEqual(FP.hazards.leakHeading(l), Math.sign(moved), 'frame ' + i);
    if (last !== null && last !== Math.sign(moved)) flips++;
    last = Math.sign(moved);
  }
  FP.assert(flips >= 1, 'elle a fait au moins un aller-retour');
});
FP.test('hazards: les limaces vont nettement plus vite (+50 % de base, plafond ×3)', () => {
  FP.assertEqual(FP.config.hazards.leakRateK, 2.6);
  const s = FP.state.createRun(8, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  s.plant.stemCount = 99; s.score.flowers = 99; FP.assertEqual(FP.hazards.leakSpeedScale(s), 3);
});
