// Niveau de boss (v4.12.0) : tronçons, points faibles, couloir, trappe.
const bossRun = (W, milieu, seed = 7) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s); s.run.milieu = milieu; s.run.boss = true; FP.level.generate(s);
  return s;
};
const B = () => FP.config.boss;
const radiusAt = (s) => Math.min(Math.max(FP.config.level.safePath.radiusMin, FP.config.level.safePath.radiusBase + s.level * FP.config.level.safePath.radiusPerLevel) * B().corridorK,
  B().weakOut + B().weakHit - 2);

FP.test('bossLevel: 4 tronçons alternés, chacun son point faible côté couloir', () => {
  for (const W of [300, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const bl = bossRun(W, milieu).world.bossLevel;
    FP.assertEqual(bl.segments.length, B().segments);
    FP.assertEqual(bl.weak.length, B().segments);
    bl.segments.forEach((seg, i) => {
      if (i > 0) FP.assertEqual(seg.side, -bl.segments[i - 1].side, 'alternance ' + i);
      FP.assert(Math.abs(Math.abs(seg.x1 - seg.x0) - W * B().segWidth) < 1e-6, 'largeur ' + i);
      if (i > 0) FP.assert(seg.y1 < bl.segments[i - 1].y0, 'empilés du bas vers le haut ' + i);
      const w = bl.weak[i], face = seg.side < 0 ? seg.x1 : seg.x0;
      FP.assertEqual(w.i, i);
      FP.assert(Math.abs(Math.abs(w.x - face) - B().weakOut) < 1e-6 && Math.sign(face - w.x) === seg.side, 'saillie côté couloir ' + i);
      FP.assert(Math.abs(w.y - (seg.y0 + seg.y1) / 2) < 1e-6, 'mi-hauteur ' + i);
      FP.assert(FP.collision.distanceTo(seg.solid, w.x, w.y) >= B().weakR - B().weakOut, 'hors du polygone ' + i);
      FP.assertEqual(seg.solid.kind, 'boss');
    });
  }
});

FP.test('bossLevel: le couloir est franchissable et longe chaque point faible', () => {
  for (const W of [300, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const s = bossRun(W, milieu), w = s.world, bl = w.bossLevel, P = w.safePath;
    const normal = Math.max(FP.config.level.safePath.radiusMin, FP.config.level.safePath.radiusBase + s.level * FP.config.level.safePath.radiusPerLevel);
    FP.assert(Math.abs(w.safeRadius - radiusAt(s)) < 1e-9 && w.safeRadius <= normal * B().corridorK + 1e-9, 'rayon ' + w.safeRadius);
    const blocking = w.solids.filter(o => !o.off && o.kind !== 'trap');
    for (const n of P) for (const o of blocking) FP.assert(FP.collision.distanceTo(o, n.x, n.y) >= w.safeRadius, `nœud (${n.x | 0},${n.y | 0}) trop près de ${o.kind}`);
    for (const wk of bl.weak) {
      let m = Infinity;
      for (let i = 1; i < P.length; i++) m = Math.min(m, FP.geom.distPointToSegment(wk.x, wk.y, P[i - 1].x, P[i - 1].y, P[i].x, P[i].y));
      FP.assert(m <= B().weakHit, 'point faible ' + wk.i + ' à ' + m);
    }
    FP.assertEqual(P[0].x, w.width / 2); FP.assertEqual(P[0].y, w.height - FP.config.plant.seedOffset);
    const last = P[P.length - 1];
    FP.assert(last.y >= bl.trap.y1 && last.y < bl.trap.y1 + 40 && last.x > 0 && last.x < w.width, 'fin sous la trappe');
    for (let i = 1; i < P.length; i++) FP.assert(P[i].y < P[i - 1].y, 'le couloir monte');
  }
});

FP.test('bossLevel: même niveau d’une tentative à l’autre', () => {
  const s = bossRun(440, 2), pick = (w) => JSON.stringify([w.bossLevel.segments.map(g => [g.side, g.x0, g.x1, g.y0, g.y1]), w.bossLevel.weak, w.toxics, w.safePath]);
  const first = pick(s.world);
  for (let i = 0; i < 37; i++) s.rng.next();
  FP.level.generate(s);
  FP.assertEqual(pick(s.world), first);
});

FP.test('bossLevel: un duel — ni obstacle habituel ni limace, 2 nappes hors des points faibles', () => {
  for (let milieu = 0; milieu < 4; milieu++) for (const W of [300, 440]) {
    const w = bossRun(W, milieu).world;
    FP.assert(w.solids.length > 0 && w.solids.every(o => o.boss === true), 'que le boss');
    FP.assertEqual(w.leaks.length, 0);
    FP.assert(w.toxics.length <= B().toxics, 'nappes ' + w.toxics.length);
    for (const t of w.toxics) for (const wk of w.bossLevel.weak) {
      FP.assert(Math.hypot(t.x - wk.x, t.y - wk.y) > B().weakHit + Math.max(t.rx, t.ry), 'nappe sur un point faible');
    }
  }
});

FP.test('bossLevel: trappe pleine largeur sous la pelouse, fermée tant qu’il reste un point', () => {
  const s = bossRun(440, 1), tr = s.world.bossLevel.trap, w = s.world;
  FP.assertEqual(tr.solid.off, false); FP.assertEqual(tr.solid.kind, 'trap');
  FP.assertEqual(tr.y0, w.surfaceY + B().trap.gap); FP.assertEqual(tr.y1 - tr.y0, B().trap.thick);
  FP.assert(FP.collision.distanceTo(tr.solid, 3, (tr.y0 + tr.y1) / 2) < 0 && FP.collision.distanceTo(tr.solid, w.width - 3, (tr.y0 + tr.y1) / 2) < 0, 'pleine largeur');
  FP.assert(w.solids.includes(tr.solid));
  s.bossFight.pierced = s.bossFight.pierced.map(() => true);
  FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel.trap.solid.off, true);
  s.bossFight.pierced[2] = false; FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel.trap.solid.off, false);
});

