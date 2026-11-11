// Terre des boss (v5.7.0, boss cohérent) : la machine surgit de la terre (bords extérieurs des murs rongés), poche de terre au-dessus de la
// tête, où la fleur éclot. Aides : pipeRun (bosspipes.test.js), skinCtx (bossskin.test.js), PLAN_WIDTHS (bossplan.test.js).
const earthRun = (m, W = 440) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s); s.run.milieu = m; s.run.boss = true; FP.level.generate(s); s.mode = 'playing'; s.time = 2; return s;
};
const earthColors = (m) => { const S = FP.palette.milieux[FP.config.milieux[m].id].strata; return new Set([...S.clay, ...S.humus]); };

FP.test('bossEarth: les bords rongés ne donnent jamais sur un couloir ni dans une salle', () => {
  for (const W of PLAN_WIDTHS) for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m, W), bl = s.world.bossLevel, placed = FP.bossPlan.toWorld(bl.plan, s.world);
    const refs = Object.values(placed.paths), E = FP.bossEarth.edges(bl, s.world);
    FP.assert(E.length > 0, 'des bords extérieurs, milieu ' + m);
    for (const e of E) for (let k = 0; k <= 4; k++) {
      const x = e.x0 + (e.x1 - e.x0) * k / 4, y = e.y0 + (e.y1 - e.y0) * k / 4;
      let d = Infinity; for (const r of refs) for (let i = 1; i < r.length; i++) {
        const a = r[i - 1], b = r[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L)) : 0;
        d = Math.min(d, Math.hypot(a.x + t * dx - x, a.y + t * dy - y));
      }
      FP.assert(d >= placed.channelMin / 2, `bord à ${d.toFixed(1)} d'un trajet, milieu ${m} W=${W}`);
    }
  }
});

FP.test('bossEarth: dessiner la terre ne change aucun solide', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m), before = JSON.stringify(s.world.solids);
    s.camera.y = s.world.bossLevel.head.solid.y - s.world.viewH / 2; FP.bossEarth.draw(skinCtx(), s);
    FP.assertEqual(JSON.stringify(s.world.solids), before, 'milieu ' + m);
  }
});

FP.test('bossEarth: poche de terre au-dessus de la tête', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m), h = s.world.bossLevel.head.solid, P = FP.config.boss.earth.pocket;
    s.camera.y = h.y - s.world.viewH / 2; const g = skinCtx(); FP.bossEarth.draw(g, s);
    const cam = FP.px.toArt(s.camera.y), C = earthColors(m), top = h.y + Math.min(...h.collision.map(q => q[1]));
    const inPocket = g.rects.filter(r => C.has(r.c) && Math.abs((r.x + .5) * FP.px.SCALE - h.x) <= P && (r.y + cam) * FP.px.SCALE <= top + 2);
    FP.assert(inPocket.length > 10, 'poche, milieu ' + m + ' : ' + inPocket.length);
  }
});

FP.test('bossEarth: même terre d’une tentative à l’autre, rien hors boss', () => {
  const a = earthRun(1), b = earthRun(1);
  for (const s of [a, b]) s.camera.y = s.world.bossLevel.rooms[0].y0 - s.world.viewH / 2;
  const ga = skinCtx(), gb = skinCtx(); FP.bossEarth.draw(ga, a); FP.bossEarth.draw(gb, b);
  FP.assert(ga.rects.length > 0 && JSON.stringify(ga.rects) === JSON.stringify(gb.rects), 'identique');
  a.world.bossLevel = null; const g = skinCtx(); FP.bossEarth.draw(g, a); FP.assertEqual(g.rects.length, 0, 'hors boss');
});
