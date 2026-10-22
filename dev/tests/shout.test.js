// Cri de mort et aide de première pousse (logique pure) ; plus de messages texte dans la simulation.
FP.test('shout: cri court tiré de la cause, en capitales, avec « ! »', () => {
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'server' }), 'RACK SERVEUR\u00a0!');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'scooter' }), 'TROTTINETTE FOSSILE\u00a0!');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'inconnu' }), 'DÉCHET\u00a0!');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'leak' }), 'LIXIVIAT\u00a0!');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'toxic' }), 'BRÛLÉE\u00a0!');
});
FP.test('shout: chaque cri tient en 2 lignes ×2 sur l’écran le plus étroit', () => {
  const maxW = FP.config.view.minW / FP.px.SCALE - 8;
  const events = [...Object.keys(FP.config.text.death).map(kind => ({ type: 'death', cause: 'solid', kind })), { type: 'death', cause: 'leak' }, { type: 'death', cause: 'toxic' }];
  for (const e of events) {
    const lines = FP.font.wrap(FP.shout.textFor(e), maxW, { scale: 2 });
    FP.assert(lines.length <= 2, FP.shout.textFor(e));
    for (const l of lines) FP.assert(FP.font.measure(l, { scale: 2 }) <= maxW, l);
  }
});
FP.test('shout: aide seulement à la toute première pousse', () => {
  const s = FP.state.createRun(4, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  s.input.down = false; FP.assertEqual(FP.shout.helpFor(s), FP.config.text.help.hold);
  s.input.down = true; FP.assertEqual(FP.shout.helpFor(s), FP.config.text.help.guide);
  s.plant.trail.length = 90; FP.assertEqual(FP.shout.helpFor(s), null);
  s.plant.trail.length = 10; s.plant.stemCount = 2; FP.assertEqual(FP.shout.helpFor(s), null);
});
FP.test('flow: plus de messages texte dans la simulation', () => {
  FP.assertEqual(FP.flow.say, undefined);
  const s = FP.state.createRun(4, { W: 440, H: 783 });
  FP.assert(!('message' in s.flow) && !('messageTimer' in s.flow));
});
FP.test('shout: le « ! » ne part jamais seul sur la deuxième ligne, quelle que soit la largeur', () => {
  const events = [...Object.keys(FP.config.text.death).map(kind => ({ type: 'death', cause: 'solid', kind })), { type: 'death', cause: 'leak' }, { type: 'death', cause: 'toxic' }];
  for (let artW = FP.config.view.minW / FP.px.SCALE; artW <= 260; artW++) {
    for (const e of events) for (const l of FP.font.wrap(FP.shout.textFor(e), artW - 8, { scale: 2 })) FP.assert(l.trim() !== '!', FP.shout.textFor(e) + ' à ' + artW);
  }
});
FP.test('shout: l’aide et « TOUCHER POUR POUSSER » passent au-dessus du combo, sans le toucher', () => {
  const L = FP.hud.layout(366);
  FP.assert(L.textY + FP.font.HEIGHT + 2 <= L.comboY - 2, 'texte ' + L.textY + ', combo ' + L.comboY);   // −2 : accents au-dessus du combo
});
