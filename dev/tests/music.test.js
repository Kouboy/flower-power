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
FP.test('music: tempo 100, +3,5 par éclosion, plafond 125', () => {
  const s = mRun(); FP.assertEqual(FP.music.tempoFor(s), 100);
  s.score.flowers = 2; FP.assertEqual(FP.music.tempoFor(s), 107);
  s.score.flowers = 20; FP.assertEqual(FP.music.tempoFor(s), 125);
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
  const spy = audioSpy(), s = mRun(); s.score.flowers = 4; s.plant.stemCount = 2;
  for (let i = 0; i <= 24; i++) { spy.t = i * .025; FP.music.update(s, [], spy); }   // pas de 25 ms, comme le vrai minuteur
  const notes = spy.calls.filter(c => c[0] === 'note' || c[0] === 'drum');
  const kicks = spy.calls.filter(c => c[0] === 'drum' && c[1] === 'kick').map(c => c[2]);
  FP.assert(kicks.length >= 2 && Math.abs((kicks[1] - kicks[0]) - .75 * 60 / 114) < 1e-6, 'écart des 2 premières grosses caisses à 114 BPM : ' + (kicks[1] - kicks[0]));
  FP.assert(notes.length > 0);
});
FP.test('score: constructeurs partagés', () => {
  const s = FP.score.song(120, [0], (bar, add, hit) => { add('groove', 'bass', 1, 36, .5); hit('perc', 'hat', [0, .5], .4); }, 2);
  FP.assertEqual(s.bars, 2); FP.assertEqual(s.notes.length, 6);
  FP.assertEqual(s.notes.map(n => n.beat).join(), '0,0.5,1,4,4.5,5');
  FP.assertEqual(FP.score.melt(7, 30), -30); FP.assertEqual(FP.songs.variants('friche'), 4);
  FP.assert(!('game' in FP.songs) && !('gameVariants' in FP.songs));
});
