// Silhouette → polygone de collision (v4.14.0, src/world/silhouette.js) : masques synthétiques.
(function () {
  const S = () => FP.silhouette;
  const maskOf = (w, h, f) => { const on = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) on[y * w + x] = f(x + .5, y + .5) ? 1 : 0; return { w, h, on }; };
  const disc = () => maskOf(24, 24, (x, y) => (x - 12) ** 2 + (y - 12) ** 2 <= 100);
  const ring = () => maskOf(28, 28, (x, y) => { const d = (x - 14) ** 2 + (y - 14) ** 2; return d <= 144 && d > 36; });
  const ell = () => maskOf(20, 20, (x, y) => !(x > 10 && y < 10));
  const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const cross = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  const simple = (p) => { for (let i = 0; i < p.length; i++) for (let j = i + 2; j < p.length; j++) { if (i === 0 && j === p.length - 1) continue; if (cross(p[i], p[(i + 1) % p.length], p[j], p[(j + 1) % p.length])) return false; } return true; };

  FP.test('silhouette: disque → polygone qui le couvre', () => {
    const m = disc(), p = S().polygon(m), c = S().coverage(m, p);
    FP.assert(p.length >= 3 && p.length <= 48, String(p.length));
    FP.assert(c.inside >= .95 && c.outside < .03, JSON.stringify(c));
  });
  FP.test('silhouette: le trou d’un anneau est ignoré', () => {
    const p = S().polygon(ring());
    FP.assert(inPoly(p, 14, 14));
  });
  FP.test('silhouette: un L garde son creux', () => {
    const m = ell(), p = S().polygon(m);
    FP.assert(!inPoly(p, 15.5, 4.5)); FP.assert(inPoly(p, 4.5, 4.5) && inPoly(p, 15.5, 15.5));
    const c = S().coverage(m, p); FP.assert(c.inside >= .95 && c.outside < .03, JSON.stringify(c));
  });
  FP.test('silhouette: deux taches → la plus grande', () => {
    const m = maskOf(30, 10, (x, y) => (x < 6 && y < 6) || (x > 12 && x < 28));
    FP.assertEqual(S().components(m), 2);
    const p = S().polygon(m);
    FP.assert(inPoly(p, 20, 5) && !inPoly(p, 3, 3));
  });
  FP.test('silhouette: erode retire le bord', () => {
    const m = S().erode(maskOf(12, 12, (x, y) => x > 1 && x < 11 && y > 1 && y < 11), 1);
    let n = 0; for (const v of m.on) n += v;
    FP.assertEqual(n, 64);
  });
  FP.test('silhouette: jamais plus de 48 points', () => {
    const m = maskOf(240, 12, (x, y) => y > 6 || (Math.floor(x / 2) % 2 === 0));
    const p = S().polygon(m);
    FP.assert(p.length >= 3 && p.length <= 48, String(p.length));
  });
  FP.test('silhouette: le polygone ne se recoupe pas', () => {
    for (const m of [disc(), ring(), ell()]) FP.assert(simple(S().polygon(m)));
  });
  FP.test('silhouette: la diagonale seule ne relie pas', () => {
    const m = maskOf(4, 4, (x, y) => (x < 2 && y < 2) || (x > 2 && y > 2));
    FP.assertEqual(S().components(m), 2);
  });
})();
