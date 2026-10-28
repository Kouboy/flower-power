// Niveau de boss (v4.12.0) : tronçons, points faibles, couloir, trappe.
const bossRun = (W, milieu, seed = 7) => {
  const s = FP.state.createRun(seed, { W, H: Math.round(W * 16 / 9) });
  FP.level.startRun(s); s.run.milieu = milieu; s.run.boss = true; FP.level.generate(s);
  return s;
};
const B = () => FP.config.boss;
const radiusAt = (s) => Math.min(Math.max(FP.config.level.safePath.radiusMin, FP.config.level.safePath.radiusBase + s.level * FP.config.level.safePath.radiusPerLevel) * B().corridorK,
  B().weakOut + B().weakHit - 2);

FP.test('bossLevel: 4 tronçons alternés, chacun son point faible côté couloir', () => {
  for (const W of [300, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const bl = bossRun(W, milieu).world.bossLevel;
    FP.assertEqual(bl.segments.length, B().segments);
    FP.assertEqual(bl.weak.length, B().segments);
    bl.segments.forEach((seg, i) => {
      if (i > 0) FP.assertEqual(seg.side, -bl.segments[i - 1].side, 'alternance ' + i);
      FP.assert(Math.abs(Math.abs(seg.x1 - seg.x0) - W * B().segWidth) < 1e-6, 'largeur ' + i);
      if (i > 0) FP.assert(seg.y1 < bl.segments[i - 1].y0, 'empilés du bas vers le haut ' + i);
      const w = bl.weak[i], face = seg.side < 0 ? seg.x1 : seg.x0;
      FP.assertEqual(w.i, i);
      FP.assert(Math.abs(Math.abs(w.x - face) - B().weakOut) < 1e-6 && Math.sign(face - w.x) === seg.side, 'saillie côté couloir ' + i);
      FP.assert(Math.abs(w.y - (seg.y0 + seg.y1) / 2) < 1e-6, 'mi-hauteur ' + i);
      FP.assert(FP.collision.distanceTo(seg.solid, w.x, w.y) >= B().weakR - B().weakOut, 'hors du polygone ' + i);
      FP.assertEqual(seg.solid.kind, 'boss');
    });
  }
});

FP.test('bossLevel: le couloir est franchissable et longe chaque point faible', () => {
  for (const W of [300, 440]) for (let milieu = 0; milieu < 4; milieu++) {
    const s = bossRun(W, milieu), w = s.world, bl = w.bossLevel, P = w.safePath;
    const normal = Math.max(FP.config.level.safePath.radiusMin, FP.config.level.safePath.radiusBase + s.level * FP.config.level.safePath.radiusPerLevel);
    FP.assert(Math.abs(w.safeRadius - radiusAt(s)) < 1e-9 && w.safeRadius <= normal * B().corridorK + 1e-9, 'rayon ' + w.safeRadius);
    const blocking = w.solids.filter(o => !o.off && o.kind !== 'trap');
    for (const n of P) for (const o of blocking) FP.assert(FP.collision.distanceTo(o, n.x, n.y) >= w.safeRadius, `nœud (${n.x | 0},${n.y | 0}) trop près de ${o.kind}`);
    for (const wk of bl.weak) {
      let m = Infinity;
      for (let i = 1; i < P.length; i++) m = Math.min(m, FP.geom.distPointToSegment(wk.x, wk.y, P[i - 1].x, P[i - 1].y, P[i].x, P[i].y));
      FP.assert(m <= B().weakHit, 'point faible ' + wk.i + ' à ' + m);
    }
    FP.assertEqual(P[0].x, w.width / 2); FP.assertEqual(P[0].y, w.height - FP.config.plant.seedOffset);
    const last = P[P.length - 1];
    FP.assert(last.y >= bl.trap.y1 && last.y < bl.trap.y1 + 40 && last.x > 0 && last.x < w.width, 'fin sous la trappe');
    for (let i = 1; i < P.length; i++) FP.assert(P[i].y < P[i - 1].y, 'le couloir monte');
  }
});

FP.test('bossLevel: même niveau d’une tentative à l’autre', () => {
  const s = bossRun(440, 2), pick = (w) => JSON.stringify([w.bossLevel.segments.map(g => [g.side, g.x0, g.x1, g.y0, g.y1]), w.bossLevel.weak, w.toxics, w.safePath]);
  const first = pick(s.world);
  for (let i = 0; i < 37; i++) s.rng.next();
  FP.level.generate(s);
  FP.assertEqual(pick(s.world), first);
});

FP.test('bossLevel: un duel — ni obstacle habituel ni limace, 2 nappes hors des points faibles', () => {
  for (let milieu = 0; milieu < 4; milieu++) for (const W of [300, 440]) {
    const w = bossRun(W, milieu).world;
    FP.assert(w.solids.length > 0 && w.solids.every(o => o.boss === true), 'que le boss');
    FP.assertEqual(w.leaks.length, 0);
    FP.assert(w.toxics.length <= B().toxics, 'nappes ' + w.toxics.length);
    for (const t of w.toxics) for (const wk of w.bossLevel.weak) {
      FP.assert(Math.hypot(t.x - wk.x, t.y - wk.y) > B().weakHit + Math.max(t.rx, t.ry), 'nappe sur un point faible');
    }
  }
});

FP.test('bossLevel: trappe pleine largeur sous la pelouse, fermée tant qu’il reste un point', () => {
  const s = bossRun(440, 1), tr = s.world.bossLevel.trap, w = s.world;
  FP.assertEqual(tr.solid.off, false); FP.assertEqual(tr.solid.kind, 'trap');
  FP.assertEqual(tr.y0, w.surfaceY + B().trap.gap); FP.assertEqual(tr.y1 - tr.y0, B().trap.thick);
  FP.assert(FP.collision.distanceTo(tr.solid, 3, (tr.y0 + tr.y1) / 2) < 0 && FP.collision.distanceTo(tr.solid, w.width - 3, (tr.y0 + tr.y1) / 2) < 0, 'pleine largeur');
  FP.assert(w.solids.includes(tr.solid));
  s.bossFight.pierced = s.bossFight.pierced.map(() => true);
  FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel.trap.solid.off, true);
  s.bossFight.pierced[2] = false; FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel.trap.solid.off, false);
});

