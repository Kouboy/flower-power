FP.test('loop: ordre des systèmes de la spec', () => {
  const calls = [], saved = {};
  for (const n of FP.loop.UPDATE_ORDER) { saved[n] = FP[n]; FP[n] = { update(){ calls.push(n); } }; }
  try {
    const s = FP.state.createRun(1); s.mode = 'playing';
    FP.loop.step(s, .016);
    FP.assertEqual(calls.join(','), 'input,plant,hazards,collision,graze,scoring,powerups,flow,camera');
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
