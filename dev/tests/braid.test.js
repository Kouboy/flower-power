// La tresse (v5.15.0, ?lab ; spec docs/superpowers/specs/2026-11-19-tresse-design.md) : B, un deuxième chemin sûr tracé autour de A (le
// chemin sûr d'aujourd'hui), qui le croise plusieurs fois ; plus étroit, plus risqué, plus payant.
const BRAID_WIDTHS = [280, 360, 440];
// Un niveau (biome m, graine, largeur), au Lab ou non ; grow : pousses et fleurs déjà faites (niveau plus haut).
const braidLevel = ({ seed = 1, W = 360, m = 0, lab = true, grow = 0 } = {}) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = lab; s.run.milieu = m; s.plant.stemCount = grow; s.score.flowers = grow;
  FP.level.generate(s); s.mode = 'playing';
  return s;
};
const braidEach = (fn) => { for (const W of BRAID_WIDTHS) for (const m of [0, 1, 2, 3]) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) for (const grow of [0, 200]) fn(braidLevel({ seed, W, m, grow }), `W=${W} biome ${m} graine ${seed} grow ${grow}`); };

FP.test('tresse: A est le chemin d’aujourd’hui', () => {
  for (const seed of [1, 2, 3]) for (const W of BRAID_WIDTHS) {
    const key = (s) => JSON.stringify(s.world.safePath.map(p => [p.x.toFixed(3), p.y.toFixed(3)]));
    FP.assertEqual(key(braidLevel({ seed, W })), key(braidLevel({ seed, W, lab: false })), `graine ${seed} W=${W}`);
  }
});

FP.test('tresse: au moins deux croisements, un écart réel entre deux', () => {
  braidEach((s, at) => {
    const w = s.world, B = w.braid, ys = FP.braid.crossings(w);
    FP.assert(ys.length >= 2, 'croisements : ' + ys.length + ' ' + at);
    const cuts = [B.path[0].y, ...ys, B.path[B.path.length - 1].y];
    for (let i = 1; i < cuts.length; i++) {
      const gap = Math.max(...B.path.filter(p => p.y <= cuts[i - 1] && p.y >= cuts[i]).map(p => Math.abs(p.x - FP.level.pathXAt(w, p.y))));
      FP.assert(gap > w.safeRadius + B.radius + 30, `écart ${gap | 0} px entre deux croisements ` + at);
    }
  });
});

FP.test('tresse: B monte toujours, respecte la pente et la bande sûre', () => {
  braidEach((s, at) => {
    const w = s.world, P = w.braid.path, m = FP.camera.safeX(w.width), k = FP.config.level.safePath.maxSlope;
    FP.assertEqual(P[0].y, w.safePath[0].y, 'part avec A ' + at); FP.assertEqual(P[P.length - 1].y, w.safePath[w.safePath.length - 1].y, 'arrive avec A ' + at);
    for (let i = 1; i < P.length; i++) {
      FP.assert(P[i].y < P[i - 1].y, 'monte ' + at); FP.assert(Math.abs(P[i].x - P[i - 1].x) <= k * (P[i - 1].y - P[i].y) + 1e-6, 'pente ' + at);
    }
    for (const p of P.slice(1, -1)) FP.assert(p.x >= m && p.x <= w.width - m, 'bande sûre ' + at);
    FP.assert(w.braid.radius < w.safeRadius, 'B plus étroit que A ' + at);
  });
});

FP.test('tresse: rien hors Lab ni au boss', () => {
  FP.assertEqual(braidLevel({ lab: false }).world.braid, null, 'hors Lab');
  const b = FP.state.createRun(7, { W: 360, H: 640 }); b.run.lab = true; b.run.boss = true; FP.level.generate(b);
  FP.assertEqual(b.world.braid, null, 'boss');
});
