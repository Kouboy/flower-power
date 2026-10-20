const camRun = () => FP.state.createRun(1, { W: 440, H: 783 });
FP.test('camera: sans pousse, reste en bas du monde', () => {
  const s = camRun(); s.camera.y = 0;
  for (let i = 0; i < 200; i++) FP.camera.update(s, .016);
  FP.assert(Math.abs(s.camera.y - FP.camera.maxY(s.world)) < .5, String(s.camera.y));
});
FP.test('camera: suit la pointe à 52 % de la hauteur', () => {
  const s = camRun(); s.plant.tip = { x: 220, y: 900 };
  for (let i = 0; i < 300; i++) FP.camera.update(s, .016);
  FP.assert(Math.abs(s.camera.y - (900 - 783 * .52)) < .5, String(s.camera.y));
});
FP.test('camera: bornée en haut', () => {
  const s = camRun(); s.plant.tip = { x: 220, y: 10 };
  for (let i = 0; i < 300; i++) FP.camera.update(s, .016);
  FP.assert(s.camera.y >= 0 && s.camera.y < .5, String(s.camera.y));
});
FP.test('camera: scrollBy borné et manuel', () => {
  const s = camRun();
  FP.camera.scrollBy(s, -1e6); FP.assertEqual(s.camera.y, 0);
  FP.camera.scrollBy(s, 1e6); FP.assertEqual(s.camera.y, FP.camera.maxY(s.world));
  FP.assertEqual(s.camera.manual, true);
  const before = s.camera.y; FP.camera.update(s, .5); FP.assertEqual(s.camera.y, before);
});
FP.test('camera: zoom de frôlement monte avec le danger', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing'; s.plant.tip = { x: 220, y: 1500 };
  s.query = { solid: null, danger: 1, near: null };
  for (let i = 0; i < 120; i++) FP.camera.update(s, 1 / 60);
  FP.assert(Math.abs(s.camera.zoom - 1.22) < .01, String(s.camera.zoom));
  FP.assert(Math.abs(FP.camera.totalZoom(s) - 1.22 * 1.18) < .02);
});
FP.test('camera: pas de cadrage hors partie', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'over';
  FP.assertEqual(FP.camera.totalZoom(s), 1);
});
FP.test('camera: le cadrage reste pendant la mort (pas de saut de zoom)', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing'; s.plant.tip = { x: 220, y: 1500 };
  s.query = { solid: null, danger: 1, near: null };
  for (let i = 0; i < 60; i++) FP.camera.update(s, 1 / 60);
  s.mode = 'dying';
  for (let i = 0; i < 51; i++) { FP.camera.update(s, 1 / 60); FP.assert(FP.camera.totalZoom(s) >= 1.18 - 1e-9, String(FP.camera.totalZoom(s))); }
});
FP.test('camera: cible non finie ignorée', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing';
  const y = s.camera.y; s.plant.tip = { x: 220, y: NaN };
  FP.camera.update(s, .1);
  FP.assertEqual(s.camera.y, y);
});
FP.test('camera: en ready, retour au fond même avec une ancienne pointe', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'ready'; s.plant.tip = { x: 220, y: 200 }; s.camera.y = 0;
  for (let i = 0; i < 200; i++) FP.camera.update(s, 1 / 60);
  FP.assert(Math.abs(s.camera.y - FP.camera.maxY(s.world)) < .5);
});
FP.test('camera: la secousse s’amortit', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.camera.shake = .28;
  FP.camera.update(s, .1); FP.assert(Math.abs(s.camera.shake - .18) < 1e-9);
});