FP.test('bossLevel: une défense par tronçon, montée sur sa face, de la paire du milieu, au repos', () => {
  for (let milieu = 0; milieu < 4; milieu++) {
    const w = bossRun(440, milieu).world, bl = w.bossLevel, d = B().defense;
    FP.assertEqual(bl.defenses.length, B().segments);
    bl.defenses.forEach((df, i) => {
      const seg = bl.segments[i], pair = B().pairs[FP.config.milieux[milieu].id];
      FP.assertEqual(df.type, pair[i % 2]); FP.assertEqual(df.side, seg.side);
      FP.assertEqual(df.x, seg.side < 0 ? seg.x1 : seg.x0);
      FP.assert(Math.abs(df.y - (seg.y0 + d.mountK * (seg.y1 - seg.y0))) < 1e-6, 'à mountK du haut');
      FP.assert(Math.abs(df.reach - d.reach * (w.width - Math.abs(seg.x1 - seg.x0))) < 1e-6, 'portée');
      FP.assertEqual(df.solid.kind, 'defense'); FP.assertEqual(df.solid.off, true); FP.assertEqual(df.solid.boss, true);
      FP.assert(w.solids.includes(df.solid));
    });
  }
});

FP.test('bossLevel: la spore ne détruit pas le boss', () => {
  const s = bossRun(440, 0), before = s.world.solids.filter(o => o.boss).length, seg = s.world.bossLevel.segments[1];
  FP.powerups.detonate(s, (seg.x0 + seg.x1) / 2, (seg.y0 + seg.y1) / 2);
  FP.assertEqual(s.world.solids.filter(o => o.boss).length, before);
});

FP.test('level: un niveau normal n’a pas de bossLevel', () => {
  const s = bossRun(440, 0);
  s.run.boss = false; FP.level.generate(s);
  FP.assertEqual(s.world.bossLevel, null);
  FP.assert(s.world.solids.every(o => !o.boss));
});

FP.test('state: bossFight démarre sans point percé', () => {
  const s = FP.state.createRun(3, { W: 440, H: 783 });
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[false,false,false,false]');
});

// Défenses (v4.12.0) : cycle prévient / frappe / repos, formes animées.
const sweepStage = (i, pierced, name) => {
  const f = Math.pow(1 - B().defense.speedup, pierced), P = B().defense.period * f, dt = .001;
  let n = 0;
  for (let t = 0; t < P; t += dt) if (FP.boss.stageAt(i, t, pierced).stage === name) n++;
  return n * dt;
};

