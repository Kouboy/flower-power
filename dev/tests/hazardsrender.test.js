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
// Nappes préparées hors du jeu (v4.7.5) : une par appel, la plus proche de l'écran d'abord ; plus rien quand tout est prêt.
FP.test('hazardsRender: hors du jeu, les nappes se préparent une à une, les plus proches d’abord', () => {
  const s = FP.state.createRun(6, { W: 440, H: 783 }); s.level = 14; FP.level.startRun(s);
  const pools = s.world.toxics, mid = () => s.camera.y + s.world.viewH / 2;
  FP.assert(pools.length > 2, 'trop peu de nappes');
  s.camera.y = pools[0].y - 200;
  withLayer(() => {
    FP.hazardsRender.prewarm(s);
    const ready = pools.filter(o => o._px);
    FP.assertEqual(ready.length, 1);
    FP.assertEqual(Math.min(...pools.map(o => Math.abs(o.y - mid()))), Math.abs(ready[0].y - mid()));
    for (let i = 1; i < pools.length; i++) FP.hazardsRender.prewarm(s);
    FP.assert(pools.every(o => o._px), 'toutes prêtes');
    fakeLayer.made = 0; FP.hazardsRender.prewarm(s); FP.assertEqual(fakeLayer.made, 0);
  });
});
