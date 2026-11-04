// Point faible détruit et mort du boss (v5.1.0, retours de playtest) : arrêt sur image puis ralenti, éclats, plaque qui tournoie, éclair blanc.
// Aides : assaultRun, hitTarget (boss.test.js), bfxRun, bfxAssault (bossfx.test.js), recCtx (decor.test.js), withBackend, sounding, auRun (audio.test.js).
// Une frame de la vraie boucle (FP.loop.step), rendu et son remplacés (sink reçoit les événements de la frame, render dessine à la place
// du vrai rendu, absent sous Node) ; rend le temps de jeu écoulé.
const bdStep = (s, sink, render = null, dt = 1 / 60) => {
  const saved = [FP.render, FP.audio], t0 = s.time;
  FP.render = render; FP.audio = { consume(ev) { if (sink) sink.push(...ev); } };
  try { FP.loop.step(s, dt); } finally { [FP.render, FP.audio] = saved; }
  return s.time - t0;
};

FP.test('bossHit: arrêt sur image puis ralenti, la vitesse normale revient en ≈ 1 s', () => {
  const H = FP.config.boss.hit, s = assaultRun(); hitTarget(s, 0);
  FP.assertEqual(s.mode, 'dying'); FP.assert(s.camera.shake >= .45, 'forte secousse ' + s.camera.shake);
  FP.assertEqual(H.stop, .08); FP.assertEqual(H.slow, .5); FP.assertEqual(H.scale, .4);
  const dts = []; for (let i = 0; i < 72; i++) dts.push(bdStep(s));
  const at = (real) => dts[Math.round(real * 60) - 1];
  FP.assertEqual(at(1 / 60), 0, 'arrêt'); FP.assertEqual(at(.05), 0, 'arrêt');
  FP.assert(Math.abs(at(.3) - H.scale / 60) < 1e-9, 'ralenti ' + at(.3));
  FP.assert(Math.abs(at(1) - 1 / 60) < 1e-9, 'vitesse normale ' + at(1));
  const back = dts.findIndex((d, i) => i > 6 && Math.abs(d - 1 / 60) < 1e-9);
  FP.assert(back >= 0 && (back + 1) / 60 <= 1, 'en ≈ 1 s : ' + (back + 1) / 60);
  FP.assertEqual(s.flow.warp, null);
});

FP.test('bossHit: la cible éclate en éclats qui retombent, la plaque tournoie en tombant puis disparaît', () => {
  const s = bfxRun(), H = FP.config.boss.hit, o = bfxAssault(s, 0), fx = s.fx.boss, t0 = s.time;
  FP.assertEqual(fx.shards.length, H.shards, 'éclats');
  const xs = o.collision.map(q => o.x + q[0]), ys = o.collision.map(q => o.y + q[1]);
  for (const sh of fx.shards) {
    const a = FP.bossFx.shardAt(sh, 0), b = FP.bossFx.shardAt(sh, .2), c = FP.bossFx.shardAt(sh, H.shardLife);
    FP.assert(a.x >= Math.min(...xs) - 1 && a.x <= Math.max(...xs) + 1 && a.y >= Math.min(...ys) - 1 && a.y <= Math.max(...ys) + 1, 'tiré du polygone');
    FP.assert(Math.hypot(b.x - a.x, b.y - a.y) > 5, 'projeté'); FP.assert(c.y > b.y, 'retombe');
  }
  FP.assertEqual(fx.plates.length, 1, 'plaque en chute');
  const p = fx.plates[0], p1 = FP.bossFx.platePose(p, .1), p2 = FP.bossFx.platePose(p, .5);
  FP.assert(p1.a !== 0 && p2.a !== p1.a, 'tournoie'); FP.assert(p2.y > p1.y, 'tombe');
  FP.assert(fx.sparks.length >= 10, 'gerbe d’étincelles et de jetons');
  FP.assert(FP.bossFx.draw(recCtx(), s) === undefined, 'se dessine');
  s.time = t0 + Math.max(H.shardLife, H.plateLife) + .1; FP.bossFx.update(s);
  const f = s.fx.boss;
  FP.assertEqual(f.shards.length + f.plates.length + f.sparks.length, 0, 'tout est retombé, la plaque a disparu');
});

FP.test('bossHit: éclair blanc pendant 2 images, presque blanc (sa distance aux teintes de danger : boss.test.js)', () => {
  const s = bfxRun(); bfxAssault(s, 0);
  const flash = () => { const g = recCtx(); FP.bossFx.draw(g, s); return g.rects.some(q => q.c === FP.palette.boss.flash && q.w >= 100); };
  FP.assert(flash(), 'image 1'); FP.bossFx.update(s); FP.assert(flash(), 'image 2'); FP.bossFx.update(s); FP.assert(!flash(), 'deux images seulement');
  const c = FP.palette.boss.flash, rgb = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  FP.assert(rgb.every(v => v >= 0xd0) && rgb[0] + rgb[1] + rgb[2] >= 3 * 0xe8, 'presque blanc : ' + c);
});

FP.test('audio: le point faible explose en grand — FM, plusieurs couches', () => withBackend(b => {
  FP.audio.consume([{ type: 'bossTarget' }], auRun(), 0);
  const c = sounding(b), n = (k) => c.filter(q => q[0] === k).length;
  FP.assert(n('drum') >= 2 && n('burst') >= 2 && n('note') >= 6, `couches : ${n('drum')} percussions, ${n('burst')} souffles, ${n('note')} notes`);
}));
