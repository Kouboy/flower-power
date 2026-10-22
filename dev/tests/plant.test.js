const plantRun = () => { const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.generate(s); s.world.solids = []; FP.plant.launch(s); return s; };
FP.test('plant: lancement depuis la graine', () => {
  const s = plantRun(), w = s.world;
  FP.assertEqual(s.mode, 'playing');
  FP.assertEqual(s.plant.tip.x, w.width / 2);
  FP.assertEqual(s.plant.tip.y, w.height - 46);
  FP.assertEqual(s.plant.stemCount, 1);
  FP.assert(s.events.some(e => e.type === 'stemStart'));
});
FP.test('plant: vitesse de départ v3 (cadrage B)', () => {
  const s = plantRun();
  FP.assertEqual(FP.plant.speed(s), 76 * .88);
});
FP.test('plant: monte sans contrôle', () => {
  const s = plantRun(), y0 = s.plant.tip.y;
  for (let i = 0; i < 60; i++) FP.plant.update(s, 1 / 60);
  FP.assert(y0 - s.plant.tip.y > 55 && y0 - s.plant.tip.y < 75, String(y0 - s.plant.tip.y));
  FP.assert(s.plant.trail.length > 5);
});
FP.test('plant: tourne vers le pointeur sans jamais redescendre', () => {
  const s = plantRun();
  s.input = { x: 20, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 120; i++) { FP.plant.update(s, 1 / 60); FP.assert(s.plant.dir.y < 0); }
  FP.assert(s.plant.tip.x < s.world.width / 2 - 40, String(s.plant.tip.x));
});
FP.test('plant: bords', () => {
  const s = plantRun();
  s.input = { x: -500, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 600; i++) { FP.plant.update(s, 1 / 60); FP.assert(s.plant.tip.x >= 12 && s.plant.tip.x <= s.world.width - 12); }
});
FP.test('plant: pas maximal par frame', () => {
  const s = plantRun(); s.plant.stemCount = 99; s.plant.stemAge = 99;
  const y0 = s.plant.tip.y; FP.plant.update(s, .033);
  FP.assert(y0 - s.plant.tip.y <= 196 * .88 * .033 + 1e-9);
});
FP.test('plant: trace bornée à 340 points', () => {
  const s = plantRun(); s.world.height = 1e6; s.plant.tip.y = 9e5;
  for (let i = 0; i < 6000; i++) FP.plant.update(s, 1 / 30);
  FP.assert(s.plant.trail.length <= 340);
});
FP.test('plant: prepare pose la graine sans lancer', () => {
  const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.plant.prepare(s);
  FP.assertEqual(s.plant.tip, null);
  FP.assertEqual(s.plant.seed.y, s.world.height - 46);
});
FP.test('plant: déviée mais toujours vers le haut', () => {
  const s = plantRun(); s.input = { x: 440, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 300; i++) { s.plant.corruption = .28; s.time += 1 / 60; FP.plant.update(s, 1 / 60); FP.assert(s.plant.dir.y < 0); }
});
FP.test('plant: corruption ralentit de 10 %', () => {
  const s = plantRun(), v = FP.plant.speed(s); s.plant.corruption = .2;
  FP.assertEqual(FP.plant.speed(s), v * .90);
});
FP.test('plant: prepare remet l’exposition à zéro', () => {
  const s = plantRun(); s.plant.corruption = .2; s.plant.toxicTimer = .5; s.plant.recentToxic = .3;
  FP.plant.prepare(s);
  FP.assertEqual(s.plant.corruption + s.plant.toxicTimer + s.plant.recentToxic, 0);
});
FP.test('plant: chaque tige gratte dès sa première frame', () => {
  const s = plantRun(); s.events.length = 0;
  s.plant.scrapeTimer = 5; FP.plant.prepare(s); FP.plant.launch(s); s.events.length = 0;
  FP.plant.update(s, 1 / 60);
  const ticks = s.events.filter(e => e.type === 'growthTick');
  FP.assertEqual(ticks.length, 1);
  FP.assert(ticks[0].k >= 0 && ticks[0].k <= 1 && typeof ticks[0].near === 'boolean');
  s.events.length = 0; FP.plant.update(s, 1 / 60);
  FP.assert(!s.events.some(e => e.type === 'growthTick'), 'cadence ≥ 37 ms');
});
FP.test('plant: chaque éclosion rend la pousse suivante nettement plus rapide (≥ 10 %)', () => {
  const s = plantRun(), v1 = FP.plant.speed(s);
  s.plant.stemCount += 1; s.score.flowers += 1; s.plant.stemAge = 0;
  FP.assert(FP.plant.speed(s) >= v1 * 1.1, FP.plant.speed(s) + ' vs ' + v1);
});
