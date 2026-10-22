// Variantes des fleurs : empreinte pure tirée des données de la fleur (pas d'effet copier-coller dans le parterre).
const gardenOf = (n) => { const r = FP.createRng(9), pals = FP.config.garden.palettes; return Array.from({ length: n }, (_, i) => ({ x: 20 + i * 13, size: 1, maxSize: r.range(.9, 1.15), age: 5, palette: pals[i % pals.length], tilt: r.range(-.1, .1), character: FP.config.cast.ids[i % 16] })); };
FP.test('flowers: une fleur garde sa variante', () => { const f = gardenOf(1)[0]; FP.assertEqual(JSON.stringify(FP.flowersRender.variant(f)), JSON.stringify(FP.flowersRender.variant({ ...f }))); });
FP.test('flowers: au moins 20 variantes sur 30 fleurs', () => { FP.assert(new Set(gardenOf(30).map(f => JSON.stringify(FP.flowersRender.variant(f)))).size >= 20); });
FP.test('flowers: valeurs dans leurs bornes ; plus de visage dans la variante', () => {
  const vs = gardenOf(200).map(FP.flowersRender.variant);
  FP.assert(vs.every(v => v.petals >= 5 && v.petals <= 8 && Math.abs(v.hue) <= 12 && ['round', 'pointy', 'cup', 'double'].includes(v.shape)));
  FP.assert(vs.every(v => !('face' in v)));
});
FP.test('flowers: le cache du parterre contient les fleurs les plus hautes', () => {
  const r = FP.createRng(4), pals = FP.config.garden.palettes, g = FP.config.garden;
  for (let i = 0; i < 400; i++) {
    const f = { x: r.range(10, 430), size: 1, maxSize: i % 4 ? r.range(g.extraSize[0], g.extraSize[1]) : 1, age: 5, palette: pals[i % pals.length], tilt: r.range(-g.tilt, g.tilt), character: FP.config.cast.ids[i % 16] };
    FP.assert(FP.flowersRender.extent(f) <= FP.flowersRender.CACHE_TOP, 'fleur coupée : ' + FP.flowersRender.extent(f));
  }
});
FP.test('flowers: chaque visage fleur reste dans la boîte', () => {
  for (const id of FP.config.cast.ids) { const c = fakeCtx(); FP.cast.get(id).flower(c, 0, 0, '#e8b860'); FP.assert(c.px.size > 0 && inBox(c), id); }
});
