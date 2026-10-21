// Parcours complets : vrais systèmes enchaînés (collision → graze → scoring → powerups), sans faux enregistrement.
const e2eRun = () => {
  const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  s.world.solids = []; s.world.toxics = []; s.world.leaks = []; s.world.bonuses = []; s.events.length = 0;
  return s;
};
// Abscisse, à droite de l'obstacle, où la pointe passe à `gap` px de son polygone (dans la bande de frôlement).
const besideX = (o, y, gap) => { for (let x = o.x; x < o.x + 200; x += .5) if (FP.collision.distanceTo(o, x, y) >= gap) return x; return null; };
// Une frame de simulation sur le chemin du frôlement.
const e2eStep = (s, dt) => { s.time += dt; FP.collision.update(s); FP.graze.update(s, dt); FP.scoring.update(s, dt); FP.powerups.update(s, dt); };

FP.test('e2e: frôler puis sortir paie', () => {
  const s = e2eRun(), o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids = [o];
  const seen = [];
  for (let i = 0; i < 40; i++) { s.plant.tip = { x: besideX(o, 900, 5), y: 900 }; e2eStep(s, 1 / 60); seen.push(...s.events); s.events.length = 0; }
  s.plant.tip = { x: o.x + 200, y: 900 }; e2eStep(s, 1 / 60); seen.push(...s.events);
  const eco = seen.filter(e => e.type === 'eco');
  FP.assertEqual(eco.length, 1); FP.assert(eco[0].amount >= 75 && eco[0].amount % 25 === 0, String(eco[0].amount));
});

FP.test('e2e: un flyover complet fait naître une récompense', () => {
  const s = e2eRun(), o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids = [o];
  s.plant.dir = { x: 0, y: -1 };
  const seen = [];
  // Monter le long du flanc, de sous l'obstacle jusqu'au-dessus, au plus près (≈ 1,2 s).
  for (let y = 960; y > 820; y -= 2) {
    const x = besideX(o, y, 4);
    s.plant.tip = { x: x === null ? o.x + 20 : x, y }; e2eStep(s, 1 / 60); seen.push(...s.events); s.events.length = 0;
  }
  s.plant.tip = { x: o.x + 120, y: 700 }; e2eStep(s, 1 / 60); seen.push(...s.events);
  FP.assert(seen.some(e => e.type === 'bonusSpawn'), JSON.stringify(seen.filter(e => e.type === 'flyover')));
});