FP.test('boss: une défense prévient, frappe, se repose, aux durées réglées', () => {
  const d = B().defense;
  FP.assert(Math.abs(sweepStage(0, 0, 'warn') - d.warn) < .01, 'warn');
  FP.assert(Math.abs(sweepStage(0, 0, 'strike') - d.strike) < .01, 'strike');
  FP.assert(Math.abs(sweepStage(0, 0, 'rest') - (d.period - d.warn - d.strike)) < .01, 'rest');
  for (let t = 0; t < 6; t += .05) { const s = FP.boss.stageAt(1, t, 0); FP.assert(s.k >= 0 && s.k <= 1, 'k ' + s.k); }
});

FP.test('boss: 20 % plus vite par point percé', () => {
  const d = B().defense;
  FP.assert(Math.abs(sweepStage(2, 2, 'strike') - d.strike * .8 * .8) < .01, 'strike ' + sweepStage(2, 2, 'strike'));
});

FP.test('boss: jamais toutes les défenses en coup au même instant', () => {
  for (let p = 0; p < 4; p++) for (let t = 0; t <= 10; t += .05) {
    let n = 0;
    for (let i = 0; i < 4; i++) if (FP.boss.stageAt(i, t, p).stage === 'strike') n++;
    FP.assert(n < 4, `${n} coups à t=${t}, ${p} percés`);
  }
});

FP.test('boss: une défense n’est un obstacle que pendant son coup, et laisse la moitié du couloir libre', () => {
  for (const milieu of [0, 1, 2, 3]) {
    const s = bossRun(440, milieu), bl = s.world.bossLevel;
    let seen = 0;
    for (let t = 0; t < 6; t += .05) {
      s.time = t; FP.boss.update(s, 0);
      for (const df of bl.defenses) {
        const st = FP.boss.stageAt(df.i, t, 0).stage, o = df.solid;
        FP.assertEqual(o.off, st !== 'strike', `off ${df.type} t=${t}`);
        if (o.off) continue;
        seen++;
        const free = s.world.width - Math.abs(bl.segments[df.i].x1 - bl.segments[df.i].x0);
        for (const [px, py] of o.collision) {
          const p = FP.geom.toWorld(o, px, py), out = (p.x - df.x) * -df.side;
          FP.assert(out <= df.reach + 1e-6 && df.reach <= free / 2 + 1e-6, `${df.type} sort de ${out}`);
          FP.assert(py === py && p.y === p.y, 'nombre');
        }
        FP.assert(o.broadR > 0);
      }
    }
    FP.assert(seen > 0, 'des coups ont eu lieu');
  }
});

FP.test('boss: le bras au repos ne touche pas le couloir, il y entre à la fin du coup', () => {
  const s = bossRun(440, 1), bl = s.world.bossLevel;
  for (const df of bl.defenses.filter(d => d.type === 'arm')) {
    const reachOf = (t) => {
      s.time = t; FP.boss.update(s, 0);
      return Math.max(...df.solid.collision.map(([px, py]) => (FP.geom.toWorld(df.solid, px, py).x - df.x) * -df.side));
    };
    const W = B().defense.warn, S = B().defense.strike, phase = -df.i * B().defense.period / 4;
    const start = phase + Math.ceil((0 - phase) / B().defense.period) * B().defense.period + W;
    FP.assert(reachOf(start + .001) <= 1, 'début du coup : le long de la face');
    FP.assert(Math.abs(reachOf(start + S - .001) - df.reach) < df.reach * .02 + B().defense.thick, 'fin du coup : à l’horizontale');
  }
});

// Perçage, trappe, persistance, victoire (v4.12.0).
const bossFlow = () => { const s = flowRun(); for (let i = 0; i < 3; i++) nextBloom(s); FP.plant.launch(s); s.events.length = 0; return s; };
const tipOn = (s, i) => { const w = s.world.bossLevel.weak[i]; s.plant.tip = { x: w.x, y: w.y }; };
const seen = (s, type) => s.events.filter(e => e.type === type);
const pierceAll = (s) => { for (let i = 0; i < B().segments; i++) { tipOn(s, i); FP.boss.update(s, 0); } };

FP.test('boss: la pointe perce un point faible une seule fois', () => {
  const s = bossFlow(), eco = s.score.eco;
  tipOn(s, 1); FP.boss.update(s, 0);
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[false,true,false,false]');
  const ev = seen(s, 'bossPierce'), w = s.world.bossLevel.weak[1];
  FP.assertEqual(ev.length, 1); FP.assertEqual(ev[0].i, 1); FP.assertEqual(ev[0].x, w.x); FP.assertEqual(ev[0].y, w.y);
  FP.assertEqual(s.score.eco - eco, B().pierceBonus * s.run.saison);
  FP.assert(s.camera.shake >= B().pierceShake, 'secousse');
  s.events.length = 0; FP.boss.update(s, 0);
  FP.assertEqual(s.events.length, 0); FP.assertEqual(s.score.eco - eco, B().pierceBonus * s.run.saison);
});

