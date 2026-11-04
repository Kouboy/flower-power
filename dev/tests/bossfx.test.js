// Rendu du boss (v5.1.0) : graine rendue, « +1 GRAINE », menaces lisibles, assaut = explosion, sons. Aides : bossRun, bossDirect (boss.test.js), recCtx (decor.test.js), auRun / withBackend / sounding (audio.test.js).
const bfxRun = (milieu = 1) => { const s = bossRun(440, milieu); s.mode = 'playing'; s.camera.y = s.world.bossLevel.targets[0].solid.y - s.world.viewH / 2; s.time = 2; return s; };
const bfxUi = (s) => ({ w: Math.round(s.world.width / FP.px.SCALE), h: Math.ceil(s.world.viewH / FP.px.SCALE) });
// Espionne FP.font.draw (pas de toile sous Node) : les textes demandés, avec leur échelle.
const bfxTexts = (fn) => {
  const saved = FP.font.draw, out = [];
  FP.font.draw = (g, text, x, y, o) => { out.push({ text, x, y, scale: (o && o.scale) || 1 }); return 0; };
  try { fn(); } finally { FP.font.draw = saved; }
  return out;
};
const bfxAssault = (s, i = 0) => { const o = s.world.bossLevel.targets[i].solid; s.events.push({ type: 'bossTarget', i, x: o.x, y: o.y }, { type: 'bossSeed', x: o.x, y: o.y }); FP.bossFx.update(s); s.events.length = 0; return o; };

FP.test('bossfx: la graine finit sur le compteur du HUD en 1 s au plus', () => {
  const s = bfxRun(), c = FP.bossFx.counter(s), from = { x: 120, y: 90 };
  FP.assert(FP.bossFx.FLIGHT <= 1, 'durée ' + FP.bossFx.FLIGHT);
  const h = bfxUi(s).h, L = FP.hud.layout(h);
  FP.assert(Math.abs(c.y - (L.seedY + 3.5 * FP.hud.SEED_SCALE)) < 1 && c.x > FP.hud.MARGIN && c.x < FP.hud.MARGIN + FP.config.plant.seeds * FP.hud.SEED_STEP, 'compteur : ' + JSON.stringify(c));
  const a = FP.bossFx.seedFlight(0, from, c), z = FP.bossFx.seedFlight(FP.bossFx.FLIGHT, from, c), z2 = FP.bossFx.seedFlight(5, from, c);
  FP.assertEqual(a.x, from.x); FP.assertEqual(a.y, from.y);
  FP.assertEqual(z.x, c.x); FP.assertEqual(z.y, c.y); FP.assertEqual(z2.x, c.x);
  let mid = 0; for (let t = 0; t <= FP.bossFx.FLIGHT; t += .02) mid = Math.max(mid, FP.bossFx.seedFlight(t, from, c).scale);
  FP.assert(mid > z.scale, 'la graine grossit avant de filer');
});

FP.test('bossfx: « +1 GRAINE » visible pendant tout le vol, gros, au-dessus de l’épave', () => {
  const s = bfxRun(); bfxAssault(s); const t0 = s.time, o = s.world.bossLevel.targets[0].solid;
  const wreckY = FP.px.toArt(o.y) - FP.px.toArt(s.camera.y);
  for (let age = 0; age <= FP.bossFx.FLIGHT; age += .05) {
    s.time = t0 + age;
    const t = bfxTexts(() => FP.bossFx.drawUi(recCtx(), s)).filter(q => q.text === '+1 GRAINE');
    FP.assertEqual(t.length, 1, 'à ' + age.toFixed(2) + ' s');
    FP.assert(t[0].scale >= 3, 'gros'); FP.assert(t[0].y < wreckY, 'au-dessus de l’épave : ' + t[0].y + ' / ' + wreckY);
  }
  s.time = t0 + 3; FP.assertEqual(bfxTexts(() => FP.bossFx.drawUi(recCtx(), s)).length, 0, 'plus rien après');
});

