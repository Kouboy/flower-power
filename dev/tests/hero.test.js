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
FP.test('hero: sûr de lui sous le bouclier, mais le frôlement reste prioritaire', () => {
  const s = heroRun(); s.power.shield = true; s.input.down = true;
  FP.assertEqual(FP.hero.mood(s, null).name, 'shield');
  s.graze.active.set({}, { time: .3 }); FP.assertEqual(FP.hero.mood(s, null).name, 'graze');
});
// Tête composée (v4.4.0) : chaque personnage, dans chaque humeur, tient dans sa boîte et laisse voir le danger.
const castDefined = () => FP.config.cast.ids.filter(id => FP.cast.get(id));
const paintPx = (id, mood, o) => { const c = fakeCtx(); FP.hero.paint(c, 0, 0, id, mood, o); return c; };
FP.test('hero: chaque personnage défini reste dans la boîte', () => {
  for (const id of castDefined()) for (const { mood, o } of faceCases()) {
    const c = paintPx(id, mood, { ...o, sweat: true });
    FP.assert(inBox(c), id + ' ' + mood + ' ' + JSON.stringify(o) + ' : ' + [...c.px.keys()].filter(k => k.split(',').some(n => Math.abs(+n) > 12)).slice(0, 3));
  }
});
FP.test('hero: chez chaque personnage, alerte et mort se distinguent du calme', () => {
  for (const id of castDefined()) {
    const calm = pixelsOf(paintPx(id, 'calm', {}));
    for (const [mood, o] of [['alarm', {}], ['dead', { cause: 'solid' }], ['dead', { cause: 'melt' }]]) FP.assert(pixelsOf(paintPx(id, mood, o)) !== calm, id + ' ' + mood);
  }
});
FP.test('hero: la bouche spéciale ne sort qu’au calme et en concentration', () => {
  const def = FP.cast.get('lapin'), keep = def.mouth; let n = 0;
  def.mouth = () => { n++; };
  try {
    for (const mood of ['calm', 'focus']) FP.hero.paint(fakeCtx(), 0, 0, 'lapin', mood, {});
    FP.assertEqual(n, 2);
    for (const mood of ['graze', 'alarm', 'toxic', 'shield', 'dead']) FP.hero.paint(fakeCtx(), 0, 0, 'lapin', mood, {});
    FP.assertEqual(n, 2);
  } finally { def.mouth = keep; }
});
FP.test('hero: les huit premiers personnages sont définis', () => {
  for (const id of FP.config.cast.ids.slice(0, 8)) { const d = FP.cast.get(id); FP.assert(d && typeof d.flower === 'function', id); }
});
FP.test('hero: le casting est complet', () => {
  for (const id of FP.config.cast.ids) { const d = FP.cast.get(id); FP.assert(d && d.id === id && typeof d.flower === 'function', id); }
});
FP.test('hero: chez les 16, les pupilles tournent juste avant la brûlure', () => {
  for (const id of FP.config.cast.ids) {
    const frames = new Set([0, .13, .26, .39].map(t => pixelsOf(paintPx(id, 'toxic', { dizzy: true, t }))));
    FP.assert(frames.size >= 2, id);
  }
});
FP.test('hero: chez les 16, les dents serrées du frôlement restent visibles', () => {
  const teeth = FP.palette.hero.teeth;
  for (const id of FP.config.cast.ids) {
    const c = paintPx(id, 'graze', {});
    FP.assert([...c.px.entries()].some(([k, col]) => col === teeth && +k.split(',')[1] >= 2), id);
  }
});
