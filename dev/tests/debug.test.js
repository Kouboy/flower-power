// Outils de réglage : absents sans paramètre d'URL (le banc n'en passe aucun).
FP.test('debug: profileur absent par défaut', () => FP.assertEqual(FP.perf, null));
FP.test('debug: flydebug absent par défaut', () => FP.assertEqual(FP.flydebug, null));
// Fausse surface de dessin : on ne retient que les textes écrits.
const textCtx = () => { const texts = []; return { texts, save() {}, restore() {}, beginPath() {}, roundRect() {}, fill() {}, fillText: (t) => texts.push(t) }; };
FP.test('flydebug: un bandeau ne survit pas à la partie', () => {
  const fd = FP._createFlydebug(), W = FP.view;
  FP.view = { W: 440 };
  try {
    const a = FP.state.createRun(1, { W: 440, H: 783 }); a.time = 300;
    a.events.push({ type: 'flyover', outcome: 'spawn', kind: 'water', risk: .66, time: .92, effective: .71, progress: .8 });
    const c1 = textCtx(); fd.draw(c1, a); FP.assertEqual(c1.texts.length, 1);
    const b = FP.state.createRun(2, { W: 440, H: 783 }); b.time = 1;
    const c2 = textCtx(); fd.draw(c2, b); FP.assertEqual(c2.texts.length, 0);
  } finally { FP.view = W; }
});
FP.test('flydebug: formats de la v3', () => {
  const t = FP._createFlydebug().text;
  FP.assertEqual(t({ type: 'flyover', outcome: 'spawn', kind: 'water', risk: .66, time: .92, effective: .71 })[0], 'WATER · 0.92s (0.71 utile) · 66%');
  FP.assertEqual(t({ type: 'flyover', outcome: 'noSpot', kind: 'water', risk: .5, time: 1 })[0], 'FLY 1.00s · 50% · spawn bloqué');
  FP.assertEqual(t({ type: 'bonusMissed', kind: 'water', gate: 'LIBRE' })[1], 1.5);
});