FP.test('bossfx: la graine en vol et l’explosion se dessinent, puis s’éteignent', () => {
  const s = bfxRun(); bfxAssault(s); const t0 = s.time;
  s.time = t0 + .2; const g = recCtx(), u = recCtx();
  FP.bossFx.draw(g, s); bfxTexts(() => FP.bossFx.drawUi(u, s));
  FP.assert(g.rects.length > 10, 'explosion'); FP.assert(u.rects.length > 5, 'graine');
  s.time = t0 + 3; FP.bossFx.update(s); const g2 = recCtx(); FP.bossFx.draw(g2, s);
  FP.assertEqual(g2.rects.length, 0); FP.assertEqual(s.fx.boss.bursts.length + s.fx.boss.flights.length + s.fx.boss.plates.length, 0);
  s.events.push({ type: 'bossHead', x: 100, y: 500 }); FP.bossFx.update(s); s.events.length = 0;
  s.camera.y = 500 - s.world.viewH / 2; FP.bossFx.draw(recCtx(), s);   // la tête transpercée
  FP.assertEqual(s.fx.boss.bursts.length, 1);
});

FP.test('bossRender: dessine sans erreur chaque étape (idle, warn, strike, visée, figée, tir)', () => {
  for (const milieu of [1, 2, 3]) {
    const s = bfxRun(milieu), bl = s.world.bossLevel, r = bl.rooms[0], tur = bl.turrets.find(q => q.room === r.id) || bl.turrets[0];
    s.camera.y = (r.y0 + r.y1) / 2 - s.world.viewH / 2;
    const count = (setup) => { setup(); const g = recCtx(); FP.bossRender.draw(g, s); return g.rects.length; };
    const colors = (setup) => { setup(); const g = recCtx(); FP.bossRender.draw(g, s); return new Set(g.rects.map(q => q.c)); };
    const set = (stage, t, half = 1) => { s.bossThreats.rooms[r.id] = { stage, t, half }; };
    const idle = count(() => set('idle', 0));
    const warn = count(() => set('warn', .5)), strike = count(() => set('strike', .3));
    FP.assert(warn > idle && strike > idle, 'hachures : ' + [idle, warn, strike]);
    FP.assert(colors(() => set('warn', .5)).has(FP.palette.boss.hatch[0]) || colors(() => set('warn', .6)).has(FP.palette.boss.hatch[0]), 'hachures orange');
    // le clignotement accélère : plus de bascules par seconde en fin d’avertissement qu’au début
    const flips = (from, to) => { let n = 0, prev = null; for (let t = from; t < to; t += .01) { const on = colors(() => set('warn', t)).has(FP.palette.boss.hatch[0]); if (prev !== null && on !== prev) n++; prev = on; } return n; };
    FP.assert(flips(.8, 1.2) > flips(0, .4), 'clignotement qui accélère');
    set('idle', 0);
    const tip = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }; s.plant.tip = tip;
    const aimed = colors(() => { s.bossThreats.aim = { turret: tur.id, t: .3, lockedAt: null }; });
    const locked = colors(() => { s.bossThreats.aim = { turret: tur.id, t: .8, lockedAt: { x: tip.x + 30, y: tip.y } }; });
    FP.assert(aimed.has(FP.palette.boss.aim[0]) && !aimed.has(FP.palette.boss.aim[1]), 'ligne qui suit');
    FP.assert(locked.has(FP.palette.boss.aim[1]) && !locked.has(FP.palette.boss.aim[0]), 'ligne figée : autre couleur');
    s.bossThreats.aim = null;
    const shot = colors(() => { s.bossThreats.shots.push({ x: tip.x, y: tip.y, vx: 420, vy: 0, solid: {} }); });
    FP.assert(shot.has(FP.palette.boss.shot[0]) && shot.has(FP.palette.boss.shot[1]), 'projectile');
  }
});

