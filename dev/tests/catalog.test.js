FP.test('catalog: 12 assets, dont le T-Rex signature', () => {
  const keys = Object.keys(FP.catalog.assets).sort();
  FP.assertEqual(keys.join(','), 'battery,cone,drone,extinguisher,microwave,nuclear,sarcophagus,server,solar,tire,trashbag,trex_signature');
});
FP.test('catalog: dimensions et collision mises à l’échelle', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.w, 80);
  FP.assertEqual(o.h, 80 * 292 / 302);
  FP.assertEqual(o.collision[0][0], -142.474 * (80 / 302));
  FP.assertEqual(o.collision[0][1], -71.958 * (80 / 302));
  FP.assertEqual(o.grazeRadius, 16);
  FP.assertEqual(o.flyoverEligible, true);
});
FP.test('catalog: flip miroir sur x', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, -1);
  FP.assertEqual(o.collision[0][0], -142.474 * (80 / 302) * -1);
});
FP.test('catalog: T-Rex signature jamais retourné', () => {
  const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, 1);
  FP.assertEqual(o.w, 200);
  FP.assertEqual(o.signature, true);
});
FP.test('catalog: footprint = rectangle rendu + padding', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.footprint.length, 4);
  FP.assertEqual(o.footprint[0].x, 100 - 40 - 7);
  FP.assertEqual(o.footprint[2].x, 100 + 40 + 7);
});
FP.test('catalog: famille inconnue → null', () => FP.assertEqual(FP.catalog.makeSolid({ kind: 'pipe', x: 0, y: 0, a: 0, flip: 1 }), null));
FP.test('catalog: asset sans polygone exclu', () => {
  FP.assert(!FP.catalog.filterAssets({ bad: { collision: { points: [[0,0],[1,1]] } } }).bad);
});
FP.test('catalog: chaque asset a son runtime.src', () => { for (const a of Object.values(FP.catalog.assets)) FP.assert(a.runtime && a.runtime.src, a.id); });
// level.js échantillonne le chemin sûr autour du centre de l'obstacle : un pivot décentré devra être pris en compte là-bas.
FP.test('catalog: tous les assets ont un pivot centré', () => {
  for (const a of Object.values(FP.catalog.assets)) FP.assert(a.render.pivot[0] === .5 && a.render.pivot[1] === .5, a.id);
});
