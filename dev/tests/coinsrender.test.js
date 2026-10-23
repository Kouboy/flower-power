// Jetons rouillés (render/coins.js) : quatre images de rotation dans un carré 11 × 11, sans couleur de danger.
FP.test('coinsRender: chaque image tient dans 11 × 11', () => {
  for (let f = 0; f < 4; f++) {
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
  FP.assertEqual(w(0), 11); FP.assert(w(2) <= 4 && w(1) < 11 && w(1) > w(2));
});
FP.test('coinsRender: aucune couleur de danger dans les jetons', () => {
  for (const col of Object.values(FP.palette.coin)) FP.assert(!FP.palette.danger.includes(col), col);
});
