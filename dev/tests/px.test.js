// Boîte à outils pixel et palettes : logique pure, testée sur un faux contexte qui retient les pixels écrits.
const fakeCtx = () => { const px = new Map(); return { px, set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; }, fillRect(x, y, w, h) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px.set((x + i) + ',' + (y + j), this._c); } }; };
FP.test('px: conversion monde → pixel d’art arrondie', () => { FP.assertEqual(FP.px.toArt(5), 3); FP.assertEqual(FP.px.toArt(4.9), 2); FP.assertEqual(FP.px.toArt(-3), -1); });
FP.test('px: un rectangle n’écrit que des pixels entiers', () => { const c = fakeCtx(); FP.px.rect(c, 1, 2, 3, 2, '#fff'); FP.assertEqual(c.px.size, 6); FP.assert([...c.px.keys()].every(k => k.split(',').every(n => Number.isInteger(+n)))); });
FP.test('px: disque symétrique, rangée centrale de 2r + 1', () => {
  const c = fakeCtx(); FP.px.disc(c, 10, 10, 4, '#fff');
  let row = 0; for (let x = 0; x < 20; x++) if (c.px.has(x + ',10')) row++; FP.assertEqual(row, 9);
  for (const k of c.px.keys()) { const [x, y] = k.split(',').map(Number); FP.assert(c.px.has((20 - x) + ',' + y) && c.px.has(x + ',' + (20 - y))); }
});
FP.test('px: anneau creux', () => { const c = fakeCtx(); FP.px.ring(c, 10, 10, 5, '#fff'); FP.assert(!c.px.has('10,10')); FP.assert(c.px.has('15,10') && c.px.has('5,10')); });
FP.test('px: ligne continue (8-connexe)', () => {
  const c = fakeCtx(); FP.px.line(c, 0, 0, 9, 4, '#fff');
  const pts = [...c.px.keys()].map(k => k.split(',').map(Number)).sort((a, b) => a[0] - b[0]);
  FP.assertEqual(pts.length, 10); for (let i = 1; i < pts.length; i++) FP.assert(Math.abs(pts[i][1] - pts[i - 1][1]) <= 1);
});
FP.test('px: tramage 0 = tout A, 16 = tout B, 8 = moitié', () => {
  const count = (lv) => { const c = fakeCtx(); FP.px.dither(c, 0, 0, 8, 8, 'a', 'b', lv); return [...c.px.values()].filter(v => v === 'b').length; };
  FP.assertEqual(count(0), 0); FP.assertEqual(count(16), 64); FP.assertEqual(count(8), 32);
});
FP.test('palette: aucune couleur de danger dans le décor', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const near = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])) < 60;
  for (const c of FP.palette.decor()) for (const d of FP.palette.danger) FP.assert(!near(c, d), c + ' trop proche de ' + d);
});
const img = (w, h, fill) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(fill) });
FP.test('px: réduction d’une image vide → transparente, sans erreur', () => { const r = FP.px.downscale(img(8, 8, 0), 2, 2); FP.assertEqual(r.width, 2); FP.assert(r.data.every((v, i) => i % 4 !== 3 || v === 0)); });
FP.test('px: réduction d’une image opaque → opaque, couleur moyenne', () => { const r = FP.px.downscale(img(4, 4, 255), 2, 2); FP.assert(r.data.every(v => v === 255)); });
FP.test('px: contour autour d’un pixel opaque', () => {
  const s = img(1, 1, 255), o = FP.px.outline(s, '#000000');
  FP.assertEqual(o.width, 3); FP.assertEqual(o.data[(1 * 3 + 0) * 4 + 3], 255); FP.assertEqual(o.data[0 * 4 + 3], 0);   // voisin gauche contouré, coin vide
});
FP.test('px: postérisation sur 8 niveaux', () => { const s = { width: 1, height: 1, data: new Uint8ClampedArray([100, 200, 30, 255]) }; const r = FP.px.posterize(s, 8); FP.assert([...r.data.slice(0, 3)].every(v => [0, 36, 73, 109, 146, 182, 219, 255].includes(v))); });
FP.test('palette: les dangers ne ressemblent pas à la pousse', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const plant = [FP.palette.stem.body, FP.palette.stem.light, FP.palette.stem.leaf, FP.palette.hero.skin, FP.palette.hero.skinLight];
  for (const d of FP.palette.danger) for (const p of plant) FP.assert(dist(d, p) > 110, d + ' trop proche de ' + p);
});
// Contexte factice : enregistre les pixels peints (couleur par pixel) et compte les appels.
const countingCtx = () => { const px = new Map(); let calls = 0; return { px, get calls() { return calls; }, fillStyle: '',
  fillRect(x, y, w, h) { calls++; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px.set((x + i) + ',' + (y + j), this.fillStyle); } }; };
// Référence : le tracé d'origine (un carré par pas de Bresenham).
function refLine(ctx, x0, y0, x1, y1, color, thick) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = (thick - 1) >> 1;
  let err = dx + dy; ctx.fillStyle = color;
  for (;;) { ctx.fillRect(x0 - o, y0 - o, thick, thick); if (x0 === x1 && y0 === y1) return; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
}
FP.test('px: line peint exactement les mêmes pixels qu’avant, en bien moins d’appels', () => {
  let seed = 7; const rnd = (n) => (seed = (seed * 9301 + 49297) % 233280) % n;
  let before = 0, after = 0;
  for (let i = 0; i < 2000; i++) {
    const x0 = rnd(60), y0 = rnd(60), x1 = rnd(60), y1 = rnd(60), thick = 1 + rnd(4);
    const a = countingCtx(), b = countingCtx();
    refLine(a, x0, y0, x1, y1, '#abc', thick); FP.px.line(b, x0, y0, x1, y1, '#abc', thick);
    FP.assertEqual(b.px.size, a.px.size, 'ligne ' + [x0, y0, x1, y1, thick]);
    for (const k of a.px.keys()) FP.assert(b.px.has(k), 'pixel manquant ' + k);
    before += a.calls; after += b.calls;
  }
  FP.assert(after < before * .6, before + ' → ' + after + ' appels');
});
