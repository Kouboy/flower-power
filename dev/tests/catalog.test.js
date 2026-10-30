FP.test('catalog: 14 assets, dont le T-Rex signature', () => {
  const keys = Object.keys(FP.catalog.assets).sort();
  FP.assertEqual(keys.join(','), 'arcade,battery,cone,drone,extinguisher,microwave,nuclear,sarcophagus,scooter,server,solar,tire,trashbag,trex_signature');
});
const SERVER_W = 120;   // worldWidth du rack serveur (échelle v4.2.1)
FP.test('catalog: dimensions et collision mises à l’échelle', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.w, SERVER_W);
  FP.assertEqual(o.h, SERVER_W * 292 / 302);
  FP.assertEqual(o.collision[0][0], -142.474 * (SERVER_W / 302));
  FP.assertEqual(o.collision[0][1], -71.958 * (SERVER_W / 302));
  FP.assertEqual(o.grazeRadius, 16);
  FP.assertEqual(o.flyoverEligible, true);
});
FP.test('catalog: flip miroir sur x', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, -1);
  FP.assertEqual(o.collision[0][0], -142.474 * (SERVER_W / 302) * -1);
});
FP.test('catalog: T-Rex signature jamais retourné', () => {
  const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, 1);
  FP.assertEqual(o.w, 280);   // v4.3.0 : squelette entier de T-Rex (12 m) : un monument, bien plus grand que tout le reste
  FP.assertEqual(o.signature, true);
});
FP.test('catalog: footprint = rectangle rendu + padding', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.footprint.length, 4);
  const pad = FP.config.level.padding.authored;
  FP.assertEqual(o.footprint[0].x, 100 - SERVER_W / 2 - pad);
  FP.assertEqual(o.footprint[2].x, 100 + SERVER_W / 2 + pad);
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
FP.test('catalog: l’échelle agrandit le sprite et sa collision ensemble', () => {
  const a = FP.catalog.makeSolid({ kind: 'tire', x: 0, y: 0, a: 0, flip: 1 }), b = FP.catalog.makeSolid({ kind: 'tire', x: 0, y: 0, a: 0, flip: 1, scale: 1.1 });
  FP.assert(Math.abs(b.w - a.w * 1.1) < 1e-9 && Math.abs(b.h - a.h * 1.1) < 1e-9);
  b.collision.forEach(([x, y], i) => FP.assert(Math.abs(x - a.collision[i][0] * 1.1) < 1e-9 && Math.abs(y - a.collision[i][1] * 1.1) < 1e-9));
  FP.assert(b.broadR > a.broadR);
});
FP.test('catalog: nouveaux déchets importés (trottinette, borne d’arcade), placés et nommés à la mort', () => {
  for (const k of ['scooter', 'arcade']) {
    FP.assert(FP.catalog.has(k), k + ' absent du catalogue');
    FP.assert(FP.config.text.death[k], k + ' sans message de mort');
    FP.assert(['upper', 'middle', 'deep'].some(b => FP.config.spawnTables[b].some(e => e.kind === k)), k + ' absent des tables d’apparition');
  }
  // tout ce que les tables peuvent tirer existe au catalogue et a son message
  for (const b of ['upper', 'middle', 'deep']) for (const e of FP.config.spawnTables[b]) FP.assert(FP.catalog.has(e.kind) && FP.config.text.death[e.kind], e.kind);
});
FP.test('catalog: échelle qui suit le réel (la batterie, la plus petite, garde 80 de large)', () => {
  const kinds = ['battery', 'drone', 'extinguisher', 'microwave', 'cone', 'trashbag', 'tire', 'nuclear', 'server', 'scooter', 'solar', 'sarcophagus', 'arcade'];
  const o = Object.fromEntries(kinds.map(k => [k, FP.catalog.makeSolid({ kind: k, x: 0, y: 0, a: 0, flip: 1 })]));
  FP.assertEqual(o.battery.w, 80); FP.assertEqual(o.drone.w, 80);
  for (const k of kinds) FP.assert(o[k].h <= o.arcade.h, 'la borne est la plus grande (' + k + ')');
  FP.assert(o.drone.h < o.cone.h && o.cone.h < o.server.h && o.server.h < o.sarcophagus.h, 'petit drone, cône moyen, gros rack, grand cercueil');
  FP.assert(o.arcade.h / Math.min(o.battery.h, o.drone.h) <= 2.7, 'écart compressé');
});
// Version dessinée (v4.14.0, ?obstacles=dessin) : fiches au format des fiches PNG, collision tirée du dessin.
(function () {
  const PNG = () => FP.catalog.filterAssets(window.FLOWER_POWER_AUTHORED_ASSETS);
  const m = FP.drawn.material('#202020', '#505050', '#909090', '#d0d0d0', '#100808');
  const square = { w: 20, h: 20, paint: (g) => { for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) FP.drawn.paint(g, x, y, m, 2); } };
  const drawnCone = () => FP.catalog.drawnAssets({ cone: square, nope: square }, PNG());

  FP.test('catalog: sans paramètre, les fiches PNG de la v4.13', () => {
    FP.catalog.select(null);
    const png = PNG();
    FP.assertEqual(Object.keys(FP.catalog.assets).sort().join(), Object.keys(png).sort().join());
    for (const k of Object.keys(png)) FP.assertEqual(FP.catalog.assets[k].render.worldWidth, png[k].render.worldWidth, k);
  });
  FP.test('catalog: une fiche dessinée reprend les réglages de la fiche PNG', () => {
    const d = drawnCone(), a = d.cone, p = PNG().cone;
    FP.assert(!d.nope, 'famille sans fiche PNG écartée');
    FP.assertEqual(a.drawn, true);
    FP.assertEqual(JSON.stringify(a.render.pivot), JSON.stringify(p.render.pivot));
    FP.assertEqual(a.render.mirrorSafe, p.render.mirrorSafe);
    FP.assertEqual(a.collision.grazeRadius, p.collision.grazeRadius);
    FP.assertEqual(a.collision.flyoverEligible, p.collision.flyoverEligible);
    FP.assertEqual(JSON.stringify(a.spawn), JSON.stringify(p.spawn));
    FP.assert(!a.runtime.src && !a.runtime.metadata, 'pas de PNG');
  });
  FP.test('catalog: worldWidth dessiné = largeur de la grille × 2', () => {
    const a = drawnCone().cone;
    FP.assertEqual(a.source.width, 22); FP.assertEqual(a.source.height, 22); FP.assertEqual(a.render.worldWidth, 44);
  });
  FP.test('catalog: la collision dessinée est centrée sur le pivot', () => {
    const pts = drawnCone().cone.collision.points;
    FP.assert(pts.length >= 3);
    for (const [x, y] of pts) FP.assert(Math.abs(x) <= 11 && Math.abs(y) <= 11, x + ',' + y);
  });
  FP.test('catalog: solide dessiné à l’échelle .5 et retourné', () => {
    Object.assign(FP.catalog.assets, drawnCone());
    try {
      const a = FP.catalog.makeSolid({ kind: 'cone', x: 0, y: 0, a: 0, flip: 1, scale: .5 });
      const b = FP.catalog.makeSolid({ kind: 'cone', x: 0, y: 0, a: 0, flip: -1, scale: .5 });
      FP.assertEqual(a.w, 22);
      a.collision.forEach(([x, y], i) => { FP.assertEqual(b.collision[i][0], -x); FP.assertEqual(b.collision[i][1], y); });
    } finally { FP.catalog.select(null); }
  });
})();
