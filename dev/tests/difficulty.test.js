// Difficulté en dents de scie (v4.13.0) : chaque milieu monte de son départ à son sommet, le suivant repart un peu plus bas.
const runAt = (o) => ({ milieu: 0, step: 0, saison: 1, boss: false, playtest: false, push: 0, ...o });
const near = (a, b, msg) => FP.assert(Math.abs(a - b) < 1e-9, (msg || '') + ' : ' + a + ' ≠ ' + b);
FP.test('difficulty: départs et sommets des quatre milieux, avec et sans boss', () => {
  const starts = [0, .10, .35, .60], peaks = [.25, .50, .75, 1];
  for (const playtest of [true, false]) {
    const S = FP.difficulty.steps(runAt({ playtest }));
    FP.assertEqual(S, playtest ? 6 : 3);
    for (let m = 0; m < 4; m++) {
      near(FP.difficulty.at(runAt({ playtest, milieu: m })), starts[m], 'départ ' + m);
      near(FP.difficulty.at(runAt({ playtest, milieu: m, step: S - 1 })), peaks[m], 'sommet ' + m);
    }
  }
});
FP.test('difficulty: montée linéaire dans un milieu', () => {
  near(FP.difficulty.at(runAt({ playtest: true, milieu: 1, step: 3 })), .34);
});
FP.test('difficulty: le boss se joue au sommet de son milieu', () => {
  near(FP.difficulty.at(runAt({ boss: true, milieu: 2, step: 3 })), .75);
});
FP.test('difficulty: le pollen avance sans dépasser le sommet', () => {
  near(FP.difficulty.at(runAt({ playtest: true, step: 1, push: 2 })), .15);
  near(FP.difficulty.at(runAt({ playtest: true, step: 4, push: 5 })), .25);
});
FP.test('difficulty: saison 2 au maximum, niveau équivalent', () => {
  near(FP.difficulty.at(runAt({ saison: 2 })), 1);
  near(FP.difficulty.level(runAt({ saison: 2 })), 10);
  near(FP.difficulty.level(runAt({})), 0);
});
