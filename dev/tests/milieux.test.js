// Milieux (v4.9.0) : quatre décors qui se succèdent, chacun avec ses familles d'obstacles, ses palettes et son boss.
const MILIEU_IDS = ['friche', 'industrie', 'decharge', 'nucleaire'];
FP.test('milieux: quatre milieux dans l’ordre, chacun avec nom, ligne, familles connues et boss', () => {
  const known = new Set(Object.values(FP.config.spawnTables).flat().map(e => e.kind));
  FP.assertEqual(FP.config.milieux.map(m => m.id).join(), MILIEU_IDS.join());
  for (const m of FP.config.milieux) {
    FP.assert(m.name && m.line, m.id);
    FP.assert(m.kinds.length >= 4 && m.kinds.every(k => known.has(k)), m.id + ' : ' + m.kinds);
    FP.assert(m.boss && m.boss.name && m.boss.order, m.id + ' : boss');
  }
});
FP.test('palette: chaque milieu a ses trois strates de 4 teintes, au moins 2 ciels et 2 pelouses', () => {
  for (const id of MILIEU_IDS) {
    const p = FP.palette.milieux[id];
    for (const s of ['humus', 'clay', 'stone']) FP.assertEqual(p.strata[s].length, 4, id + ' ' + s);
    FP.assert(p.sky.length >= 2 && p.sky.length <= FP.config.level.skyVariants && p.sky.every(b => b.length === 8), id + ' : ciel');
    FP.assert(p.lawn.length >= 2 && p.lawn.length <= FP.config.level.lawnVariants && p.lawn.every(b => b.length === 4), id + ' : pelouse');
  }
});
FP.test('palette: la friche garde les palettes de la v4.8', () => {
  const p = FP.palette.milieux.friche;
  FP.assertEqual(p.sky[0][0], '#2e1452'); FP.assertEqual(p.sky.length, 4);
  FP.assertEqual(p.strata.humus[0], '#130d0e'); FP.assertEqual(p.lawn[0][0], '#1c2e14');
});
const genIn = (seed, level, milieu) => { const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.level = level; s.run.milieu = milieu; FP.level.generate(s); return s; };
FP.test('level: chaque milieu ne pose que ses familles', () => {
  FP.config.milieux.forEach((m, i) => {
    for (const level of [0, 8]) for (let seed = 1; seed <= 20; seed++) {
      const w = genIn(seed, level, i).world;
      FP.assertEqual(w.milieu, m.id);
      for (const o of w.solids) FP.assert(m.kinds.includes(o.kind) || o.kind === 'trex_signature', m.id + ' : ' + o.kind);
    }
  });
});
FP.test('level: tableFor reprend les poids d’origine, ou toutes les familles du milieu à poids égaux si la bande n’en a aucune', () => {
  const T = FP.config.spawnTables, deep = FP.level.tableFor(0, 'deep'), friche = FP.config.milieux[0].kinds;
  FP.assertEqual(JSON.stringify(FP.level.tableFor(1, 'middle')), JSON.stringify(T.middle.filter(e => FP.config.milieux[1].kinds.includes(e.kind))));
  const original = Object.fromEntries(['upper', 'middle', 'deep'].flatMap(b => T[b]).reverse().map(e => [e.kind, e.a]));
  if (T.deep.some(e => friche.includes(e.kind))) FP.assert(deep.every(e => friche.includes(e.kind)));
  const fake = { ...FP.config.milieux[0] }, keep = FP.config.milieux[0];
  FP.config.milieux[0] = { ...fake, kinds: ['scooter', 'drone'] };   // familles absentes de la bande profonde
  try {
    const t = FP.level.tableFor(0, 'deep');
    FP.assertEqual(t.map(e => e.kind).join(), 'scooter,drone'); FP.assert(t.every(e => e.w === 1 && e.a === original[e.kind]), JSON.stringify(t));
  } finally { FP.config.milieux[0] = keep; }
});
FP.test('level: le T-Rex signature n’apparaît qu’au site nucléaire', () => {
  let friche = 0, nucleaire = 0;
  for (let seed = 1; seed <= 40; seed++) for (const [milieu, add] of [[0, () => friche++], [3, () => nucleaire++]]) {
    const s = FP.state.createRun(seed, { W: 440, H: 783 }); s.run.milieu = milieu; s.level = 1;
    s.signature = { armed: true, spawned: false, targetLevel: 0 };
    FP.level.generate(s);
    if (s.world.solids.some(o => o.kind === 'trex_signature')) add();
  }
  FP.assertEqual(friche, 0); FP.assert(nucleaire > 0, 'jamais au nucléaire');
});
// Le monde tire ses nuances sans connaître les palettes (world/* ne lit pas render/*) ; le rendu les ramène à celles du milieu.
FP.test('level: le niveau porte son milieu, et chaque nuance tirée existe dans ce milieu', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const w = genIn(seed, 2, seed % 4).world, p = FP.palette.milieux[w.milieu];
    FP.assertEqual(w.milieu, FP.config.milieux[seed % 4].id);
    FP.assert(p.sky[w.skyVariant % p.sky.length] && p.lawn[w.lawnVariant % p.lawn.length], w.milieu);
  }
});
FP.test('palette: strataTone suit le milieu', () => {
  FP.assert(FP.palette.strataTone(.1, 0, 'friche') !== FP.palette.strataTone(.1, 0, 'nucleaire'));
  FP.assertEqual(FP.palette.strataTone(.5, 3, 'friche'), FP.palette.milieux.friche.strata.clay[0]);
});
// Cycle de partie (v4.9.0) : 3 pousses réussies → boutique → niveau de boss → milieu suivant ; saison 2 après le 4ᵉ boss.
// Aides de flow.test.js : flowRun, bloomNow, advance, skipShop, serverAt.
const spyShop = (fn) => { const keep = FP.shop.open, calls = []; FP.shop.open = (s, o) => { calls.push({ after: o.after, boss: s.run.boss }); keep(s, o); }; try { fn(calls); } finally { FP.shop.open = keep; } };
const nextBloom = (s) => { FP.plant.launch(s); bloomNow(s); advance(s, 8); skipShop(s); };
const killNow = (s) => { FP.plant.launch(s); serverAt(s); s.plant.tip = { x: 220, y: 900 }; FP.collision.update(s); FP.flow.update(s, 0); advance(s, 3); };
FP.test('flow: trois éclosions mènent au boss, boutique comprise', () => spyShop(calls => {
  const s = flowRun();
  for (let i = 0; i < 3; i++) nextBloom(s);
  FP.assert(s.run.boss && s.run.step === 3 && s.mode === 'ready', JSON.stringify(s.run) + ' ' + s.mode);
  FP.assertEqual(JSON.stringify(calls), JSON.stringify([{ after: 'bloom', boss: true }]));
  FP.assertEqual(s.run.card && s.run.card.kind, 'boss');
}));
FP.test('flow: une mort ne fait pas avancer le milieu', () => spyShop(calls => {
  const s = flowRun(); nextBloom(s); killNow(s);
  FP.assertEqual(s.run.step, 1); FP.assertEqual(calls.length, 0); FP.assertEqual(s.mode, 'ready');
}));
FP.test('flow: une éclosion à plusieurs fleurs compte pour une pousse', () => {
  const s = flowRun(), level = s.level;
  FP.plant.launch(s); s.score.flowerBonus = 2; bloomNow(s); advance(s, 8); skipShop(s);   // le pollen se ramasse pendant la pousse
  FP.assertEqual(s.run.step, 1); FP.assertEqual(s.level, level + 3);
});
FP.test('flow: battre le boss passe au milieu suivant', () => {
  const s = flowRun(); for (let i = 0; i < 4; i++) nextBloom(s);
  FP.assertEqual(JSON.stringify([s.run.bosses, s.run.milieu, s.run.step, s.run.boss]), JSON.stringify([1, 1, 0, false]));
  FP.assertEqual(s.world.milieu, 'industrie'); FP.assertEqual(s.run.card && s.run.card.kind, 'milieu');
});
FP.test('flow: après le 4ᵉ boss, écran de fin puis saison 2 en friche', () => {
  const s = flowRun();
  for (let i = 0; i < 15; i++) nextBloom(s);
  FP.plant.launch(s); bloomNow(s);   // la 16ᵉ : on s'arrête dès l'écran de fin, sans laisser filer son délai
  for (let i = 0; i < 900 && s.mode !== 'won'; i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'won'); FP.assert(s.run.won && s.run.saison === 2 && s.run.milieu === 0, JSON.stringify(s.run));
  s.input = { ...s.input, pressed: true }; FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'won', 'un appui trop tôt ne passe pas');
  s.input = { ...s.input, pressed: false }; advance(s, 2); s.input = { ...s.input, pressed: true }; FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'ready');
  s.input = { ...s.input, pressed: false };
  for (let i = 0; i < 16; i++) { nextBloom(s); FP.assert(s.mode !== 'won', 'la fin ne revient pas'); }
  FP.assertEqual(s.run.saison, 3);
});
FP.test('flow: mort au boss puis dernière chance : on reste au boss', () => spyShop(calls => {
  const s = flowRun(); for (let i = 0; i < 3; i++) nextBloom(s);
  s.plant.reserves = 1; killNow(s);
  FP.assertEqual(s.mode, 'shop'); FP.assertEqual(calls[calls.length - 1].after, 'last');
  s.plant.reserves = 1; s.shop = null; FP.flow.afterShop(s, 'last');   // la Graine Bio™ achetée
  FP.assert(s.run.boss && s.run.milieu === 0 && s.run.step === 3 && s.mode === 'ready', JSON.stringify(s.run));
  FP.assertEqual(calls.length, 2);
}));
FP.test('flow: après une mort au boss, le carton du boss revient (mort simple et dernière chance)', () => {
  // La germination efface le carton : on la fait pour de vrai (hold, flow.test.js), puis la pousse meurt.
  const s = flowRun(); for (let i = 0; i < 3; i++) nextBloom(s);
  const dieAfterGerm = () => { hold(s, 1); FP.assertEqual(s.run.card, null); s.input = { ...s.input, down: false }; serverAt(s); s.plant.tip = { x: 220, y: 900 }; FP.collision.update(s); FP.flow.update(s, 0); advance(s, 3); };
  s.plant.reserves = 3; dieAfterGerm();
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.run.card && s.run.card.kind, 'boss');
  s.plant.reserves = 1; dieAfterGerm(); FP.assertEqual(s.mode, 'shop');
  s.plant.reserves = 1; s.shop = null; FP.flow.afterShop(s, 'last');
  FP.assertEqual(s.run.card && s.run.card.kind, 'boss');
});
FP.test('flow: la boutique ne s’ouvre jamais hors boss et dernière chance', () => spyShop(calls => {
  const s = flowRun();
  for (let i = 0; i < 10; i++) { s.plant.reserves = 3; if (i % 3 === 1) killNow(s); else nextBloom(s); }
  FP.assert(calls.length > 0 && calls.every(c => (c.after === 'bloom' && c.boss) || c.after === 'last'), JSON.stringify(calls));
}));
