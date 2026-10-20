const solidAt = (x, y, kind = 'server') => FP.catalog.makeSolid({ kind, x, y, a: 0, flip: 1 });
const worldWith = (...solids) => ({ solids });
FP.test('collision: point dans le polygone → solide', () => {
  const o = solidAt(200, 300);
  FP.assertEqual(FP.collision.queryPoint(worldWith(o), 200, 300).solid, o);
});
FP.test('collision: dans la bande de frôlement → danger', () => {
  const o = solidAt(200, 300);
  const q = FP.collision.queryPoint(worldWith(o), 200 + 38, 300);   // bord du polygone à y=0 ≈ +28,9 px, bande 16
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
