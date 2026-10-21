const grazeRun = () => { const s = FP.state.createRun(2, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.world.solids = []; s.world.toxics = []; s.world.leaks = []; return s; };
const withAwards = (fn) => { const saved = FP.scoring; const got = []; FP.scoring = { award: (s, x, y, a, k) => got.push({ a, k }), update() {} }; try { fn(got); } finally { FP.scoring = saved; } };
const fakeGraze = (s, obj, intensity, kind = 'solid') => { s.query = { solid: null, leak: 0, toxic: 0, danger: intensity, grazes: [{ obj, kind, intensity, x: 100, y: 100 }] }; };
const noGraze = (s) => { s.query = { solid: null, leak: 0, toxic: 0, danger: 0, grazes: [] }; };
FP.test('graze: frôlement soutenu puis sortie → paiement', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 60; i++) { fakeGraze(s, o, .8); FP.graze.update(s, 1 / 60); }
  noGraze(s); FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 1); FP.assert(got[0].a >= 75 && got[0].a % 25 === 0, String(got[0].a));
  FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: trop court → rien', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 10; i++) { fakeGraze(s, o, 1); FP.graze.update(s, 1 / 60); }
  noGraze(s); FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0);
}));
FP.test('graze: trop faible → rien', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 16; i++) { fakeGraze(s, o, .05); FP.graze.update(s, 1 / 60); }
  noGraze(s); FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0);
}));
FP.test('graze: contact annule tout sans payer', () => withAwards(got => {
  const s = grazeRun(), a = { kind: 'server' }, b = { kind: 'tire' };
  for (let i = 0; i < 60; i++) { s.query = { solid: null, leak: 0, toxic: 0, danger: 1, grazes: [{ obj: a, kind: 'solid', intensity: .8, x: 0, y: 0 }, { obj: b, kind: 'solid', intensity: .8, x: 0, y: 0 }] }; FP.graze.update(s, 1 / 60); }
  s.query = { solid: a, leak: 0, toxic: 0, danger: 0, grazes: [] }; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0); FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: hors partie, rien ne survit', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 60; i++) { fakeGraze(s, o, .8); FP.graze.update(s, 1 / 60); }
  s.mode = 'bloom'; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0); FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: limace frôlée → multiplicateur et flash', () => withAwards(got => {
  const s = grazeRun(), l = { hitFlash: 0 };
  for (let i = 0; i < 60; i++) { fakeGraze(s, l, .8, 'leak'); FP.graze.update(s, 1 / 60); }
  FP.assert(l.hitFlash > .2); FP.assertEqual(s.graze.active.get(l).mul, 1.12);
}));
FP.test('graze: obstacle premium ×1,18', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'nuclear' };
  fakeGraze(s, o, .5); FP.graze.update(s, 1 / 60);
  FP.assertEqual(s.graze.active.get(o).mul, 1.18);
}));
FP.test('graze: mesures du flyover', () => withAwards(() => {
  const s = grazeRun(), o = { kind: 'server', y: s.plant.tip.y - 20 };
  for (let i = 0; i < 30; i++) { fakeGraze(s, o, .5); FP.graze.update(s, 1 / 60); }
  const r = s.graze.active.get(o);
  FP.assertEqual(r.startRelY, 20);
  FP.assert(Math.abs(r.intensityTime - .25) < 1e-9);
  FP.assert(Math.abs(r.effectiveTime - .5 * (.45 + .55 * .5)) < 1e-9);
}));
