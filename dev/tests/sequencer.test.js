// Séquenceur et direction musicale : quelles notes partent, quand (logique pure, moteur espion).
// Espion de moteur audio, partagé par les tests audio et musique (chargés après ce fichier).
function audioSpy() {
  const calls = [];
  return { t: 0, calls, now() { return this.t; },
    note(...a) { calls.push(['note', ...a]); }, drum(...a) { calls.push(['drum', ...a]); }, burst(...a) { calls.push(['burst', ...a]); },
    setGain(...a) { calls.push(['gain', ...a]); }, setFilter(...a) { calls.push(['filter', ...a]); }, setTreble(...a) { calls.push(['treble', ...a]); }, hum(...a) { calls.push(['hum', ...a]); }, drone() {}, suspend() {}, resume() {} };
}
const loop4 = { bpm: 120, bars: 1, beatsPerBar: 4, pcs: [4], notes: [
  { beat: 0, dur: 1, inst: 'bass', midi: 40, layer: 'groove' }, { beat: 2.5, dur: .5, inst: 'bass', midi: 52, layer: 'groove' } ] };
FP.test('sequencer: notes d’un intervalle, boucle dépliée', () => {
  const n = FP.sequencer.notesBetween(loop4, 0, 8);
  FP.assertEqual(n.map(x => x.beat).join(','), '0,2.5,4,6.5');
});
FP.test('sequencer: deux fenêtres contiguës = ni doublon ni oubli', () => {
  const a = FP.sequencer.notesBetween(loop4, 0, 2.5), b = FP.sequencer.notesBetween(loop4, 2.5, 4);
  FP.assertEqual(a.length + b.length, 2); FP.assertEqual(b[0].beat, 2.5);
});
FP.test('sequencer: le tempo change en début de mesure, sans note sautée ni doublée', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  FP.songs.__t = loop4; p.play('__t', { fade: 0, gain: 1 });
  for (let t = 0; t <= 5; t += .05) { if (Math.abs(t - .7) < .01) p.setTempo(60); spy.t = t; p.update(t); }
  const times = spy.calls.filter(c => c[0] === 'note').map(c => +c[3].toFixed(3));
  FP.assertEqual(new Set(times).size, times.length, 'pas de doublon');
  FP.assert(times.includes(2) && times.includes(2 + 2.5), 'mesure 2 au nouveau tempo (60 BPM) : ' + times);
  delete FP.songs.__t;
});
FP.test('sequencer: pas de rattrapage après un long gel', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  FP.songs.__t = loop4; p.play('__t', { fade: 0, gain: 1 }); p.update(0);
  const before = spy.calls.length; p.update(30);   // 30 s sans mise à jour
  FP.assert(spy.calls.length - before <= 2, 'au plus la fenêtre courante : ' + (spy.calls.length - before));
  delete FP.songs.__t;
});
FP.test('songs: le thème du titre reste dans sa gamme, mesures complètes', () => {
  const s = FP.songs.title;
  FP.assertEqual(s.bpm, 92);
  for (const n of s.notes) {
    if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), 'hors gamme : ' + n.midi);
    FP.assert(n.beat >= 0 && n.beat < s.bars * 4, 'hors boucle : ' + n.beat);
    FP.assert(n.inst in FP.synth.INSTRUMENTS || ['kick', 'snare', 'hat', 'openhat', 'tamb'].includes(n.inst), n.inst);
  }
});
FP.test('music: silence à l’accueil, thème du titre une fois réveillé', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'splash';
  FP.assertEqual(FP.music.songFor(s).song, null);
  s.mode = 'menu'; FP.assertEqual(FP.music.songFor(s).song, 'title');
});
FP.test('sequencer: en changeant de morceau, le nouveau démarre après ce que l’ancien a déjà planifié (pas de doublé)', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  p.play('game0', { fade: 0, gain: 1, bpm: 100 });
  for (let i = 0; i <= 36; i++) { spy.t = i * .025; p.update(spy.t); }   // 0,9 s : en pleine mesure
  const at = (c) => (c[0] === 'drum' ? c[2] : c[3]), sounding = (c) => c[0] === 'note' || c[0] === 'drum';
  const old = spy.calls.filter(sounding).map(at), lastOld = Math.max(...old), mark = spy.calls.length;
  p.play('game1', { fade: 0, gain: 1, bpm: 100, atBar: true }); p.update(spy.t);
  for (let i = 37; i <= 60; i++) { spy.t = i * .025; p.update(spy.t); }
  const fresh = spy.calls.slice(mark).filter(sounding).map(at);
  FP.assert(fresh.length > 0 && Math.min(...fresh) >= lastOld + .05, 'nouveau ' + Math.min(...fresh).toFixed(3) + ' / ancien ' + lastOld.toFixed(3));
});
// Musique de la boutique (v4.6.0) : reggae pollué, sono de supermarché.
FP.test('songs: le reggae de la boutique reste en mi mineur, mesures complètes', () => {
  const s = FP.songs.shop;
  FP.assertEqual(s.bpm, 72); FP.assertEqual(s.bars, 4);
  for (const n of s.notes) {
    if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), 'hors gamme : ' + n.midi);
    FP.assert(n.beat >= 0 && n.beat < s.bars * 4, 'hors boucle : ' + n.beat);
    FP.assert(n.inst in FP.synth.INSTRUMENTS || FP.synth.DRUMS.includes(n.inst), n.inst);
  }
  FP.assert(s.notes.some(n => n.detune), 'skank désaccordé');
});
FP.test('music: le bon de commande joue le reggae, aigus poussés, sans filtre de veille', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'shop';
  FP.assertEqual(FP.music.songFor(s).song, 'shop');
  FP.assertEqual(FP.music.trebleFor(s), 7);
  s.mode = 'ready'; const asleep = FP.music.filterFor(s); s.mode = 'shop';
  FP.assert(FP.music.filterFor(s) > asleep);
  s.mode = 'playing'; FP.assertEqual(FP.music.trebleFor(s), 0);
});
FP.test('sequencer: le désaccord d’une note part avec elle', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  FP.songs.__d = { bpm: 120, bars: 1, beatsPerBar: 4, pcs: [4], notes: [{ beat: 0, dur: .5, inst: 'clav', midi: 64, layer: 'groove', detune: -18 }] };
  p.play('__d', { fade: 0, gain: 1 }); p.update(0);
  const n = spy.calls.find(c => c[0] === 'note'); FP.assertEqual(n[6].detune, -18);
  delete FP.songs.__d;
});
