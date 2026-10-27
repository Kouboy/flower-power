// Musiques des milieux (v4.10.0) : chaque milieu a ses variantes et son thème de boss, dans sa gamme, sur les six couches,
// sans dépasser la densité de la friche de plus de 30 % (plafond de voix des téléphones modestes).
const LAYERS = ['groove', 'clav', 'perc', 'organ', 'sitar', 'ghost'];
const nps = (s) => s.notes.length / (s.bars * s.beatsPerBar * 60 / s.bpm);
// Voix qui sonnent en même temps (au tempo le plus rapide du milieu) : [décalage, durée de vie] de chaque voix d'une
// percussion, comme synth.js les compte ; une note accordée vit sa durée, son relâchement et 0,1 s.
const DRUM_VOICES = { kick: [[0, .3]], snare: [[0, .21], [0, .25]], hat: [[0, .09]], openhat: [[0, .23]], tamb: [[0, .14], [.015, .11]],
  clap: [[0, .07], [.012, .07], [.024, .17]], steam: [[0, .35]], lid: [[0, .17], [0, .3]], tick: [[0, .062]],
  guiro: [0, 1, 2, 3, 4, 5].map(i => [i * .014, .062]), cowbell: [[0, .28], [0, .28]] };
function peakVoices(s) {
  const spb = 60 / (s.bpm + 8), ev = [];
  for (const n of s.notes) {
    const I = FP.synth.INSTRUMENTS[n.inst], t = n.beat * spb;
    for (const [o, d] of DRUM_VOICES[n.inst] || [[0, n.dur * spb + ((I && I.release) || .08) + .1]]) ev.push([t + o, 1], [t + o + d, -1]);
  }
  ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let c = 0, m = 0; for (const [, k] of ev) { c += k; m = Math.max(m, c); }
  return m;
}
function checkMilieuSongs(id, count) {
  FP.assertEqual(FP.songs.variants(id), count, id);
  const variants = [...Array(count).keys()].map(v => FP.songs[id + v]), boss = FP.songs[id + 'Boss'];
  for (const s of variants.concat([boss])) {
    FP.assert(s && s.notes.length, id);
    for (const l of LAYERS) FP.assert(s.notes.some(n => n.layer === l), id + ' couche ' + l);
    for (const n of s.notes) {
      FP.assert(LAYERS.includes(n.layer), id + ' couche inconnue ' + n.layer);
      FP.assert(FP.synth.DRUMS.includes(n.inst) || FP.synth.INSTRUMENTS[n.inst], id + ' ' + n.inst);
      if (!FP.synth.DRUMS.includes(n.inst)) FP.assert(s.pcs.includes(((n.midi % 12) + 12) % 12), id + ' ' + n.inst + ' ' + n.midi);
    }
    FP.assert(nps(s) <= 1.3 * nps(FP.songs.friche0), id + ' trop dense : ' + nps(s).toFixed(1) + ' notes/s');
    FP.assert(peakVoices(s) <= 1.3 * peakVoices(FP.songs.friche0), id + ' : trop de voix à la fois (' + peakVoices(s) + ')');
  }
  FP.assert(boss.bpm >= variants[0].bpm + 10 && boss.bpm <= variants[0].bpm + 15, id + ' : boss plus rapide de 10 à 15 BPM');
  const groove = (s) => s.notes.filter(n => n.layer === 'groove' && !FP.synth.DRUMS.includes(n.inst)).map(n => n.inst + n.midi + '@' + n.beat).join();
  FP.assertEqual(new Set(variants.map(groove)).size, count, id + ' : des basses différentes d’une variante à l’autre');
}
FP.test('songs: zone industrielle, 3 variantes et un boss', () => checkMilieuSongs('industrie', 3));
FP.test('songs: décharge, 3 variantes et un boss', () => checkMilieuSongs('decharge', 3));
FP.test('songs: site nucléaire, 3 variantes et un boss', () => checkMilieuSongs('nucleaire', 3));
FP.test('songs: friche, 4 variantes et un boss', () => checkMilieuSongs('friche', 4));