FP.test('boss: hors du rayon de perçage, ou hors jeu, rien ne perce', () => {
  const s = bossFlow(), w = s.world.bossLevel.weak[0];
  s.plant.tip = { x: w.x + B().weakHit + 1, y: w.y }; FP.boss.update(s, 0);
  FP.assertEqual(s.bossFight.pierced.some(Boolean), false);
  tipOn(s, 0); s.mode = 'dying'; FP.boss.update(s, 0);
  FP.assertEqual(s.bossFight.pierced.some(Boolean), false); FP.assertEqual(seen(s, 'bossPierce').length, 0);
});

FP.test('boss: 4 points percés → la trappe s’ouvre', () => {
  const s = bossFlow(), tr = s.world.bossLevel.trap.solid;
  for (let i = 0; i < 3; i++) { tipOn(s, i); FP.boss.update(s, 0); }
  FP.assertEqual(tr.off, false); FP.assertEqual(seen(s, 'bossTrap').length, 0);
  tipOn(s, 3); FP.boss.update(s, 0); FP.boss.update(s, 0);
  FP.assertEqual(tr.off, true); FP.assertEqual(seen(s, 'bossTrap').length, 1);
});

FP.test('boss: trappe fermée atteinte → mort « la trappe est fermée »', () => {
  const s = bossFlow(), tr = s.world.bossLevel.trap;
  s.plant.tip = { x: 220, y: (tr.y0 + tr.y1) / 2 };
  FP.collision.update(s); FP.flow.update(s, 0);
  const d = seen(s, 'death');
  FP.assertEqual(d.length, 1); FP.assertEqual(d[0].kind, 'trap');
  FP.assertEqual(s.flow.overReason, FP.config.text.death.trap);
});

FP.test('boss: une mort garde les points percés et la trappe ouverte', () => {
  const s = bossFlow(); pierceAll(s);
  s.plant.reserves = 3; killNow(s);
  FP.assertEqual(s.mode, 'ready');
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[true,true,true,true]');
  FP.assertEqual(s.world.bossLevel.trap.solid.off, true);
});

FP.test('boss: la dernière chance garde les points percés', () => {
  const s = bossFlow(); tipOn(s, 0); FP.boss.update(s, 0); tipOn(s, 2); FP.boss.update(s, 0);
  s.plant.reserves = 1; killNow(s);
  FP.assertEqual(s.mode, 'shop');
  s.plant.reserves = 1; s.shop = null; FP.flow.afterShop(s, 'last');
  FP.assertEqual(s.mode, 'ready');
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[true,false,true,false]');
  FP.assertEqual(s.world.bossLevel.trap.solid.off, false);
});

FP.test('boss: victoire — bonus 1 500 × saison, carton BOSS VAINCU, milieu suivant', () => {
  const s = bossFlow(); pierceAll(s); s.events.length = 0;
  const eco = s.score.eco;
  bloomNow(s);
  const ev = seen(s, 'bossDown');
  FP.assertEqual(ev.length, 1); FP.assertEqual(ev[0].x, 220); FP.assertEqual(ev[0].y, s.world.surfaceY);
  FP.assertEqual(s.score.eco - eco, B().bonus * s.run.saison);
  FP.assertEqual(s.run.card.kind, 'victory');
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[true,true,true,true]');
  advance(s, 8); skipShop(s);
  FP.assertEqual(s.run.milieu, 1);
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[false,false,false,false]');
});

FP.test('boss: saison 2, le boss de la friche est intact', () => {
  const s = flowRun();
  for (let i = 0; i < 15; i++) nextBloom(s);
  s.bossFight.pierced = [true, true, true, true];   // le boss du réacteur est tombé tout percé
  FP.plant.launch(s); bloomNow(s);
  for (let i = 0; i < 900 && s.mode !== 'won'; i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'won'); FP.assertEqual(s.run.saison, 2);
  advance(s, 2); s.input = { ...s.input, pressed: true }; FP.flow.update(s, 1 / 60); s.input = { ...s.input, pressed: false };
  for (let i = 0; i < 3; i++) nextBloom(s);
  FP.assert(s.run.boss && s.run.milieu === 0 && s.run.saison === 2, JSON.stringify(s.run));
  FP.assertEqual(JSON.stringify(s.bossFight.pierced), '[false,false,false,false]');
  FP.assertEqual(s.world.bossLevel.trap.solid.off, false);
});
