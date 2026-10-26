// Effets FM et sons d'interface : quels sons partent (moteur espion de sequencer.test.js), pas le signal.
const withBackend = (fn) => { const saved = FP.audio._backend; const b = audioSpy(); FP.audio._backend = b; try { fn(b); } finally { FP.audio._backend = saved; } };
const auRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing'; return s; };
// Seulement le bus des effets (consume fait aussi jouer la musique) : route en 7e position pour note et burst, 5e pour drum.
const routeOf = (c) => (c[0] === 'drum' ? c[4] : c[6]);
const sounding = (b) => b.calls.filter(c => (c[0] === 'note' || c[0] === 'burst' || c[0] === 'drum') && routeOf(c) && routeOf(c).bus === 'sfx');
const EVENTS = [['bloom'], ['blossom'], ['eco'], ['grazeStart'], ['bomb'], ['shieldBreak'], ['toxicEnter'], ['stemStart'], ['runStart'], ['ready'], ['pickup'], ['growthTick']];
FP.test('audio: chaque événement de jeu fait un son FM', () => {
  for (const [type] of EVENTS) withBackend(b => { FP.audio.consume([{ type, amount: 500, combo: 1, kind: 'water', k: .5 }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
});
FP.test('audio: le son de départ est franc (plusieurs notes, pas seulement du grave)', () => withBackend(b => {
  FP.audio.consume([{ type: 'runStart' }], auRun(), 0);
  const notes = sounding(b).filter(c => c[0] === 'note');
  FP.assert(notes.length >= 3 && notes.some(c => c[2] >= 64), notes.map(c => c[2]).join(','));
}));
FP.test('audio: mort = impact puis jingle des cuivres', () => withBackend(b => {
  FP.audio.consume([{ type: 'death', cause: 'solid' }], auRun(), 0);
  FP.assert(sounding(b).some(c => c[0] === 'note' && c[1] === 'brass'), 'cuivres');
}));
FP.test('audio: le kling monte d’un demi-ton par palier de combo, plafond +5', () => {
  const pitch = (combo) => { let m = 0; withBackend(b => { FP.audio.consume([{ type: 'eco', amount: 500, combo }], auRun(), 0); m = Math.min(...sounding(b).filter(c => c[0] === 'note').map(c => c[2])); }); return m; };
  FP.assertEqual(pitch(2) - pitch(1), 1); FP.assertEqual(pitch(9) - pitch(1), 5);
});
FP.test('audio: anti-rafale par type', () => withBackend(b => {
  FP.audio.consume(Array.from({ length: 8 }, () => ({ type: 'eco', amount: 500, combo: 1 })), auRun(), 0);
  const once = sounding(b).length; b.calls.length = 0; FP.audio.consume([{ type: 'eco', amount: 500, combo: 1 }], auRun(), 0);
  FP.assertEqual(sounding(b).length, 0, 'un seul kling dans la fenêtre'); FP.assert(once > 0);
}));
FP.test('audio: le grattement suit le battement de croissance', () => withBackend(b => {
  const s = auRun(); FP.audio.consume([], s, 1); FP.assertEqual(sounding(b).filter(c => c[0] === 'burst').length, 0);
  FP.audio.consume([{ type: 'growthTick', k: .5, near: false }], s, 1 / 60);
  FP.assert(sounding(b).filter(c => c[0] === 'burst').length >= 1);
}));
FP.test('audio: bourdonnement du frôlement actif, coupé net au choc', () => withBackend(b => {
  const s = auRun(), o = { kind: 'server' }, drone = [];
  b.drone = (...a) => drone.push(a);
  s.graze.active.set(o, { time: 1 }); s.query = { grazes: [{ obj: o, kind: 'solid', intensity: .8 }] };
  FP.audio.consume([], s, 1 / 60); FP.assert(drone.some(a => a[0] === true));
  s.graze.active.clear(); s.query = { grazes: [] }; FP.audio.consume([{ type: 'death', cause: 'solid' }], s, 1 / 60);
  FP.assert(drone.some(a => a[0] === false && a[1] === true), 'arrêt net');
}));
FP.test('audio: sans Web Audio, aucun plantage', () => {
  const saved = FP.audio._backend; FP.audio._backend = null;
  try { FP.audio.consume([{ type: 'bloom' }, { type: 'eco', amount: 1 }], auRun(), 1 / 60); FP.audio.sfx('stamp'); FP.audio.unlock(); }
  finally { FP.audio._backend = saved; }
});
FP.test('audio: une lettre du cri = un « toc », chaque ligne du certificat = un cliquetis, puis le tampon', () => {
  const s = auRun(); s.fx.ui = { shout: { text: 'RACK SERVEUR !', t0: s.time } };
  s.time += 5; FP.assertEqual(FP.shout.cues(s).filter(c => c === 'letter').length, 'RACK SERVEUR !'.replace(/\s/g, '').length);
  FP.assertEqual(FP.shout.cues(s).length, 0, 'pas deux fois');
  const o = FP.state.createRun(2, { W: 440, H: 783 }); o.mode = 'over'; o.flow.overReason = 'rupture : rack serveur'; o.fx.ui = { overAt: o.time }; o.time += 5;
  const c = FP.certificate.cues(o);
  FP.assert(c.filter(x => x === 'type').length >= 6 && c.includes('stamp'), c.join(','));
});
FP.test('audio: plus d’anciennes recettes v3', () => {
  FP.assert(!/\btone\b|\bnoise\b/.test(FP.synth.create.toString().match(/return \{[^}]*\}/)[0]), 'le moteur n’expose plus tone/noise');
});
FP.test('audio: réglage tout → effets seuls → muet → tout, mémorisé', () => {
  while (FP.audio.setting() !== 'all') FP.audio.cycleSetting();
  const seq = [FP.audio.cycleSetting(), FP.audio.cycleSetting(), FP.audio.cycleSetting()];
  FP.assertEqual(seq.join(','), 'sfx,mute,all');
  FP.assertEqual(JSON.parse(FP._testStore.getItem('flower_power_v4_sound')).setting, 'all');
});
FP.test('audio: « effets seuls » coupe la musique, pas les effets', () => withBackend(b => {
  while (FP.audio.setting() !== 'sfx') FP.audio.cycleSetting();
  const g = b.calls.filter(c => c[0] === 'gain');
  FP.assert(g.some(c => c[1] === 'musicMute' && c[2] === 0) && !g.some(c => c[1] === 'sfx' && c[2] === 0), JSON.stringify(g));
  while (FP.audio.setting() !== 'all') FP.audio.cycleSetting();
}));
FP.test('audio: réglage illisible en stockage → tout', () => {
  FP._testStore.setItem('flower_power_v4_sound', '{"setting":"fort"}');
  FP.assertEqual(FP.audio.loadSetting(), 'all');
});
// Pièces (v4.5.0) : le « tink » monte avec le rang ; le gain d'une pièce ne fait pas sonner le kling du score.
FP.test('audio: une pièce sonne plus aigu au rang 3 qu’au rang 0', () => {
  const pitch = (rank) => { let m = 0; withBackend(b => { FP.audio.consume([{ type: 'coin', rank }], auRun(), 0); m = Math.max(...sounding(b).filter(c => c[0] === 'note').map(c => c[2])); }); return m; };
  FP.assert(pitch(3) > pitch(0), pitch(0) + ' → ' + pitch(3));
});
FP.test('audio: un gain de pièce ne sonne pas, un chapelet complet sonne', () => {
  withBackend(b => { FP.audio.consume([{ type: 'eco', amount: 25, combo: 1, kind: 'coin', quiet: true }], auRun(), 0); FP.assertEqual(sounding(b).length, 0); });
  withBackend(b => { FP.audio.consume([{ type: 'chainDone', amount: 400, word: 'GREEN !' }], auRun(), 0); FP.assert(sounding(b).filter(c => c[0] === 'note').length >= 3); });
});
FP.test('audio: le bonus de chapelet ne double pas l’accord avec le kling du score', () => {
  withBackend(b => { FP.audio.consume([{ type: 'eco', amount: 400, combo: 2, kind: 'chain' }], auRun(), 0); FP.assertEqual(sounding(b).length, 0); });
});
// Bon de commande (v4.6.0) : froissement à l'ouverture, « tic » de crayon à chaque case, tampon à la commande.
FP.test('audio: ouvrir, cocher, commander et fermer le bon font chacun un son FM, sans bruit blanc', () => {
  for (const type of ['shopOpen', 'shopTick', 'shopOrder', 'shopClose']) withBackend(b => {
    FP.audio.consume([{ type }], auRun(), 0);
    const snd = sounding(b); FP.assert(snd.length > 0, type); FP.assert(snd.every(c => c[0] === 'note'), type + ' : que des opérateurs FM');
  });
});
FP.test('audio: la commande sonne le tiroir-caisse, plus le tampon', () => withBackend(b => {
  FP.audio.consume([{ type: 'shopOrder' }], auRun(), 0);
  FP.assert(sounding(b).some(c => c[1] === 'clonk') && !sounding(b).some(c => c[0] === 'drum'));
}));
// Équilibre (v4.6.2) : jetons plus discrets, musique plus présente.
FP.test('audio: le tink d’un jeton est discret', () => withBackend(b => {
  FP.audio.consume([{ type: 'coin', rank: 3 }], auRun(), 0);
  FP.assert(sounding(b).every(c => c[5] <= .4), JSON.stringify(sounding(b).map(c => c[5])));
}));
FP.test('music: la musique est plus présente', () => FP.assertEqual(FP.music.MUSIC_GAIN, .8));
// Mélodie des jetons (v4.6.3) : une phrase de 8 notes qui boucle (une octave plus bas au 2e tour), pas une note figée.
const coinPitch = (rank) => { let m = 0; withBackend(b => { FP.audio.consume([{ type: 'coin', rank }], auRun(), 0); m = sounding(b).filter(c => c[0] === 'note')[0][2]; }); return m; };
FP.test('audio: la mélodie des jetons boucle au lieu de rester sur une note', () => {
  FP.assert(coinPitch(8) !== coinPitch(7), 'le 9e jeton repart');
  FP.assertEqual(coinPitch(8), coinPitch(0) - 12); FP.assertEqual(coinPitch(13), coinPitch(5) - 12); FP.assertEqual(coinPitch(16), coinPitch(0));
});
// Déblocage (v4.7.0) : au doigt, seul le lever (pointerup) compte comme geste pour le navigateur ; le toucher (pointerdown)
// laissait le moteur en pause et la musique du titre muette jusqu'au toucher suivant.
FP.test('audio: le son se débloque aussi au lever du doigt', () => FP.assert(FP.audio.UNLOCK_EVENTS.includes('pointerup'), String(FP.audio.UNLOCK_EVENTS)));
// Nappe toxique (v4.7.0) : un grincement continu qui monte avec l'exposition, coupé à la sortie ou à la mort.
const humAt = (exposure, inside = true) => { let h = null; withBackend(b => {
  const s = auRun(); s.query = { ...s.query, toxic: inside ? 1 : 0, grazes: [] }; s.plant.toxicTimer = exposure * FP.config.toxic.burnAt;
  FP.audio.consume([], s, 1 / 60); h = b.calls.filter(c => c[0] === 'hum').pop(); }); return h; };
FP.test('audio: la nappe grince, de plus en plus haut et fort avec l’exposition', () => {
  const a = humAt(.2), b = humAt(.8);
  FP.assert(a && a[1] === true && b[1] === true, 'grincement actif');
  FP.assert(b[2] > a[2] && b[4] > a[4], 'plus haut et plus fort : ' + a + ' / ' + b);
});
FP.test('audio: hors de la nappe, le grincement se tait', () => { const h = humAt(0, false); FP.assert(!h || h[1] === false, String(h)); });
FP.test('audio: la mort coupe net le grincement', () => withBackend(b => {
  const s = auRun(); s.query = { ...s.query, toxic: 1, grazes: [] }; s.plant.toxicTimer = .5;
  FP.audio.consume([], s, 1 / 60); s.mode = 'dying'; FP.audio.consume([{ type: 'death', cause: 'toxic' }], s, 1 / 60);
  const h = b.calls.filter(c => c[0] === 'hum').pop(); FP.assert(h[1] === false && h[2] === true, String(h));
}));
FP.test('audio: la graine craque et la pousse part dans un pop', () => {
  for (const type of ['germCrack', 'germPop']) withBackend(b => { FP.audio.consume([{ type }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
});
