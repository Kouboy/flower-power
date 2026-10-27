// audio/songs-industrie.js — musique de la zone industrielle (v4.10.0) : « Funk à la chaîne », le funk de la friche dont la
// batterie sort de l'usine (tôle en caisse claire, vapeur en charleston), slap robotique, fanfare qui rate sa dernière note,
// sirène qui se désaccorde, cordes qui fondent. Thème de boss : même riff en demi-temps qui écrase.
// Lit     : FP.score.
// Écrit   : rien.
// Expose  : FP.songs.industrie0..2 (une variante par pousse), FP.songs.industrieBoss.
(function () {
  'use strict';
  const FP = window.FP;
  const { song, q, ALL16, OFF, soft16, melody, melt } = FP.score;
  const PCS = [9, 0, 2, 3, 4, 7, 10];   // la mineur blues (la do ré mi♭ mi sol), et le si♭ qui grince dans les cordes

  // Même batterie et même instrumentation ; chaque variante a ses riffs de slap (doubles croches : [position, note, durée]),
  // ses accords de clavinet et ses phrases de cordes (la seconde finit par fondre).
  const VARIANTS = [
    { bassA: [[0, 33, 1], [2, 45, 1], [3, 33, 1], [6, 36, 1], [7, 38, 1], [8, 39, 1], [9, 40, 2], [12, 33, 1], [14, 43, 1], [15, 45, 1]],
      bassB: [[0, 33, 1], [2, 45, 1], [4, 33, 1], [6, 40, 1], [7, 39, 1], [8, 38, 2], [11, 36, 1], [12, 33, 1], [13, 45, 1], [14, 31, 2]],
      clav: [[57, 60, 64, 67], [55, 60, 62, 67]],
      stringsA: [[0, 76, .5], [.5, 79, .5], [1, 81, .75], [1.75, 82, .25], [2, 81, 1], [3, 79, .5], [3.5, 76, .5]],
      stringsB: [[0, 84, .75], [.75, 81, .25], [1, 79, .5], [1.5, 75, .5], [2, 76, 2]] },
    { bassA: [[0, 33, 1], [3, 36, 1], [4, 38, 1], [6, 40, 1], [8, 33, 1], [10, 45, 1], [11, 43, 1], [12, 40, 1], [14, 38, 2]],
      bassB: [[0, 33, 1], [2, 33, 1], [3, 36, 1], [6, 38, 1], [7, 39, 1], [8, 40, 2], [11, 43, 1], [12, 45, 1], [14, 40, 1], [15, 38, 1]],
      clav: [[60, 64, 67, 69], [57, 62, 64, 67]],
      stringsA: [[0, 79, .5], [.5, 81, .5], [1, 84, .75], [1.75, 81, .25], [2, 79, .5], [2.5, 82, .5], [3, 81, 1]],
      stringsB: [[0, 76, .5], [.5, 79, .5], [1, 81, .5], [1.5, 82, .5], [2, 81, 1], [3, 79, 1]] },
    { bassA: [[0, 33, 1], [1, 33, 1], [3, 39, 1], [4, 40, 1], [6, 33, 1], [8, 36, 1], [9, 39, 1], [10, 40, 2], [12, 45, 1], [13, 43, 1], [14, 39, 2]],
      bassB: [[0, 33, 1], [2, 39, 1], [3, 40, 1], [6, 43, 1], [7, 45, 1], [8, 43, 1], [10, 40, 1], [11, 39, 1], [12, 38, 1], [14, 36, 2]],
      clav: [[57, 63, 67, 72], [55, 62, 64, 69]],
      stringsA: [[0, 76, .25], [.25, 82, .25], [.5, 81, .5], [1, 79, .5], [1.5, 76, 1], [2.5, 75, .5], [3, 76, 1]],
      stringsB: [[0, 84, .5], [.5, 82, .5], [1, 81, .5], [1.5, 79, .5], [2, 76, 1], [3, 72, 1]] }
  ];
  const lastFalls = (d) => (d >= 1 ? { bend: .97 } : {});

  function variant(v) {
    const { bassA, bassB, clav, stringsA, stringsB } = VARIANTS[v];
    return song(104, PCS, (bar, add, hit) => {
      for (const [p, m, d] of bar % 2 ? bassB : bassA) add('groove', 'rslap', q(p), m, q(d) * .8, m > 40 ? .75 : 1);
      hit('groove', 'kick', [0, q(3), q(10)]);
      add('groove', 'metal', 1, 60, .2); add('groove', 'metal', 3, 60, .2);
      hit('groove', 'steam', [q(14)], .8);
      for (const p of [1, 5, 7, 10, 13]) for (const m of clav[Math.floor(bar / 2) % 2]) add('clav', 'clav', q(p), m + 12, .1);
      if (bar % 2) for (const m of [64, 67, 72]) add('clav', 'sbrass', q(12), m, .9, 1, { bend: .7 });   // la fanfare qui rate sa dernière note
      hit('perc', 'tick', ALL16, soft16); add('perc', 'metal', q(6), 84, .1, .3); hit('perc', 'tamb', OFF, .6);
      if (bar % 2 === 0) add('organ', 'siren', 0, 69, 3.5, 1, { bend: 1.06, detune: melt(bar, 40) });
      if (bar % 2 === 0) add('organ', 'hum2', 0, 45, 7.5, .8, { bend: .94 });
      if (bar % 4 === 1) melody(add, 'sitar', 'strings', stringsA);
      if (bar % 4 === 3) melody(add, 'sitar', 'strings', stringsB, 1, lastFalls);
      if (bar % 4 === 0) add('ghost', 'theremin', 0, 81, 7, 1, { bend: .667 });
    });
  }

  // Boss : 116 BPM, demi-temps qui écrase. Basse sale doublée d'une sous-basse, grosse caisse doublée, tôle grave sur le
  // 3e temps, stabs de cuivres graves sur un accord diminué, motif du boss (la do mi♭ ré) en fin de mesure paire ; la
  // fanfare tombe d'un triton ; deux sirènes en triton ; cordes qui descendent chromatiquement.
  function boss() {
    const riffA = [[0, 33, 2], [2, 33, 1], [3, 33, 1], [6, 36, 1], [7, 39, 2], [10, 33, 1], [11, 33, 1], [12, 40, 1], [13, 39, 1], [14, 36, 2]];
    const riffB = [[0, 33, 2], [2, 33, 1], [3, 33, 1], [6, 36, 1], [7, 38, 1], [8, 39, 3], [12, 33, 1], [13, 45, 1], [14, 44, 1], [15, 43, 1]];
    return song(116, [9, 0, 2, 3, 4, 7, 8, 5, 6], (bar, add, hit) => {
      for (const [p, m, d] of bar % 2 ? riffB : riffA) {
        add('groove', 'doom', q(p), m, q(d) * .9, m > 40 ? .8 : 1, { detune: melt(bar, 25) });
        if (d >= 2) add('groove', 'sub', q(p), m - 12, q(d) * .9);
      }
      hit('groove', 'kick', [0, q(2), q(3), q(10), q(11)]);
      add('groove', 'metal', 2, 48, .3, 1.3); hit('groove', 'steam', [2], 1); add('groove', 'metal', 0, 36, .3, 1);
      for (const p of [1, 5, 7, 10, 13]) for (const m of [57, 60, 63]) add('clav', 'clav', q(p), m + 12, .1);
      for (const p of [6, 14]) for (const m of [45, 48, 51]) add('clav', 'lowbrass', q(p), m, .4, .9);
      if (bar % 2 === 0) melody(add, 'clav', 'lowbrass', [[q(12), 45, .25], [q(13), 48, .25], [q(14), 51, .25], [q(15), 50, .25]], 1.1);
      else for (const m of [64, 67, 72]) add('clav', 'sbrass', q(12), m, .9, 1, { bend: .707 });
      hit('perc', 'tick', ALL16, soft16); add('perc', 'metal', q(6), 84, .1, .4); hit('perc', 'tamb', OFF, .6);
      if (bar % 2 === 0) { add('organ', 'siren', 0, 69, 7.5, 1, { bend: 1.06, detune: melt(bar, 40) }); add('organ', 'siren', 0, 75, 7.5, .8, { bend: 1.06 }); }
      if (bar % 4 === 1) melody(add, 'sitar', 'strings', [[0, 81, 1], [1, 80, 1], [2, 79, 1], [3, 78, 1]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'strings', [[0, 77, 1], [1, 76, 1], [2, 75, 2]], 1, (d) => (d === 2 ? { bend: .94 } : {}));
      if (bar % 4 === 0) { add('ghost', 'hum2', 0, 21, 15.5, .8); add('ghost', 'theremin', 0, 81, 7, 1, { bend: .5 }); }
    });
  }

  VARIANTS.forEach((_, v) => { FP.songs['industrie' + v] = variant(v); });
  FP.songs.industrieBoss = boss();
})();
