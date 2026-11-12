// Terre des boss (v5.7.0, boss cohérent) : la machine surgit de la terre (bords extérieurs des murs rongés) ; v5.9.0 : plus de poche de
// terre au-dessus de la tête (la pelouse revient à la mort du boss, la fleur y éclot). Aides : pipeRun (bosspipes.test.js), skinCtx (bossskin.test.js), PLAN_WIDTHS (bossplan.test.js).
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

FP.test('earth: pas de poche au-dessus de la tête', () => {
  FP.assertEqual(FP.config.boss.earth.pocket, undefined);
  const near = (E, x, y, d) => E.some(e => { const dx = e.x1 - e.x0, dy = e.y1 - e.y0, L = dx * dx + dy * dy, t = L ? Math.max(0, Math.min(1, ((x - e.x0) * dx + (y - e.y0) * dy) / L)) : 0; return Math.hypot(e.x0 + t * dx - x, e.y0 + t * dy - y) <= d; });
  for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m), bl = s.world.bossLevel, h = bl.head.solid, E = FP.bossEarth.edges(bl, s.world), top = h.y + Math.min(...h.collision.map(q => q[1]));
    const D = (FP.config.boss.earth.fringe + 3) * FP.px.SCALE, C = earthColors(m);
    for (let cy = s.world.surfaceY; cy < top; cy += s.world.viewH / 2) {
      s.camera.y = cy; const g = skinCtx(); FP.bossEarth.draw(g, s); const cam = FP.px.toArt(s.camera.y);
      const stray = g.rects.filter(r => { const x = (r.x + .5) * FP.px.SCALE, y = (r.y + cam + .5) * FP.px.SCALE; return C.has(r.c) && Math.abs(x - h.x) <= 34 && y >= s.world.surfaceY && y <= top && !near(E, x, y, D); });
      FP.assertEqual(stray.length, 0, 'terre hors des bords au-dessus de la tête, milieu ' + m);
    }
  }
});

FP.test('bossEarth: même terre d’une tentative à l’autre, rien hors boss', () => {
  const a = earthRun(1), b = earthRun(1);
  for (const s of [a, b]) s.camera.y = s.world.bossLevel.rooms[0].y0 - s.world.viewH / 2;
  const ga = skinCtx(), gb = skinCtx(); FP.bossEarth.draw(ga, a); FP.bossEarth.draw(gb, b);
  FP.assert(ga.rects.length > 0 && JSON.stringify(ga.rects) === JSON.stringify(gb.rects), 'identique');
  a.world.bossLevel = null; const g = skinCtx(); FP.bossEarth.draw(g, a); FP.assertEqual(g.rects.length, 0, 'hors boss');
});

FP.test('bossEarth: un mur effondré perd sa terre', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = earthRun(m), bl = s.world.bossLevel;
    s.camera.y = bl.rooms[0].y0 - s.world.viewH / 2; const before = skinCtx(); FP.bossEarth.draw(before, s);
    for (const w of bl.walls) w.off = true; const after = skinCtx(); FP.bossEarth.draw(after, s);
    FP.assert(after.rects.length < before.rects.length, 'moins de terre sans murs, milieu ' + m);
  }
});
