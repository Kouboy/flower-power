// Rendu du boss (v4.12.0) : flèche, dessin provisoire, teinte réservée aux points faibles, retours du perçage.
// Aides de dev/tests/boss.test.js (chargé avant) : bossRun, bossFlow, tipOn, B ; de decor.test.js : recCtx.
// Pointe sous le point faible j, caméra qui la suit, cadrage réel (×1,18 autour de la pointe, comme render/frame.js).
const arrowView = (j, below, pierced = []) => {
  const s = bossRun(440, 0), wk = s.world.bossLevel.weak[j];
  s.mode = 'playing'; s.plant.tip = { x: wk.x, y: wk.y + below };
  s.camera.y = s.plant.tip.y - s.world.viewH * FP.config.camera.followRatio;
  pierced.forEach(i => { s.bossFight.pierced[i] = true; });
  return s;
};
// Écran → la transformation de render/frame.js (zoom autour du point focal), recalculée ici depuis la configuration.
const zoomOf = (s) => {
  const f = FP.config.camera.focalY, H = s.world.viewH;
  return { z: FP.camera.totalZoom(s), fx: FP.input.focalX(s), fy: Math.min(H * f.max, Math.max(H * f.min, s.plant.tip.y - s.camera.y)) };
};
FP.test('bossRender: la flèche vise le prochain point faible au-dessus de la pointe, hors de l’écran zoomé, et se dessine dans l’écran', () => {
  const H = 782, W = 440;
  // Le point 1 est dans la vue sans zoom, mais hors de la vue zoomée (le point 0, percé, est juste sous la pointe) : flèche vers le haut, dans l'écran.
  let s = arrowView(1, 355, [0]), a = FP.bossRender.arrowFor(s);
  FP.assert(a && a.dir === 'up', 'flèche vers le haut ' + JSON.stringify(a));
  FP.assert(a.x >= 0 && a.x <= W && a.y >= 0 && a.y <= H, 'ancre dans l’écran ' + JSON.stringify(a));
  // Ce qui est dessiné (teinte du point faible, loin de tout point faible) retombe dans l'écran une fois zoomé.
  const g = recCtx(), Z = zoomOf(s), S = FP.px.SCALE, cam = FP.px.toArt(s.camera.y);
  FP.bossRender.draw(g, s);
  const mine = g.rects.filter(r => r.c === FP.palette.boss.weak[0] &&
    s.world.bossLevel.weak.every(k => Math.hypot(r.x - FP.px.toArt(k.x), r.y - (FP.px.toArt(k.y) - cam)) > 8));
  FP.assert(mine.length > 0, 'flèche dessinée');
  for (const r of mine) {
    const sx = Z.fx + (r.x * S - Z.fx) * Z.z, sy = Z.fy + (r.y * S - Z.fy) * Z.z;
    FP.assert(sx >= 0 && sx <= W && sy >= 0 && sy <= H, `flèche hors de l’écran (${sx | 0}, ${sy | 0})`);
  }
  // Point raté sous la pointe : la flèche vise le suivant au-dessus, pas lui.
  s = arrowView(1, 355); a = FP.bossRender.arrowFor(s);
  FP.assert(a && a.dir === 'up' && Math.abs(a.x - Math.min(W - FP.config.boss.arrowMargin, Math.max(FP.config.boss.arrowMargin, Z.fx + (s.world.bossLevel.weak[1].x - Z.fx) * Z.z))) < 1e-6, 'vise le point 1 ' + JSON.stringify(a));
  // Le prochain point au-dessus est à l'écran : rien.
  FP.assertEqual(FP.bossRender.arrowFor(arrowView(1, 100, [0])), null);
  // Les points restants sont tous sous la pointe (ratés) : rien, les icônes du HUD le disent.
  FP.assertEqual(FP.bossRender.arrowFor(arrowView(3, -60, [2, 3])), null);
  s = arrowView(1, 355); s.bossFight.pierced.fill(true); FP.assertEqual(FP.bossRender.arrowFor(s), null);
  const n = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.startRun(n); FP.assertEqual(FP.bossRender.arrowFor(n), null);
});
FP.test('bossRender: dessine sans erreur, points faibles dans la teinte réservée', () => {
  for (let milieu = 0; milieu < 4; milieu++) {
    const s = bossRun(440, milieu), wk = s.world.bossLevel.weak[1];
    s.camera.y = wk.y - s.world.viewH / 2; s.time = 1.3;
    const g = recCtx(); FP.bossRender.draw(g, s);
    FP.assert(g.rects.length > 50, 'rien dessiné');
    FP.assert(g.rects.some(r => r.c === FP.palette.boss.weak[0]), 'point faible absent (milieu ' + milieu + ')');
    for (const t of [0, .4, .9, 1.5, 2.2]) { s.time = t; s.bossFight.pierced[1] = t > 1; FP.bossRender.draw(recCtx(), s); }
    s.world.bossLevel.trap.solid.off = true; s.camera.y = 0; FP.bossRender.draw(recCtx(), s);
  }
  FP.bossRender.draw(recCtx(), FP.state.createRun(3, { W: 440, H: 783 }));   // niveau normal : rien, sans erreur
});
// Les points faibles sont toujours sous la trappe : ciel et décor de surface ne partagent jamais leur zone, on ne les compare pas.
FP.test('palette: le blanc-jaune des points faibles se distingue de tout ce qui partage leur zone (terre, boss, plante, pièces, dangers)', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const P = FP.palette, W = P.boss.weak;
  const others = [...Object.values(P.milieux).flatMap(m => [...m.strata.humus, ...m.strata.clay, ...m.strata.stone]),
    ...P.boss.trap, ...P.boss.plate, ...P.boss.jet, ...P.boss.glow, ...P.boss.smoke, P.boss.hole, ...Object.values(P.boss.milieux).flatMap(m => Object.values(m)),
    ...P.danger, ...Object.values(P.stem), ...Object.values(P.hero), ...Object.values(P.coin)];
  for (const c of W) for (const t of others) FP.assert(dist(c, t) > 60, c + ' trop proche de ' + t);
});
FP.test('palette: les teintes du boss restent à 60 de toute teinte de danger', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const B = FP.palette.boss, all = [...B.weak, ...B.trap, ...B.plate, ...B.jet, ...B.glow, ...B.smoke, B.hole, ...Object.values(B.milieux).flatMap(m => Object.values(m))];
  for (const c of all) for (const d of FP.palette.danger) FP.assert(dist(c, d) >= 60, c + ' trop proche du danger ' + d);
});
FP.test('bossTrap: openedAt posé au 4e perçage, -Infinity si le niveau est régénéré ouvert, et le dessin n’écrit rien', () => {
  const s = bossRun(440, 0), bl = s.world.bossLevel;
  FP.assertEqual(bl.trap.openedAt, null);
  s.mode = 'playing'; s.time = 12.5;
  for (const w of bl.weak) { s.plant.tip = { x: w.x, y: w.y }; FP.boss.update(s, 0); }
  FP.assertEqual(bl.trap.solid.off, true); FP.assertEqual(bl.trap.openedAt, 12.5);
  FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel.trap.openedAt, -Infinity);
  const tr = s.world.bossLevel.trap, snap = JSON.stringify(tr);
  s.camera.y = 0; s.time = 13; FP.bossRender.draw(recCtx(), s);
  FP.assertEqual(JSON.stringify(tr), snap);
});
FP.test('bossPierce: gerbe d’étincelles, jetons qui jaillissent, gain flottant — sans teinte de danger', () => {
  const s = bossFlow(); s.fx.particles = []; s.fx.effects = [];
  const w = s.world.bossLevel.weak[1]; s.camera.y = w.y - s.world.viewH / 2;
  tipOn(s, 1); FP.boss.update(s, 0);
  FP.particles.draw(recCtx(), s); FP.effects.draw(recCtx(), s);
  const sparks = s.fx.particles.filter(q => q.type === 'spark');
  FP.assert(sparks.length >= 20, 'étincelles ' + sparks.length);
  FP.assert(s.fx.effects.some(e => e.type === 'eco'), 'gain flottant');
  const g = recCtx(); FP.coinsRender.draw(g, s);
  FP.assertEqual((s.fx.coinBursts || []).length, 1, 'une poignée de jetons');
  s.events.length = 0; s.time += .2;
  const g2 = recCtx(); FP.coinsRender.draw(g2, s); FP.particles.draw(g2, s);
  const tokens = new Set(g2.rects.filter(r => r.c === FP.palette.coin.ink).map(r => Math.round(r.x / 8) + ',' + Math.round(r.y / 8)));
  FP.assert(tokens.size >= 6, 'jetons dessinés ' + tokens.size);
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const sparkColors = new Set(g2.rects.map(r => r.c).filter(c => typeof c === 'string' && c[0] === '#' && c.length === 7));
  for (const c of sparkColors) for (const d of FP.palette.danger) FP.assert(dist(c, d) >= 60, c + ' trop proche du danger ' + d);
  s.time += 2; s.events.length = 0; FP.coinsRender.draw(recCtx(), s);
  FP.assertEqual(s.fx.coinBursts.length, 0);
});
