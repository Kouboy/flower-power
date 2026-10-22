// Émergence (motte de taupe) : gonflement sous la pelouse, puis éclosion différée de la fleur.
const moundRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
FP.test('mound: la motte ne gonfle qu’à l’approche de la surface, et de plus en plus', () => {
  const s = moundRun(), sy = s.world.surfaceY;
  s.plant.tip = { x: 200, y: sy + 400 }; FP.assertEqual(FP.mound.swell(s).k, 0);
  s.plant.tip = { x: 200, y: sy + 50 }; const a = FP.mound.swell(s).k;
  s.plant.tip = { x: 200, y: sy + 15 }; const b = FP.mound.swell(s);
  FP.assert(a > 0 && b.k > a, a + ' < ' + b.k);
  FP.assertEqual(b.x, 200);
  s.plant.tip = { x: 200, y: sy }; FP.assertEqual(FP.mound.swell(s).k, 1);
});
FP.test('mound: rien hors de la pousse', () => {
  const s = moundRun(); s.plant.tip = { x: 200, y: s.world.surfaceY + 10 }; s.mode = 'dying';
  FP.assertEqual(FP.mound.swell(s).k, 0);
});
FP.test('flow: la fleur attend que la motte se fende, puis l’événement blossom part une fois', () => {
  const s = moundRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  const d = FP.config.flow.hatchDelay, f = s.garden.flowers[0];
  FP.assert(d > 0);
  for (let t = 0; t < d - .05; t += 1 / 60) FP.flow.update(s, 1 / 60);
  FP.assertEqual(f.size, 0);
  FP.assertEqual(s.events.filter(e => e.type === 'blossom').length, 0);
  for (let i = 0; i < 12; i++) FP.flow.update(s, 1 / 60);
  FP.assert(f.size > 0, 'la fleur pousse après la fente');
  const bl = s.events.filter(e => e.type === 'blossom');
  FP.assertEqual(bl.length, 1); FP.assertEqual(bl[0].x, 220);
});
