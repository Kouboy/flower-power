// Jetons rouillés (render/coins.js) : quatre images de rotation dans un carré 11 × 11, sans couleur de danger.
FP.test('coinsRender: chaque image tient dans 11 × 11', () => {
  FP.assertEqual(FP.coinsRender.FRAMES, 6);
  for (let f = 0; f < FP.coinsRender.FRAMES; f++) {
    const c = fakeCtx(); FP.coinsRender.token(c, 0, 0, f);
    FP.assert(c.px.size > 0 && [...c.px.keys()].every(k => k.split(',').every(n => +n >= 0 && +n <= 10)), 'image ' + f);
  }
});
FP.test('coinsRender: la face montre le Ɇ gravé', () => {
  const c = fakeCtx(); FP.coinsRender.token(c, 0, 0, 0);
  FP.assert([...c.px.values()].filter(v => v === FP.palette.coin.engrave).length >= 5);
});
FP.test('coinsRender: la tranche est étroite, la face pleine', () => {
  const w = (f) => { const c = fakeCtx(); FP.coinsRender.token(c, 0, 0, f); const xs = [...c.px.keys()].map(k => +k.split(',')[0]); return Math.max(...xs) - Math.min(...xs) + 1; };
  FP.assertEqual(w(0), 11); FP.assert(w(3) <= 4 && w(1) < 11 && w(1) > w(2) && w(2) > w(3), [0, 1, 2, 3].map(w).join());
  FP.assertEqual(w(4), w(2)); FP.assertEqual(w(5), w(1));   // l'autre moitié du tour, en miroir
});
FP.test('coinsRender: aucune couleur de danger dans les jetons', () => {
  for (const col of Object.values(FP.palette.coin)) FP.assert(!FP.palette.danger.includes(col), col);
});
// Effet de ramassage (v4.7.0) : éclair blanc au départ, puis anneau cuivré qui s'ouvre.
FP.test('coinsRender: le ramassage fait un éclair puis un anneau qui s’ouvre', () => {
  const at = (k) => { const c = fakeCtx(); FP.coinsRender.pop(c, 50, 50, k); return [...c.px.entries()].map(([key, col]) => { const [x, y] = key.split(',').map(Number); return { d: Math.hypot(x - 50, y - 50), col }; }); };
  FP.assert(at(0).some(p => p.d < 2 && p.col === '#ffffff'), 'éclair au centre');
  const ring = (k) => at(k).filter(p => p.col !== '#ffffff');
  const r1 = Math.max(...ring(.3).map(p => p.d)), r2 = Math.max(...ring(.8).map(p => p.d));
  FP.assert(r2 > r1 && r2 <= 13, r1 + ' → ' + r2);
  FP.assertEqual(at(1).length, 0);
});
// Images en calques (v4.7.5) : les six images de rotation sont dessinées une fois, puis recopiées (outils de plantrender.test.js).
FP.test('coinsRender: les jetons en calques donnent exactement les mêmes pixels', () => {
  const s = FP.state.createRun(6, { W: 440, H: 783 }); FP.level.startRun(s);
  const c0 = s.world.coins[Math.floor(s.world.coins.length / 2)];
  s.camera.y = c0.y - 300; s.time = 1.37;
  const direct = fakeLayerCtx(), cached = fakeLayerCtx();
  fakeLayer.made = 0;
  withoutLayer(() => FP.coinsRender.draw(direct, s)); withLayer(() => FP.coinsRender.draw(cached, s));
  FP.assert(fakeLayer.made > 0, 'aucun calque'); FP.assert(direct.px.size > 0); FP.assertEqual(visible(cached, s), visible(direct, s));
});
