// Le jeu normal (v5.17.0, spec docs/superpowers/specs/2026-11-19-tresse-ilots-design.md) : la tresse et ses îlots quittent le Lab ; `?lab`
// n'existe plus. Les modules (v5.12–v5.14) restent retirés.

FP.test('normal: ?lab n’existe plus', () => {
  FP.assertEqual(FP.parseParams('?lab').lab, undefined); FP.assertEqual(FP.state.createRun(3, { W: 360, H: 640 }).run.lab, undefined);
  FP.assertEqual(FP.config.lab, undefined); FP.assertEqual(FP.config.text.lab, undefined);
  FP.assertEqual(FP.title.playtestLine({ lab: true }), null, 'plus de mention LAB');
});

FP.test('normal: chaque niveau tiré au hasard a sa tresse', () => {
  const s = FP.state.createRun(7, { W: 360, H: 640 }); FP.level.startRun(s);
  FP.assert(s.world.braid && s.world.braid.path.length > 2, 'la tresse');
});

FP.test('normal: plus aucune trace des modules', () => {
  for (const k of ['labLevel', 'labPulse', 'labTurret', 'labHazards', 'labStats', 'labRender', 'labTurretView', 'labStatsView']) FP.assertEqual(FP[k], undefined, k);
  FP.assertEqual(window.FLOWER_POWER_LAB, undefined); FP.assertEqual(FP.plant.soilStep, undefined);
  FP.assertEqual(FP.loop.UPDATE_ORDER.filter(k => /^lab/.test(k)).length, 0);
});

// Empreinte de deux niveaux normaux (graines 3 et 11, 360 × 640), relevée à la v5.17.2 (la tresse et ses îlots) : la génération ne bouge plus sans le vouloir.
FP.test('normal: empreinte des niveaux', () => {
  const out = [];
  for (const seed of [3, 11]) {
    const s = FP.state.createRun(seed, { W: 360, H: 640 }); FP.level.startRun(s); const w = s.world;
    const j = JSON.stringify([w.height, w.solids.map(o => [o.kind, Math.round(o.x), Math.round(o.y)]), w.toxics.map(t => [Math.round(t.x), Math.round(t.y)]),
      w.leaks.map(l => [Math.round(l.x), Math.round(l.y)]), w.coins.map(c => [Math.round(c.x), Math.round(c.y)])]);
    let h = 2166136261; for (const ch of j) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out.push(h);
  }
  FP.assertEqual(out.join(), '460772944,1701488530');
});

// Empreinte relevée à la v5.17.2 : seed 3, 360 × 640, 30 pas de 1/60 s.
FP.test('normal: empreinte des limaces', () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s);
  for (let i = 0; i < 30; i++) { s.time += 1 / 60; FP.hazards.update(s, 1 / 60); }
  FP.assertEqual(s.world.leaks.map(l => l.cx.toFixed(3) + ',' + l.cy.toFixed(3)).join(' '), '172.025,359.662 259.965,794.365 199.478,436.399');
});
