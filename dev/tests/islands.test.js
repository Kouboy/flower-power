// Îlots de la tresse (v5.17.0, spec docs/superpowers/specs/2026-11-19-tresse-ilots-design.md) : des déchets entre A et B, puis, à partir du
// deuxième biome, au plus une tourelle enfouie par îlot. Aides : braidLevel (braid.test.js), recCtx (decor.test.js).

// Les solides (ou les nappes, list) d'un îlot : entre A et B, à sa hauteur.
const inIsland = (w, sp, list = w.solids) => list.filter(o => o.y <= sp.y0 && o.y >= sp.y1 && (o.x - FP.level.pathXAt(w, o.y)) * (o.x - FP.level.pathXAt(w, o.y, w.braid.path)) < 0);

// v5.17.1 : à leur taille (jamais réduits), les déchets ne tiennent que dans les îlots assez larges ; les autres ont une nappe à leur mesure.
FP.test('îlots: presque tous sont peuplés, d’un déchet ou d’une nappe', () => {
  let n = 0, full = 0;
  for (const W of [360, 440]) for (const m of [0, 1, 2, 3]) for (let seed = 1; seed <= 6; seed++) {
    const w = braidLevel({ seed, W, m }).world;
    for (const sp of FP.islands.spans(w)) { n += 1; if (inIsland(w, sp).length || inIsland(w, sp, w.toxics).length) full += 1; }
  }
  FP.assert(full / n >= .8, `îlots peuplés : ${full}/${n}`);
});
FP.test('îlots: leurs nappes restent hors du couloir de A, et pas en petits points', () => {
  const k = FP.config.braid.islands.pool.edgeK;
  for (const W of [280, 360, 440]) for (const m of [0, 2]) for (let seed = 1; seed <= 5; seed++) {
    const w = braidLevel({ seed, W, m }).world, pts = FP.level.pathSamples(w);
    for (const sp of FP.islands.spans(w)) for (const t of inIsland(w, sp, w.toxics)) {
      FP.assert(FP.levelHazards.toxicClear(t, pts, w.hazardRadius * k - 1e-6), `nappe dans A (W=${W} biome ${m} graine ${seed})`);
      FP.assert(t.rx >= FP.config.braid.islands.pool.rx[0], `nappe ${t.rx | 0}×${t.ry | 0}`);   // (les nappes ordinaires peuvent aussi tomber dans un îlot)
    }
  }
});

FP.test('îlots: jamais plus d’une tourelle par îlot, aucune au premier biome', () => {
  const by = [0, 0, 0, 0];
  for (const W of [280, 360, 440]) for (const m of [0, 1, 2, 3]) for (let seed = 1; seed <= 8; seed++) for (const grow of [0, 200]) {
    const w = braidLevel({ seed, W, m, grow }).world, at = `W=${W} biome ${m} graine ${seed} grow ${grow}`;
    by[m] += w.turrets.length;
    FP.assertEqual(w.turrets.length, w.solids.filter(o => o.kind === 'turret').length, 'chaque tourelle est un obstacle ' + at);
    for (const sp of FP.islands.spans(w)) FP.assert(inIsland(w, sp).filter(o => o.kind === 'turret').length <= 1, 'une tourelle au plus ' + at);
    for (const q of w.turrets) FP.assert(FP.islands.spans(w).some(sp => inIsland(w, sp).includes(q.solid)), 'dans un îlot ' + at);
  }
  FP.assertEqual(by[0], 0, 'premier biome');
  FP.assert(by[1] > 0 && by[3] > 0, 'des tourelles ensuite : ' + by);
});

// Une tourelle d'îlot en jeu : la pointe à 150 px sous elle, la caméra centrée dessus.
const turretGame = () => {
  for (let seed = 1; seed <= 40; seed++) {
    const s = braidLevel({ seed, W: 440, m: 3 });
    if (!s.world.turrets.length) continue;
    const q = s.world.turrets[0]; FP.plant.launch(s); s.mode = 'playing';
    s.plant.tip = { x: q.x, y: q.y + 150 }; s.camera.y = q.y - s.world.viewH / 2; s.events.length = 0;
    return { s, q };
  }
  return null;
};
const turretRun = (s, sec) => { for (let i = 0; i < Math.round(sec * 60); i++) { s.time += 1 / 60; FP.islandTurrets.update(s, 1 / 60); } };
const turretEvents = (s, type) => s.events.filter(e => e.type === type && e.turret === 0 && e.island);

FP.test('tourelle d’îlot: vise, se verrouille, tire sa rafale, puis attend', () => {
  const g = turretGame(); FP.assert(g, 'une tourelle'); const { s } = g, C = FP.config.boss.shot;
  turretRun(s, C.track - C.lock - .05);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 1, 'visée'); FP.assertEqual(turretEvents(s, 'bossLock').length, 0, 'pas encore figée');
  turretRun(s, C.lock + C.burst * C.burstGap + .05);
  FP.assertEqual(turretEvents(s, 'bossLock').length, 1, 'figée'); FP.assertEqual(turretEvents(s, 'bossShot').length, C.burst, 'la rafale');
  FP.assert(s.world.turretShots.length > 0 && s.world.turretShots.every(t => s.world.solids.includes(t.solid)), 'les tirs sont des obstacles');
  turretRun(s, FP.config.braid.islands.turret.gap - .3);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 1, 'elle attend');
  turretRun(s, .5);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 2, 'puis vise à nouveau');
});

