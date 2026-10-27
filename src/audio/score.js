// audio/score.js — petits constructeurs de partition partagés par les musiques de milieu (v4.10.0).
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.score.song(bpm, pcs, fill, bars = 8) → { bpm, bars, beatsPerBar: 4, pcs, notes } ; fill(bar, add, hit) avec
//           add(layer, inst, beat, midi, dur, vel = 1, extra) et hit(layer, kind, beats, vel = 1 | (beat) => vel), temps en
//           beats dans la mesure ; FP.score.q(i) (i doubles croches), ALL16, EIGHTHS, OFF, soft16(beat) (charleston doux/fort),
//           melody(add, layer, inst, [[beat, midi, dur]…], vel = 1, extra(dur)), melt(bar, cents) (cassette qui fond).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function song(bpm, pcs, fill, bars = 8) {
    const notes = [];
    for (let bar = 0; bar < bars; bar++) {
      const add = (layer, inst, beat, midi, dur, vel = 1, extra) => notes.push({ beat: bar * 4 + beat, dur, inst, midi, vel, layer, ...(extra || {}) });
      const hit = (layer, kind, beats, vel = 1) => { for (const b of beats) notes.push({ beat: bar * 4 + b, dur: .25, inst: kind, vel: typeof vel === 'function' ? vel(b) : vel, layer }); };
      fill(bar, add, hit);
    }
    return { bpm, bars, beatsPerBar: 4, pcs, notes: notes.sort((a, b) => a.beat - b.beat) };
  }
  const q = (i) => i / 4;
  const ALL16 = [...Array(16).keys()].map(q), EIGHTHS = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5], OFF = [.5, 1.5, 2.5, 3.5];
  const soft16 = (b) => (b % .5 ? .35 : .7);
  const melody = (add, layer, inst, items, vel = 1, extra) => { for (const [b, m, d] of items) add(layer, inst, b, m, d, vel, extra && extra(d)); };
  const melt = (bar, cents) => -cents * bar / 7;   // de plus en plus bas au fil de la boucle de 8 mesures

  FP.score = { song, q, ALL16, EIGHTHS, OFF, soft16, melody, melt };
})();
