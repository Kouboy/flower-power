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
