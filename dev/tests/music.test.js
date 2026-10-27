// Musique de jeu : partition, morceau par mode, couches, tempo, baisses de volume (logique pure, moteur espion).
const mRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('music: la partition de jeu reste dans sa gamme', () => {
  const s = FP.songs.friche0; FP.assertEqual(s.bpm, 100);
  for (const n of s.notes) if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), n.inst + ' ' + n.midi);
  for (const l of ['groove', 'clav', 'perc', 'organ', 'sitar', 'ghost']) FP.assert(s.notes.some(n => n.layer === l), 'couche ' + l);
});
FP.test('music: B en jeu, B en veille entre deux niveaux, A réduit après le tampon', () => {
  const s = mRun(); FP.assert(FP.music.songFor(s).song.startsWith('friche'));
  s.mode = 'ready'; FP.assert(FP.music.songFor(s).song.startsWith('friche')); FP.assertEqual(FP.music.filterFor(s), 900);
  s.mode = 'over'; s.fx.ui = { overAt: s.time }; FP.assertEqual(FP.music.songFor(s).song, null);
  s.fx.ui.overAt = s.time - 10; const after = FP.music.songFor(s);
  FP.assertEqual(after.song, 'title'); FP.assert(after.gain < 1);
});
FP.test('music: les couches suivent le jeu', () => {
  const s = mRun(); let L = FP.music.layersFor(s);
  FP.assertEqual(L.groove, 1); FP.assertEqual(L.organ, 0); FP.assertEqual(L.sitar, 0); FP.assertEqual(L.perc, 0);
  s.plant.corruption = .2; FP.assertEqual(FP.music.layersFor(s).organ, 1);
  s.plant.tip.y = s.world.surfaceY + 20; FP.assertEqual(FP.music.layersFor(s).sitar, 1);
  const o = { kind: 'server' }; s.graze.active.set(o, { time: .3 });
  s.query = { grazes: [{ obj: o, kind: 'solid', intensity: .7 }] }; FP.assertEqual(FP.music.layersFor(s).perc, .7);
  s.mode = 'ready'; L = FP.music.layersFor(s); FP.assertEqual(L.clav + L.perc + L.organ + L.sitar, 0); FP.assertEqual(L.groove, 1);
});
FP.test('music: baisse pendant le frôlement, jusqu’à −6 dB', () => {
  FP.assertEqual(FP.music.grazeDuck(0), 1);
  FP.assert(Math.abs(FP.music.grazeDuck(1) - Math.pow(10, -6 / 20)) < 1e-9);
});
FP.test('music: baisses non cumulées en rafale de morts', () => {
  const spy = audioSpy(), s = mRun();
  for (let i = 0; i < 6; i++) { spy.t = i * .1; FP.music.update(s, [{ type: 'death', cause: 'solid' }], spy); }
  const music = spy.calls.filter(c => c[0] === 'gain' && c[1] === 'music').map(c => c[2]);
  FP.assert(music.length > 0, 'le bus musique est piloté');
  FP.assert(Math.min(...music) >= .5 * Math.pow(10, -9 / 20) * Math.pow(10, -6 / 20) - 1e-9, 'jamais plus bas que mort + frôlement : ' + Math.min(...music));
});
FP.test('music: 4 variantes de la musique de jeu, toutes dans la gamme, aux progressions différentes', () => {
  const V = [0, 1, 2, 3].map(v => FP.songs['friche' + v]); FP.assertEqual(V.length, 4);
  const sig = (s, inst) => s.notes.filter(n => n.inst === inst).map(n => n.midi).join(',');
  for (const s of V) for (const n of s.notes) if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), n.inst + ' ' + n.midi);
  for (const inst of ['slap', 'clav']) FP.assertEqual(new Set(V.map(s => sig(s, inst))).size, 4, inst + ' : 4 versions différentes');
});
FP.test('music: chaque nouvelle pousse a sa variante, en boucle sur 4', () => {
  const s = mRun(), names = [];
  for (let k = 1; k <= 5; k++) { s.plant.stemCount = k; names.push(FP.music.songFor(s).song); }
  FP.assertEqual(names.join(','), 'friche0,friche1,friche2,friche3,friche0');
});
FP.test('music: la variante suivante démarre au tempo acquis, pas au tempo de base', () => {
  const spy = audioSpy(), s = mRun(); s.run.step = 2; s.plant.stemCount = 2;
  for (let i = 0; i <= 24; i++) { spy.t = i * .025; FP.music.update(s, [], spy); }   // pas de 25 ms, comme le vrai minuteur
  const notes = spy.calls.filter(c => c[0] === 'note' || c[0] === 'drum');
  const kicks = spy.calls.filter(c => c[0] === 'drum' && c[1] === 'kick').map(c => c[2]);
  FP.assert(kicks.length >= 2 && Math.abs((kicks[1] - kicks[0]) - .75 * 60 / 108) < 1e-6, 'écart des 2 premières grosses caisses à 108 BPM : ' + (kicks[1] - kicks[0]));
  FP.assert(notes.length > 0);
});
FP.test('score: constructeurs partagés', () => {
  const s = FP.score.song(120, [0], (bar, add, hit) => { add('groove', 'bass', 1, 36, .5); hit('perc', 'hat', [0, .5], .4); }, 2);
  FP.assertEqual(s.bars, 2); FP.assertEqual(s.notes.length, 6);
  FP.assertEqual(s.notes.map(n => n.beat).join(), '0,0.5,1,4,4.5,5');
  FP.assertEqual(FP.score.melt(7, 30), -30); FP.assertEqual(FP.songs.variants('friche'), 4);
  FP.assert(!('game' in FP.songs) && !('gameVariants' in FP.songs));
});
// Musiques des milieux (v4.10.0) : le morceau suit le niveau généré (milieu, boss).
const inMilieu = (s, i, boss) => { s.run.milieu = i; s.run.boss = boss; FP.level.generate(s); };
FP.test('level: le niveau sait s’il est un niveau de boss', () => {
  const s = mRun(); FP.assertEqual(s.world.boss, false); s.run.boss = true; FP.level.generate(s); FP.assertEqual(s.world.boss, true);
});
FP.test('music: le morceau suit le milieu du niveau, sa variante la pousse', () => {
  const s = mRun(); inMilieu(s, 1, false); s.plant.stemCount = 1; FP.assertEqual(FP.music.songFor(s).song, 'industrie0');
  s.plant.stemCount = 4; FP.assertEqual(FP.music.songFor(s).song, 'industrie0');   // 3 variantes en boucle
  s.plant.stemCount = 3; FP.assertEqual(FP.music.songFor(s).song, 'industrie2');
});
FP.test('music: niveau de boss → thème du boss, après une mort et sur la graine après la boutique', () => {
  const s = mRun(); inMilieu(s, 2, true); FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
  s.mode = 'ready'; FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
  s.mode = 'shop'; FP.assertEqual(FP.music.songFor(s).song, 'shop');
  s.mode = 'dying'; FP.level.generate(s); FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
});
FP.test('music: pendant l’éclosion, le morceau du niveau joué continue jusqu’à la régénération', () => {
  const s = mRun(); inMilieu(s, 0, true); s.mode = 'bloom'; s.run.milieu = 1; s.run.boss = false;   // boss battu, pas encore régénéré
  FP.assertEqual(FP.music.songFor(s).song, 'fricheBoss'); FP.level.generate(s); FP.assert(FP.music.songFor(s).song.startsWith('industrie'));
});
FP.test('music: saison 2, retour en friche après le nucléaire', () => {
  const s = mRun(); inMilieu(s, 3, false); FP.assert(FP.music.songFor(s).song.startsWith('nucleaire'));
  inMilieu(s, 0, false); FP.assert(FP.music.songFor(s).song.startsWith('friche'));
});
FP.test('music: tempo du morceau + 4 par pousse du milieu ; un boss à son tempo', () => {
  const s = mRun(); inMilieu(s, 0, false); s.plant.stemCount = 1; s.run.step = 0; FP.assertEqual(FP.music.tempoFor(s), 100);
  s.run.step = 2; FP.assertEqual(FP.music.tempoFor(s), 108);
  s.score.flowers = 40; FP.assertEqual(FP.music.tempoFor(s), 108);
  inMilieu(s, 1, false); s.run.step = 1; FP.assertEqual(FP.music.tempoFor(s), 108);
  inMilieu(s, 0, true); s.run.step = 3; FP.assertEqual(FP.music.tempoFor(s), FP.songs.fricheBoss.bpm);
});
FP.test('music: sur un niveau de boss, la couche de surface reste ouverte', () => {
  const s = mRun(); inMilieu(s, 1, true); FP.assertEqual(FP.music.layersFor(s).sitar, 1);
  s.mode = 'ready'; FP.assertEqual(FP.music.layersFor(s).sitar, 0);   // veille : socle seul
});
FP.test('music: relais en fin de mesure seulement entre deux variantes du même milieu', () => {
  FP.assert(FP.music.relay('friche0', 'friche1')); FP.assert(!FP.music.relay('nucleaire2', 'friche0'));
  FP.assert(!FP.music.relay('industrie1', 'industrieBoss')); FP.assert(!FP.music.relay('shop', 'industrieBoss'));
  FP.assert(!FP.music.relay(null, 'friche0'));
});
FP.test('music: écran de fin, titre et boutique inchangés', () => {
  const s = mRun(); inMilieu(s, 2, true);
  s.mode = 'won'; FP.assertEqual(FP.music.songFor(s).song, 'title'); s.mode = 'menu'; FP.assertEqual(FP.music.songFor(s).song, 'title');
  s.mode = 'shop'; FP.assertEqual(FP.music.songFor(s).song, 'shop');
});
