FP.test('loop: ordre des systèmes de la spec', () => {
  const calls = [], saved = {};
  for (const n of FP.loop.UPDATE_ORDER) { saved[n] = FP[n]; FP[n] = { update(){ calls.push(n); } }; }
  try {
    const s = FP.state.createRun(1); s.mode = 'playing';
    FP.loop.step(s, .016);
    FP.assertEqual(calls.join(','), 'input,plant,hazards,boss,collision,graze,coinPlay,scoring,powerups,shop,flow,camera');
  } finally { for (const n of FP.loop.UPDATE_ORDER) FP[n] = saved[n]; }
});
FP.test('loop: rien ne tourne au menu', () => {
  let called = false; const saved = FP.plant;
  FP.plant = { update(){ called = true; } };
  try { FP.loop.step(FP.state.createRun(1), .016); FP.assert(!called); }
  finally { FP.plant = saved; }
});
FP.test('loop: dt plafonné et dt invalide remplacé', () => {
  const s = FP.state.createRun(1);
  FP.loop.step(s, 5); FP.assertEqual(s.time, .033);
  FP.loop.step(s, NaN); FP.assertEqual(Math.round(s.time*1000), 49);
});
FP.test('loop: events consommés puis vidés', () => {
  const s = FP.state.createRun(1); let seen = 0; const saved = FP.audio;
  let gotState = null, gotDt = 0;
  FP.audio = { consume(ev, st, dt){ seen = ev.length; gotState = st; gotDt = dt; } };
  try { s.events.push({type:'a'},{type:'b'}); FP.loop.step(s, .016); }
  finally { FP.audio = saved; }
  FP.assertEqual(seen, 2); FP.assertEqual(s.events.length, 0);
  FP.assertEqual(gotState, s); FP.assertEqual(gotDt, .016);
});
FP.test('loop: une erreur de système ne fige pas la partie', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  const saved = FP.camera.update; let calls = 0;
  FP.camera.update = () => { calls++; s.events.push({ type: 'x' }); throw new Error('boom'); };
  const err = console.error; let logged = 0; console.error = () => { logged++; };
  try { FP.loop.step(s, 1 / 60); FP.loop.step(s, 1 / 60); } finally { FP.camera.update = saved; console.error = err; }
  FP.assertEqual(calls, 2); FP.assertEqual(s.events.length, 0); FP.assertEqual(logged, 1, 'signalée une seule fois');
});
FP.test('loop: une erreur répétée de mise à jour laisse le rendu tourner', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  const cam = FP.camera.update, render = FP.render, err = console.error; let frames = 0;
  FP.camera.update = () => { throw new Error('répétée'); }; FP.render = { frame() { frames++; } }; console.error = () => {};
  try { for (let i = 0; i < 3; i++) FP.loop.step(s, 1 / 60); } finally { FP.camera.update = cam; FP.render = render; console.error = err; }
  FP.assertEqual(frames, 3);
});
FP.test('loop: une erreur de rendu n’arrête pas la simulation', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  const render = FP.render, err = console.error, t0 = s.plant.stemAge;
  FP.render = { frame() { throw new Error('rendu'); } }; console.error = () => {};
  try { FP.loop.step(s, 1 / 60); FP.loop.step(s, 1 / 60); } finally { FP.render = render; console.error = err; }
  FP.assert(s.plant.stemAge > t0 + 1 / 60, 'la pousse a avancé deux fois'); FP.assertEqual(s.events.length, 0);
});
