// Maquettes des musiques de milieu (sous-projet 2, v4.10) : instruments et partitions candidates, joués par le moteur du jeu
// (src/audio/synth.js, sequencer.js). Deux directions par milieu ; les gagnantes passeront dans src/audio.
// Règle : un groove qui fait danser, une gaieté de pub d'entreprise plaquée sur la catastrophe, des gags sonores — et
// dessous quelque chose de malade (mode mineur, notes qui se désaccordent, note fausse, couche toxique mutante).
// Couches (mêmes rôles que la friche) : groove = socle, clav = rythmique, perc = frôlement, organ = toxique,
// sitar = près de la surface, ghost = fond.
(function () {
  'use strict';
  const FP = window.FP;

  Object.assign(FP.synth.INSTRUMENTS, {
    metal: { ratio: 1.41, index: 6, indexEnd: .5, indexTime: .08, gain: .06, sustain: .1, decay: .06, release: .12, wet: .2 },   // tôle frappée
    siren: { ratio: 1, index: .4, attack: .3, gain: .03, sustain: .9, release: .4, wet: .4 },
    hum2: { ratio: .5, index: 2, indexEnd: 3.5, attack: .5, gain: .03, sustain: .9, release: .5 },                                  // bourdon de machine
    strings: { ratio: 1.002, index: 1.6, indexEnd: 1, attack: .03, gain: .028, sustain: .7, decay: .2, release: .2, wet: .4, detune: 8 },
    cowbell: { ratio: 1.48, index: 2, indexEnd: .4, indexTime: .05, gain: .04, sustain: .15, decay: .06, release: .08 },
    slide: { ratio: 1, index: .1, attack: .02, gain: .035, sustain: .9, release: .1, wet: .3 },                                    // sifflet à coulisse
    choir: { ratio: 2, index: .4, attack: .4, gain: .025, sustain: .9, vibrato: [5.5, .01], wet: .8, release: .6 },
    sbrass: { ratio: 1, index: 2.5, indexEnd: 3.5, attack: .04, gain: .045, sustain: .8, wet: .3, vibrato: [5, .006] },          // cuivres de pub
    rslap: { ratio: 1, index: 4, indexEnd: .8, indexTime: .04, gain: .17, sustain: .5, decay: .05, release: .03, detune: -12 },   // slap robotique
    accordion: { ratio: 2, index: 1.2, attack: .02, gain: .028, sustain: .8, trem: 9, detune: 10, wet: .2 },
    melodica: { ratio: 1, index: 1.2, attack: .05, gain: .03, sustain: .8, vibrato: [5, .012], wet: .3 },
    horn: { ratio: 1, index: 2.2, indexEnd: 3, attack: .04, gain: .045, sustain: .75, wet: .3, detune: 15 },                      // cuivres fatigués
    kazoo: { ratio: 1, index: 5, indexEnd: 4, attack: .03, gain: .025, sustain: .8, vibrato: [6, .01] },
    dskank: { ratio: 3, index: 3, indexEnd: .6, indexTime: .05, gain: .032, sustain: .25, decay: .03, release: .03, wet: .25 },
    vibes: { ratio: 4, index: 1.2, indexEnd: .2, indexTime: .3, gain: .05, sustain: .4, decay: .4, release: .6, trem: 5, wet: .4 },
    bongo: { ratio: 1.5, index: 2, indexEnd: .1, indexTime: .03, gain: .09, sustain: .05, decay: .05, release: .05 },
    upright: { ratio: 1, index: .8, indexEnd: .3, attack: .015, gain: .2, sustain: .4, decay: .2, release: .08 },
    pulse: { ratio: 1, index: 1.8, indexEnd: .8, gain: .15, sustain: .6, decay: .1, release: .04 },
    arp: { ratio: 2, index: 1.4, indexEnd: .4, indexTime: .06, gain: .03, sustain: .3, decay: .06, release: .06, wet: .4 },
    pad: { ratio: 1.003, index: .8, attack: .7, gain: .028, sustain: .9, release: .9, wet: .7 },
    // Boss : basse sale doublée d'une sous-basse, cuivres graves.
    doom: { ratio: .5, index: 6, indexEnd: 2.5, indexTime: .15, gain: .13, sustain: .7, decay: .1, release: .05, detune: -8 },
    sub: { ratio: 1, index: .2, gain: .2, sustain: .9, release: .05 },
    lowbrass: { ratio: 1, index: 3.5, indexEnd: 5, attack: .03, gain: .06, sustain: .85, wet: .25, detune: -10 },
    // EDM malade : basse qui gronde (trémolo au rythme des croches), accords qui pompent, montée.
    growl: { ratio: .5, index: 5, indexEnd: 4, gain: .11, sustain: .9, decay: .1, release: .05, trem: 4.2, detune: -15 },
    saws: { ratio: 1, index: 3, indexEnd: 2.2, attack: .12, gain: .022, sustain: .8, decay: .1, release: .08, wet: .3 }
  });

  // Percussions des milieux, en bruit filtré et FM (comme la batterie du jeu).
  const EXTRA = {
    clap: (b, t, v, r) => { for (const d of [0, .012, .024]) b.burst(t + d, d === .024 ? .12 : .02, .15 * v, 1400, 'bandpass', r, 1.5); },
    steam: (b, t, v, r) => b.burst(t, .3, .06 * v, 5000, 'highpass', r),
    lid: (b, t, v, r) => { b.burst(t, .12, .08 * v, 3800, 'bandpass', r, 4); b.note('metal', 88, t, .08, .4 * v, r); },
    tick: (b, t, v, r) => b.burst(t, .012, .12 * v, 5000, 'highpass', r),
    cowbell: (b, t, v, r) => { b.note('cowbell', 80, t, .1, v, r); b.note('cowbell', 87, t, .1, .6 * v, r); },
    guiro: (b, t, v, r) => { for (let i = 0; i < 6; i++) b.burst(t + i * .014, .012, .06 * v, 4200, 'bandpass', r, 3); }
  };
  for (const k of Object.keys(EXTRA)) FP.synth.DRUMS.push(k);
  function wrap(backend) {
    const drum = backend.drum;
    backend.drum = (kind, t, vel = 1, route) => (EXTRA[kind] ? EXTRA[kind](backend, Math.max(t, backend.now()), vel, route) : drum(kind, t, vel, route));
    return backend;
  }

  // Constructeur : fill(bar, add, hit) ; add(layer, inst, beat, midi, dur, vel, extra) ; hit(layer, kind, beats, vel).
  function song(bpm, pcs, fill) {
    const notes = [];
    for (let bar = 0; bar < 8; bar++) {
      const add = (layer, inst, beat, midi, dur, vel = 1, extra) => notes.push({ beat: bar * 4 + beat, dur, inst, midi, vel, layer, ...(extra || {}) });
      const hit = (layer, kind, beats, vel = 1) => { for (const b of beats) notes.push({ beat: bar * 4 + b, dur: .25, inst: kind, vel: typeof vel === 'function' ? vel(b) : vel, layer }); };
      fill(bar, add, hit);
    }
    return { bpm, bars: 8, beatsPerBar: 4, pcs, notes: notes.sort((a, b) => a.beat - b.beat) };
  }
  const q = (i) => i / 4;
  const ALL16 = [...Array(16).keys()].map(q), EIGHTHS = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5], OFF = [.5, 1.5, 2.5, 3.5];
  const soft16 = (b) => (b % .5 ? .35 : .7);
  const melody = (add, layer, inst, items, vel = 1, extra) => { for (const [b, m, d] of items) add(layer, inst, b, m, d, vel, extra && extra(d)); };
  const melt = (bar, cents) => -cents * bar / 7;   // cassette qui fond : de plus en plus bas au fil de la boucle

  // --- I3 · Disco d'entreprise : 120 BPM, ré dorien ; la 7e mesure part en si♭ (accord muté) --------
  const I3 = (() => {
    const Dm7 = [50, 53, 57, 60], G7 = [50, 53, 55, 59], Bb = [50, 53, 58, 62];
    const chords = [Dm7, G7, Dm7, G7, Dm7, G7, Bb, G7], roots = [38, 43, 38, 43, 38, 43, 34, 43];
    return song(120, [2, 4, 5, 7, 9, 11, 0, 10], (bar, add, hit) => {
      const r = roots[bar], ch = chords[bar];
      EIGHTHS.forEach((b, i) => add('groove', 'rslap', b, i % 2 ? r + 12 : r, .3, i % 2 ? .75 : 1));
      hit('groove', 'kick', [0, 1, 2, 3]); hit('groove', 'clap', [1, 3], .8); hit('groove', 'openhat', OFF, .7);
      for (const b of [1.5, 3.5]) for (const m of ch) add('clav', 'strings', b, m + 12, .3, 1, { detune: melt(bar, 30) });
      if (bar % 2) for (const [i, m] of [63, 65, 67, 69].entries()) add('clav', 'strings', 3 + i * .25, m + (bar === 7 ? 1 : 0), .25, .8);   // la montée qui rate
      hit('perc', 'cowbell', [0, .75, 1.5, 2.5, 3, 3.25], .8); hit('perc', 'tamb', [.5, 1.5, 2.5, 3.5], .5);
      for (const m of ch.slice(0, 3)) add('organ', 'choir', 0, m + 12, 3.9, 1, { bend: .94 });   // les collaborateurs qui déchantent
      if (bar % 4 === 1) melody(add, 'sitar', 'sbrass', [[0, 74, .5], [.5, 77, .5], [1, 81, .75], [2, 79, .25], [2.25, 77, .25], [2.5, 76, .5], [3, 74, 1]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'sbrass', [[0, 81, .5], [.5, 79, .5], [1, 77, .5], [1.5, 76, .5], [2, 74, .5], [2.5, 73, .5], [3, 74, 1]], 1, (d) => (d === 1 ? { bend: .94 } : {}));
      if (bar === 6) add('ghost', 'slide', 0, 84, 1.8, 1, { bend: .5 });   // le sifflet qui dégringole
      if (bar % 4 === 0) add('ghost', 'hum2', 0, 26, 15.5, .6);
    });
  })();

  // --- I4 · Funk à la chaîne : 104 BPM, la mineur blues ; la batterie sort de l'usine ---------------
  const I4 = (() => {
    const bassA = [[0, 33, 1], [2, 45, 1], [3, 33, 1], [6, 36, 1], [7, 38, 1], [8, 39, 1], [9, 40, 2], [12, 33, 1], [14, 43, 1], [15, 45, 1]];
    const bassB = [[0, 33, 1], [2, 45, 1], [4, 33, 1], [6, 40, 1], [7, 39, 1], [8, 38, 2], [11, 36, 1], [12, 33, 1], [13, 45, 1], [14, 31, 2]];
    const clav = [[57, 60, 64, 67], [55, 60, 62, 67]];
    return song(104, [9, 0, 2, 3, 4, 7], (bar, add, hit) => {
      for (const [p, m, d] of bar % 2 ? bassB : bassA) add('groove', 'rslap', q(p), m, q(d) * .8, m > 40 ? .75 : 1);
      hit('groove', 'kick', [0, q(3), q(10)]);
      add('groove', 'metal', 1, 60, .2); add('groove', 'metal', 3, 60, .2);
      hit('groove', 'steam', [q(14)], .8);
      for (const p of [1, 5, 7, 10, 13]) for (const m of clav[Math.floor(bar / 2) % 2]) add('clav', 'clav', q(p), m + 12, .1);
      if (bar % 2) for (const m of [64, 67, 72]) add('clav', 'sbrass', q(12), m, .9, 1, { bend: .7 });   // la fanfare qui rate sa dernière note
      hit('perc', 'tick', ALL16, soft16); add('perc', 'metal', q(6), 84, .1, .3); hit('perc', 'tamb', OFF, .6);
      if (bar % 2 === 0) add('organ', 'siren', 0, 69, 3.5, 1, { bend: 1.06, detune: melt(bar, 40) });
      if (bar % 2 === 0) add('organ', 'hum2', 0, 45, 7.5, .8, { bend: .94 });
      if (bar % 4 === 1) melody(add, 'sitar', 'strings', [[0, 76, .5], [.5, 79, .5], [1, 81, .75], [1.75, 82, .25], [2, 81, 1], [3, 79, .5], [3.5, 76, .5]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'strings', [[0, 84, .75], [.75, 81, .25], [1, 79, .5], [1.5, 75, .5], [2, 76, 2]], 1, (d) => (d === 2 ? { bend: .97 } : {}));
      if (bar % 4 === 0) add('ghost', 'theremin', 0, 81, 7, 1, { bend: .667 });
    });
  })();

  // --- Boss de l'industrie (tiré d'I4) : 116 BPM, la mineur blues, demi-temps qui écrase ---------------
  // Basse sale doublée d'une sous-basse, grosse caisse doublée, tôle grave sur le 3e temps, stabs de cuivres graves sur un
  // accord diminué, motif du boss (la do mi♭ ré) en fin de mesure paire ; la fanfare tombe d'un triton.
  const BI4 = (() => {
    const riffA = [[0, 33, 2], [2, 33, 1], [3, 33, 1], [6, 36, 1], [7, 39, 2], [10, 33, 1], [11, 33, 1], [12, 40, 1], [13, 39, 1], [14, 36, 2]];
    const riffB = [[0, 33, 2], [2, 33, 1], [3, 33, 1], [6, 36, 1], [7, 38, 1], [8, 39, 3], [12, 33, 1], [13, 45, 1], [14, 44, 1], [15, 43, 1]];
    return song(116, [9, 0, 2, 3, 4, 7, 8], (bar, add, hit) => {
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
  })();

  // --- D3 · Cumbia de la benne : 96 BPM, sol mineur harmonique ------------------------------------
  const D3 = (() => {
    const Gm = [55, 58, 62], D = [54, 57, 62], Cm = [55, 60, 63];
    const chords = [Gm, Gm, D, D, Cm, Cm, D, Gm], roots = [43, 43, 38, 38, 36, 36, 38, 43];
    return song(96, [7, 9, 10, 0, 2, 3, 6], (bar, add, hit) => {
      const r = roots[bar], ch = chords[bar];
      for (const [b, iv, d] of [[0, 0, .7], [1.5, 7, .4], [2, 7, .7], [3.5, 0, .4]]) add('groove', 'upright', b, r + iv - (iv ? 12 : 0), d, 1.1);
      hit('groove', 'kick', [0, 2]); hit('groove', 'snare', [1, 3], .5);
      for (const b of [0, 1, 2, 3]) hit('groove', 'guiro', [b], 1), hit('groove', 'guiro', [b + .5, b + .75], .6);
      for (const b of OFF) for (const m of ch) add('clav', 'accordion', b, m, .2, 1, { detune: melt(bar, 25) });
      hit('perc', 'lid', OFF, .5); hit('perc', 'cowbell', [0, 1.5, 2, 3.5], .5);
      if (bar % 2 === 0) add('organ', 'melodica', 0, ch[2] + 12, 7.5, 1, { detune: -30, bend: .96 });   // synthé de supermarché qui fond
      if (bar % 2) melody(add, 'sitar', 'accordion', [[0, 74, .5], [.5, 75, .25], [.75, 74, .25], [1, 72, .5], [1.5, 70, .5], [2, 69, .5], [2.5, 67, .5], [3, 66, 1]], 1.2);
      if (bar % 4 === 0) for (const m of [55, 62]) add('ghost', 'horn', 0, m, 3.5, .5, { bend: .94 });
    });
  })();

  // --- D4 · Ska de kermesse : 160 BPM, fa majeur ; un accord de ré♭ mutant à la 7e mesure ----------
  const D4 = (() => {
    const F = [57, 60, 65], Bb = [58, 62, 65], C = [55, 60, 64], Db = [56, 61, 65];
    const chords = [F, F, Bb, Bb, C, C, Db, C];
    const walk = [[41, 45, 48, 45], [41, 43, 45, 46], [46, 50, 53, 50], [46, 45, 43, 40], [36, 40, 43, 40], [36, 38, 40, 37], [37, 41, 44, 41], [36, 40, 43, 40]];
    return song(160, [5, 7, 9, 10, 0, 2, 4, 1, 8], (bar, add, hit) => {
      walk[bar].forEach((m, i) => add('groove', 'bass', i, m, .45, 1.2));
      hit('groove', 'kick', [0, 2]); hit('groove', 'snare', [1, 3], .8); hit('groove', 'hat', [0, 1, 2, 3], .5);
      for (const b of OFF) for (const m of chords[bar]) add('clav', 'dskank', b, m, .18, 1, { detune: (b * 37 + bar * 13) % 30 - 15 });
      hit('perc', 'lid', OFF, .7);
      if (bar % 2 === 0) add('organ', 'kazoo', 0, chords[bar][2], 7.5, 1, { detune: -40, bend: .95 });
      const tune = bar % 4 === 2 ? [[0, 72, .5], [.5, 74, .5], [1, 77, .75], [1.75, 76, .25], [2, 74, .5], [2.5, 72, .5], [3, 69, 1]]
        : bar % 4 === 3 ? [[0, 70, .5], [.5, 69, .5], [1, 67, .5], [1.5, 65, .5], [2, 64, .5], [2.5, 67, .5], [3, 65, 1]] : null;
      if (tune) { melody(add, 'sitar', 'horn', tune); melody(add, 'sitar', 'kazoo', tune, .8, () => ({ detune: 25 })); }   // fanfare bancale
      if (bar % 4 === 1) add('ghost', 'slide', 2, 72, 1.5, 1, { bend: 2 });
    });
  })();

  // --- N3 · Lounge atomique : 112 BPM, fa lydien, croches ternaires ; si♭ maj7 muté ----------------
  const N3 = (() => {
    const F = [57, 60, 64, 65], Em = [55, 59, 62, 64], Dm = [53, 57, 60, 64], Bb = [53, 57, 58, 62];
    const chords = [F, F, Em, Em, Dm, Dm, Bb, Bb], roots = [41, 41, 40, 40, 38, 38, 34, 34];
    const sw = (b) => Math.floor(b) + (b % 1 ? 2 / 3 : 0);   // croche ternaire
    return song(112, [5, 7, 9, 11, 0, 2, 4, 10], (bar, add, hit) => {
      const r = roots[bar], ch = chords[bar];
      [[0, 0], [1, 7], [2, 12], [3, 7], [3.5, 5]].forEach(([b, iv]) => add('groove', 'upright', sw(b), r + iv, .5, b === 0 ? 1 : .8));
      hit('groove', 'kick', [0, sw(2.5)], .7); hit('groove', 'hat', [1, 3], .6);
      hit('groove', 'hat', [0, 1, sw(1.5), 2, 3, sw(3.5)], (b) => (b % 1 ? .5 : .8));
      for (const b of [0, sw(1.5), 3]) for (const m of ch) add('clav', 'vibes', b, m + 12, .5, .6, { detune: melt(bar, 20) });
      for (const [b, m] of [[0, 64], [sw(.5), 69], [1, 64], [sw(2.5), 69], [3, 64], [sw(3.5), 71]]) add('perc', 'bongo', b, m, .1, .9);
      if (bar % 2 === 0) add('organ', 'theremin', 0, 77, 7.5, 1.3, { bend: .7 });   // le « ouuuh » qui s'effondre
      if (bar % 4 === 1) melody(add, 'sitar', 'vibes', [[0, 81, .5], [sw(.5), 79, .5], [1, 77, .5], [sw(1.5), 76, .5], [2, 79, 1.5]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'vibes', [[0, 76, .5], [sw(.5), 74, .5], [1, 71, 1], [2, 70, 2]]);   // le si♭ qui n'a rien à faire là
      if (bar % 4 === 0) for (const m of [65, 69, 72]) add('ghost', 'choir', 0, m, 15.5);
    });
  })();

  // --- N4 · Disco radieux : 122 BPM, mi majeur ; une note de l'arpège grince de plus en plus -------
  const N4 = (() => {
    const E = [64, 68, 71], Csm = [61, 64, 68], A = [61, 64, 69], B = [63, 66, 71];
    const chords = [E, E, Csm, Csm, A, A, B, B], roots = [40, 40, 37, 37, 33, 33, 35, 35];
    const clicks = [.13, .55, 1.37, 2.05, 2.33, 2.9, 3.45];
    return song(122, [4, 6, 8, 9, 11, 1, 3], (bar, add, hit) => {
      const r = roots[bar], ch = chords[bar];
      for (const [p, iv] of [[0, 0], [2, 12], [3, 0], [6, 12], [8, 0], [10, 12], [11, 7], [14, 12]]) add('groove', 'pulse', q(p), r + iv, .2, p % 4 ? .8 : 1);
      hit('groove', 'kick', [0, 1, 2, 3]); hit('groove', 'clap', [1, 3], .8); hit('groove', 'openhat', OFF, .5);
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12];
      ALL16.forEach((b, i) => add('clav', 'arp', b, arp[i % 4] + 12, .2, i % 2 ? .45 : .65, i % 4 === 3 ? { detune: 12 + bar * 12 } : {}));
      hit('perc', 'cowbell', [.75, 1.5, 2.75, 3.5], .7); hit('perc', 'hat', ALL16, soft16);
      hit('organ', 'tick', clicks, .9);
      if (bar % 2 === 0) add('organ', 'siren', 0, 76, 7.5, 1, { bend: .94 });
      if (bar % 4 === 1) melody(add, 'sitar', 'sbrass', [[0, 76, .5], [.5, 80, .5], [1, 83, 1], [2, 81, .5], [2.5, 80, .5], [3, 78, 1]]);
      if (bar % 4 === 3) melody(add, 'sitar', 'sbrass', [[0, 83, .5], [.5, 81, .5], [1, 80, .5], [1.5, 78, .5], [2, 76, 1.5]], 1, (d) => (d > 1 ? { bend: .97 } : {}));
      if (bar % 4 === 0) for (const m of ch) add('ghost', 'pad', 0, m, 15.5);
    });
  })();

  // --- N4 EDM malade : 126 BPM, mi majeur ; 6 mesures de « drop », montée (roulement, sifflet qui monte), retombée -----
  // Accords qui pompent sur les contretemps (désaccordés par paires, de plus en plus), basse qui gronde, arpège qui grince,
  // jingle de pub en surface, compteur Geiger en toxique.
  const N4E = (() => {
    const E = [64, 68, 71], Csm = [61, 64, 68], A = [61, 64, 69], B = [63, 66, 71];
    const chords = [E, E, Csm, Csm, A, A, B, B], roots = [40, 40, 37, 37, 33, 33, 35, 35];
    const clicks = [.13, .55, 1.37, 2.05, 2.33, 2.9, 3.45];
    return song(126, [4, 6, 8, 9, 11, 1, 3], (bar, add, hit) => {
      const r = roots[bar], ch = chords[bar], build = bar >= 6;
      hit('groove', 'kick', bar === 7 ? [0, 1] : [0, 1, 2, 3]);
      if (!build) { for (const b of OFF) add('groove', 'growl', b, r, .4, 1, { detune: melt(bar, 30) }); add('groove', 'sub', 0, r - 12, .35); hit('groove', 'clap', [1, 3], .8); }
      else hit('groove', 'snare', bar === 6 ? EIGHTHS : ALL16, (b) => .3 + .7 * ((bar - 6) * 4 + b) / 8);   // roulement qui monte
      for (const b of OFF) for (const m of ch) for (const c of [-8, 8]) add('clav', 'saws', b, m, .38, .9, { detune: c * (1 + bar / 3) });
      const arp = [ch[0], ch[1], ch[2], ch[0] + 12];
      ALL16.forEach((b, i) => add('clav', 'arp', b, arp[i % 4] + 12, .2, i % 2 ? .3 : .45, i % 4 === 3 ? { detune: 12 + bar * 12 } : {}));
      hit('perc', 'openhat', OFF, .5); hit('perc', 'hat', ALL16, soft16); hit('perc', 'cowbell', [.75, 2.75], .6);
      hit('organ', 'tick', clicks, .9);
      if (bar % 2 === 0) add('organ', 'siren', 0, 76, 7.5, 1, { bend: .94 });
      if (bar % 4 === 1) melody(add, 'sitar', 'sbrass', [[0, 76, .5], [.5, 80, .5], [1, 83, 1], [2, 81, .5], [2.5, 80, .5], [3, 78, 1]]);
      if (bar === 3) melody(add, 'sitar', 'sbrass', [[0, 83, .5], [.5, 81, .5], [1, 80, .5], [1.5, 78, .5], [2, 76, 1.5]], 1, (d) => (d > 1 ? { bend: .97 } : {}));
      if (bar === 6) add('ghost', 'slide', 0, 64, 7.8, 1, { bend: 4 });   // sifflet qui monte de deux octaves
      if (bar === 0) for (const m of ch) add('ghost', 'pad', 0, m, 23.5);
    });
  })();

  Object.assign(FP.songs, { mN4E: N4E, mI3: I3, mI4: I4, mBI4: BI4, mD3: D3, mD4: D4, mN3: N3, mN4: N4 });
  FP.maquettes = { wrap };
})();
