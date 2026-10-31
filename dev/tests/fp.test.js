FP.test('rng: reproduit le LCG de la v3', () => {
  const r = FP.createRng(1234);
  FP.assertEqual(r.next(), 0.7143076679203659);
  FP.assertEqual(r.next(), 0.20701311994343996);
  FP.assertEqual(r.next(), 0.7495418272446841);
});
FP.test('rng: même graine, même suite', () => {
  const a = FP.createRng(42), b = FP.createRng(42);
  for (let i = 0; i < 50; i++) FP.assertEqual(a.next(), b.next());
});
FP.test('rng: range reste dans [a,b)', () => {
  const r = FP.createRng(7);
  for (let i = 0; i < 200; i++) { const v = r.range(-3, 5); FP.assert(v >= -3 && v < 5, String(v)); }
});
FP.test('math: clamp et lerp', () => {
  FP.assertEqual(FP.math.clamp(5, 0, 1), 1);
  FP.assertEqual(FP.math.lerp(0, 10, .25), 2.5);
});
FP.test('params: seed valide, 0 compris', () => {
  FP.assertEqual(FP.parseParams('?seed=1234').seed, 1234);
  FP.assertEqual(FP.parseParams('?seed=0').seed, 0);
});
FP.test('params: seed invalide ignorée', () => {
  FP.assertEqual(FP.parseParams('?seed=abc').seed, null);
  FP.assertEqual(FP.parseParams('?seed=-3').seed, null);
  FP.assertEqual(FP.parseParams('').seed, null);
});
FP.test('params: perf et flydebug', () => {
  const p = FP.parseParams('?perf=1&flydebug=1');
  FP.assert(p.perf && p.flydebug);
  FP.assert(!FP.parseParams('?perf=0').perf);
  FP.assert(FP.parseParams('?freecam=1').freecam);
});
FP.test('storage: backend qui lève → fallback, pas d’exception', () => {
  const broken = { getItem(){ throw new Error('blocked'); }, setItem(){ throw new Error('blocked'); } };
  FP.assertEqual(FP.storage.readJSON('k', 0, broken), 0);
  FP.assertEqual(FP.storage.write('k', 5, broken), false);
});
FP.test('storage: readJSON valide, cassé, backend qui lève', () => {
  FP.assertEqual(FP.storage.readJSON('k', null, { getItem() { return '{"a":1}'; } }).a, 1);
  FP.assertEqual(FP.storage.readJSON('k', 7, { getItem() { return '{oops'; } }), 7);
  FP.assertEqual(FP.storage.readJSON('k', 7, { getItem() { return '3'; } }), 7);
  FP.assertEqual(FP.storage.readJSON('k', 7, { getItem() { throw new Error('x'); } }), 7);
});
FP.test('storage: writeJSON backend qui lève → false', () => {
  FP.assertEqual(FP.storage.writeJSON('k', { a: 1 }, { setItem() { throw new Error('x'); } }), false);
});
FP.test('fp: graine hors 32 bits refusée', () => {
  FP.assertEqual(FP.parseParams('?seed=4294967295').seed, 4294967295);
  FP.assertEqual(FP.parseParams('?seed=4294967296').seed, null);
});
FP.test('fp: sansboss=1 active le mode playtest', () => {
  FP.assertEqual(FP.parseParams('?sansboss=1').sansboss, true);
  for (const q of ['', '?sansboss=0', '?sansboss=oui']) FP.assertEqual(FP.parseParams(q).sansboss, false, q);
});
FP.test('fp: plus de choix de version des obstacles (v5.0.0)', () => FP.assert(!('obstacles' in FP.parseParams('?obstacles=dessin'))));
