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
  FP.assertEqual(FP.config.version, '4.0.0');
  FP.assertEqual(FP.config.storageKey, 'flower_power_v4_best');
  FP.assertEqual(FP.config.palette.skies.length, 4);
});
