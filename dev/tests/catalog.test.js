// Fiches des obstacles (v5.0.0 : PixelLab, générées par dev/tools/import-pixel.js) : 26 familles, T-Rex signature à part.
const RAW = () => window.FLOWER_POWER_OBSTACLES;
FP.test('catalog: 26 familles, dont le T-Rex signature', () => {
  FP.assertEqual(Object.keys(FP.catalog.assets).length, 26);
  FP.assert(FP.catalog.has('trex_signature') && FP.catalog.has('duck') && FP.catalog.has('tire'));
});
FP.test('catalog: dimensions et collision mises à l’échelle', () => {
  const a = RAW().server, o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 }), k = a.render.worldWidth / a.source.width;
  FP.assertEqual(o.w, a.render.worldWidth);
  FP.assertEqual(o.h, a.render.worldWidth * a.source.height / a.source.width);
  FP.assertEqual(o.collision[0][0], a.collision.points[0][0] * k);
  FP.assertEqual(o.collision[0][1], a.collision.points[0][1] * k);
  FP.assertEqual(o.grazeRadius, 16);
  FP.assertEqual(o.flyoverEligible, true);
});
FP.test('catalog: un pixel de l’image = un pixel d’art (deux pour le T-Rex)', () => {
  for (const [k, a] of Object.entries(RAW())) FP.assertEqual(a.render.worldWidth, a.source.width * 2 * (k === 'trex_signature' ? 2 : 1), k);
});
FP.test('catalog: flip miroir sur x', () => {
  const a = FP.catalog.makeSolid({ kind: 'server', x: 0, y: 0, a: 0, flip: 1 }), b = FP.catalog.makeSolid({ kind: 'server', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(b.flip, -1);
  a.collision.forEach(([x, y], i) => { FP.assertEqual(b.collision[i][0], -x); FP.assertEqual(b.collision[i][1], y); });
});
FP.test('catalog: T-Rex signature jamais retourné, le plus grand', () => {
  const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, 1);
  FP.assertEqual(o.signature, true);
  for (const k of Object.keys(RAW())) if (k !== 'trex_signature') {
    FP.assert(!FP.catalog.makeSolid({ kind: k, x: 0, y: 0, a: 0, flip: 1 }).signature, k);
    FP.assert(RAW()[k].render.worldWidth < o.w, k);
  }
});
FP.test('catalog: footprint = rectangle rendu + padding', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.footprint.length, 4);
  const pad = FP.config.level.padding.authored;
  FP.assertEqual(o.footprint[0].x, 100 - o.w / 2 - pad);
  FP.assertEqual(o.footprint[2].x, 100 + o.w / 2 + pad);
});
FP.test('catalog: famille inconnue → null', () => FP.assertEqual(FP.catalog.makeSolid({ kind: 'nope', x: 0, y: 0, a: 0, flip: 1 }), null));
FP.test('catalog: asset sans polygone exclu', () => {
  FP.assert(!FP.catalog.filterAssets({ bad: { collision: { points: [[0,0],[1,1]] } } }).bad);
});
FP.test('catalog: chaque asset a son image', () => {
  for (const [k, a] of Object.entries(FP.catalog.assets)) FP.assertEqual(a.runtime && a.runtime.src, 'assets/obstacles/' + k + '.png', k);
});
FP.test('catalog: collision dans le cadre de l’image, centrée, 48 points au plus', () => {
  for (const [k, a] of Object.entries(RAW())) {
    const pts = a.collision.points;
    FP.assert(pts.length >= 3 && pts.length <= 48, k);
    for (const [x, y] of pts) FP.assert(Math.abs(x) <= a.source.width / 2 && Math.abs(y) <= a.source.height / 2, k + ' ' + x + ',' + y);
  }
});
FP.test('catalog: chaque famille des milieux et des tables existe, avec son cri de mort', () => {
  for (const m of FP.config.milieux) for (const k of m.kinds) FP.assert(FP.catalog.has(k) && FP.config.text.death[k], m.id + ' ' + k);
  for (const b of ['upper', 'middle', 'deep']) for (const e of FP.config.spawnTables[b]) FP.assert(FP.catalog.has(e.kind) && FP.config.text.death[e.kind], e.kind);
});
// level.js échantillonne le chemin sûr autour du centre de l'obstacle : un pivot décentré devra être pris en compte là-bas.
FP.test('catalog: tous les assets ont un pivot centré', () => {
  for (const a of Object.values(FP.catalog.assets)) FP.assert(a.render.pivot[0] === .5 && a.render.pivot[1] === .5, a.id);
});
FP.test('catalog: l’échelle agrandit le sprite et sa collision ensemble', () => {
  const a = FP.catalog.makeSolid({ kind: 'tire', x: 0, y: 0, a: 0, flip: 1 }), b = FP.catalog.makeSolid({ kind: 'tire', x: 0, y: 0, a: 0, flip: 1, scale: 1.1 });
  FP.assert(Math.abs(b.w - a.w * 1.1) < 1e-9 && Math.abs(b.h - a.h * 1.1) < 1e-9);
  b.collision.forEach(([x, y], i) => FP.assert(Math.abs(x - a.collision[i][0] * 1.1) < 1e-9 && Math.abs(y - a.collision[i][1] * 1.1) < 1e-9));
  FP.assert(b.broadR > a.broadR);
});
