// La tresse (v5.15.0 au Lab, v5.17.0 dans le jeu normal ; spec docs/superpowers/specs/2026-11-19-tresse-design.md) : B, un deuxième chemin
// sûr tracé autour de A (le chemin sûr d'aujourd'hui), qui le croise plusieurs fois ; plus étroit, plus risqué, plus payant.
const BRAID_WIDTHS = [280, 360, 440];
// Un niveau (biome m, graine, largeur) ; grow : pousses et fleurs déjà faites (niveau plus haut).
const braidLevel = ({ seed = 1, W = 360, m = 0, grow = 0 } = {}) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  s.run.milieu = m; s.plant.stemCount = grow; s.score.flowers = grow;
  FP.level.generate(s); s.mode = 'playing';
  return s;
};
const braidEach = (fn) => { for (const W of BRAID_WIDTHS) for (const m of [0, 1, 2, 3]) for (const seed of [1, 2, 3, 4]) for (const grow of [0, 200]) fn(braidLevel({ seed, W, m, grow }), `W=${W} biome ${m} graine ${seed} grow ${grow}`); };

// Empreinte du chemin A relevée en v5.16.0, avant la tresse dans le jeu normal : A ne bouge pas.
FP.test('tresse: A est le chemin d’aujourd’hui', () => {
  const out = [];
  for (const seed of [1, 2, 3]) for (const W of BRAID_WIDTHS) { const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) }); FP.level.generate(s); out.push(s.world.safePath.map(p => p.x.toFixed(3) + ',' + p.y.toFixed(3)).join(' ')); }
  let h = 2166136261; for (const ch of out.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  FP.assertEqual(h, 3882868715);
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

FP.test('tresse: rien au boss', () => {
  const b = FP.state.createRun(7, { W: 360, H: 640 }); b.run.boss = true; FP.level.generate(b);
  FP.assertEqual(b.world.braid, null); FP.assertEqual(b.world.turrets.length, 0, 'pas de tourelle d’îlot');
});

// --- Dangers et pièces autour de B (tâche 3) : rien ne bouche A ni B ; les limaces barrent B dès le début ; les pièces le suivent.
const braidSome = (fn) => { for (const W of BRAID_WIDTHS) for (const m of [0, 2]) for (const seed of [1, 2, 3, 4, 5]) fn(braidLevel({ seed, W, m }), `W=${W} biome ${m} graine ${seed}`); };
const toB = (w, x, y) => FP.level.distToSafePath(w, x, y, w.braid.path);
const boxPts = (o) => [[0, 0], [-o.w / 2, -o.h / 2], [o.w / 2, -o.h / 2], [o.w / 2, o.h / 2], [-o.w / 2, o.h / 2]].map(([a, b]) => FP.geom.toWorld(o, a, b));
FP.test('tresse: rien ne bouche A ni B', () => {
  braidSome((s, at) => {
    const w = s.world, B = w.braid, bite = FP.config.braid.toxicBite * B.radius, cl = FP.config.level.leaks.cross.clearPad;
    for (const o of w.solids.filter(q => q.w)) for (const p of boxPts(o)) {
      // v5.17.2 : un déchet d'îlot peut mordre islands.bite de la largeur garantie de A et de B, jamais plus.
      FP.assert(toB(w, p.x, p.y) >= B.radius * (1 - FP.config.braid.islands.bite) - 1e-6, `obstacle ${o.kind} à ${toB(w, p.x, p.y).toFixed(1)} px de B ` + at);
      FP.assert(FP.level.distToSafePath(w, p.x, p.y) >= w.safeRadius * (1 - FP.config.braid.islands.bite) - 1e-6, `obstacle ${o.kind} dans A ` + at);
    }
    const ptsB = FP.level.pathSamples(w, B.path);
    for (const t of w.toxics) {
      const ca = Math.cos(-t.a), sa = Math.sin(-t.a);
      for (const p of ptsB) { const dx = p.x - t.x, dy = p.y - t.y, u = (dx * ca - dy * sa) / (t.rx + B.radius - bite), v = (dx * sa + dy * ca) / (t.ry + B.radius - bite); FP.assert(u * u + v * v > 1, 'nappe au-delà de toxicBite × la largeur de B ' + at); }
    }
    for (const l of w.leaks) {
      const ca = Math.cos(l.angle) * l.len / 2, sa = Math.sin(l.angle) * l.len / 2;
      if (FP.level.segmentToSafePath(w, l.x - ca, l.y - sa, l.x + ca, l.y + sa, B.path) >= B.radius + l.r) continue;
      FP.assert(Math.max(toB(w, l.x - ca, l.y - sa), toB(w, l.x + ca, l.y + sa)) >= B.radius + l.r + cl - 1e-6, 'limace en travers de B sans bout libre ' + at);
    }
  });
});
FP.test('tresse: les limaces barrent B dès le premier niveau', () => {
  let n = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const w = braidLevel({ seed }).world, B = w.braid;
    if (w.leaks.some(l => { const ca = Math.cos(l.angle) * l.len / 2, sa = Math.sin(l.angle) * l.len / 2; return FP.level.segmentToSafePath(w, l.x - ca, l.y - sa, l.x + ca, l.y + sa, B.path) < B.radius + l.r; })) n += 1;
  }
  FP.assert(n >= 1, 'aucune limace en travers de B sur 20 graines');
});
FP.test('tresse: les pièces suivent surtout B', () => {
  let onB = 0, all = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const w = braidLevel({ seed }).world;
    w.chains.forEach((c, i) => {
      if (c.kind !== 'easy') return;
      const cs = w.coins.filter(q => q.chain === i), dA = cs.reduce((a, q) => a + FP.level.distToSafePath(w, q.x, q.y), 0), dB = cs.reduce((a, q) => a + toB(w, q.x, q.y), 0);
      all += 1; if (dB < dA) onB += 1;
    });
  }
  FP.assert(all > 0 && onB / all >= .55, `traînées sur B : ${onB}/${all}`);
});
// 170 : obstacles des mêmes vingt niveaux en v5.16.0, sans la tresse.
FP.test('tresse: la densité reste proche d’un niveau sans tresse', () => {
  let n = 0;
  for (let seed = 1; seed <= 20; seed++) n += braidLevel({ seed }).world.solids.length;
  FP.assert(n >= .85 * 170, `obstacles : ${n} avec la tresse pour 170 sans`);
});

// Revue finale : quand A longe le bord gauche d'un écran étroit, B doit quand même changer de côté (au moins deux croisements).
FP.test('tresse: deux croisements même quand A longe un bord', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const w = braidLevel({ seed, W: 280, grow: 40 }).world;
    FP.assert(FP.braid.crossings(w).length >= 2, `graine ${seed} : ${FP.braid.crossings(w).length} croisement(s)`);
  }
});