FP.test('cards: l’ordre d’assaut du boss du milieu', () => {
  for (const m of FP.config.milieux) {
    FP.assert(/^DÉTRUIS SES 3 .*, PUIS /.test(m.boss.order), m.boss.order);
    FP.assert(!/PERCE/.test(m.boss.order), 'plus de « perce »');
  }
  const s = FP.state.createRun(3, { W: 440, H: 783 }); s.run.milieu = 3; s.run.card = { kind: 'boss' };
  FP.assertEqual(FP.cards.textFor(s).lines[1], 'DÉTRUIS SES 3 BARRES, PUIS SON CŒUR');
});

FP.test('assaut: une explosion, pas de l’acide ni une fonte', () => {
  const ev = { type: 'death', cause: 'assault', kind: 'target', x: 100, y: 500 };
  const s = bfxRun(); s.events.push(ev);
  FP.effects.update ? FP.effects.update(s) : 0;
  FP.particles.draw(recCtx(), s);
  FP.assert(s.fx.particles.length > 0 && s.fx.particles.every(p => p.type !== 'acid'), 'gerbe sans acide');
  FP.assertEqual(FP.hero.mood(s, null).cause === 'melt', false);
  const txt = FP.shout.textFor(ev); FP.assert(!/rupture/i.test(txt) && !/DÉCHET/.test(txt), 'cri : ' + txt);
  const s2 = bfxRun(); s2.events.push(ev); FP.effects.draw(recCtx(), s2);
  FP.assert(s2.fx.effects.length > 0 && s2.fx.effects.every(f => !f.acid), 'éclat sans acide');
  withBackend(b => {
    FP.audio.consume([ev], auRun(), 0);
    FP.assert(!sounding(b).some(c => c[0] === 'note' && c[1] === 'clav'), 'pas le son de l’acide');
    FP.assert(!sounding(b).some(c => c[0] === 'note' && c[1] === 'brass'), 'pas le jingle de mort');
  });
});

FP.test('assaut: le cri de mort n’est pas lancé', () => {
  const s = bfxRun(); s.events.push({ type: 'death', cause: 'assault', kind: 'target', x: 0, y: 0 });
  const savedView = FP.view; FP.view = { ui: { w: 220, h: 391 } };
  const saved = FP.font.draw; FP.font.draw = () => 0;
  try { FP.shout.draw(recCtx(), s); } finally { FP.font.draw = saved; FP.view = savedView; }
  FP.assert(!(s.fx.ui && s.fx.ui.shout), 'aucun cri');
});

