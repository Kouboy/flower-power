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
