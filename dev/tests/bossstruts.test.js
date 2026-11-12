// Structures de liaison des boss (v5.8.0, boss infiltré) : poutrelles, câbles et engrenages qui relient la machine et donnent son échelle,
// sans collision. Aides : skinCtx (bossskin.test.js), PLAN_WIDTHS (bossplan.test.js).
const strutRun = (m, W = 440, stems = 0) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) }); FP.level.startRun(s); s.run.milieu = m; s.run.boss = true; s.plant.stemCount = stems;
  FP.level.generate(s); s.mode = 'playing'; s.time = 2; return s;
};
const strutEach = (fn) => { for (const W of [280, 440]) for (const stems of [0, 1e3]) for (const m of [0, 1, 2, 3]) { const s = strutRun(m, W, stems); fn(s, FP.bossStruts.place(s.world.bossLevel, s.world, s.seed), `biome ${m} W=${W}${stems ? ' étiré' : ''}`); } };
const strutPts = (e) => {
  if (e.kind === 'gear') { const out = []; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; out.push([e.cx + Math.cos(a) * e.r, e.cy + Math.sin(a) * e.r]); } out.push([e.cx, e.cy]); return out; }
  const out = []; for (let k = 0; k <= 20; k++) out.push([e.x0 + (e.x1 - e.x0) * k / 20, e.y0 + (e.y1 - e.y0) * k / 20]); return out;
};
const strutProtected = (bl) => [...bl.targets.map(t => t.solid), bl.head.solid, ...bl.plates.map(p => p.solid)].map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));

FP.test('bossStruts: aucune structure ne recouvre une pompe, la tête, une plaque ni une tourelle', () => {
  strutEach((s, E, at) => {
    const bl = s.world.bossLevel, P = strutProtected(bl), clear = FP.config.boss.struts.clear, tr = FP.config.boss.turret.size / 2 * FP.px.SCALE;
    for (const e of E) for (const [x, y] of strutPts(e)) {
      for (const poly of P) FP.assert(FP.geom.sdPoly(x, y, poly) >= clear, `${e.kind} sur une pièce, ${at}`);
      for (const q of bl.turrets) FP.assert(Math.hypot(x - q.x, y - q.y) >= tr + clear, `${e.kind} sur ${q.id}, ${at}`);
    }
  });
});

FP.test('bossStruts: aucune traversée dans une salle, au plus maxPerScreen par écran', () => {
  strutEach((s, E, at) => {
    const bl = s.world.bossLevel, K = FP.config.boss.struts, H = s.world.viewH;
    const cross = E.filter(e => e.kind !== 'gear');
    for (const e of cross) for (const [x, y] of strutPts(e)) FP.assert(!bl.rooms.some(r => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1), `${e.kind} dans une salle, ${at}`);
    const ys = cross.map(e => (e.y0 + e.y1) / 2).sort((a, b) => a - b);
    for (let i = 0; i + K.maxPerScreen < ys.length; i++) FP.assert(ys[i + K.maxPerScreen] - ys[i] >= H - 1e-6, `plus de ${K.maxPerScreen} traversées dans un écran, ${at}`);
  });
});

FP.test('bossStruts: chaque boss a au moins 1 traversée, 2 engrenages et 4 structures ; même placement d’une tentative à l’autre ; aucun solide', () => {
  for (const m of [0, 1, 2, 3]) {
    const a = strutRun(m), b = strutRun(m), before = JSON.stringify(a.world.solids);
    const A = FP.bossStruts.place(a.world.bossLevel, a.world, a.seed), B = FP.bossStruts.place(b.world.bossLevel, b.world, b.seed);
    FP.assertEqual(JSON.stringify(A), JSON.stringify(B), 'déterministe, biome ' + m);
    FP.assert(A.filter(e => e.kind !== 'gear').length >= 1 && A.filter(e => e.kind === 'gear').length >= 2 && A.length >= 4, `biome ${m} : ${A.filter(e => e.kind !== 'gear').length} traversées, ${A.filter(e => e.kind === 'gear').length} engrenages`);
    a.camera.y = a.world.bossLevel.rooms[0].y0 - a.world.viewH; FP.bossStruts.draw(skinCtx(), a);
    FP.assertEqual(JSON.stringify(a.world.solids), before, 'aucun solide, biome ' + m);
  }
});

FP.test('bossStruts: un mur effondré emporte ses structures', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = strutRun(m), bl = s.world.bossLevel, E = FP.bossStruts.place(bl, s.world, s.seed), e = E[0];
    s.camera.y = (e.kind === 'gear' ? e.cy : e.y0) - s.world.viewH / 2;
    const before = skinCtx(); FP.bossStruts.draw(before, s);
    for (const w of bl.walls) w.off = true;
    const after = skinCtx(); FP.bossStruts.draw(after, s);
    FP.assert(before.rects.length + before.images.length > 0, 'dessinées, biome ' + m);
    FP.assertEqual(after.rects.length + after.images.length, 0, 'plus rien, biome ' + m);
  }
});

FP.test('bossStruts: les engrenages tournent plus vite quand une pompe casse, et s’arrêtent à la mort du boss', () => {
  const s = strutRun(1), A = (t) => FP.bossStruts.gearAngle(t, s);
  const v0 = A(1.1) - A(1); s.bossFight.destroyed = [true, false, false]; const v1 = A(1.1) - A(1);
  FP.assert(v0 > 0 && v1 > v0, `plus vite : ${v0} → ${v1}`);
  s.world.bossLevel.head.solid.off = true; FP.assertEqual(A(1.1), A(1), 'arrêtés');
});
