// Modules du Lab en partie normale (v5.14.0, ?modules ; spec docs/superpowers/specs/2026-11-18-modules-en-partie-design.md) : à partir du
// 2e niveau de chaque biome, un ou plusieurs modules de la sélection du biome posés dans le niveau tiré au hasard.
const MOD_BIOMES = ['friche', 'industrie', 'decharge', 'nucleaire'];
// Un niveau de partie avec ?modules : biome m (indice), step, largeur W, graine.
const modRun = ({ m = 0, step = 1, W = 360, seed = 7, flag = true, grow = 0 } = {}) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  s.run.modules = flag; s.run.milieu = m; s.run.step = step;
  s.plant.stemCount = grow; s.score.flowers = grow;
  FP.level.generate(s); s.mode = 'playing';
  return s;
};
const modIds = (s) => s.world.modules.map(M => M.circuit.id);

FP.test('modules: paramètre', () => {
  FP.assertEqual(FP.parseParams('?modules').modules, true); FP.assertEqual(FP.parseParams('').modules, false);
  FP.assertEqual(FP.state.createRun(3, { W: 360, H: 640 }).run.modules, false);
});

FP.test('modules: jamais au 1er niveau d’un biome, ni au boss, ni au Lab, ni sans ?modules', () => {
  FP.assertEqual(modRun({ step: 0 }).world.modules.length, 0, '1er niveau');
  FP.assertEqual(modRun({ flag: false }).world.modules.length, 0, 'sans ?modules');
  const b = FP.state.createRun(7, { W: 360, H: 640 }); b.run.modules = true; b.run.step = 1; b.run.boss = true; FP.level.generate(b);
  FP.assertEqual(b.world.modules.length, 0, 'boss');
  const l = FP.state.createRun(7, { W: 360, H: 640 }); l.run.modules = true; l.run.step = 1; l.run.lab = 3; FP.level.generate(l);
  FP.assertEqual(modIds(l).join(), 'peigne', 'le Lab garde son module');
});

FP.test('modules: au moins un dès le 2e niveau, dans la sélection du biome, sans doublon', () => {
  const sets = FP.config.lab.modules.sets;
  MOD_BIOMES.forEach((id, m) => { for (const step of [1, 2]) for (const W of [280, 360, 440]) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const ids = modIds(modRun({ m, step, W, seed })), at = `${id} step ${step} W=${W} graine ${seed}`;
    FP.assert(ids.length >= 1, 'au moins un : ' + at); FP.assert(ids.every(x => sets[id].includes(x)), 'sélection du biome : ' + ids + ' ' + at);
    FP.assertEqual(new Set(ids).size, ids.length, 'pas de doublon ' + at);
  } });
});

FP.test('modules: le niveau le plus court a la place d’un module de 1,5 écran', () => {
  for (let H = 480; H <= 1000; H += 40) for (const W of [280, 360, 440]) {
    const s = FP.state.createRun(1, { W, H }), w = s.world, c = FP.config.lab.modules;
    w.height = FP.state.worldHeightFor(w.viewH);
    const room = (w.height - FP.config.plant.seedOffset - c.bottom * w.viewH) - (w.surfaceY + c.top * w.viewH);
    FP.assert(room >= 1.5 * w.viewH, `place ${(room / w.viewH).toFixed(2)} écran (${W}×${H})`);
  }
});

FP.test('modules: plusieurs quand le niveau grandit, sans chevauchement', () => {
  let many = 0;
  MOD_BIOMES.forEach((id, m) => { for (const seed of [1, 2, 3, 4]) {
    const s = modRun({ m, seed, grow: 200 }), w = s.world, mods = [...w.modules].sort((a, b) => b.bottom - a.bottom);
    if (mods.length > 1) many += 1;
    FP.assert(mods[0].bottom <= w.height - FP.config.plant.seedOffset + 1e-6 && mods[mods.length - 1].top >= w.surfaceY - 1e-6, 'dans le niveau ' + id);
    for (let i = 1; i < mods.length; i++) FP.assert(mods[i].bottom <= mods[i - 1].top - FP.config.lab.modules.gap * w.viewH + 1e-6, 'intervalle ' + id);
  } });
  FP.assert(many > 0, 'au moins un niveau à plusieurs modules');
});

