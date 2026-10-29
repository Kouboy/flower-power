// Version playtest sans boss (v4.13.0, ?sansboss=1) : 6 pousses par milieu, bon de commande toutes les 3, résultats à la fin.
// Aides de flow.test.js et milieux.test.js : flowRun, bloomNow, advance, skipShop, spyShop, nextBloom, killNow.
const playRun = () => { const s = flowRun(); s.run.playtest = true; return s; };
FP.test('playtest: bon de commande toutes les 3 pousses, milieu suivant après 6', () => spyShop(calls => {
  const s = playRun(), seen = [];
  for (let i = 1; i <= 6; i++) { nextBloom(s); seen.push(calls.length); }
  FP.assertEqual(seen.join(), '0,0,1,1,1,2');
  FP.assert(calls.every(c => c.after === 'bloom' && !c.boss), JSON.stringify(calls));
  FP.assertEqual(JSON.stringify([s.run.milieu, s.run.step, s.mode]), JSON.stringify([1, 0, 'ready']));
  FP.assertEqual(s.world.milieu, 'industrie'); FP.assertEqual(s.run.card && s.run.card.kind, 'milieu');
}));
FP.test('playtest: jamais de niveau de boss', () => {
  const s = playRun();
  for (let i = 0; i < 23; i++) { nextBloom(s); FP.assert(!s.run.boss && !s.world.bossLevel, 'boss à la pousse ' + (i + 1)); }
  FP.assertEqual(JSON.stringify([s.run.milieu, s.run.step]), JSON.stringify([3, 5]));
});
FP.test('playtest: fin après la 6ᵉ pousse du dernier milieu', () => spyShop(calls => {
  const s = playRun(); s.run.milieu = 3; s.run.step = 5;
  FP.plant.launch(s); bloomNow(s); advance(s, 8);
  FP.assertEqual(s.mode, 'over'); FP.assertEqual(s.run.done, true); FP.assertEqual(calls.length, 0);
  FP.assertEqual(s.run.saison, 1); FP.assertEqual(s.run.won, false);
}));
FP.test('playtest: game over inchangé', () => {
  const s = playRun(); s.run.milieu = 3; s.run.step = 5; s.plant.reserves = 1; killNow(s);
  FP.assertEqual(s.mode, 'shop'); skipShop(s);
  FP.assertEqual(s.mode, 'over'); FP.assertEqual(s.run.done, false);
});
FP.test('flow: avec boss, toujours 3 pousses puis bon puis boss', () => spyShop(calls => {
  const s = flowRun(); for (let i = 0; i < 3; i++) nextBloom(s);
  FP.assert(s.run.boss); FP.assertEqual(JSON.stringify(calls), JSON.stringify([{ after: 'bloom', boss: true }]));
}));
FP.test('difficulty: la difficulté suit les éclosions, pas les morts', () => {
  const s = playRun(), got = [];
  for (let i = 0; i < 3; i++) { nextBloom(s); got.push(s.difficulty); }
  FP.assertEqual(got.map(d => d.toFixed(6)).join(), ['0.500000', '1.000000', '1.500000'].join());
  killNow(s); FP.assertEqual(s.difficulty.toFixed(6), '1.500000');
  FP.level.generate(s, { lobbying: true }); FP.assertEqual(s.difficulty.toFixed(6), '1.500000');
});
FP.test('difficulty: le pollen pousse, et l’avance s’efface au milieu suivant', () => {
  const s = playRun();
  FP.plant.launch(s); s.score.flowerBonus = 2; bloomNow(s); advance(s, 8); skipShop(s);
  FP.assertEqual(s.run.push, 2); s.score.flowerBonus = 0;
  for (let i = 0; i < 5; i++) nextBloom(s);
  FP.assertEqual(s.run.milieu, 1); FP.assertEqual(s.run.push, 0); FP.assertEqual(s.difficulty.toFixed(6), '1.000000');
});
FP.test('flow: saison 2 au maximum', () => {
  const s = flowRun();
  for (let i = 0; i < 15; i++) nextBloom(s);
  FP.plant.launch(s); bloomNow(s);
  for (let i = 0; i < 900 && s.mode !== 'won'; i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.run.saison, 2); FP.assertEqual(s.difficulty, 10);
});
