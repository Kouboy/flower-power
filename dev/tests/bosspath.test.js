// Niveau de boss (v4.12.0) : le couloir en zigzag se suit au doigt, par les vrais systèmes (pousse, boss, collision, déroulé).
// Robot naturel : le doigt sur l'abscisse du prochain nœud du couloir, défenses retirées (le couloir seul est jugé ici).
const bossFollow = (W, level, milieu) => {
  const s = FP.state.createRun(21, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s); s.level = level; s.run.milieu = milieu; s.run.boss = true; s.run.step = FP.config.run.steps;
  FP.level.generate(s); FP.plant.launch(s); s.mode = 'playing'; s.run.card = null; s.events.length = 0;
  const bl = s.world.bossLevel;
  bl.defenses.forEach(d => { d.solid.off = true; }); bl.defenses.length = 0;
  const systems = ['plant', 'hazards', 'boss', 'collision', 'graze', 'coinPlay', 'scoring', 'powerups', 'flow'], dt = 1 / 60;
  let death = null;
  for (let f = 0; f < 60 * 40 && s.mode === 'playing' && s.plant.tip.y > bl.trap.y0; f++) {
    const next = s.world.safePath.find(n => n.y < s.plant.tip.y) || s.world.safePath[s.world.safePath.length - 1];
    s.input = { ...s.input, down: true, touch: false, key: false, active: true, x: next.x, y: s.world.viewH * .5, screenX: 0 };
    s.time += dt;
    for (const n of systems) FP[n].update(s, dt);
    death = death || s.events.find(e => e.type === 'death');
    s.events.length = 0;
  }
  return { s, death, pierced: s.bossFight.pierced.filter(Boolean).length };
};

FP.test('bossLevel: changements de flanc doux, loin des coins, du niveau 3 au niveau 10', () => {
  const c = FP.config.boss, max = c.crossK * FP.config.level.safePath.maxSlope;
  for (const W of [300, 360, 440]) for (let level = 3; level <= 10; level++) {
    const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
    FP.level.startRun(s); s.level = level; s.run.boss = true; FP.level.generate(s);
    const P = s.world.safePath, r = s.world.safeRadius, at = `W=${W} niveau ${level}`;
    for (let i = 1; i < P.length; i++) FP.assert(Math.abs(P[i].x - P[i - 1].x) / (P[i - 1].y - P[i].y) <= max + 1e-9, `pente au segment ${i} ` + at);
    for (const seg of s.world.bossLevel.segments) for (const [x, y] of [[seg.x0, seg.y0], [seg.x1, seg.y0], [seg.x0, seg.y1], [seg.x1, seg.y1]]) {
      if (x === 0 || x === W) continue;   // coin collé au bord de l'écran
      for (let i = 1; i < P.length; i++) FP.assert(FP.geom.distPointToSegment(x, y, P[i - 1].x, P[i - 1].y, P[i].x, P[i].y) > r, `coin (${x | 0},${y | 0}) ` + at);
    }
  }
});

FP.test('bossLevel: un doigt qui suit le couloir perce les 4 points et atteint la trappe vivant', () => {
  for (const W of [300, 440]) for (const level of [3, 10]) for (const milieu of [0, 1]) {
    const { s, death, pierced } = bossFollow(W, level, milieu), at = `W=${W} niveau ${level} milieu ${milieu}`;
    FP.assert(!death, `mort (${death && death.kind}) à y=${Math.round(s.plant.tip.y)}, ${pierced} percé(s) ` + at);
    FP.assertEqual(pierced, FP.config.boss.segments, 'points percés ' + at);
    FP.assert(s.plant.tip.y <= s.world.bossLevel.trap.y0 + 1, 'pointe sous la trappe ' + at);
  }
});
