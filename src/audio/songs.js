// audio/songs.js — partitions de la bande-son (données) : le thème du titre « psyché 60s qui a mal tourné ».
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.songs.title = { bpm, bars, beatsPerBar, pcs, notes } ; note = { beat, dur, inst, midi?, vel?, layer, bend? }.
// Temps en beats (noire = 1) depuis le début de la boucle ; pcs = classes de hauteur de la gamme (contrôlées par les tests).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Petits constructeurs : une mesure = 4 temps ; chaque fonction ajoute ses notes à la liste.
  const at = (bar, beat) => bar * 4 + beat;
  function phrase(notes, bar, inst, layer, items, extra) {
    for (const [beat, midi, dur, vel] of items) notes.push({ beat: at(bar, beat), dur, inst, midi, vel, layer, ...(extra ? extra(dur) : {}) });
  }
  function hits(notes, bar, inst, layer, beats, vel) {
    for (const b of beats) notes.push({ beat: at(bar, b), dur: .25, inst, vel: typeof vel === 'function' ? vel(b) : vel, layer });
  }
  const sorted = (notes) => notes.sort((a, b) => a.beat - b.beat);

  // --- A : thème du titre, 92 BPM, mi phrygien dominant (mi fa sol♯ la si do ré) ------------------
  function title() {
    const n = [], L = 'title';
    const chords = [[52, 56, 59], [53, 57, 60], [52, 56, 59], [50, 53, 57], [52, 56, 59], [53, 57, 60], [48, 52, 57], [52, 56, 59]];   // E F E Dm E F Am/C E
    const roots = [40, 41, 40, 38, 40, 41, 45, 40];
    const sitarA = [[0, 64, .5], [.5, 65, .5], [1, 68, .75], [1.75, 69, .25], [2, 71, 1], [3, 72, .5], [3.5, 71, .5]];
    const sitarB = [[0, 76, .75], [.75, 74, .25], [1, 72, .5], [1.5, 71, .5], [2, 69, .5], [2.5, 68, .5], [3, 65, .5], [3.5, 64, .5]];
    for (let bar = 0; bar < 8; bar++) {
      // Orgue tremblant et sa doublure désaccordée, une octave au-dessus.
      phrase(n, bar, 'organ', L, chords[bar].map(m => [0, m, 3.9]));
      phrase(n, bar, 'organ2', L, chords[bar].map(m => [0, m + 12, 3.9]));
      // Basse ronde : fondamentale, quinte, octave.
      const r = roots[bar];
      phrase(n, bar, 'bass', L, [[0, r, .7], [.75, r, .25], [1.5, r + 7, .45], [2, r, .7], [2.75, r + 12, .25], [3.5, r + 7, .45]]);
      // Sitar une mesure sur deux ; les notes longues glissent vers le haut.
      if (bar % 2 === 1) phrase(n, bar, 'sitar', L, bar % 4 === 3 ? sitarB : sitarA, (dur) => (dur >= .75 ? { bend: 1.06 } : {}));
      hits(n, bar, 'kick', L, [0, 2.5], 1);
      hits(n, bar, 'snare', L, [1, 3], .8);
      hits(n, bar, 'tamb', L, [0, .5, 1, 1.5, 2, 2.5, 3, 3.5], (b) => (b % 1 ? 1 : .55));
    }
    return { bpm: 92, bars: 8, beatsPerBar: 4, pcs: [4, 5, 8, 9, 11, 0, 2], notes: sorted(n) };
  }

  FP.songs = { title: title() };
})();