FP.test('bossLevel: une défense par tronçon, montée sur sa face, de la paire du milieu, au repos', () => {
  for (let milieu = 0; milieu < 4; milieu++) {
    const w = bossRun(440, milieu).world, bl = w.bossLevel, d = B().defense;
    FP.assertEqual(bl.defenses.length, B().segments);
    bl.defenses.forEach((df, i) => {
      const seg = bl.segments[i], pair = B().pairs[FP.config.milieux[milieu].id];
      FP.assertEqual(df.type, pair[i % 2]); FP.assertEqual(df.side, seg.side);
      FP.assertEqual(df.x, seg.side < 0 ? seg.x1 : seg.x0);
      FP.assert(Math.abs(df.y - (seg.y0 + d.mountK * (seg.y1 - seg.y0))) < 1e-6, 'à mountK du haut');
      FP.assert(Math.abs(df.reach - d.reach * (w.width - Math.abs(seg.x1 - seg.x0))) < 1e-6, 'portée');
      FP.assertEqual(df.solid.kind, 'defense'); FP.assertEqual(df.solid.off, true); FP.assertEqual(df.solid.boss, true);
      FP.assert(w.solids.includes(df.solid));
    });
  }
});

FP.test('bossLevel: la spore ne détruit pas le boss', () => {
  const s = bossRun(440, 0), before = s.world.solids.filter(o => o.boss).length, seg = s.world.bossLevel.segments[1];
  FP.powerups.detonate(s, (seg.x0 + seg.x1) / 2, (seg.y0 + seg.y1) / 2);
  FP.assertEqual(s.world.solids.filter(o => o.boss).length, before);
});

FP.test('level: un niveau normal n’a pas de bossLevel', () => {
  const s = bossRun(440, 0);
  s.run.boss = false; FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel, null);
  FP.assert(s.world.solids.every(o => !o.boss));
});

FP.test('state: bossFight démarre sans point percé', () => {
  const s = FP.state.createRun(3, { W: 440, H: 783 });
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[false,false,false,false]');
});