FP.test('tourelle d’îlot: muette hors de portée ou hors champ', () => {
  const g = turretGame(), { s, q } = g;
  s.plant.tip = { x: q.x, y: q.y + FP.config.braid.islands.turret.range + 20 }; turretRun(s, 2);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 0, 'hors de portée');
  s.plant.tip = { x: q.x, y: q.y + 100 }; s.camera.y = q.y + 10; turretRun(s, 2);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 0, 'hors champ');
});

FP.test('tourelle d’îlot: elle et ses tirs tuent', () => {
  let { s, q } = turretGame();
  s.plant.tip = { x: q.x, y: q.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying', 'toucher la tourelle');
  ({ s, q } = turretGame()); turretRun(s, FP.config.boss.shot.track + .02);
  const t = s.world.turretShots[0]; FP.assert(t, 'un tir');
  s.plant.tip = { x: t.x, y: t.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying', 'toucher un tir');
  turretRun(s, .1);
  FP.assertEqual(s.world.turretShots.length, 0, 'plus de tir après la mort'); FP.assertEqual(s.world.solids.filter(o => o.kind === 'shot').length, 0);
});

FP.test('tourelle d’îlot: la spore la fait taire', () => {
  const { s, q } = turretGame();
  FP.powerups.detonate(s, q.x, q.y);
  FP.assert(!s.world.solids.includes(q.solid), 'nettoyée'); turretRun(s, 2);
  FP.assertEqual(turretEvents(s, 'bossAim').length, 0, 'muette');
});

FP.test('tourelle d’îlot: enfouie, et ses tirs sont des ondes dans la terre', () => {
  const { s } = turretGame(), P = FP.palette.boss;
  let g = recCtx(); FP.islandTurretView.drawBody(g, s);
  FP.assert(g.rects.some(r => P.pulse.dirt.includes(r.c)), 'la motte'); FP.assert(g.rects.some(r => r.c === P.milieux.nucleaire.edge), 'la trappe du biome');
  turretRun(s, .2); g = recCtx(); FP.islandTurretView.drawThreats(g, s);
  FP.assert(g.rects.some(r => r.c === P.aim[0]), 'la ligne de visée');
  turretRun(s, FP.config.boss.shot.track); g = recCtx(); FP.islandTurretView.drawThreats(g, s);
  FP.assert(g.rects.some(r => r.c === P.pulse.core), 'une onde');
});

// Revue au navigateur : avant le départ et entre deux vies, la pousse n'a pas de pointe ; la tourelle se dessine quand même (canon vers le haut).
FP.test('tourelle d’îlot: dessinée sans pointe', () => {
  const { s, q } = turretGame(); s.plant.tip = null; s.mode = 'ready';
  FP.assertEqual(FP.islandTurrets.pose(s, q).angle, -Math.PI / 2); FP.assertEqual(FP.islandTurrets.pose(s, q).aim, null);
  FP.islandTurretView.drawBody(recCtx(), s); FP.islandTurretView.drawThreats(recCtx(), s);
});

// Retour de jeu (v5.17.1) : réduits pour tenir dans les îlots, des micro-ondes dépassaient des frigos. Chaque déchet garde sa taille de
// référence (au tirage de taille près, sizeJitter) ; seul le T-Rex signature se règle sur l'écran.
FP.test('îlots: chaque déchet garde sa taille de référence', () => {
  const [lo, hi] = FP.config.level.solids.sizeJitter;
  for (const W of [280, 360, 440]) for (const m of [0, 1, 2, 3]) for (let seed = 1; seed <= 5; seed++) for (const o of braidLevel({ seed, W, m }).world.solids) {
    if (o.kind === 'turret' || o.kind === 'trex_signature') continue;
    const k = o.w / FP.catalog.assets[o.kind].render.worldWidth;
    FP.assert(k >= lo - 1e-9 && k <= hi + 1e-9, `${o.kind} à ${Math.round(k * 100)} % (W=${W} biome ${m} graine ${seed})`);
  }
});

// Retour de jeu (v5.17.2) : « trop facile de les ignorer ». Au verrouillage, la tourelle vise là où la pousse sera quand le tir arrivera
// (sa vitesse, le temps du verrouillage et du trajet, × turret.lead), pas là où elle est.
FP.test('tourelle d’îlot: vise en amont de la pousse', () => {
  const { s, q } = turretGame(), C = FP.config.boss.shot, T = FP.config.braid.islands.turret;
  s.plant.dir = { x: 0, y: -1 }; const tip = { ...s.plant.tip }, v = FP.plant.speed(s);
  turretRun(s, C.track - C.lock + .02);
  const at = q.aim.lockedAt, d = Math.hypot(tip.x - q.x, tip.y - q.y);
  FP.assert(at, 'figée'); FP.assertEqual(Math.round(at.x), Math.round(tip.x), 'droit devant');
  const ahead = tip.y - at.y, want = v * (C.lock + d / T.speed) * T.lead;
  FP.assert(ahead > want * .8 && ahead < want * 1.2, `en avance de ${ahead | 0} px (attendu ~${want | 0})`);
});
