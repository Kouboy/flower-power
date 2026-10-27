// Limaces (render/hazards.js, v4.7.5) : le sillon, fixe, est dessiné une fois par limace puis recopié (outils de plantrender.test.js).
FP.test('hazardsRender: les sillons en calques donnent exactement les mêmes pixels, éclair compris', () => {
  const s = FP.state.createRun(6, { W: 440, H: 783 }); s.level = 14; FP.level.startRun(s);
  FP.assert(s.world.leaks.length > 0, 'aucune limace');
  const l0 = s.world.leaks[0];
  s.camera.y = l0.y - 300; s.time = 2.4;
  fakeLayer.made = 0;
  for (const flash of [0, 1]) {
    for (const l of s.world.leaks) l.hitFlash = flash;
    const direct = fakeLayerCtx(), cached = fakeLayerCtx();
    withoutLayer(() => FP.hazardsRender.drawLeaks(direct, s)); withLayer(() => FP.hazardsRender.drawLeaks(cached, s));
    FP.assert(direct.px.size > 0); FP.assertEqual(visible(cached, s), visible(direct, s));
  }
  FP.assert(fakeLayer.made > 0, 'aucun calque');
});
