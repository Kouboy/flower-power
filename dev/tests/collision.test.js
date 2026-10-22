const solidAt = (x, y, kind = 'server') => FP.catalog.makeSolid({ kind, x, y, a: 0, flip: 1 });
const worldWith = (...solids) => ({ solids });
FP.test('collision: point dans le polygone → solide', () => {
  const o = solidAt(200, 300);
  FP.assertEqual(FP.collision.queryPoint(worldWith(o), 200, 300).solid, o);
});
FP.test('collision: dans la bande de frôlement → danger', () => {
  const o = solidAt(200, 300);
  const k = o.w / 80, q = FP.collision.queryPoint(worldWith(o), 200 + 38 * k, 300);   // bord du polygone à y=0 ≈ +28,9 px × k, bande 16
  FP.assertEqual(q.solid, null);
  FP.assert(q.danger > 0 && q.danger < 1, String(q.danger));
  FP.assertEqual(q.near, o);
});
FP.test('collision: loin → rien', () => {
  const q = FP.collision.queryPoint(worldWith(solidAt(200, 300)), 400, 700);
  FP.assertEqual(q.solid, null); FP.assertEqual(q.danger, 0);
});
FP.test('collision: rotation et miroir respectés', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 200, y: 300, a: Math.PI / 2, flip: -1 });
  for (const [lx, ly] of o.collision.slice(0, 4)) {
    const p = FP.geom.toWorld(o, lx * .8, ly * .8);
    FP.assertEqual(FP.collision.queryPoint(worldWith(o), p.x, p.y).solid, o);
  }
});
FP.test('geom: sdPoly signe', () => {
  const sq = [[0,0],[10,0],[10,10],[0,10]];
  FP.assertEqual(FP.geom.sdPoly(5, 5, sq), -5);
  FP.assertEqual(FP.geom.sdPoly(13, 5, sq), 3);
});
FP.test('collision: contact lixiviat', () => {
  const l = { x: 200, y: 300, len: 100, angle: 0, r: 12, cx: 200, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [], toxics: [], leaks: [l] }, 205, 300);
  FP.assert(q.leak > 0 && q.leakHit === l);
});
FP.test('collision: frôlement de limace → danger', () => {
  const l = { x: 200, y: 300, len: 100, angle: 0, r: 12, cx: 200, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [], toxics: [], leaks: [l] }, 200, 300 + 30);
  FP.assertEqual(q.leak, 0); FP.assert(q.danger > 0 && q.danger <= .98);
});
FP.test('collision: intensité toxique cumulée', () => {
  const o = { x: 200, y: 300, rx: 40, ry: 30, a: 0 };
  FP.assertEqual(FP.collision.queryPoint({ solids: [], toxics: [o, o], leaks: [] }, 200, 300).toxic, 2);
});
FP.test('collision: liste des frôlements', () => {
  const o = solidAt(200, 300);
  const l = { x: 400, y: 300, len: 0, angle: 0, r: 12, cx: 400, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [o], toxics: [], leaks: [l] }, 200 + 38 * o.w / 80, 300);   // dans la bande de frôlement du rack
  FP.assertEqual(q.grazes.length, 1); FP.assertEqual(q.grazes[0].obj, o); FP.assertEqual(q.grazes[0].kind, 'solid');
});
FP.test('collision: toutes les limaces touchées clignotent', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  s.world.solids = []; s.world.toxics = [];
  const leak = () => ({ x: s.plant.tip.x, y: s.plant.tip.y, len: 40, angle: 0, r: 12, cx: s.plant.tip.x, cy: s.plant.tip.y, cr: 12, hitFlash: 0 });
  s.world.leaks = [leak(), leak()];
  FP.collision.update(s);
  FP.assert(s.world.leaks.every(l => l.hitFlash > 0));
});
