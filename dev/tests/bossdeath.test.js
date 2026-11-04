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

// --- Boss détruit : cinématique de destruction (config.boss.death). Aides : bossRun, bossDirect (boss.test.js), advance, skipShop (flow.test.js), audioSpy (sequencer.test.js).
const bdHead = (milieu = 1) => {
  const s = bossRun(440, milieu); s.bossFight.destroyed = [true, true, true]; s.bossFight.headOpen = true; FP.level.generate(s);
  FP.plant.launch(s); s.events.length = 0; s.plant.reserves = 3; s.camera.shake = 0; return s;
};
const bdPierce = (s) => { const o = s.world.bossLevel.head.solid; s.plant.tip = { x: o.x, y: o.y }; FP.collision.update(s); FP.flow.update(s, 0); };

FP.test('bossDeath: 3,5 s de cinématique au ralenti — pointe figée, menaces muettes, parois qui explosent depuis la tête, puis toutes off', () => {
  const s = bdHead(), bl = s.world.bossLevel, D = FP.config.boss.death, h = bl.head.solid;
  FP.assertEqual(D.time, 3.5);
  const r = bl.rooms.find(q => q.turrets.length); s.bossThreats.rooms[r.id] = { stage: 'warn', t: .5, half: 1 };
  s.bossThreats.aim = { turret: r.turrets[0], t: .2, lockedAt: null };
  bdPierce(s); FP.assert(h.off && s.bossFight.collapse, 'cinématique lancée');
  const tip = { ...s.plant.tip }, ev = [], t0 = s.time;
  let frame = 0;
  const step = () => { const n = ev.length; bdStep(s, ev); for (let k = n; k < ev.length; k++) ev[k].frame = frame; frame++; };
  for (let real = 0; real < D.time - .05; real += 1 / 60) {
    step();
    FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.tip.x, tip.x); FP.assertEqual(s.plant.tip.y, tip.y);
    FP.assert(Object.values(s.bossThreats.rooms).every(e => e.stage === 'idle') && !s.bossThreats.aim && !s.bossThreats.shots.length, 'menaces muettes');
  }
  FP.assert(s.flow.freeze > 0, 'encore figée juste avant 3,5 s');
  FP.assert(Math.abs((s.time - t0) / (D.time - .05) - D.scale) < .02, 'ralenti : ' + (s.time - t0));
  for (let i = 0; i < 12; i++) step();
  FP.assertEqual(s.flow.freeze, 0); FP.assert(!s.bossFight.collapse, 'cinématique finie');
  FP.assert(bl.walls.every(w => w.off), 'toutes les parois tombées');
  const blasts = ev.filter(e => e.type === 'bossBlast'), dist = (e) => FP.collision.distanceTo(bl.walls[e.i], h.x, h.y);
  FP.assertEqual(blasts.length, bl.walls.length); FP.assertEqual(ev.filter(e => e.type === 'bossCrumble').length, bl.walls.length);
  FP.assertEqual(ev.filter(e => e.type === 'bossPeak').length, 1);
  for (const a of blasts) for (const b of blasts) if (a.frame < b.frame) FP.assert(dist(a) <= dist(b) + 1e-9, 'de la tête vers les bords');
  FP.assert(new Set(blasts.map(e => e.frame)).size > 2, 'en chaîne, pas d’un coup');
  const y = s.plant.tip.y; step(); FP.assert(s.plant.tip.y < y, 'la pousse repart');
});

FP.test('bossDeath: la pousse repart à travers les ruines et éclot — bonus × saison, BOSS VAINCU, milieu suivant', () => {
  const s = bdHead(), eco = s.score.eco, ev = []; bdPierce(s);
  for (let f = 0; f < 60 * 12 && s.mode === 'playing'; f++) bdStep(s, ev);
  FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.run.bosses, 1); FP.assertEqual(s.run.card.kind, 'victory');
  FP.assertEqual(ev.filter(e => e.type === 'bossDown').length, 1);
  FP.assert(s.score.eco - eco >= FP.config.boss.bonus * s.run.saison, 'bonus');
  advance(s, 8); skipShop(s);
  FP.assertEqual(s.run.milieu, 2);
  FP.assertEqual(JSON.stringify(s.bossFight), '{"destroyed":[false,false,false],"headOpen":false}');
});

FP.test('bossDeath: chaque étape se dessine sans erreur (fausse surface) — fissures, morceaux, flash plein écran, pluie de jetons', () => bossDirect(() => {
  for (const m of [0, 1, 2, 3]) {
    const s = bdHead(m), bl = s.world.bossLevel, P = FP.palette.boss, seen = { cracks: 0, blasts: 0, chunks: 0, flash: 0, rain: 0 };
    let err = null;
    const render = { frame(st) {
      try {
        st.camera.y = bl.head.solid.y - st.world.viewH / 3;
        const g = recCtx(), d = recCtx();
        FP.bossRender.draw(g, st); FP.bossFx.update(st); FP.bossFx.draw(g, st); FP.bossDeath.update(st); FP.bossDeath.draw(d, st);
        if (st.bossFight.collapse && d.rects.some(q => q.c === P.hole)) seen.cracks++;
        if (st.fx.boss.bursts.some(b => b.kind === 'blast')) seen.blasts++;
        if (st.fx.bossDeath.chunks.length) seen.chunks++;
        if (st.fx.bossDeath.rain.length) seen.rain++;
        if (d.rects.some(q => q.c === P.flash && q.w >= 100)) seen.flash++;
      } catch (e) { err = err || e; }
    } };
    bdPierce(s);
    for (let f = 0; f < 60 * 5 && s.mode === 'playing'; f++) bdStep(s, null, render);
    FP.assert(!err, FP.config.milieux[m].id + ' : ' + (err && err.message));
    for (const k of Object.keys(seen)) FP.assert(seen[k] > 0, FP.config.milieux[m].id + ' : ' + k + ' ' + JSON.stringify(seen));
  }
}));

FP.test('music: la mort du boss coupe la musique net, le jingle de victoire éclate au paroxysme, chaque explosion sonne', () => {
  const s = bdHead(), spy = audioSpy();
  FP.assertEqual(FP.music.songFor(s).song, 'industrieBoss');
  FP.music.update(s, [], spy);
  bdPierce(s);
  FP.assertEqual(JSON.stringify(FP.music.songFor(s)), JSON.stringify({ song: null, gain: 0, cut: true }));
  spy.calls.length = 0; FP.music.update(s, [], spy);
  FP.assert(spy.calls.some(c => c[0] === 'gain' && c[1] === 'song' && c[2] === 0 && c[3] === 0), 'coupée net : ' + JSON.stringify(spy.calls));
  FP.assert(FP.songs.jingles.bossVictory, 'jingle de victoire');
  withBackend(b => { FP.audio.consume([{ type: 'bossPeak', x: 0, y: 0 }], auRun(), 0); FP.assert(sounding(b).filter(c => c[0] === 'note').length >= 8, 'jingle'); });
  for (const type of ['bossBlast', 'bossCrumble']) withBackend(b => { FP.audio.consume([{ type, i: 0, x: 0, y: 0 }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
});
