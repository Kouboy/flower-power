// Kit de dessin des obstacles (v4.14.0, assets/obstacles/dessin/kit.js) : grille, contour teinté, volumes arrondis.
(function () {
  const M = () => FP.drawn.material('#101010', '#404040', '#808080', '#c0c0c0', '#200a0a');
  const count = (g, pred) => { let n = 0; for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (pred(g.get(x, y), x, y)) n++; return n; };

  FP.test('drawn: grid ignore le hors-cadre et arrondit', () => {
    const g = FP.drawn.grid(4, 3), m = M();
    g.set(-1, 0, m[2], m.ink); g.set(4, 1, m[2], m.ink); g.set(1, 3, m[2], m.ink);
    FP.assertEqual(count(g, c => c), 0);
    g.set(1.4, 1.6, m[2], m.ink);
    FP.assertEqual(g.get(1, 2), m[2]); FP.assertEqual(g.ink(1, 2), m.ink);
  });

  FP.test('drawn: render ajoute un contour teinté d’un pixel', () => {
    const m = M(), def = { w: 4, h: 4, paint: (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) FP.drawn.paint(g, x, y, m, 2); } };
    const g = FP.drawn.renderDef(def, 0);
    FP.assertEqual(g.w, 6); FP.assertEqual(g.h, 6);
    FP.assertEqual(g.get(1, 2), m[2]);
    FP.assertEqual(g.get(0, 2), m.ink);
    FP.assertEqual(g.get(0, 0), null);   // la diagonale seule ne reçoit pas de contour
    FP.assertEqual(count(g, c => c === m.ink), 16);
  });

  FP.test('drawn: tone éclaire à gauche et assombrit à droite', () => {
    const m = M();
    FP.assertEqual(FP.drawn.tone(m, -.3), m[3]); FP.assertEqual(FP.drawn.tone(m, .9), m[0]); FP.assertEqual(FP.drawn.tone(m, 0), m[2]);
  });

  FP.test('drawn: roundRect n’a pas d’angle droit', () => {
    const g = FP.drawn.grid(20, 12), m = M();
    FP.drawn.roundRect(g, 0, 0, 20, 12, 3, m);
    for (const [x, y] of [[0, 0], [19, 0], [0, 11], [19, 11]]) FP.assertEqual(g.get(x, y), null, x + ',' + y);
    FP.assert(g.get(10, 6), 'centre peint');
  });

  FP.test('drawn: blob est symétrique sans wobble', () => {
    const g = FP.drawn.grid(31, 21), m = M();
    FP.drawn.blob(g, 15, 10, 12, 8, m);
    const left = count(g, (c, x) => c && x < 15), right = count(g, (c, x) => c && x > 15);
    FP.assert(left > 50 && Math.abs(left - right) <= 2, left + ' / ' + right);
  });

  FP.test('drawn: over ne peint que sur un pixel déjà peint', () => {
    const g = FP.drawn.grid(3, 1), m = M();
    FP.drawn.paint(g, 0, 0, m, 2); FP.drawn.over(g, 0, 0, m, 3); FP.drawn.over(g, 1, 0, m, 3);
    FP.assertEqual(g.get(0, 0), m[3]); FP.assertEqual(g.get(1, 0), null);
  });

  FP.test('drawn: stains ne tache que la forme, et autrement selon la graine', () => {
    const m = M(), fill = () => { const g = FP.drawn.grid(10, 10); for (let x = 0; x < 5; x++) for (let y = 0; y < 10; y++) FP.drawn.paint(g, x, y, m, 2); return g; };
    const a = fill(), b = fill();
    FP.drawn.stains(a, m, 0, 30, 1, { x: 0, y: 0, w: 10, h: 10 }); FP.drawn.stains(b, m, 0, 30, 2, { x: 0, y: 0, w: 10, h: 10 });
    FP.assertEqual(count(a, (c, x) => c && x >= 5), 0);
    FP.assert(count(a, c => c === m[0]) > 0 && count(a, (c, x, y) => c !== b.get(x, y)) > 0);
  });

  FP.test('drawn: hash est déterministe et dans [0, 1[', () => {
    for (let i = 0; i < 200; i++) {
      const h = FP.drawn.hash(i, i * 3, 7);
      FP.assert(h >= 0 && h < 1, String(h)); FP.assertEqual(h, FP.drawn.hash(i, i * 3, 7));
    }
  });
})();