// Emprise verticale d'un objet tiré au hasard (obstacle : boîte visible ; nappe : ellipse ; limace : trajet et corps ; pièce : disque).
const modTouches = (w, y0, y1) => w.modules.some(M => y1 >= M.top - FP.config.lab.modules.pad && y0 <= M.bottom + FP.config.lab.modules.pad);
FP.test('modules: rien de tiré au hasard dans une bande', () => {
  MOD_BIOMES.forEach((id, m) => { for (const seed of [1, 2, 3, 4, 5]) for (const grow of [0, 200]) {
    const s = modRun({ m, seed, grow, step: 2 }), w = s.world, at = `${id} graine ${seed} grow ${grow}`;
    for (const o of w.solids.filter(q => !q.lab && q.footprint)) { const ys = FP.catalog.visibleFootprint(o).map(p => p.y); FP.assert(!modTouches(w, Math.min(...ys), Math.max(...ys)), 'obstacle ' + o.kind + ' ' + at); }
    for (const t of w.toxics.filter(q => !q.lab)) { const r = Math.max(t.rx, t.ry); if (!w.modules.some(M => t.y >= M.top && t.y <= M.bottom)) FP.assert(!modTouches(w, t.y - r, t.y + r), 'nappe ' + at); }
    for (const l of w.leaks.filter(q => !q.lab)) { const dy = Math.abs(Math.sin(l.angle)) * l.len / 2; FP.assert(!modTouches(w, l.y - dy - l.r, l.y + dy + l.r), 'limace ' + at); }
    const own = new Set(w.chains.map((c, i) => (c.anchor === 'lab' ? i : -1)));
    for (const c of w.coins.filter(q => !own.has(q.chain))) FP.assert(!modTouches(w, c.y - FP.config.coins.radius, c.y + FP.config.coins.radius), 'pièce ' + at);
  } });
  const s = modRun({ m: 0, seed: 2 }), M = s.world.modules[0];
  FP.assert(!FP.levelModules.blocked(s.world, s.world.height - 12, s.world.height - 10), 'sous le module le plus bas : libre');
  FP.assert(!FP.levelModules.blocked(modRun({ step: 0 }).world, 0, 1e9), 'sans module : rien de réservé');
  FP.assert(FP.levelModules.blocked(s.world, (M.top + M.bottom) / 2, (M.top + M.bottom) / 2), 'dans la bande : réservé');
});

FP.test('modules: les nappes et limaces d’un module sont bien les siennes', () => {
  const s = modRun({ m: 2, seed: 3, grow: 200 }), w = s.world;
  const wanted = w.modules.reduce((n, M) => n + (M.circuit.slugs || []).length, 0);
  FP.assertEqual(w.leaks.filter(l => l.lab).length, wanted, 'limaces de module');
  FP.assertEqual(w.solids.filter(o => o.kind === 'lab').length, w.modules.reduce((n, M) => n + M.walls.length, 0), 'murs');
  FP.assert(w.chains.filter(c => c.anchor === 'lab').length === w.modules.length, 'une chaîne de pièces par module');
});

FP.test('modules: le chemin sûr passe par les portes', () => {
  const near = (a, b) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
  MOD_BIOMES.forEach((id, m) => { for (const seed of [1, 2, 3]) for (const grow of [0, 200]) {
    const s = modRun({ m, seed, grow }), w = s.world, P = w.safePath, c = FP.config.lab.modules, at = `${id} graine ${seed}`;
    for (const M of w.modules) {
      const i = P.findIndex(p => near(p, M.path[0])); FP.assert(i >= 0, 'porte du bas ' + at);
      M.path.forEach((q, k) => FP.assert(near(P[i + k], q), 'trajet du module ' + at));
    }
    const out = (y) => !w.modules.some(M => y >= M.top - c.approach * w.viewH - 1e-6 && y <= M.bottom + c.approach * w.viewH + 1e-6);
    for (let k = 1; k < P.length; k++) if (out(P[k - 1].y) && out(P[k].y)) FP.assert(Math.abs(P[k].x - P[k - 1].x) <= FP.config.level.safePath.maxSlope * Math.abs(P[k].y - P[k - 1].y) + 1e-6, 'pente ' + at);
    for (let k = 1; k < P.length; k++) FP.assert(P[k].y < P[k - 1].y, 'le chemin monte toujours ' + at);
  } });
});

FP.test('modules: une mort dans un module coûte une graine et retire le niveau', () => {
  const s = modRun({ m: 3, seed: 4 }); FP.plant.launch(s); const before = s.plant.reserves, M = s.world.modules[0];
  s.plant.tip = { x: s.world.width * .5, y: (M.top + M.bottom) / 2 };
  for (let i = 0; i < 240; i++) { s.time += 1 / 60; FP.labHazards.update(s, 1 / 60); FP.labTurret.update(s, 1 / 60); FP.labPulse.update(s, 1 / 60); }
  s.plant.tip = { x: 3, y: (M.top + M.bottom) / 2 };   // contre le bord, dans le béton du module (ses murs ferment les bords)
  FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, before - 1, 'une graine');
  for (let i = 0; i < 600 && s.mode !== 'ready'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); }
  FP.assertEqual(s.mode, 'ready'); FP.assert(s.world.modules.length >= 1 && s.world.modules[0] !== M, 'nouveau niveau, nouveaux modules');
  FP.assert(!s.world.solids.some(o => o.kind === 'shot' || o.kind === 'pulse'), 'ni tir ni bouffée');
});
