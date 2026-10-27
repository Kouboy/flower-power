// Musiques des milieux (v4.10.0) : chaque milieu a ses variantes et son thème de boss, dans sa gamme, sur les six couches,
// sans dépasser la densité de la friche de plus de 30 % (plafond de voix des téléphones modestes).
const LAYERS = ['groove', 'clav', 'perc', 'organ', 'sitar', 'ghost'];
const nps = (s) => s.notes.length / (s.bars * s.beatsPerBar * 60 / s.bpm);
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
  }
  FP.assert(boss.bpm >= variants[0].bpm + 10 && boss.bpm <= variants[0].bpm + 15, id + ' : boss plus rapide de 10 à 15 BPM');
  const groove = (s) => s.notes.filter(n => n.layer === 'groove' && !FP.synth.DRUMS.includes(n.inst)).map(n => n.inst + n.midi + '@' + n.beat).join();
  FP.assertEqual(new Set(variants.map(groove)).size, count, id + ' : des basses différentes d’une variante à l’autre');
}
FP.test('songs: zone industrielle, 3 variantes et un boss', () => checkMilieuSongs('industrie', 3));
