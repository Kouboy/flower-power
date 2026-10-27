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
FP.test('palette: strataTone suit le milieu', () => {
  FP.assert(FP.palette.strataTone(.1, 0, 'friche') !== FP.palette.strataTone(.1, 0, 'nucleaire'));
  FP.assertEqual(FP.palette.strataTone(.5, 3, 'friche'), FP.palette.milieux.friche.strata.clay[0]);
});