FP.test('audio: chaque événement du boss fait un son FM', () => {
  for (const type of ['bossTarget', 'bossSeed', 'bossWarn', 'bossLock', 'bossShot', 'bossHead'])
    withBackend(b => { FP.audio.consume([{ type }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
});

// Revue finale (v5.1.0) : la graine rendue se voit au compteur — sa case se vide à l'assaut, se remplit (petit éclat) quand elle atterrit.
FP.test('hud: la graine rendue quitte le compteur à l’assaut et le remplit à l’atterrissage', () => {
  const s = bfxRun(); s.plant.reserves = 3;
  FP.assertEqual(FP.hud.items(s).seeds, 3, 'avant l’assaut');
  bfxAssault(s); const t0 = s.time;
  for (const age of [0, .3, FP.bossFx.FLIGHT - .02]) {
    s.time = t0 + age; FP.bossFx.update(s);
    FP.assertEqual(FP.hud.items(s).seeds, 2, 'en vol à ' + age); FP.assertEqual(s.plant.reserves, 3, 'la réserve ne baisse pas');
  }
  FP.assertEqual(JSON.stringify(FP.bossFx.counter(s)), JSON.stringify(FP.hud.seedCenter(2, bfxUi(s).h)), 'elle vise la case vidée');
  const savedView = FP.view, savedDraw = FP.font.draw, hud = () => { const g = recCtx(); FP.hud.draw(g, s); return g; };
  FP.view = { ui: bfxUi(s) }; FP.font.draw = () => 0;
  try {
    hud();
    s.time = t0 + FP.bossFx.FLIGHT + .01; FP.bossFx.update(s);
    FP.assertEqual(FP.hud.items(s).seeds, 3, 'atterrie');
    const g = hud(), x = FP.hud.MARGIN + 2 * FP.hud.SEED_STEP;
    FP.assert(g.rects.some(r => r.c === FP.font.COLORS.gold && Math.abs(r.x - x) <= 2), 'éclat sur la case remplie');
    FP.assertEqual(s.fx.ui.hud.lostAt[2], undefined, 'la case vidée par le vol ne s’est pas fendue');
    s.time += 1; FP.bossFx.update(s);
    FP.assert(!hud().rects.some(r => r.c === FP.font.COLORS.gold && Math.abs(r.x - x) <= 2), 'éclat éteint');
  } finally { FP.view = savedView; FP.font.draw = savedDraw; }
});

// Revue finale (v5.1.0) : parois, plaques et cibles intactes peintes une fois dans un calque (FP.px.layer, simulé ici : pas de DOM sous Node).
const bfxLayers = (fn) => {
  const saved = FP.px.layer, made = [];
  FP.px.layer = (w, h) => { const l = { canvas: { width: w, height: h }, g: recCtx() }; made.push(l); return l; };
  try { fn(made); } finally { FP.px.layer = saved; }
};
const bfxBlitCtx = () => { const g = recCtx(); g.blits = []; g.drawImage = (img, sx, sy, sw, sh, dx, dy) => g.blits.push({ img, sy, sh, dx, dy }); return g; };

FP.test('bossRender: parois, plaques et cibles dans un calque, recopié, refait après un assaut et à la génération', () => {
  const s = bfxRun(1), bl = s.world.bossLevel;
  const direct = recCtx(); bossDirect(() => FP.bossRender.draw(direct, s));   // sans calque : tout en direct
  bfxLayers(made => {
    const g = bfxBlitCtx(); FP.bossRender.draw(g, s);
    FP.assertEqual(made.length, 1, 'un calque');
    FP.assert(made[0].g.rects.length > 200, 'pièces peintes dans le calque : ' + made[0].g.rects.length);
    FP.assert(g.blits.length >= 1 && g.blits.every(b => b.img === made[0].canvas && b.dx === 0), 'recopié tel quel');
    FP.assert(g.rects.length * 3 < direct.rects.length, `bien moins de rectangles par frame : ${g.rects.length} / ${direct.rects.length}`);
    for (let i = 0; i < 3; i++) { s.time += 1 / 60; FP.bossRender.draw(bfxBlitCtx(), s); }
    FP.assertEqual(made.length, 1, 'gardé d’une frame à l’autre');
    FP.boss.destroy(s, 0); FP.bossRender.draw(bfxBlitCtx(), s);
    FP.assertEqual(made.length, 2, 'refait après un assaut');
    const before = made[0].g.rects.length, after = made[1].g.rects.length;
    FP.assert(after < before, 'la cible et sa plaque ne sont plus dans le calque');
    FP.level.generate(s); FP.bossRender.draw(bfxBlitCtx(), s);
    FP.assertEqual(made.length, 3, 'refait à la génération'); FP.assert(s.world.bossLevel !== bl);
  });
});

FP.test('bossRender: la salle avertie tremble (calque et tourelles) d’un pixel, pas au repos', () => bfxLayers(() => {
  const s = bfxRun(1), bl = s.world.bossLevel, r = bl.rooms[0], tur = bl.turrets.find(q => q.room === r.id);
  const M = FP.palette.boss.milieux[s.world.milieu];
  s.camera.y = (r.y0 + r.y1) / 2 - s.world.viewH / 2;
  const frame = (stage, time) => { s.bossThreats.rooms[r.id] = { stage, t: .2, half: 1 }; s.time = time; const g = bfxBlitCtx(); FP.bossRender.draw(g, s); return g; };
  const lens = (g) => { const q = g.rects.find(o => o.c === M.edge && o.w === 9 && Math.abs(o.x + 4 - FP.px.toArt(tur.x)) <= 1); return q && q.x + 4; };
  const a = frame('warn', 0), b = frame('warn', 1.01 / 30);
  FP.assert(a.blits.some(q => q.dx !== 0) && b.blits.some(q => q.dx !== 0), 'rangées de la salle décalées');
  FP.assert(a.blits.every(q => Math.abs(q.dx) <= 1), '± 1 pixel');
  FP.assertEqual(Math.abs(lens(a) - lens(b)), 2, 'la tourelle tremble');
  const c = frame('idle', 0), d = frame('idle', 1.01 / 30);
  FP.assert(c.blits.every(q => q.dx === 0), 'au repos : rien ne bouge'); FP.assertEqual(lens(c), lens(d));
}));

FP.test('bossRender: la tête transpercée est une épave, plus une lueur', () => {
  const s = bfxRun(1); s.bossFight.destroyed = [true, true, true]; s.bossFight.headOpen = true; FP.level.generate(s);
  const h = s.world.bossLevel.head.solid, P = FP.palette.boss; s.camera.y = h.y - s.world.viewH / 2;
  const cam = FP.px.toArt(s.camera.y), xs = h.collision.map(v => FP.px.toArt(h.x + v[0])), ys = h.collision.map(v => FP.px.toArt(h.y + v[1]) - cam);
  const inHead = () => { const g = recCtx(); FP.bossRender.draw(g, s); return new Set(g.rects.filter(r => r.x >= Math.min(...xs) && r.x <= Math.max(...xs) && r.y >= Math.min(...ys) && r.y <= Math.max(...ys)).map(r => r.c)); };
  const open = inHead(); FP.assert(open.has(P.glow[0]) && !open.has(P.hole), 'à nu : lueur');
  h.off = true; const wreck = inHead();
  FP.assert(wreck.has(P.hole) && !wreck.has(P.glow[0]) && !wreck.has(P.glow[1]), 'transpercée : épave');
});

FP.test('audio: l’avertissement monte sur toute sa durée, à chaque rythme', () => {
  for (const n of [0, 3]) withBackend(b => {
    const s = auRun(); s.bossFight.destroyed = [0, 1, 2].map(k => k < n);
    FP.audio.consume([{ type: 'bossWarn', room: 'salle', half: 1 }], s, 0);
    const notes = sounding(b).filter(c => c[0] === 'note'), warn = FP.bossThreats.timing(n, FP.config.milieux[s.run.milieu].id).warn, t0 = notes[0][3];
    FP.assert(notes.length >= 6, 'notes : ' + notes.length);
    FP.assert(notes[notes.length - 1][3] - t0 >= .85 * warn && notes[notes.length - 1][3] - t0 < warn, `couvre l’avertissement (${warn} s)`);
    FP.assert(notes.every((c, i) => i === 0 || c[2] >= notes[i - 1][2]) && notes[notes.length - 1][2] > notes[0][2] + 8, 'monte');
  });
});

FP.test('bossfx: la graine part de l’épave telle qu’elle était à l’écran, même si la caméra bouge pendant le vol', () => {
  const s = bfxRun(); bfxAssault(s); s.time += .5;
  const frame = () => { const g = recCtx(); const t = bfxTexts(() => FP.bossFx.drawUi(g, s)); return JSON.stringify([g.rects, t]); };
  const a = frame(); s.camera.y += 400; FP.assertEqual(frame(), a, 'rien ne saute quand la caméra bouge (pousse suivante préparée)');
});
