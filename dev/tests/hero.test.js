// Humeur du héros : fonction pure de l'état existant (le rendu ne change rien à la simulation).
const heroRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
FP.test('hero: calme par défaut', () => FP.assertEqual(FP.hero.mood(heroRun(), null).name, 'calm'));
FP.test('hero: le frôlement l’emporte sur le doigt posé', () => { const s = heroRun(); s.input.down = true; s.graze.active.set({}, { time: .3 }); FP.assertEqual(FP.hero.mood(s, null).name, 'graze'); });
FP.test('hero: le toxique l’emporte sur le frôlement ; vertige près de la brûlure', () => { const s = heroRun(); s.graze.active.set({}, { time: .3 }); s.plant.toxicTimer = .7; const m = FP.hero.mood(s, null); FP.assertEqual(m.name, 'toxic'); FP.assert(m.dizzy); });
FP.test('hero: une humeur tient 0,25 s', () => {
  const s = heroRun(); s.time = 10; let m = FP.hero.mood(s, null);
  s.input.down = true; s.time = 10.1; m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'calm');
  s.time = 10.3; m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'focus');
});
FP.test('hero: la mort s’affiche tout de suite, même sur la dernière graine', () => {
  const s = heroRun(); s.time = 5; let m = FP.hero.mood(s, null);
  s.events.push({ type: 'death', cause: 'solid' }); s.mode = 'over'; s.time = 5.01;
  m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'dead'); FP.assertEqual(m.cause, 'solid');
});
FP.test('hero: mort acide → visage qui fond', () => { const s = heroRun(); s.events.push({ type: 'death', cause: 'leak' }); s.mode = 'dying'; FP.assertEqual(FP.hero.mood(s, null).cause, 'melt'); });
