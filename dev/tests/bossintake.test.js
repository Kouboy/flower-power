// Bouche d'aspiration des boss (v5.9.0, retour de jeu : « le couloir du début ne se rattache pas au boss ») : l'entonnoir d'entrée devient la
// prise d'air de la machine — tôles rivetées, dents sur les lèvres de la gorge, grille au pied. Aides : earthRun (bossearth.test.js),
// skinCtx (bossskin.test.js).
const intakeAt = (s) => { const bl = s.world.bossLevel, ys = bl.walls.filter(w => w.intake).map(w => w.y); s.camera.y = Math.max(...ys) - s.world.viewH / 2; return s; };
const intakeDraw = (s) => { const g = skinCtx(); FP.bossIntake.draw(g, s); return g; };

FP.test('intake: les lèvres regardent la gorge', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m), bl = s.world.bossLevel, start = FP.bossPlan.toWorld(bl.plan, s.world).paths.head[0];
    FP.assertEqual(bl.walls.filter(w => w.intake).length, 2, 'deux murs d’entrée, milieu ' + m);
    const L = FP.bossIntake.lips(bl);
    FP.assert(L.length >= 2, 'des lèvres, milieu ' + m);
    for (const l of L) {
      FP.assert(bl.walls[l.wall].intake, 'lèvre d’un mur d’entrée');
      const mx = (l.x0 + l.x1) / 2;
      FP.assert(Math.sign(start.x - mx) === Math.sign(l.nx) && l.nx !== 0, `normale vers la gorge, milieu ${m} : ${l.nx.toFixed(2)} en x=${mx | 0}`);
    }
    FP.assert(L.some(l => l.nx > 0) && L.some(l => l.nx < 0), 'une lèvre de chaque côté, milieu ' + m);
  }
});

FP.test('intake: tôles, dents et grille sans toucher la géométrie', () => {
  const T = FP.palette.boss.intake;
  for (const m of [0, 1, 2, 3]) {
    const s = intakeAt(earthRun(m)), before = JSON.stringify(s.world.solids), g = intakeDraw(s), cam = FP.px.toArt(s.camera.y);
    FP.assertEqual(JSON.stringify(s.world.solids), before, 'géométrie, milieu ' + m);
    for (const l of FP.bossIntake.lips(s.world.bossLevel)) {
      const xa = Math.min(FP.px.toArt(l.x0), FP.px.toArt(l.x1)) - 4, xb = Math.max(FP.px.toArt(l.x0), FP.px.toArt(l.x1)) + 4;
      const ya = Math.min(FP.px.toArt(l.y0), FP.px.toArt(l.y1)) - cam - 4, yb = Math.max(FP.px.toArt(l.y0), FP.px.toArt(l.y1)) - cam + 4;
      if (yb < 0 || ya > s.world.viewH / FP.px.SCALE) continue;
      FP.assert(g.rects.some(r => r.c === T.tooth && r.x >= xa && r.x <= xb && r.y >= ya && r.y <= yb), 'dents sur la lèvre, milieu ' + m);
    }
    FP.assert(g.rects.some(r => r.c === T.grille), 'grille, milieu ' + m);
    FP.assert(g.rects.some(r => r.c === FP.palette.boss.milieux[FP.config.milieux[m].id].rivet), 'tôles rivetées, milieu ' + m);
  }
});

FP.test('intake: rien quand le mur tombe, ni hors boss', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = intakeAt(earthRun(m));
    for (const w of s.world.bossLevel.walls) if (w.intake) w.off = true;
    FP.assert(!intakeDraw(s).rects.some(r => r.c === FP.palette.boss.intake.tooth), 'mur tombé, milieu ' + m);
  }
  const s = intakeAt(earthRun(1)); s.world.bossLevel.head.solid.off = true; FP.assertEqual(intakeDraw(s).rects.length, 0, 'tête transpercée');
  s.world.bossLevel = null; FP.assertEqual(intakeDraw(s).rects.length, 0, 'hors boss');
});
