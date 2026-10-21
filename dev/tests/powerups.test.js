const puRun = () => { const s = FP.state.createRun(4, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.world.solids = []; s.world.toxics = []; s.world.leaks = []; return s; };
const server = (x, y) => FP.catalog.makeSolid({ kind: 'server', x, y, a: 0, flip: 1 });
const record = (o) => Object.assign({ time: .9, score: 600, peak: .7, kind: 'solid', mul: 1, startRelY: 40, intensityTime: .5, effectiveTime: .75, lastX: 0, lastY: 0 }, o);
FP.test('powerups: contournement montant → flyover qualifié', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 900 - 50 };
  const a = FP.powerups.assess(s, o, record());
  FP.assert(a.qualified, JSON.stringify(a)); FP.assert(a.risk > .4);
});
FP.test('powerups: rester à côté sans monter → pas de flyover', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 900 + 30 };
  FP.assert(!FP.powerups.assess(s, o, record()).qualified);
});
FP.test('powerups: trop bref → pas de flyover', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 850 };
  FP.assert(!FP.powerups.assess(s, o, record({ time: .25 })).qualified);
});
FP.test('powerups: nature de la récompense selon durée et risque', () => {
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .9, risk: .7 }), 'spore');
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .6, risk: .5 }), 'water');
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .6, risk: .45 }), 'pollen');
});
const qualifyingFlyover = (s) => { const o = server(200, 900); s.world.solids = [o]; s.plant.tip = { x: 250, y: 850 }; s.plant.dir = { x: 0, y: -1 }; return o; };
FP.test('powerups: flyover qualifié → récompense devant la pointe', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 1);
  const b = s.world.bonuses[0]; FP.assert(b.y < s.plant.tip.y - 30, String(b.y)); FP.assertEqual(b.type, 'water');
  FP.assert(FP.collision.queryPoint({ solids: s.world.solids, toxics: [], leaks: [] }, b.x, b.y).solid === null);
  FP.assert(s.events.some(e => e.type === 'bonusSpawn'));
});
FP.test('powerups: un obstacle ne récompense qu’une fois', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  FP.powerups.onFlyover(s, o, record()); FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 1);
});
FP.test('powerups: bouclier actif → pas de goutte, pas de file', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 0); FP.assert(o.rewarded);
});
FP.test('powerups: bouclier actif → le pollen apparaît quand même', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record({ effectiveTime: .45, intensityTime: .3 }));
  FP.assertEqual(s.world.bonuses.length, 1); FP.assertEqual(s.world.bonuses[0].type, 'pollen');
});
const bonusAtTip = (s, type) => { const b = { type, x: s.plant.tip.x, y: s.plant.tip.y, r: 15, phase: 0, forming: 0, formMax: .48, age: 0, originX: 0, originY: 0 }; s.world.bonuses.push(b); return b; };
FP.test('powerups: goutte → bouclier', () => {
  const s = puRun(); bonusAtTip(s, 'water'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.power.shield, true); FP.assertEqual(s.world.bonuses.length, 0);
  FP.assert(s.events.some(e => e.type === 'pickup' && e.kind === 'water'));
});
FP.test('powerups: pollen → +1 fleur à l’éclosion', () => {
  const s = puRun(); bonusAtTip(s, 'pollen'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.score.flowerBonus, 1);
  s.plant.tip.y = s.world.surfaceY - 1; FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.score.flowers, 2); FP.assertEqual(s.level, 2);
});
FP.test('powerups: en formation, impossible à ramasser', () => {
  const s = puRun(); const b = bonusAtTip(s, 'water'); b.forming = .3;
  FP.powerups.update(s, 1 / 60); FP.assertEqual(s.power.shield, false);
});
FP.test('powerups: récompense ratée → disparaît sans effet', () => {
  const s = puRun(); const b = bonusAtTip(s, 'water'); b.y = s.plant.tip.y + 160;
  FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.world.bonuses.length, 0); FP.assertEqual(s.power.shield, false);
  FP.assert(s.events.some(e => e.type === 'bonusMissed' && e.gate === 'LIBRE'));
});
FP.test('powerups: trop vieille → disparaît', () => {
  const s = puRun(); const b = bonusAtTip(s, 'water'); b.x += 200; b.y = s.plant.tip.y - 100; b.age = 9.49;
  FP.powerups.update(s, .02); FP.assertEqual(s.world.bonuses.length, 0);
});
FP.test('powerups: spore → nettoie, paie 2 000 par solide, sans combo, sans payer les frôlements effacés', () => {
  const s = puRun(); const t = s.plant.tip;
  const a = server(t.x + 60, t.y - 20), b = server(t.x - 60, t.y + 20);
  s.world.solids = [a, b]; s.graze.active.set(a, { time: 1, score: 900, peak: .8, kind: 'solid', mul: 1, lastX: 0, lastY: 0, startRelY: 0, intensityTime: .5, effectiveTime: .8 });
  bonusAtTip(s, 'spore'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.world.solids.length, 0); FP.assertEqual(s.score.eco, 4000); FP.assertEqual(s.score.combo, 0);
  FP.assertEqual(s.graze.active.size, 0);
  FP.assert(s.events.some(e => e.type === 'bomb'));
});
FP.test('powerups: une nouvelle pousse repart sans bouclier ni pollen', () => {
  const s = puRun(); s.power.shield = true; s.power.shieldGrace = .3; s.score.flowerBonus = 2;
  FP.plant.prepare(s);
  FP.assertEqual(s.power.shield, false); FP.assertEqual(s.power.shieldGrace, 0); FP.assertEqual(s.score.flowerBonus, 0);
});
FP.test('powerups: un nouveau niveau efface les récompenses', () => {
  const s = puRun(); bonusAtTip(s, 'water'); FP.level.generate(s);
  FP.assertEqual(s.world.bonuses.length, 0);
});
FP.test('powerups: le bouclier absorbe un choc sans changer la direction', () => {
  const s = puRun(); s.power.shield = true; const dy = -Math.sqrt(1 - .09); s.plant.dir = { x: .3, y: dy }; s.plant.tip = { x: 220, y: 1200 };   // loin du fond : le recul n’est pas borné
  const t0 = { ...s.plant.tip }; s.world.solids = [server(t0.x, t0.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.power.shield, false);
  FP.assertEqual(s.plant.dir.x, .3); FP.assertEqual(s.plant.dir.y, dy);
  FP.assert(Math.abs(Math.hypot(s.plant.tip.x - t0.x, s.plant.tip.y - t0.y) - 26) < 1e-6);
  FP.assert(s.events.some(e => e.type === 'shieldBreak'));
});
FP.test('powerups: pendant la grâce, un second choc ne tue pas', () => {
  const s = puRun(); s.power.shield = true; s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing');
});
FP.test('powerups: après la grâce, un choc tue', () => {
  const s = puRun(); s.power.shieldGrace = .01; s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.powerups.update(s, .02); FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying');
});
FP.test('powerups: le bouclier protège aussi du lixiviat', () => {
  const s = puRun(); s.power.shield = true; const t = s.plant.tip;
  s.world.leaks = [{ x: t.x, y: t.y, len: 0, angle: 0, r: 12, cx: t.x, cy: t.y, cr: 12, hitFlash: 0 }];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing');
  FP.assert(s.events.some(e => e.type === 'shieldBreak' && e.kind === 'acid'));
});
FP.test('powerups: le bouclier ne protège pas d’une zone toxique', () => {
  const s = puRun(); s.power.shield = true; const t = s.plant.tip;
  s.world.toxics = [{ x: t.x, y: t.y, rx: 60, ry: 60, a: 0 }]; s.plant.toxicTimer = .82;
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.power.shield, true);
});
FP.test('powerups: le bris recale le guide sur l’intention du joueur', () => {
  const s = puRun(); s.power.shield = true; s.input = { x: 100, y: 400, down: true, active: true, pressed: false, screenX: 100 };
  s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.plant.guide.x, 100);
});
FP.test('powerups: le flyover annonce sa décision', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record());
  FP.assert(s.events.some(e => e.type === 'flyover' && e.outcome === 'blocked' && e.kind === 'water'));
  const s2 = puRun(); const o2 = qualifyingFlyover(s2);
  FP.powerups.onFlyover(s2, o2, record());
  FP.assert(s2.events.some(e => e.type === 'flyover' && e.outcome === 'spawn' && e.time === .9 && e.effective === .75));
});
FP.test('powerups: un frôlement trop court ne s’annonce pas', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  FP.powerups.onFlyover(s, o, record({ time: .2, effectiveTime: .1, intensityTime: .1, score: 60, peak: .2 }));
  FP.assert(!s.events.some(e => e.type === 'flyover'));
});
FP.test('powerups: pas de place → l’obstacle peut encore récompenser', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  for (let x = 10; x < 440; x += 25) for (let y = s.world.surfaceY; y < s.plant.tip.y; y += 25) s.world.bonuses.push({ type: 'pollen', x, y, r: 13, phase: 0, forming: 0, formMax: .48, age: 0 });
  FP.powerups.onFlyover(s, o, record());
  FP.assert(s.events.some(e => e.type === 'flyover' && e.outcome === 'noSpot')); FP.assert(!o.rewarded);
});
FP.test('powerups: une spore ramassée sauve du choc de la même frame', () => {
  const s = puRun(); const o = server(220, 900); s.world.solids = [o];
  s.plant.tip = { x: 220, y: 900 }; s.plant.dir = { x: 0, y: -1 };
  FP.collision.update(s); FP.assert(s.query.solid === o, 'montage : la pointe est dans l’obstacle');
  s.world.bonuses.push({ type: 'spore', x: 220, y: 900, r: 16, phase: 0, forming: 0, formMax: .48, age: 0 });
  FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.query.solid, null); FP.assertEqual(s.mode, 'playing');
});
FP.test('powerups: un obstacle déjà récompensé annonce encore « pas flyover »', () => {
  const s = puRun(); const o = qualifyingFlyover(s); o.rewarded = true; s.plant.tip = { x: 250, y: 930 };
  FP.powerups.onFlyover(s, o, record({ time: .5 }));
  FP.assert(s.events.some(e => e.type === 'flyover' && e.outcome === 'notQualified'));
});
