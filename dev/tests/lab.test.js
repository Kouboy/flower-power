// Le Lab (v5.15.0, spec docs/superpowers/specs/2026-11-19-tresse-design.md) : `?lab` lance une partie normale (boutique, boss, graines,
// vitesse) où chaque niveau tiré au hasard a deux chemins, A et B (la tresse : braid.test.js). Les modules (v5.12–v5.14) sont retirés.
const labGame = (seed = 7, W = 360) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = true; FP.level.startRun(s); s.mode = 'playing';
  return s;
};
const labBloom = (s) => { s.events.length = 0; s.plant.tip.y = s.world.surfaceY - 1; FP.flow.update(s, 1 / 60); for (let i = 0; i < 600 && s.mode !== 'ready' && s.mode !== 'shop'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); } };

FP.test('lab: paramètre', () => {
  FP.assertEqual(FP.parseParams('?lab').lab, true); FP.assertEqual(FP.parseParams('?lab=3').lab, true); FP.assertEqual(FP.parseParams('').lab, false);
  FP.assertEqual(FP.parseParams('?lab&stats').stats, undefined, '&stats n’est plus lu');
  FP.assertEqual(FP.state.createRun(3, { W: 360, H: 640 }).run.lab, false);
});

FP.test('lab: une partie normale', () => {
  const s = labGame(); FP.plant.launch(s);
  FP.assert(s.world.solids.length > 0 && s.world.toxics.length + s.world.leaks.length > 0, 'un niveau tiré au hasard');
  s.run.step = FP.config.run.steps - 1; labBloom(s);
  const n = FP.state.createRun(7, { W: 360, H: 640 }); FP.level.startRun(n); n.mode = 'playing'; FP.plant.launch(n); n.run.step = FP.config.run.steps - 1; labBloom(n);
  FP.assertEqual(s.flow.next, n.flow.next, 'même suite qu’hors Lab'); FP.assertEqual(s.run.boss, n.run.boss, 'le boss arrive');
});

FP.test('lab: une mort coûte une graine', () => {
  const s = labGame(); FP.plant.launch(s); const before = s.plant.reserves, o = s.world.solids[0];
  s.plant.tip = { x: o.x, y: o.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, before - 1);
});

FP.test('lab: pas de record', () => {
  const r = FP.scoring.records, saved = JSON.stringify(r);
  try {
    const s = labGame(); s.score.flowers = r.flowers + 50; s.score.eco = r.eco + 99999; FP.scoring.update(s, 1 / 60);
    FP.assertEqual(JSON.stringify(FP.scoring.records), saved, 'records inchangés');
  } finally { Object.assign(FP.scoring.records, JSON.parse(saved)); }
});

FP.test('lab: plus aucune trace des modules', () => {
  for (const k of ['labLevel', 'labPulse', 'labTurret', 'labHazards', 'labStats', 'labRender', 'labTurretView', 'labStatsView']) FP.assertEqual(FP[k], undefined, k);
  FP.assertEqual(window.FLOWER_POWER_LAB, undefined); FP.assertEqual(FP.config.lab.pulse, undefined); FP.assertEqual(FP.plant.soilStep, undefined);
  FP.assertEqual(FP.loop.UPDATE_ORDER.filter(k => /^lab/.test(k)).length, 0);
});

// Empreinte de deux niveaux normaux (graines 3 et 11, 360 × 640), relevée avant le mode Lab (v5.12.0) : la génération n'a pas bougé.
FP.test('lab: jeu normal intact', () => {
  const out = [];
  for (const seed of [3, 11]) {
    const s = FP.state.createRun(seed, { W: 360, H: 640 }); FP.level.startRun(s); const w = s.world;
    FP.assertEqual(s.run.lab, false);
    const j = JSON.stringify([w.height, w.solids.map(o => [o.kind, Math.round(o.x), Math.round(o.y)]), w.toxics.map(t => [Math.round(t.x), Math.round(t.y)]),
      w.leaks.map(l => [Math.round(l.x), Math.round(l.y)]), w.coins.map(c => [Math.round(c.x), Math.round(c.y)])]);
    let h = 2166136261; for (const ch of j) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out.push(h);
  }
  FP.assertEqual(out.join(), '2481539369,4256782594');
});

// Empreinte relevée avant le Lab v5.13 : seed 3, 360 × 640, 30 pas de 1/60 s.
FP.test('lab: les limaces du jeu normal ne changent pas', () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s);
  for (let i = 0; i < 30; i++) { s.time += 1 / 60; FP.hazards.update(s, 1 / 60); }
  FP.assertEqual(s.world.leaks.map(l => l.cx.toFixed(3) + ',' + l.cy.toFixed(3)).join(' '), '245.971,794.729 226.872,457.198 137.701,542.710');
});
