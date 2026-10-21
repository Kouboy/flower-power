FP.test('geom: distance point-segment', () => {
  FP.assertEqual(FP.geom.distPointToSegment(0, 5, -10, 0, 10, 0), 5);
  FP.assertEqual(FP.geom.distPointToSegment(13, 4, -10, 0, 10, 0), 5);
});
FP.test('geom: toWorld applique rotation puis translation', () => {
  const p = FP.geom.toWorld({ x: 100, y: 50, a: Math.PI / 2 }, 10, 0);
  FP.assert(Math.abs(p.x - 100) < 1e-9 && Math.abs(p.y - 60) < 1e-9, JSON.stringify(p));
});
const sq = (x, y, s) => [{x, y}, {x: x + s, y}, {x: x + s, y: y + s}, {x, y: y + s}];
FP.test('geom: SAT chevauchement', () => FP.assert(FP.geom.convexPolysOverlap(sq(0,0,10), sq(5,5,10))));
FP.test('geom: SAT disjoints', () => FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,10), sq(20,0,10))));
FP.test('geom: SAT bord à bord n’est pas un chevauchement', () => FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,10), sq(10,0,10))));
FP.test('geom: SAT carré tourné en diagonale', () => {
  const diamond = [{x: 15, y: 5}, {x: 20, y: 10}, {x: 15, y: 15}, {x: 10, y: 10}];
  FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,9.9), diamond));
});
