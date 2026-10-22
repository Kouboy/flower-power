// Écran d'accueil « PRESS TO START » : titre figé, réveil au premier appui, plein écran sur écran tactile seulement.
const splashRun = () => { const s = FP.state.createRun(3, { W: 440, H: 783 }); s.mode = 'splash'; s.time = 4.2; return s; };
FP.test('title: figé sur l’écran d’accueil, animé une fois réveillé', () => {
  const s = splashRun();
  FP.assertEqual(FP.title.clock(s), 0);
  s.time = 9; FP.assertEqual(FP.title.clock(s), 0, 'le temps qui passe ne l’anime pas');
  FP.title.wake(s); s.time = 10;
  FP.assert(FP.title.clock(s) > 0, 'il s’anime après le réveil');
});
FP.test('title: le premier appui réveille le titre sans lancer la partie', () => {
  const s = splashRun(); FP.title.wake(s);
  FP.assertEqual(s.mode, 'menu');
  FP.assertEqual(s.plant.stemCount, 0);
  FP.assert(!s.events.some(e => e.type === 'runStart'));
});
FP.test('title: plein écran seulement sur écran tactile', () => {
  FP.assertEqual(FP.title.wantsFullscreen('touch'), true);
  FP.assertEqual(FP.title.wantsFullscreen('pen'), true);
  FP.assertEqual(FP.title.wantsFullscreen('mouse'), false);
  FP.assertEqual(FP.title.wantsFullscreen(undefined), false, 'clavier');
});
