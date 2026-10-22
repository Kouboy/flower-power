// audio/songs.js — partitions de la bande-son (données) : le thème du titre « psyché 60s qui a mal tourné » (A) et la musique
// de jeu « funk 70s hanté » (B), dont l'orgue et le sitar de A forment des couches de danger.
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.songs.title, FP.songs.game = { bpm, bars, beatsPerBar, pcs, notes, swing? } ; note = { beat, dur, inst, midi?, vel?, layer, bend? }.
//           swing : retard aléatoire maximal (s) de la caisse claire et des charlestons (« boîte à rythmes qui boite »).
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

  // --- B : musique de jeu, 100 BPM, mi mineur blues (mi sol la si♭ si ré) -----------------------
  // Couches : groove (basse slap, grosse caisse, caisse claire), clav (clavinet, cuivres), perc (charlestons, tambourin,
  // caisse claire fantôme), organ et sitar (repris de A, ramenés dans la gamme), ghost (thérémine lointain).
  function game() {
    const n = [], q = (pos) => pos / 4;   // positions en doubles croches
    const bassA = [[0, 40, 1], [2, 52, 1], [3, 40, 1], [6, 43, 1], [7, 45, 1], [8, 46, 1], [9, 47, 2], [12, 40, 1], [14, 50, 1], [15, 52, 1]];
    const bassB = [[0, 40, 1], [2, 52, 1], [4, 40, 1], [6, 47, 1], [7, 46, 1], [8, 45, 2], [11, 43, 1], [12, 40, 1], [13, 52, 1], [14, 38, 2]];
    const sitarA = [[0, 64, .5], [.5, 67, .5], [1, 69, .75], [1.75, 70, .25], [2, 71, 1], [3, 74, .5], [3.5, 71, .5]];
    const sitarB = [[0, 76, .75], [.75, 74, .25], [1, 71, .5], [1.5, 70, .5], [2, 69, .5], [2.5, 67, .5], [3, 64, 1]];
    const organ = [[52, 55, 59], [50, 55, 57]];   // mi mineur, puis ré sus4 (ré sol la)
    for (let bar = 0; bar < 8; bar++) {
      phrase(n, bar, 'slap', 'groove', (bar % 2 ? bassB : bassA).map(([p, m, d]) => [q(p), m, q(d) * .8, m > 48 ? .75 : 1]));
      hits(n, bar, 'kick', 'groove', [0, q(3), q(10)], (b) => (b === 0 ? 1 : .85));
      hits(n, bar, 'snare', 'groove', [1, 3], 1);
      for (const p of [1, 5, 7, 10, 13]) phrase(n, bar, 'clav', 'clav', [64, 67, 71, 74].map(m => [q(p), m, .1]));
      if (bar % 2) phrase(n, bar, 'brass', 'clav', [59, 62, 64].map(m => [q(14), m, .5]), () => ({ bend: .82 }));
      hits(n, bar, 'hat', 'perc', [...Array(16).keys()].filter(i => i !== 14).map(q), (b) => (b % 1 === .5 ? 1 : .6));
      hits(n, bar, 'openhat', 'perc', [q(14)], 1);
      hits(n, bar, 'tamb', 'perc', [.5, 1.5, 2.5, 3.5], .7);
      if (bar % 2) hits(n, bar, 'snare', 'perc', [q(15)], .45);
      phrase(n, bar, 'organ', 'organ', organ[Math.floor(bar / 2) % 2].map(m => [0, m, 3.9]));
      if (bar % 2) phrase(n, bar, 'sitar', 'sitar', bar % 4 === 3 ? sitarB : sitarA, (dur) => (dur >= .75 ? { bend: 1.06 } : {}));
      if (bar % 4 === 0) phrase(n, bar, 'theremin', 'ghost', [[0, 76, 7]], () => ({ bend: .667 }));
    }
    return { bpm: 100, bars: 8, beatsPerBar: 4, pcs: [4, 7, 9, 10, 11, 2], swing: .025, notes: sorted(n) };
  }

  FP.songs = { title: title(), game: game() };
})();
