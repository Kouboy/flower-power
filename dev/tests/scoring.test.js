const scRun = () => FP.state.createRun(1, { W: 440, H: 783 });
FP.test('scoring: premier gain arrondi à 25', () => {
  const s = scRun(); FP.scoring.award(s, 0, 0, 312, 'solid');
  FP.assertEqual(s.score.eco, 300); FP.assertEqual(s.score.combo, 1);
  FP.assert(s.events.some(e => e.type === 'eco' && e.amount === 300));
});
FP.test('scoring: combo +22 % par gain enchaîné, plafond ×8', () => {
  const s = scRun();
  for (let i = 0; i < 10; i++) FP.scoring.award(s, 0, 0, 1000, 'solid');
  FP.assertEqual(s.score.combo, 8);
  const last = s.events.filter(e => e.type === 'eco').pop();
  FP.assertEqual(last.amount, Math.round(1000 * (1 + 7 * .22) / 25) * 25);
});
FP.test('scoring: le combo retombe après 2 s', () => {
  const s = scRun(); FP.scoring.award(s, 0, 0, 500, 'solid');
  FP.scoring.update(s, 2.01); FP.assertEqual(s.score.combo, 0);
  FP.scoring.award(s, 0, 0, 500, 'solid'); FP.assertEqual(s.score.combo, 1);
});
FP.test('scoring: records sauvegardés et relus', () => withRecords(() => {
  const mem = memStore();
  FP.scoring.records = { flowers: 2, eco: 1000 };
  FP.scoring.save(mem);
  FP.assertEqual(JSON.stringify(FP.scoring.load(mem)), JSON.stringify({ flowers: 2, eco: 1000 }));
}));
FP.test('scoring: stockage corrompu → records à 0', () => {
  const bad = { getItem() { return '{oops'; }, setItem() { throw new Error('x'); } };
  FP.assertEqual(JSON.stringify(FP.scoring.load(bad)), JSON.stringify({ flowers: 0, eco: 0 }));
});
// Les tests ne doivent jamais écrire dans le vrai stockage (dev/check.html partage localStorage avec le jeu).
const memStore = () => ({ data: {}, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });
const withRecords = (fn) => { const saved = FP.scoring.records; try { fn(); } finally { FP.scoring.records = saved; } };
FP.test('scoring: un record battu est mis à jour et sauvegardé (stockage du banc)', () => withRecords(() => {
  const s = scRun(); FP.scoring.records = { flowers: 0, eco: 0 };
  s.score.eco = 4200; s.score.flowers = 3; FP.scoring.update(s, 0);
  FP.assertEqual(FP.scoring.records.eco, 4200); FP.assertEqual(FP.scoring.records.flowers, 3);
  FP.assertEqual(FP._testStore.data[FP.config.storageKey], JSON.stringify({ flowers: 3, eco: 4200 }));
}));
FP.test('banc: les tests n’écrivent jamais dans le vrai stockage', () => {
  FP.storage.write('banc-test', 1);
  FP.assertEqual(FP._testStore.data['banc-test'], '1');
});
FP.test('scoring: un gain secoue un peu l’écran', () => {
  const s = scRun(); s.camera.shake = 0; FP.scoring.award(s, 0, 0, 500, 'solid');
  FP.assertEqual(s.camera.shake, .035 + .006);
});
