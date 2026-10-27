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
  FP.scoring.records = { flowers: 2, eco: 1000, reach: { saison: 1, milieu: 2 }, won: false };
  FP.scoring.save(mem);
  FP.assertEqual(JSON.stringify(FP.scoring.load(mem)), JSON.stringify({ flowers: 2, eco: 1000, reach: { saison: 1, milieu: 2 }, won: false }));
}));
FP.test('scoring: stockage corrompu → records à 0', () => {
  const bad = { getItem() { return '{oops'; }, setItem() { throw new Error('x'); } };
  FP.assertEqual(JSON.stringify(FP.scoring.load(bad)), JSON.stringify({ flowers: 0, eco: 0, reach: { saison: 1, milieu: 0 }, won: false }));
});
// Les tests ne doivent jamais écrire dans le vrai stockage (dev/check.html partage localStorage avec le jeu).
const memStore = () => ({ data: {}, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });
const withRecords = (fn) => { const saved = FP.scoring.records; try { fn(); } finally { FP.scoring.records = saved; } };
FP.test('scoring: un record battu est mis à jour et sauvegardé (stockage du banc)', () => withRecords(() => {
  const s = scRun(); FP.scoring.records = { flowers: 0, eco: 0, reach: { saison: 1, milieu: 0 }, won: false };
  s.score.eco = 4200; s.score.flowers = 3; FP.scoring.update(s, 0);
  FP.assertEqual(FP.scoring.records.eco, 4200); FP.assertEqual(FP.scoring.records.flowers, 3);
  FP.assertEqual(FP._testStore.data[FP.config.storageKey], JSON.stringify({ flowers: 3, eco: 4200, reach: { saison: 1, milieu: 0 }, won: false }));
}));
FP.test('banc: les tests n’écrivent jamais dans le vrai stockage', () => {
  FP.storage.write('banc-test', 1);
  FP.assertEqual(FP._testStore.data['banc-test'], '1');
});
FP.test('scoring: un gain secoue un peu l’écran', () => {
  const s = scRun(); s.camera.shake = 0; FP.scoring.award(s, 0, 0, 500, 'solid');
  FP.assertEqual(s.camera.shake, .035 + .006);
});
FP.test('scoring: gain fixe (spore) sans combo', () => {
  const s = scRun(); s.camera.shake = 0; FP.scoring.awardFlat(s, 0, 0, 4010);
  FP.assertEqual(s.score.eco, 4000); FP.assertEqual(s.score.combo, 0);
  const e = s.events.find(e => e.type === 'eco'); FP.assert(e.flat && e.combo === 1);
  FP.assertEqual(s.camera.shake, .07 + Math.min(.08, 4000 / 18000));
});
// Saisons et progression (v4.9.0).
FP.test('scoring: les gains sont multipliés par la saison', () => {
  const gains = (saison) => { const s = scRun(); s.run.saison = saison; FP.scoring.award(s, 0, 0, 312, 'solid'); s.score.comboTimer = 0; s.score.combo = 0; FP.scoring.awardCoin(s, 0, 0, 10); FP.scoring.awardFlat(s, 0, 0, 260); return s.events.filter(e => e.type === 'eco').map(e => e.amount); };
  const one = gains(1), two = gains(2);
  FP.assertEqual(JSON.stringify(one), JSON.stringify([300, 10, 250]));
  FP.assertEqual(JSON.stringify(two), JSON.stringify([625, 20, 525]));
});
FP.test('scoring: un ancien record sans progression reçoit des valeurs par défaut', () => {
  const mem = memStore(); mem.setItem(FP.config.storageKey, JSON.stringify({ flowers: 3, eco: 500 }));
  FP.assertEqual(JSON.stringify(FP.scoring.load(mem)), JSON.stringify({ flowers: 3, eco: 500, reach: { saison: 1, milieu: 0 }, won: false }));
});
FP.test('scoring: la progression la plus lointaine est enregistrée', () => withRecords(() => {
  const s = scRun(); FP.scoring.records = { flowers: 0, eco: 0, reach: { saison: 1, milieu: 0 }, won: false };
  s.run.milieu = 2; FP.scoring.update(s, 0); FP.assertEqual(FP.scoring.records.reach.milieu, 2);
  s.run.milieu = 1; FP.scoring.update(s, 0); FP.assertEqual(FP.scoring.records.reach.milieu, 2);
  s.run.saison = 2; s.run.milieu = 0; s.run.won = true; FP.scoring.update(s, 0);
  FP.assertEqual(JSON.stringify(FP.scoring.records.reach), JSON.stringify({ saison: 2, milieu: 0 })); FP.assert(FP.scoring.records.won);
  FP.assert(FP.scoring.reachBeyond({ saison: 2, milieu: 0 }, { saison: 1, milieu: 3 }) && !FP.scoring.reachBeyond({ saison: 1, milieu: 1 }, { saison: 1, milieu: 1 }));
}));
