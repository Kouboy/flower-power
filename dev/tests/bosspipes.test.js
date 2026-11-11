// Tuyaux des boss (v5.7.0, boss cohérent) : flux des pompes vers le cœur, pompe cassée qui fuit, pompe qui bat. Aides : bossRun (boss.test.js), skinCtx (bossskin.test.js).
const pipeRun = (milieu = 0, destroyed) => {
  const s = FP.state.createRun(7, { W: 440, H: Math.round(440 * 16 / 9) });
  FP.level.startRun(s); s.run.milieu = milieu; s.run.boss = true;
  if (destroyed) s.bossFight.destroyed = destroyed.slice();
  FP.level.generate(s); s.mode = 'playing'; s.time = 2; return s;
};
const pipeLen = (p) => { let L = 0; for (let i = 1; i < p.pts.length; i++) L += Math.hypot(p.pts[i][0] - p.pts[i - 1][0], p.pts[i][1] - p.pts[i - 1][1]); return L; };
// Abscisse curviligne d'un point sur le tuyau (le plus proche segment).
const pipeAt = (p, q) => {
  let best = Infinity, at = 0, done = 0;
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i], L = Math.hypot(bx - ax, by - ay), t = L ? Math.max(0, Math.min(1, ((q.x - ax) * (bx - ax) + (q.y - ay) * (by - ay)) / (L * L))) : 0;
    const d = Math.hypot(ax + t * (bx - ax) - q.x, ay + t * (by - ay) - q.y);
    if (d < best) { best = d; at = done + t * L; }
    done += L;
  }
  return at;
};

FP.test('bossPipes: des pulsations circulent vers la tête, et avancent avec le temps', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m), p = s.world.bossLevel.pipes.find(q => q.to === 'head'), v = FP.config.boss.pipes.flowSpeed, L = pipeLen(p);
    const a = FP.bossPipes.pulses(p, 1, true), b = FP.bossPipes.pulses(p, 1.1, true);
    FP.assert(a.length > 0, 'pulsations ' + m);
    const sa = pipeAt(p, a[0]), sb = b.map(q => pipeAt(p, q));
    FP.assert(sb.some(x => Math.abs(x - (sa + v * .1)) <= 1.5 || Math.abs(x - (sa + v * .1 - L)) <= 1.5), 'avance de flowSpeed × .1, milieu ' + m);
    FP.assertEqual(FP.bossPipes.pulses(p, 1, false).length, 0, 'pas de flux sans pompe');
  }
});

FP.test('bossPipes: une pompe cassée arrête son flux et fuit, même dès la génération', () => {
  const s = pipeRun(1, [true, false, false]), bl = s.world.bossLevel, p = bl.pipes.find(q => q.target === 0);
  FP.assert(p, 'tuyau de la cible 0');
  const start = { x: p.pts[0][0], y: p.pts[0][1] };
  s.camera.y = start.y - s.world.viewH / 2;
  const g = skinCtx(); FP.bossPipes.draw(g, s);
  const F = FP.palette.boss.flow, cam = FP.px.toArt(s.camera.y);
  const flows = g.rects.filter(r => F.includes(r.c));
  const onDead = flows.filter(r => { const q = { x: (r.x + .5) * FP.px.SCALE, y: (r.y + cam + .5) * FP.px.SCALE }; const s2 = pipeAt(p, q); return s2 > 40 && FP.bossPipes.distTo(p, q) < 3; });   // au-delà de la sortie de la pompe et de la rupture (le bout rompu suinte)
  FP.assertEqual(onDead.length, 0, 'aucune pulsation sur le tuyau mort');
  const near = flows.filter(r => Math.hypot((r.x + .5) * FP.px.SCALE - start.x, (r.y + cam + .5) * FP.px.SCALE - start.y) < 60);
  FP.assert(near.length > 0, 'des gouttes de fuite près de la sortie');
});

FP.test('bossPipes: chaque boss se dessine sans erreur, avec des tuyaux visibles', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m), p = s.world.bossLevel.pipes[0]; s.camera.y = p.pts[p.pts.length - 1][1] - s.world.viewH / 2;
    const g = skinCtx(); FP.bossPipes.draw(g, s);
    FP.assert(g.rects.some(r => r.c === FP.palette.boss.pipe.body), 'tuyau dessiné, milieu ' + m);
  }
  const n = pipeRun(0); n.world.bossLevel = null; const g = skinCtx(); FP.bossPipes.draw(g, n); FP.assertEqual(g.rects.length, 0, 'hors boss');
});

FP.test('bossRender: la pompe bat', () => {
  const s = pipeRun(0), o = s.world.bossLevel.targets[0].solid; s.camera.y = o.y - s.world.viewH / 2;
  const frame = (t) => { s.time = t; const g = skinCtx(); FP.bossRender.draw(g, s); return JSON.stringify(g.rects); };
  const half = 1 / FP.config.boss.pipes.pumpHz / 2;
  FP.assert(frame(2) !== frame(2 + half / 2), 'le piston bouge');
});
