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
