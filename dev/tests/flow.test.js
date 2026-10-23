const flowRun = () => { const s = FP.state.createRun(11, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
// Boutique (v4.6.0) : entre deux pousses, on refuse le bon de commande pour retrouver l'enchaînement d'avant.
const skipShop = (s) => { if (s.mode !== 'shop') return; s.shop.phase = 'idle'; FP.shop.decline(s); s.time += 1; FP.shop.update(s, 1); };
const tick = (s, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) FP.loop.step(s, dt); };
const serverAt = (s) => { const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); return o; };
FP.test('flow: contact → mort puis nouvelle pousse sur un nouveau niveau', () => {
  const s = flowRun(), before = JSON.stringify(s.world.solids.map(o => [o.x, o.y]));
  const o = serverAt(s); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, 2);
  FP.assert(s.events.some(e => e.type === 'death'));
  FP.flow.update(s, .9); FP.assertEqual(s.mode, 'shop'); skipShop(s);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.stemCount, 2);
  FP.assert(JSON.stringify(s.world.solids.map(o => [o.x, o.y])) !== before);
});
FP.test('flow: plus de graines → over', () => {
  const s = flowRun(); s.plant.reserves = 1;
  const o = serverAt(s); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0); FP.flow.update(s, .9);
  FP.assert(s.shop.lastChance); skipShop(s);
  FP.assertEqual(s.mode, 'over');
});
FP.test('flow: surface → éclosion puis ready au niveau suivant', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.score.flowers, 1); FP.assertEqual(s.level, 1);
  FP.assertEqual(s.plant.oldTrails.length, 1);
  for (let i = 0; i < 180; i++) FP.flow.update(s, 1 / 60);   // éclosion 1,55 s + fondus .46 + .48 s
  FP.assertEqual(s.mode, 'shop'); skipShop(s);
  FP.assertEqual(s.mode, 'ready');
});
FP.test('flow: ready exige un nouvel appui', () => {
  const s = flowRun(); s.mode = 'ready';
  s.input = { x: 0, y: 0, down: true, active: true, pressed: false };
  FP.flow.update(s, .1); FP.assertEqual(s.mode, 'ready');
  s.input.pressed = true; FP.flow.update(s, .1); FP.assertEqual(s.mode, 'playing');
});
FP.test('flow: une partie complète tourne sans exception', () => {
  const s = flowRun(); tick(s, 60 * 40);
  FP.assert(['playing', 'dying', 'bloom', 'shop', 'ready', 'over'].includes(s.mode));
});
const toxicAtTip = (s) => { const o = { x: s.plant.tip.x, y: s.plant.tip.y, rx: 60, ry: 60, a: 0 }; s.world.toxics = [o]; s.world.leaks = []; return o; };
FP.test('flow: rester dans un toxique brûle la pointe après ≈ 75 px de trajet', () => {
  const s = flowRun(); s.world.solids = []; toxicAtTip(s);
  let t = 0;
  while (s.mode === 'playing' && t < 3) { FP.collision.update(s); FP.flow.update(s, 1 / 60); t += 1 / 60; }
  FP.assertEqual(s.mode, 'dying');
  const c = FP.config.toxic; FP.assert(Math.abs(t - c.burnAt / c.exposureRate * c.refSpeed / FP.plant.speed(s)) < .05, String(t));
  FP.assert(s.events.some(e => e.type === 'death' && e.cause === 'toxic'));
});
FP.test('flow: passage bref dans un toxique', () => {
  const s = flowRun(); s.world.solids = []; toxicAtTip(s);
  for (let i = 0; i < 40; i++) { FP.collision.update(s); FP.flow.update(s, 1 / 60); }
  s.world.toxics = [];
  for (let i = 0; i < 60; i++) { FP.collision.update(s); FP.flow.update(s, 1 / 60); }
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.toxicTimer, 0);
});
FP.test('flow: contact lixiviat → mort', () => {
  const s = flowRun(); s.world.solids = []; s.world.toxics = [];
  s.world.leaks = [{ x: s.plant.tip.x, y: s.plant.tip.y, len: 50, angle: 0, r: 12, cx: s.plant.tip.x, cy: s.plant.tip.y, cr: 12, hitFlash: 0 }];
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'dying');
  FP.assert(s.events.some(e => e.type === 'death' && e.cause === 'leak'));
});
FP.test('flow: entrer dans un toxique émet toxicEnter et dévie', () => {
  const s = flowRun(); s.world.solids = []; toxicAtTip(s);
  FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assert(s.events.some(e => e.type === 'toxicEnter'));
  FP.assert(s.plant.corruption > 0);
});
FP.test('flow: toute mort secoue autant que la v3 (.28)', () => {
  for (const cause of ['toxic', 'leak']) {
    const s = flowRun(); s.world.solids = []; s.camera.shake = 0;
    if (cause === 'toxic') { toxicAtTip(s); s.plant.toxicTimer = .82; }
    else { s.world.toxics = []; s.world.leaks = [{ x: s.plant.tip.x, y: s.plant.tip.y, len: 0, angle: 0, r: 12, cx: s.plant.tip.x, cy: s.plant.tip.y, cr: 12, hitFlash: 0 }]; }
    FP.collision.update(s); FP.flow.update(s, 1 / 60);
    FP.assertEqual(s.camera.shake, .28, cause);
  }
});
FP.test('flow: éclosion → fleurs au parterre', () => {
  const s = flowRun(); s.score.flowerBonus = 2; s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  const f = s.garden.flowers;
  FP.assertEqual(f.length, 3);
  FP.assertEqual(new Set(f.map(x => Math.round(x.x))).size, 3);
  FP.assertEqual(f[0].maxSize, 1);
  FP.assert(f[1].maxSize >= .78 && f[1].maxSize <= .96);
  FP.assert(FP.config.garden.palettes.some(p => p === f[0].palette));
});
FP.test('flow: fleurs bornées au bord de l’écran', () => {
  const s = flowRun(); s.score.flowerBonus = 3; s.plant.tip = { x: 2, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (const f of s.garden.flowers) FP.assert(f.x >= 18 && f.x <= s.world.width - 18, String(f.x));
});
FP.test('flow: une fleur pousse en ~.4 s après la fente de la motte puis reste', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (let i = 0; i < 30 + Math.ceil(FP.config.flow.hatchDelay * 60); i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.garden.flowers[0].size, 1);
});
FP.test('flow: le parterre survit au niveau suivant, pas à un nouveau run', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (let i = 0; i < 200; i++) FP.flow.update(s, 1 / 60);
  skipShop(s);
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.garden.flowers.length, 1);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 783 }).garden.flowers.length, 0);
});
FP.test('flow: pas de mort pendant l’éclosion', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  s.query = { solid: { kind: 'server' }, leak: 0, toxic: 0, danger: 0, grazes: [] };
  FP.flow.update(s, 1 / 60); FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.plant.reserves, 3);
});
const bloomNow = (s) => { s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0); };
const advance = (s, sec) => { for (let t = 0; t < sec - 1e-9; t += 1 / 60) FP.flow.update(s, 1 / 60); };
FP.test('flow: fondu sortant puis nouveau niveau puis fondu entrant', () => {
  const s = flowRun(), before = JSON.stringify(s.world.solids.map(o => [o.x, o.y]));
  bloomNow(s);
  advance(s, 1.55 + .23);
  FP.assertEqual(s.flow.stage, 'fadeOut'); FP.assert(s.flow.fade > .4 && s.flow.fade < .6, String(s.flow.fade));
  FP.assertEqual(JSON.stringify(s.world.solids.map(o => [o.x, o.y])), before);
  advance(s, .3);
  FP.assertEqual(s.flow.stage, 'fadeIn'); FP.assert(s.flow.fade > .5);
  FP.assert(JSON.stringify(s.world.solids.map(o => [o.x, o.y])) !== before);
  advance(s, .5); skipShop(s);
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.flow.fade, 0);
});
FP.test('flow: le niveau n’est régénéré qu’une fois par éclosion', () => {
  const s = flowRun(); let n = 0; const gen = FP.level.generate;
  FP.level.generate = (st) => { n++; gen(st); };
  try { bloomNow(s); advance(s, 3); } finally { FP.level.generate = gen; }
  FP.assertEqual(n, 1);
});
FP.test('flow: la raison de la dernière mort est gardée pour l’écran de fin', () => {
  const s = flowRun(); s.plant.reserves = 1;
  const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); s.plant.tip = { x: 220, y: 900 };
  FP.collision.update(s); FP.flow.update(s, 0); FP.flow.update(s, .9); skipShop(s);
  FP.assertEqual(s.mode, 'over'); FP.assertEqual(s.flow.overReason, 'rupture : rack serveur');
});
FP.test('flow: entrée en ready → événement ready', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);
  const seen = [];
  for (let i = 0; i < 200 && s.mode !== 'ready'; i++) { s.events.length = 0; if (s.mode === 'shop') skipShop(s); else FP.flow.update(s, 1 / 60); seen.push(...s.events); }
  FP.assertEqual(s.mode, 'ready'); FP.assert(seen.some(e => e.type === 'ready'));
});
FP.test('flow: redimensionner pendant le fondu ne bloque pas la transition', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0);
  let resized = false;
  for (let i = 0; i < 300 && s.mode !== 'ready'; i++) {
    if (!resized && s.flow.stage === 'fadeOut') { FP.state.applyView(s, { W: 440, H: 600 }); resized = true; }
    if (s.mode === 'shop') skipShop(s); else FP.flow.update(s, 1 / 60);
  }
  FP.assert(resized, 'le fondu a eu lieu'); FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.world.viewH, 600);
});
FP.test('flow: une nappe brûle après la même distance parcourue (≈ 75 px), quelle que soit la vitesse', () => {
  const burnDistance = (stems) => {
    const s = flowRun(); s.plant.stemCount = stems; let t = 0;
    for (; t < 5 && s.mode === 'playing'; t += 1 / 120) { s.query = { solid: null, leak: 0, toxic: 1, danger: 0, grazes: [] }; FP.flow.update(s, 1 / 120); }
    return t * FP.plant.speed(s);
  };
  const slow = burnDistance(1), fast = burnDistance(20);
  FP.assert(Math.abs(slow - 75) < 6 && Math.abs(fast - 75) < 6, slow.toFixed(1) + ' px / ' + fast.toFixed(1) + ' px');
});
FP.test('flow: toutes les fleurs d’une éclosion portent le personnage de la pousse', () => {
  const s = flowRun(); s.score.flowerBonus = 2; s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.garden.flowers.length, 3);
  FP.assert(s.plant.character && s.garden.flowers.every(f => f.character === s.plant.character));
});
