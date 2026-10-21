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
FP.test('scoring: records sauvegardés et relus', () => {
  const mem = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } };
  FP.scoring.records = { flowers: 2, eco: 1000 };
  FP.scoring.save(mem);
  FP.assertEqual(JSON.stringify(FP.scoring.load(mem)), JSON.stringify({ flowers: 2, eco: 1000 }));
});
FP.test('scoring: stockage corrompu → records à 0', () => {
  const bad = { getItem() { return '{oops'; }, setItem() { throw new Error('x'); } };
  FP.assertEqual(JSON.stringify(FP.scoring.load(bad)), JSON.stringify({ flowers: 0, eco: 0 }));
});
FP.test('scoring: un record battu est mis à jour', () => {
  const s = scRun(); FP.scoring.records = { flowers: 0, eco: 0 };
  s.score.eco = 4200; s.score.flowers = 3; FP.scoring.update(s, 0);
  FP.assertEqual(FP.scoring.records.eco, 4200); FP.assertEqual(FP.scoring.records.flowers, 3);
});
FP.test('scoring: un gain secoue un peu l’écran', () => {
  const s = scRun(); s.camera.shake = 0; FP.scoring.award(s, 0, 0, 500, 'solid');
  FP.assertEqual(s.camera.shake, .035 + .006);
});
