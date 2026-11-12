// audio/tonality.js — tonique et mode de chaque biome (v5.10.0) : les sons, jingles et l'air du Shop, composés en mi, prennent la
// tonique de la musique du biome (mi, la, sol, mi) et son mode : une note étrangère à la gamme du biome glisse vers sa voisine du
// mode (tierce mineure ↔ majeure, septième, sixte…), sinon d'un demi-ton. La Friche (mi, la référence) et hors biome : rien ne change.
// Lit     : rien (données de composition, contrôlées par dev/tests/tonality.test.js contre les gammes des musiques des biomes).
// Écrit   : rien.
// Expose  : FP.tonality.pitch(midi, milieuId) → midi ; FP.tonality.shift(milieuId) → demi-tons (purs).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const E = 4;   // tout est composé en mi
  // shift : transposition de mi à la tonique du biome ; scale : intervalles de la gamme de sa musique, depuis sa tonique (null : aucun ajustement).
  const TONES = {
    friche: { shift: 0, scale: null },
    industrie: { shift: 5, scale: [0, 1, 3, 5, 6, 7, 10] },    // la mineur blues, et le si♭ qui grince (songs-industrie.js)
    decharge: { shift: 3, scale: [0, 2, 3, 5, 7, 8, 11] },     // sol mineur harmonique (songs-decharge.js)
    nucleaire: { shift: 0, scale: [0, 2, 4, 5, 7, 9, 11] }     // mi majeur (songs-nucleaire.js)
  };
  // Voisine du mode : la même note, mineure ou majeure (tierce, sixte, septième, seconde, quarte augmentée).
  const PARTNER = { 1: 2, 2: 1, 3: 4, 4: 3, 5: 6, 6: 5, 8: 9, 9: 8, 10: 11, 11: 10 };

  const shift = (id) => (TONES[id] ? TONES[id].shift : 0);

  function pitch(midi, id) {
    const T = TONES[id];
    if (!T) return midi;
    const m = midi + T.shift;
    if (!T.scale) return m;
    const iv = ((m - E - T.shift) % 12 + 12) % 12;
    if (T.scale.includes(iv)) return m;
    for (const to of [PARTNER[iv], iv - 1, iv + 1]) if (T.scale.includes(((to % 12) + 12) % 12)) return m + to - iv;
    return m;
  }

  FP.tonality = { pitch, shift };
})();
