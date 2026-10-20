const flowRun = () => { const s = FP.state.createRun(11, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
const tick = (s, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) FP.loop.step(s, dt); };
const serverAt = (s) => { const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); return o; };
FP.test('flow: contact → mort puis nouvelle pousse sur un nouveau niveau', () => {
  const s = flowRun(), before = JSON.stringify(s.world.solids.map(o => [o.x, o.y]));
  const o = serverAt(s); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, 2);
  FP.assert(s.events.some(e => e.type === 'death'));
  FP.flow.update(s, .9);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.stemCount, 2);
  FP.assert(JSON.stringify(s.world.solids.map(o => [o.x, o.y])) !== before);
});
FP.test('flow: plus de graines → over', () => {
  const s = flowRun(); s.plant.reserves = 1;
  const o = serverAt(s); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'over');
});
FP.test('flow: surface → éclosion puis ready au niveau suivant', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.score.flowers, 1); FP.assertEqual(s.level, 1);
  FP.assertEqual(s.plant.oldTrails.length, 1);
  FP.flow.update(s, 1.6);
  FP.assertEqual(s.mode, 'ready');
});
FP.test('flow: ready exige un nouvel appui', () => {
  const s = flowRun(); s.mode = 'ready';
  s.input = { x: 0, y: 0, down: true, active: true, pressed: false };
  FP.flow.update(s, .1); FP.assertEqual(s.mode, 'ready');
  s.input.pressed = true; FP.flow.update(s, .1); FP.assertEqual(s.mode, 'playing');
});
FP.test('flow: une partie complète tourne sans exception', () => {
  const s = flowRun(); tick(s, 60 * 40);
  FP.assert(['playing', 'dying', 'bloom', 'ready', 'over'].includes(s.mode));
});
