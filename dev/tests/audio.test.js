// Backend espion : on vérifie quels sons partent, pas le signal.
const spy = () => { const calls = []; let t = 0; return { calls, advance(d) { t += d; }, now: () => t, tone: (...a) => calls.push(['tone', ...a]), noise: (...a) => calls.push(['noise', ...a]), drone: (...a) => calls.push(['drone', ...a]) }; };
const withBackend = (fn) => { const saved = FP.audio._backend; const b = spy(); FP.audio._backend = b; try { fn(b); } finally { FP.audio._backend = saved; } };
const auRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'menu'; return s; };
FP.test('audio: chaque événement joue son son', () => withBackend(b => {
  FP.audio.consume([{ type: 'bloom' }], auRun(), 1 / 60);
  FP.assertEqual(b.calls.filter(c => c[0] === 'tone').length, 5);
}));
FP.test('audio: mort par obstacle ≠ mort acide', () => withBackend(b => {
  FP.audio.consume([{ type: 'death', cause: 'solid' }], auRun(), 0);
  const solid = b.calls.filter(c => c[0] !== 'drone').length; b.calls.length = 0; b.advance(1);
  FP.audio.consume([{ type: 'death', cause: 'leak' }], auRun(), 0);
  FP.assertEqual(solid, 2); FP.assertEqual(b.calls.filter(c => c[0] !== 'drone').length, 3);
}));
FP.test('audio: anti-rafale par type', () => withBackend(b => {
  const ev = Array.from({ length: 8 }, () => ({ type: 'eco', amount: 500 }));
  FP.audio.consume(ev, auRun(), 0);
  FP.assertEqual(b.calls.filter(c => c[0] !== 'drone').length, 3);   // un seul « eco » (2 tons + 1 bruit)
}));
FP.test('audio: drone coupé hors frôlement', () => withBackend(b => {
  const s = auRun(); s.mode = 'bloom';
  FP.audio.consume([], s, 1 / 60);
  FP.assert(b.calls.some(c => c[0] === 'drone' && c[1] === false));
}));
FP.test('audio: drone actif pendant un frôlement', () => withBackend(b => {
  const s = auRun(); s.mode = 'playing'; s.plant.tip = { x: 100, y: 100 };
  const o = { kind: 'server' };
  s.graze.active.set(o, { time: 1, score: 0, peak: .8, kind: 'solid', mul: 1, lastX: 0, lastY: 0 });
  s.query = { solid: null, leak: 0, toxic: 0, danger: .8, grazes: [{ obj: o, kind: 'solid', intensity: .8, x: 0, y: 0 }] };
  FP.audio.consume([], s, 1 / 60);
  FP.assert(b.calls.some(c => c[0] === 'drone' && c[1] === true));
}));
FP.test('audio: sans Web Audio, aucun plantage', () => {
  const saved = FP.audio._backend; FP.audio._backend = null;
  try { FP.audio.consume([{ type: 'bloom' }, { type: 'eco', amount: 1 }], auRun(), 1 / 60); FP.audio.unlock(); }
  finally { FP.audio._backend = saved; }
});
FP.test('flow: entrée en ready → événement ready', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);
  const seen = [];
  for (let i = 0; i < 200 && s.mode !== 'ready'; i++) { s.events.length = 0; FP.flow.update(s, 1 / 60); seen.push(...s.events); }
  FP.assertEqual(s.mode, 'ready'); FP.assert(seen.some(e => e.type === 'ready'));
});
