FP.test('state: forme complète', () => {
  const s = FP.state.createRun(1234);
  for (const k of ['mode','time','seed','level','rng','camera','plant','world','graze','power','score','fx','events'])
    FP.assert(k in s, 'clé manquante: ' + k);
  FP.assertEqual(s.mode, 'menu');
  FP.assertEqual(s.seed, 1234);
  FP.assertEqual(s.plant.reserves, 3);
  FP.assertEqual(s.power.shield, false);
  FP.assertEqual(s.events.length, 0);
});
FP.test('state: deux runs ne partagent rien', () => {
  const a = FP.state.createRun(1), b = FP.state.createRun(1);
  a.events.push({type:'x'}); a.world.solids.push({});
  FP.assertEqual(b.events.length, 0);
  FP.assertEqual(b.world.solids.length, 0);
});
FP.test('state: rng du run suit la graine', () => {
  FP.assertEqual(FP.state.createRun(1234).rng.next(), 0.7143076679203659);
});
FP.test('state: graine aléatoire si absente', () => {
  const s = FP.state.createRun();
  FP.assert(Number.isInteger(s.seed) && s.seed >= 0 && s.seed < 999999, String(s.seed));
});
FP.test('config: version et clé de record', () => {
  FP.assertEqual(FP.config.version, '4.4.2');
  FP.assertEqual(FP.config.storageKey, 'flower_power_v4_best');
  FP.assertEqual(FP.palette.sky.length, FP.config.level.skyVariants);   // une palette de ciel par variante tirée
  FP.assertEqual(FP.palette.lawn.length, FP.config.level.lawnVariants);
});
FP.test('state: dimensions du monde à la création', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.assertEqual(s.world.width, 440);
  FP.assertEqual(s.world.viewH, 783);
  FP.assertEqual(s.world.height, 1840);          // max(783+620, floor(783*2.35))
  FP.assertEqual(s.world.surfaceY, 783 * .19);
  FP.assertEqual(s.camera.y, 1840 - 783);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 600 }).world.surfaceY, 114);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 2000 }).world.surfaceY, 160);
});
FP.test('state: T-Rex signature désarmé à la création', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.assertEqual(s.signature.armed, false);
  FP.assertEqual(s.signature.spawned, false);
});
FP.test('state: applyView suit la nouvelle hauteur de vue et borne la caméra', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });   // height 1840, camera.y 1057
  FP.state.applyView(s, { W: 600, H: 1000 });
  FP.assertEqual(s.world.viewH, 1000);
  FP.assertEqual(s.world.width, 440);                    // la génération garde ses coordonnées
  FP.assertEqual(s.camera.y, 840);                       // ramenée dans [0, 1840 − 1000]
  FP.state.applyView(s, { W: 300, H: 500 });
  FP.assertEqual(s.world.viewH, 500);
  FP.assertEqual(s.camera.y, 840);                       // toujours dans les bornes, inchangée
});
FP.test('state: la requête initiale a sa liste de frôlements', () => FP.assert(Array.isArray(FP.state.createRun(1, { W: 440, H: 783 }).query.grazes)));
