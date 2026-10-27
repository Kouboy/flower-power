// audio/songs-nucleaire.js — musique du site nucléaire (v4.10.0) : « Disco radieux, EDM malade », la pub de la centrale.
// Six mesures de drop (grosse caisse droite, basse qui gronde sur les contretemps, accords qui pompent et se désaccordent
// de plus en plus, arpège dont une note grince un peu plus à chaque mesure), puis une montée (roulement qui accélère,
// sifflet qui grimpe de deux octaves). Compteur Geiger et sirène en toxique, jingle de cuivres de pub en surface.
// Thème de boss : drop permanent en demi-temps qui écrase.
// Lit     : FP.score.
// Écrit   : rien.
// Expose  : FP.songs.nucleaire0..2 (une variante par pousse), FP.songs.nucleaireBoss.
(function () {
  'use strict';
  const FP = window.FP;
  const { song, q, ALL16, EIGHTHS, OFF, melody, melt } = FP.score;
  const PCS = [4, 6, 8, 9, 11, 1, 3];   // mi majeur
  const E = [64, 68, 71], Csm = [61, 64, 68], A = [61, 64, 69], B = [63, 66, 71];
  const ROOT = new Map([[E, 40], [Csm, 37], [A, 33], [B, 35]]);
  const CLICKS = [.13, .55, 1.37, 2.05, 2.33, 2.9, 3.45];   // compteur Geiger, irrégulier

  // Chaque variante : sa grille, les contretemps de sa basse qui gronde et son jingle (deux phrases).
  const VARIANTS = [
    { chords: [E, E, Csm, Csm, A, A, B, B], growl: OFF,
      jingle: [[[0, 76, .5], [.5, 80, .5], [1, 83, 1], [2, 81, .5], [2.5, 80, .5], [3, 78, 1]], [[0, 83, .5], [.5, 81, .5], [1, 80, .5], [1.5, 78, .5], [2, 76, 1.5]]] },
    { chords: [Csm, Csm, A, A, E, E, B, B], growl: [.5, 1.25, 2.5, 3.25, 3.75],
      jingle: [[[0, 80, .5], [.5, 78, .5], [1, 76, 1], [2, 80, .5], [2.5, 83, .5], [3, 85, 1]], [[0, 85, .5], [.5, 83, .5], [1, 80, .5], [1.5, 78, .5], [2, 76, 1.5]]] },
    { chords: [A, B, Csm, Csm, A, B, E, E], growl: [.5, 1.5, 1.75, 2.5, 3.5],
      jingle: [[[0, 71, .5], [.5, 73, .5], [1, 76, .5], [1.5, 80, .5], [2, 78, 1], [3, 76, 1]], [[0, 83, 1], [1, 81, .5], [1.5, 80, .5], [2, 78, 1.5]]] }
  ];
  const lastFalls = (d) => (d > 1 ? { bend: .97 } : {});
  // L'arpège : une note sur quatre grince un peu plus à chaque mesure.
  const arp = (add, bar, ch, beats, vel) => beats.forEach((b, i) => add('clav', 'arp', b, [ch[0], ch[1], ch[2], ch[0] + 12][i % 4] + 12, .2, vel(i), i % 4 === 3 ? { detune: 12 + bar * 12 } : {}));

  function variant(v) {
    const { chords, growl, jingle } = VARIANTS[v];
    return song(126, PCS, (bar, add, hit) => {
      const ch = chords[bar], r = ROOT.get(ch), build = bar >= 6;
      hit('groove', 'kick', bar === 7 ? [0, 1] : [0, 1, 2, 3]);
      if (!build) { for (const b of growl) add('groove', 'growl', b, r, .4, 1, { detune: melt(bar, 30) }); add('groove', 'sub', 0, r - 12, .35); hit('groove', 'clap', [1, 3], .8); }
      else hit('groove', 'snare', bar === 6 ? EIGHTHS : ALL16, (b) => .3 + .7 * ((bar - 6) * 4 + b) / 8);   // roulement qui monte
      for (const b of OFF) for (const m of [ch[0], ch[2]]) add('clav', 'saws', b, m, .38, .9, { detune: 8 * (1 + bar / 3) });
      arp(add, bar, ch, ALL16, (i) => (i % 2 ? .3 : .45));
      hit('perc', 'openhat', OFF, .5); hit('perc', 'hat', [0, 1, 2, 3], .5); hit('perc', 'cowbell', [.75, 2.75], .6);
      hit('organ', 'tick', CLICKS, .9);
      if (bar % 2 === 0) add('organ', 'siren', 0, 76, 7.5, 1, { bend: .94 });
      if (bar === 1 || bar === 5) melody(add, 'sitar', 'sbrass', jingle[0]);
      if (bar === 3) melody(add, 'sitar', 'sbrass', jingle[1], 1, lastFalls);
      if (bar === 6) add('ghost', 'slide', 0, 64, 7.8, 1, { bend: 4 });   // sifflet qui monte de deux octaves
      if (bar === 0) for (const m of ch) add('ghost', 'pad', 0, m, 23.5);
    });
  }

  // Boss : 138 BPM, drop permanent. Basse sale doublée d'une sous-basse sur un riff qui passe par sol et si♭, grosse caisse
  // doublée, grosse frappe (caisse claire, clap) sur le 3e temps ; arpège qui grince en croches ; cuivres graves sur un
  // accord diminué, motif du boss (mi sol si♭ la) en fin de mesure paire ; le jingle tombe d'un triton ; deux sirènes en
  // triton et le compteur Geiger ; les cuivres de pub descendent chromatiquement.
  function boss() {
    const riffA = [[0, 40, 2], [2, 40, 1], [3, 40, 1], [6, 43, 1], [7, 46, 2], [10, 40, 1], [11, 40, 1], [12, 47, 1], [13, 46, 1], [14, 43, 2]];
    const riffB = [[0, 40, 2], [2, 40, 1], [3, 40, 1], [6, 43, 1], [7, 45, 1], [8, 46, 3], [12, 40, 1], [13, 52, 1], [14, 51, 1], [15, 50, 1]];
    return song(138, PCS.concat([7, 10, 5, 2]), (bar, add, hit) => {
      for (const [p, m, d] of bar % 2 ? riffB : riffA) {
        add('groove', 'doom', q(p), m, q(d) * .9, m > 47 ? .8 : 1, { detune: melt(bar, 25) });
        if (d >= 2) add('groove', 'sub', q(p), m - 12, q(d) * .9);
      }
      hit('groove', 'kick', [0, 1, 2, 2.75, 3]); hit('groove', 'snare', [2], 1.3); hit('groove', 'clap', [2], 1);
      arp(add, bar, E, EIGHTHS, (i) => (i % 2 ? .35 : .5));
      for (const p of [6, 14]) for (const m of [40, 43, 46]) add('clav', 'lowbrass', q(p), m, .4, .9);
      if (bar % 2 === 0) melody(add, 'clav', 'lowbrass', [[q(12), 40, .25], [q(13), 43, .25], [q(14), 46, .25], [q(15), 45, .25]], 1.1);
      else for (const m of E) add('clav', 'sbrass', q(12), m, .9, 1, { bend: .707 });
      hit('perc', 'openhat', OFF, .5); hit('perc', 'cowbell', [.75, 2.75], .6);
      hit('organ', 'tick', CLICKS, .9);
      if (bar % 2 === 0) { add('organ', 'siren', 0, 76, 7.5, 1, { bend: 1.06, detune: melt(bar, 40) }); add('organ', 'siren', 0, 82, 7.5, .8, { bend: 1.06 }); }
      if (bar % 4 === 1) melody(add, 'sitar', 'sbrass', [[0, 83, 1], [1, 82, 1], [2, 81, 1], [3, 80, 1]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'sbrass', [[0, 79, 1], [1, 78, 1], [2, 77, 2]], 1, (d) => (d === 2 ? { bend: .94 } : {}));
      if (bar % 4 === 0) { add('ghost', 'hum2', 0, 28, 15.5, .8); add('ghost', 'theremin', 0, 76, 7, 1, { bend: .5 }); }
    });
  }

  VARIANTS.forEach((_, v) => { FP.songs['nucleaire' + v] = variant(v); });
  FP.songs.nucleaireBoss = boss();
})();
