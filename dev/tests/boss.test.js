// Niveau de boss (v5.1.0) : construit depuis le plan du milieu (assets/boss/plans.js), état du combat, HUD, musique.
// Aides d'autres fichiers (chargés après, appelées au lancement des tests) : recCtx (decor.test.js), flowRun, nextBloom, bloomNow, advance, skipShop (flow / milieux).
const bossRun = (W, milieu, seed = 7) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s); s.run.milieu = milieu; s.run.boss = true; FP.level.generate(s);
  return s;
};
const MILIEUX = ['friche', 'industrie', 'decharge', 'nucleaire'];
const worldPoly = (o) => o.collision.map(([x, y]) => [o.x + x, o.y + y]);

FP.test('bossLevel: construit depuis le plan du milieu', () => {
  for (const W of [280, 300, 360, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const s = bossRun(W, milieu), w = s.world, bl = w.bossLevel, at = `W=${W} ${MILIEUX[milieu]}`;
    const plan = FLOWER_POWER_BOSS_PLANS[MILIEUX[milieu]], placed = FP.bossPlan.toWorld(plan, w);
    FP.assertEqual(bl.plan, plan, 'plan ' + at);
    FP.assertEqual(bl.targets.length, 3, 'cibles ' + at); FP.assertEqual(bl.plates.length, 3, 'plaques ' + at);
    FP.assertEqual(bl.head.solid.kind, 'head', 'tête ' + at);
    FP.assertEqual(bl.walls.length, placed.pieces.filter(p => p.role === 'wall').length, 'murs ' + at);
    bl.targets.forEach((t, i) => {
      FP.assertEqual(t.i, i); FP.assertEqual(t.solid.kind, 'target'); FP.assertEqual(t.solid.off, false);
      const plate = bl.plates.find(p => p.id === t.plate);
      FP.assert(plate && plate.target === i, 'plaque de la cible ' + t.id + ' ' + at);
    });
    for (const p of bl.plates) { FP.assertEqual(p.solid.kind, 'plate'); FP.assertEqual(p.solid.off, false); }
    for (const o of bl.walls) FP.assertEqual(o.kind, 'boss');
    // Chaque solide reprend exactement le polygone du plan posé dans le monde.
    const byId = {};
    for (const t of bl.targets) byId[t.id] = t.solid;
    for (const p of bl.plates) byId[p.id] = p.solid;
    byId[placed.pieces.find(p => p.role === 'head').id] = bl.head.solid;
    placed.pieces.filter(p => p.role === 'wall').forEach((p, k) => { byId[p.id] = bl.walls[k]; });
    for (const p of placed.pieces) {
      if (p.role === 'turret') continue;
      const o = byId[p.id], q = worldPoly(o);
      FP.assert(o && o.boss === true && o.a === 0 && o.flip === 1 && o.flyoverEligible === false && o.grazeRadius === 0, 'solide ' + p.id + ' ' + at);
      FP.assert(q.every(([x, y], k) => Math.abs(x - p.poly[k][0]) < 1e-9 && Math.abs(y - p.poly[k][1]) < 1e-9), 'polygone ' + p.id + ' ' + at);
      FP.assert(o.collision.every(([x, y]) => Math.hypot(x, y) <= o.broadR + 1e-9), 'broadR ' + p.id);
      FP.assert(w.solids.includes(o), 'dans world.solids ' + p.id);
    }
    FP.assertEqual(bl.rooms.length, plan.rooms.length, 'salles ' + at);
    FP.assertEqual(bl.turrets.length, plan.pieces.filter(p => p.role === 'turret').length, 'tourelles ' + at);
    for (const t of bl.turrets) FP.assert(bl.rooms.some(r => r.id === t.room && r.turrets.includes(t.id)), 'tourelle ' + t.id + ' ' + at);
    // Le chemin sûr est le trajet vers la tête ; aucun obstacle ordinaire, aucune limace.
    FP.assert(w.safePath.length > 1, 'chemin sûr ' + at);
    FP.assertEqual(JSON.stringify(w.safePath), JSON.stringify(placed.paths.head), 'chemin = trajet de la tête ' + at);
    FP.assert(w.solids.length > 0 && w.solids.every(o => o.boss === true), 'que le boss ' + at);
    FP.assertEqual(w.leaks.length, 0);
    FP.assert(w.toxics.length <= FP.config.boss.toxics, 'nappes ' + at);
    w.toxics.forEach((t, k) => { FP.assertEqual(t.x, placed.toxics[k].x); FP.assertEqual(t.y, placed.toxics[k].y); });
  }
});

FP.test('bossLevel: identique d’une tentative à l’autre', () => {
  const s = bossRun(440, 2), pick = (w) => JSON.stringify([w.solids.map(o => [o.kind, o.x, o.y, o.collision]), w.toxics, w.safePath]);
  const first = pick(s.world);
  for (let i = 0; i < 37; i++) s.rng.next();
  FP.level.generate(s);
  FP.assertEqual(pick(s.world), first);
});

FP.test('bossLevel: une cible détruite reste détruite à la régénération', () => {
  const s = bossRun(360, 1);
  s.bossFight.destroyed[1] = true; FP.level.generate(s);
  const bl = s.world.bossLevel, t = bl.targets[1];
  FP.assertEqual(t.solid.off, true);
  FP.assertEqual(bl.plates.find(p => p.id === t.plate).solid.off, true);
  for (const k of [0, 2]) {
    FP.assertEqual(bl.targets[k].solid.off, false);
    FP.assertEqual(bl.plates.find(p => p.id === bl.targets[k].plate).solid.off, false);
  }
  FP.assertEqual(bl.head.solid.off, false);
});

FP.test('boss: reset remet tout à zéro', () => {
  const s = FP.state.createRun(3, { W: 440, H: 783 });
  FP.assertEqual(JSON.stringify(s.bossFight), '{"destroyed":[false,false,false],"headOpen":false}');
  s.bossFight.destroyed[0] = s.bossFight.destroyed[2] = true; s.bossFight.headOpen = true;
  FP.boss.reset(s);
  FP.assertEqual(JSON.stringify(s.bossFight), '{"destroyed":[false,false,false],"headOpen":false}');
});

FP.test('hud: icônes de cibles et de tête', () => {
  FP.assertEqual(FP.hud.items(hudRun()).boss, null);
  const s = bossRun(440, 1);
  FP.assertEqual(JSON.stringify(FP.hud.items(s).boss), '{"targets":[false,false,false],"head":"armored"}');
  s.bossFight.destroyed[0] = s.bossFight.destroyed[2] = true;
  FP.assertEqual(JSON.stringify(FP.hud.items(s).boss), '{"targets":[true,false,true],"head":"armored"}');
  s.bossFight.destroyed[1] = true;
  FP.assertEqual(JSON.stringify(FP.hud.items(s).boss), '{"targets":[true,true,true],"head":"open"}');
});

FP.test('music: le thème du boss s’emballe de tempoPerTarget par cible détruite', () => {
  const s = mRun(); inMilieu(s, 0, true); const base = FP.songs.fricheBoss.bpm;
  FP.assertEqual(FP.music.tempoFor(s), base);
  s.bossFight.destroyed[0] = s.bossFight.destroyed[2] = true;
  FP.assertEqual(FP.music.tempoFor(s), base + 2 * FP.config.boss.tempoPerTarget);
});

// Pousse pilotée à la souris (les vrais play/plant.js et world/collision.js) le long d'un trajet de référence, jusqu'à la pièce visée.
// Le pointeur vise l'abscisse du prochain point du trajet ; sa hauteur d'écran donne un regard en avant égal à l'écart jusqu'à ce point.
// Rend null si la pointe arrive à moins de 12 px de la pièce sans avoir touché autre chose, sinon ce qui a mal tourné.
const steerAlong = (s, path, goal) => {
  const c = FP.config.plant.control, dt = 1 / 60, H = s.world.viewH;
  FP.plant.prepare(s); FP.plant.launch(s);
  let i = 1;
  for (let f = 0; f < 60 * 60; f++) {
    const tip = s.plant.tip;
    while (i < path.length - 1 && tip.y <= path[i].y) i++;
    const p = path[i], look = FP.math.clamp(tip.y - p.y, c.lookAheadBottom, c.lookAheadTop);
    const y = (c.lookAheadTop - look) / (c.lookAheadTop - c.lookAheadBottom) * H;
    s.input = { ...s.input, down: true, touch: false, key: false, active: true, x: p.x, screenX: 0, y };
    s.time += dt;
    FP.plant.update(s, dt); FP.collision.update(s);
    if (FP.collision.distanceTo(goal, tip.x, tip.y) <= 12) return null;
    if (s.query.solid && s.query.solid !== goal) return `touche ${s.query.solid.kind} en (${tip.x | 0}, ${tip.y | 0}), point ${i}`;
    if (tip.y < path[path.length - 1].y - 40) return `passe au-dessus du but en (${tip.x | 0}, ${tip.y | 0})`;
  }
  return 'jamais arrivée';
};

FP.test('bossLevel: une pousse pilotée atteint chaque cible sans toucher de paroi', () => {
  for (const W of [280, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const s0 = bossRun(W, milieu), placed = FP.bossPlan.toWorld(s0.world.bossLevel.plan, s0.world);
    for (const t of s0.world.bossLevel.targets) {
      const s = bossRun(W, milieu), goal = s.world.bossLevel.targets[t.i].solid;
      const err = steerAlong(s, placed.paths[t.id], goal);
      FP.assert(!err, `W=${W} ${MILIEUX[milieu]} → ${t.id} : ${err}`);
    }
    const s = bossRun(W, milieu);
    s.bossFight.destroyed = [true, true, true]; FP.level.generate(s);
    FP.assert(s.world.bossLevel.plates.every(p => p.solid.off), 'plaques tombées');
    const err = steerAlong(s, placed.paths.head, s.world.bossLevel.head.solid);
    FP.assert(!err, `W=${W} ${MILIEUX[milieu]} → tête : ${err}`);
  }
});

FP.test('bossLevel: la spore ne détruit pas le boss', () => {
  const s = bossRun(440, 0), before = s.world.solids.length, t = s.world.bossLevel.targets[1].solid;
  FP.powerups.detonate(s, t.x, t.y);
  FP.assertEqual(s.world.solids.length, before);
});

FP.test('level: un niveau normal n’a pas de bossLevel', () => {
  const s = bossRun(440, 0);
  s.run.boss = false; FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel, null);
  FP.assert(s.world.solids.every(o => !o.boss));
});

FP.test('boss: victoire — bonus × saison, carton BOSS VAINCU, milieu suivant remis à zéro', () => {
  const s = flowRun(); for (let i = 0; i < 3; i++) nextBloom(s);
  FP.plant.launch(s); s.events.length = 0;
  s.bossFight.destroyed = [true, true, true];
  const eco = s.score.eco;
  bloomNow(s);
  FP.assertEqual(s.events.filter(e => e.type === 'bossDown').length, 1);
  FP.assertEqual(s.score.eco - eco, FP.config.boss.bonus * s.run.saison);
  FP.assertEqual(s.run.card.kind, 'victory');
  advance(s, 8); skipShop(s);
  FP.assertEqual(s.run.milieu, 1);
  FP.assertEqual(JSON.stringify(s.bossFight.destroyed), '[false,false,false]');
});

FP.test('bossRender: dessine chaque plan sans erreur ni écriture dans l’état', () => {
  for (let milieu = 0; milieu < 4; milieu++) {
    const s = bossRun(440, milieu), bl = s.world.bossLevel;
    s.camera.y = bl.targets[0].solid.y - s.world.viewH / 2; s.time = 1.3;
    const snap = JSON.stringify(bl), g = recCtx();
    FP.bossRender.draw(g, s);
    FP.assertEqual(JSON.stringify(bl), snap, 'le dessin n’écrit rien');
    FP.assert(g.rects.length > 50, 'rien dessiné (milieu ' + milieu + ')');
    s.bossFight.destroyed = [true, true, true]; FP.level.generate(s);
    s.camera.y = s.world.bossLevel.head.solid.y - s.world.viewH / 2; FP.bossRender.draw(recCtx(), s);   // tête à nu, cibles détruites
  }
  FP.bossRender.draw(recCtx(), FP.state.createRun(3, { W: 440, H: 783 }));   // niveau normal : rien, sans erreur
});

FP.test('palette: les teintes du boss restent à 60 de toute teinte de danger', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
  const B = FP.palette.boss, all = [...B.weak, ...B.plate, ...B.glow, ...B.smoke, B.hole, ...Object.values(B.milieux).flatMap(m => Object.values(m))];
  for (const c of all) for (const d of FP.palette.danger) FP.assert(dist(c, d) >= 60, c + ' trop proche du danger ' + d);
});
