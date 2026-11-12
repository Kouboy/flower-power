// Pompes et cœur des boss dessinés par le code (v5.8.0, boss infiltré). Aides : pipeRun (bosspipes.test.js), skinCtx (bossskin.test.js).
const coreBox = [[0, 0], [40, 0], [40, 26], [0, 26]];
const coreM = () => FP.palette.boss.milieux.friche;
const lum = (h) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return .3 * r + .59 * g + .11 * b; };

FP.test('bossCore: la cuve, au centre, porte la teinte la plus claire de la pompe', () => {
  const g = skinCtx(); FP.bossCore.pump(g, coreBox, 1.3, coreM(), false);
  FP.assert(g.rects.length > 10, 'pompe dessinée');
  const best = g.rects.reduce((a, r) => (lum(r.c) > lum(a.c) ? r : a));
  FP.assert(best.x >= 10 && best.x <= 30 && best.y >= 4 && best.y <= 22, 'le plus clair est dans la cuve : ' + JSON.stringify(best));
});

FP.test('bossCore: la pompe bouge (volant, pistons, bulles) d’une image à l’autre', () => {
  const at = (t) => { const g = skinCtx(); FP.bossCore.pump(g, coreBox, t, coreM(), false); return JSON.stringify(g.rects); };
  FP.assert(at(1) !== at(1.1) && at(1.1) !== at(1.2), 'animation');
});

FP.test('bossCore: une pompe cassée a sa cuve éteinte et son volant arrêté', () => {
  const at = (t) => { const g = skinCtx(); FP.bossCore.pump(g, coreBox, t, coreM(), true); return g; };
  const a = at(1), b = at(1.37);
  FP.assertEqual(JSON.stringify(a.rects.filter(r => r.c === FP.palette.boss.weak[0])), '[]', 'plus de lumière');
  const still = (g) => JSON.stringify(g.rects.filter(r => r.c === FP.palette.boss.core.wheel));
  FP.assertEqual(still(a), still(b), 'volant arrêté');
});

FP.test('bossCore: les pales du cœur tournent tant qu’une pompe vit, arrêtées à nu ; le noyau bat', () => {
  const s = pipeRun(0), A = (t) => FP.bossCore.bladeAngle(t, s);
  FP.assert(Math.abs(A(1.2) - A(1)) > 1e-3, 'les pales tournent');
  const full = Math.abs(A(1.2) - A(1));
  s.bossFight.destroyed = [true, false, false];
  FP.assert(Math.abs(A(1.2) - A(1)) < full, 'plus lentement après une pompe cassée');
  s.bossFight.headOpen = true;
  FP.assertEqual(A(1.2), A(1), 'arrêtées à nu');
  const beats = [0, .1, .2, .3, .4, .5].map(t => FP.bossCore.beat(t, s));
  FP.assert(Math.max(...beats) - Math.min(...beats) > .3, 'le noyau bat');
  const g = skinCtx(); FP.bossCore.heart(g, [[0, 0], [60, 0], [60, 30], [0, 30]], 1, s); FP.assert(g.rects.length > 20, 'cœur dessiné');
});

// Revue finale (v5.8.0) : pompes hautes et étroites (brûleurs, barres) ; le cœur tousse et crache des étincelles à chaque pompe cassée.
FP.test('bossCore: chaque pompe des plans se dessine dans sa boîte, même haute et étroite', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m), M = FP.palette.boss.milieux[FP.config.milieux[m].id];
    for (const tg of s.world.bossLevel.targets) for (const broken of [false, true]) {
      const pts = tg.solid.collision.map(([x, y]) => [FP.px.toArt(tg.solid.x + x), FP.px.toArt(tg.solid.y + y)]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), g = skinCtx(); FP.bossCore.pump(g, pts, 1.3, M, broken);
      for (const r of g.rects) FP.assert(r.x >= Math.min(...xs) - 1 && r.x + r.w <= Math.max(...xs) + 1 && r.y >= Math.min(...ys) - 1 && r.y + r.h <= Math.max(...ys) + 1, `${tg.id} déborde : ${JSON.stringify(r)}, biome ${m}`);
      if (!broken) FP.assert(g.rects.some(r => r.c === FP.palette.boss.weak[0]), `${tg.id} : cuve lumineuse`);
    }
  }
});
FP.test('bossCore: le cœur blindé n’a pas la couleur des cibles ; il tousse et crache des étincelles après une pompe cassée', () => {
  const s = pipeRun(0), W = FP.palette.boss.weak, box = [[0, 0], [60, 0], [60, 30], [0, 30]], Sp = FP.palette.boss.core.spark;
  const draw = (t) => { const g = skinCtx(); FP.bossCore.heart(g, box, t, s); return g.rects; };
  FP.assert(!draw(1).some(r => W.includes(r.c)), 'blindé : pas de couleur de cible');
  FP.assert(!draw(1.1).some(r => r.c === Sp), 'pas d’étincelles au repos');
  s.bossFight.destroyed = [true, false, false];
  FP.assert(draw(1.3).some(r => r.c === Sp), 'étincelles juste après la pompe cassée');
  FP.assert(!draw(3).some(r => r.c === Sp), 'puis plus rien');
});
