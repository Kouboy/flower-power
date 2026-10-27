// audio/songs-decharge.js — musique de la décharge (v4.10.0) : « Cumbia de la benne », fête de village sur un tas d'ordures.
// Râpe qui gratte, contrebasse, accordéon désaccordé sur les contretemps, couvercles de poubelle et cloche à vache ; un
// synthé de supermarché qui fond (toxique), une ritournelle d'accordéon orientale (surface), des cuivres fatigués qui
// s'affaissent (fond). Thème de boss : même gamme et même pas de danse, en demi-temps qui écrase.
// Lit     : FP.score.
// Écrit   : rien.
// Expose  : FP.songs.decharge0..2 (une variante par pousse), FP.songs.dechargeBoss.
(function () {
  'use strict';
  const FP = window.FP;
  const { song, q, OFF, melody, melt } = FP.score;
  const PCS = [7, 9, 10, 0, 2, 3, 6];   // sol mineur harmonique (sol la si♭ do ré mi♭ fa♯)
  const Gm = [55, 58, 62], D = [54, 57, 62], Cm = [55, 60, 63], Eb = [55, 58, 63];
  const ROOT = new Map([[Gm, 43], [D, 38], [Cm, 36], [Eb, 39]]);

  // Chaque variante : sa grille, son pas de contrebasse ([temps, écart à la fondamentale, durée]) et sa ritournelle.
  const VARIANTS = [
    { chords: [Gm, Gm, D, D, Cm, Cm, D, Gm], bass: [[0, 0, .7], [1.5, -5, .4], [2, -5, .7], [3.5, 0, .4]],
      tune: [[0, 74, .5], [.5, 75, .25], [.75, 74, .25], [1, 72, .5], [1.5, 70, .5], [2, 69, .5], [2.5, 67, .5], [3, 66, 1]] },
    { chords: [Cm, Cm, D, D, Gm, Gm, Eb, D], bass: [[0, 0, .5], [1, -5, .4], [1.5, -5, .4], [2, 0, .5], [3, -5, .4], [3.5, -5, .4]],
      tune: [[0, 79, .5], [.5, 78, .25], [.75, 79, .25], [1, 75, .5], [1.5, 74, .5], [2, 72, .5], [2.5, 70, .5], [3, 69, 1]] },
    { chords: [Gm, Cm, Gm, D, Eb, Cm, D, D], bass: [[0, 0, .7], [1, 0, .3], [1.5, 7, .4], [2, -5, .7], [3.5, -5, .4]],
      tune: [[0, 67, .25], [.25, 70, .25], [.5, 74, .5], [1, 75, .5], [1.5, 74, .25], [1.75, 72, .25], [2, 70, .5], [2.5, 69, .5], [3, 66, .5], [3.5, 67, .5]] }
  ];

  // La râpe : un grand coup sur le temps, deux petits derrière.
  const guiro = (hit) => { for (const b of [0, 1, 2, 3]) { hit('groove', 'guiro', [b], 1); hit('groove', 'guiro', [b + .5, b + .75], .6); } };

  function variant(v) {
    const { chords, bass, tune } = VARIANTS[v];
    return song(96, PCS, (bar, add, hit) => {
      const ch = chords[bar], r = ROOT.get(ch);
      for (const [b, off, d] of bass) add('groove', 'upright', b, r + off, d, .9);
      hit('groove', 'kick', [0, 2]); hit('groove', 'snare', [1, 3], .5); guiro(hit);
      for (const b of OFF) for (const m of ch) add('clav', 'accordion', b, m, .2, 1, { detune: melt(bar, 25) });
      hit('perc', 'lid', OFF, .5); hit('perc', 'cowbell', [0, 1.5, 2, 3.5], .5);
      if (bar % 2 === 0) add('organ', 'melodica', 0, ch[2] + 12, 7.5, 1, { detune: -30, bend: .96 });   // synthé de supermarché qui fond
      if (bar % 2) melody(add, 'sitar', 'accordion', tune, 1.2);
      if (bar % 4 === 0) for (const m of [55, 62]) add('ghost', 'horn', 0, m, 3.5, .5, { bend: .94 });
    });
  }

  // Boss : 108 BPM. Basse sale doublée d'une sous-basse sur un riff qui passe par le triton (do♯), grosse caisse doublée,
  // grosse frappe (caisse claire, couvercle) sur le 3e temps, la râpe toujours là ; cuivres graves sur un accord diminué,
  // motif du boss (sol si♭ do♯ ré) en fin de mesure paire ; les cuivres fatigués tombent d'un triton ; deux sirènes en
  // triton ; l'accordéon descend chromatiquement.
  function boss() {
    const riffA = [[0, 31, 2], [2, 31, 1], [3, 31, 1], [6, 34, 1], [7, 37, 2], [10, 31, 1], [11, 31, 1], [12, 38, 1], [13, 37, 1], [14, 34, 2]];
    const riffB = [[0, 31, 2], [2, 31, 1], [3, 31, 1], [6, 34, 1], [7, 36, 1], [8, 37, 3], [12, 31, 1], [13, 43, 1], [14, 42, 1], [15, 39, 1]];
    return song(108, PCS.concat([1, 5, 4]), (bar, add, hit) => {
      for (const [p, m, d] of bar % 2 ? riffB : riffA) {
        add('groove', 'doom', q(p), m, q(d) * .9, m > 40 ? .8 : 1, { detune: melt(bar, 25) });
        if (d >= 2) add('groove', 'sub', q(p), m - 12, q(d) * .9);
      }
      hit('groove', 'kick', [0, q(2), q(3), q(10), q(11)]); hit('groove', 'snare', [2], 1.3); hit('groove', 'lid', [2], 1);
      hit('groove', 'guiro', [0, 1, 2, 3], 1);   // la râpe sur le temps seulement : six voix par coup, le boss en a assez
      for (const b of OFF) for (const m of [55, 62]) add('clav', 'accordion', b, m, .2, .8, { detune: melt(bar, 25) });   // accords à deux notes : le boss reste sous le plafond de voix
      for (const p of [6, 14]) for (const m of [43, 49]) add('clav', 'lowbrass', q(p), m, .4, .9);   // sol et do♯ : le triton seul
      if (bar % 2 === 0) melody(add, 'clav', 'lowbrass', [[q(12), 43, .25], [q(13), 46, .25], [q(14), 49, .25], [q(15), 50, .25]], 1.1);
      else for (const m of [62, 67, 70]) add('clav', 'horn', q(12), m, .9, 1, { bend: .707 });
      hit('perc', 'lid', OFF, .6); hit('perc', 'cowbell', [0, 2], .6);
      if (bar % 2 === 0) { add('organ', 'siren', 0, 67, 7, 1, { bend: 1.06, detune: melt(bar, 40) }); add('organ', 'siren', 0, 73, 7, .8, { bend: 1.06 }); }   // 7 temps : pas de chevauchement d'un cycle à l'autre
      if (bar % 4 === 1) melody(add, 'sitar', 'accordion', [[0, 79, 1], [1, 78, 1], [2, 77, 1], [3, 76, 1]], 1.2);
      if (bar % 4 === 3) melody(add, 'sitar', 'accordion', [[0, 75, 1], [1, 74, 1], [2, 73, 2]], 1.2, (d) => (d === 2 ? { bend: .94 } : {}));
      if (bar % 4 === 0) { add('ghost', 'hum2', 0, 19, 15, .8); add('ghost', 'theremin', 0, 79, 7, 1, { bend: .5 }); }
    });
  }

  VARIANTS.forEach((_, v) => { FP.songs['decharge' + v] = variant(v); });
  FP.songs.dechargeBoss = boss();
})();
