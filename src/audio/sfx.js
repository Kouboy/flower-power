// audio/sfx.js — effets sonores en FM (même moteur que la musique, accordés en mi) : sons de jeu, sons d'interface, jingles,
// bourdonnement continu du frôlement et grattement de la tige qui creuse.
// Lit     : state.mode, state.graze.active, state.query.grazes, FP.songs.jingles, FP.sequencer.notesBetween, FP.synth.DRUMS.
// Écrit   : rien dans l'état (le moteur audio uniquement ; anti-rafale rangé sur le moteur).
// Expose  : FP.sfx.play(backend, name, intensity?), FP.sfx.jingle(backend, name), FP.sfx.drone(backend, state, events),
//           FP.sfx.scrape(backend, k), FP.sfx.NAMES.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const SFX = { bus: 'sfx' };

  // Anti-rafale par type de son, propre à chaque moteur (une spore qui paie dix fois ne joue qu'un « kling »).
  const GAPS = { grazeStart: .10, contaminate: .24, scrape: .032, letter: .02, type: .02 };
  function allowed(b, kind) {
    const n = b.now(), cd = b.cooldowns || (b.cooldowns = {});
    if ((cd[kind] || 0) > n) return false;
    cd[kind] = n + (GAPS[kind] || .03);
    return true;
  }

  // Recettes : (note, bruit, batterie, t, intensité). note(inst, midi, délai, durée, vel, bend?) ; bruit(délai, durée, gain, Hz, type, q?).
  // Phrase des jetons (mi pentatonique) : elle monte, redescend un peu, repart plus haut ; elle boucle tous les 8 jetons,
  // une octave plus bas un tour sur deux (écho).
  const COIN_NOTES = [76, 79, 81, 83, 81, 86, 88, 91];
  const coinNote = (rank) => { const r = Math.max(0, Math.round(rank)); return COIN_NOTES[r % 8] - 12 * (Math.floor(r / 8) % 2); };
  const rnd = (a, b) => a + Math.random() * (b - a);   // variations sensorielles : chaque froissement est différent
  const GRAINS = ['grainA', 'grainB', 'grainC'];
  // Papier froissé : count craquements FM de hauteurs et de timbres variés, serrés au début puis qui s'espacent, sur len secondes.
  function crumple(n, count, len) {
    for (let i = 0; i < count; i++) { const k = i / count; n(GRAINS[Math.floor(Math.random() * 3)], rnd(78, 100), len * k * k * 1.1 + rnd(0, .012), rnd(.015, .045), 1 - k * .6); }
  }
  const RECIPES = {
    start: (n, z) => { n('brass', 52, 0, .35, 1.3); n('brass', 59, .04, .35, 1.2); n('brass', 64, .08, .4, 1.2); n('bell', 76, .12, .5, 1); z(0, .25, .06, 3000, 'highpass'); },
    growStart: (n, z) => { n('pluck', 40, 0, .08, 1.3); n('pluck', 47, .03, .08, 1); z(0, .1, .08, 400, 'lowpass'); },
    grazeStart: (n, z, d, i) => { n('pluck', 71, 0, .06, i); z(0, .07, .05 * i, 2100, 'bandpass'); },
    eco: (n, z, d, combo) => { const m = 76 + Math.min(5, Math.max(0, Math.round(combo) - 1)); n('bell', m, 0, .12, 1); n('bell', m + 7, .05, .14, .8); z(0, .04, .02, 2600, 'highpass'); },
    // Pièce (v4.5.0) : « tink » qui monte d'une note par pièce du chapelet (mi mineur pentatonique), puis l'accord du chapelet complet.
    coin: (n, z, d, rank) => { n('bell', coinNote(rank), 0, .1, .36); },
    chain: (n) => { for (const m of [76, 83, 88, 91]) n('bell', m, 0, .7, .42); n('brass', 64, .02, .4, .35); },
    // Bon de commande (v4.6.0), en FM pur : papier froissé (apparition, départ), gratouillis de crayon, tiroir-caisse.
    crumple: (n) => crumple(n, 14, .35),
    crumpleOut: (n) => crumple(n, 8, .22),
    pencil: (n) => {
      for (let i = 0; i < 4; i++) n('grainA', 94 + rnd(-2, 2), i * .014, rnd(.012, .02), .8);                          // petit trait vers le bas
      for (let i = 0; i < 9; i++) n('grainB', 96 + i * .5 + rnd(-2, 2), .075 + i * .016, rnd(.012, .022), .86 * (1 - i / 14));   // long trait vers le haut
    },
    register: (n) => {
      n('beep', 96, 0, .06); n('beep', 96, .09, .06);                                                   // bip bip
      n('bell', 88, .2, .6, 1.15); n('bell', 95, .2, .5, .65);                                          // ding
      n('clonk', 33, .23, .14);                                                                         // le tiroir s'ouvre
      for (let i = 0, at = .3; i < 4; i++, at += rnd(.035, .06)) n('tinkle', 100 + rnd(-3, 3), at, .05);   // pièces
    },
    water: (n) => { n('bell', 64, 0, .08, 1, 1.3); n('bell', 71, .07, .08, .9); n('bell', 76, .14, .12, .8); },
    bud: (n) => { n('bell', 76, 0, .1, 1); n('bell', 83, .07, .14, .9); },
    bomb: (n, z, d) => { d('kick', 0, 1.5); z(0, .35, .1, 400, 'lowpass'); n('pluck', 64, .12, .06, .5); n('pluck', 71, .18, .06, .5); n('pluck', 76, .24, .06, .4); },
    shieldBreak: (n, z) => { z(0, .18, .08, 3500, 'highpass'); n('bell', 82, 0, .15, 1, .6); n('pluck', 57, .04, .12, .8); },
    contaminate: (n, z) => { n('organ', 40, 0, .3, 1.4, .7); z(0, .25, .05, 1700, 'bandpass', 3); },
    hit: (n, z, d) => { d('kick', 0, 1.4); z(0, .18, .1, 520, 'bandpass'); n('slap', 40, 0, .2, 1, .55); },
    acid: (n, z) => { z(0, .3, .09, 2400, 'highpass'); n('clav', 46, 0, .25, 2, .66); },
    crack: (n, z, d) => { z(0, .12, .12, 300, 'lowpass'); z(.05, .08, .08, 900, 'bandpass'); d('snare', .02, .6); },
    ready: (n) => { n('organ', 52, 0, .3, 1.5); n('organ', 59, .12, .3, 1.3); },
    // Interface.
    wake: (n) => { n('organ', 52, 0, .9, 1.5); n('organ', 56, 0, .9, 1.3); n('organ', 59, 0, .9, 1.3); n('sitar', 64, .2, .6, 1, 1.06); },
    letter: (n, z) => { n('pluck', 47, 0, .04, .8); z(0, .02, .03, 1500, 'bandpass'); },
    type: (n, z) => { z(0, .025, .05, 4000, 'bandpass'); n('pluck', 88, 0, .02, .3); },
    stamp: (n, z, d) => { d('kick', 0, 1.5); z(0, .15, .12, 700, 'lowpass'); n('slap', 28, 0, .2, 1); },
    toggle: (n) => { n('pluck', 76, 0, .05, .8); }
  };
  const NAMES = Object.keys(RECIPES);

  function play(b, name, intensity) {
    const r = RECIPES[name];
    if (!b || !r || !allowed(b, name)) return;
    const t = b.now();
    const n = (inst, midi, at, dur, vel, bend) => b.note(inst, midi, t + at, dur, vel, bend ? { bus: 'sfx', bend } : SFX);
    const z = (at, dur, gain, hz, type, q) => b.burst(t + at, dur, gain, hz, type, SFX, q);
    const d = (kind, at, vel) => b.drum(kind, t + at, vel, SFX);
    r(n, z, d, intensity === undefined ? 1 : intensity);
  }

  // Jingle : une petite partition de FP.songs.jingles, jouée tout de suite sur le bus des effets.
  function jingle(b, name) {
    const song = FP.songs.jingles && FP.songs.jingles[name];
    if (!b || !song || !allowed(b, 'jingle:' + name)) return;
    const t = b.now(), spb = 60 / song.bpm;
    for (const { note: x, beat } of FP.sequencer.notesBetween(song, 0, song.bars * song.beatsPerBar)) {
      const at = t + beat * spb, route = x.bend ? { bus: 'sfx', bend: x.bend } : SFX;
      if (FP.synth.DRUMS.includes(x.inst)) b.drum(x.inst, at, x.vel === undefined ? 1 : x.vel, SFX);
      else b.note(x.inst, x.midi, at, x.dur * spb, x.vel === undefined ? 1 : x.vel, route);
    }
  }

  // Ronron de la foreuse, au rythme du battement de croissance : une note FM douce (mi, puis la quinte), à peine
  // soulignée d'un souffle de terre sourd. (Le grattement en bruit aigu de la v3 devenait irritant à force d'être répété.)
  let drillStep = 0;
  function scrape(b, k) {
    if (!allowed(b, 'scrape')) return;
    const t = b.now();
    b.note('drill', drillStep++ % 2 ? 59 : 52, t, .06, .8 + k * .4, SFX);   // mi3 / si3 : audible même sur des haut-parleurs d'ordinateur portable
    b.burst(t, .05, .025 + k * .015, 240, 'lowpass', SFX);
    if (drillStep % 2) b.burst(t + .01, .03, .02 + k * .015, 1300 + Math.random() * 500, 'bandpass', SFX);   // grattement discret, un battement sur deux
  }

  // Bourdonnement du frôlement (logique de la v3) : proximité = hauteur et brillance, durée = puissance ; coupé net sur un choc.
  const HARD_STOP = new Set(['death', 'shieldBreak', 'bloom', 'runStart']);
  function drone(b, state, events) {
    let intensity = 0, duration = 0;
    if (state.mode === 'playing') {
      for (const g of state.query.grazes || []) {
        const r = state.graze.active.get(g.obj);
        if (r) { intensity = Math.max(intensity, g.intensity); duration = Math.max(duration, r.time); }
      }
    }
    intensity = clamp(intensity, 0, 1);
    if (intensity <= .02) { b.drone(false, events.some(e => HARD_STOP.has(e.type))); return; }
    const close = Math.pow(intensity, 1.42), held = clamp(duration / 2.1, 0, 1);
    b.drone(true, 165 + close * 1640 + held * 330, 920 + close * 4700 + held * 1200, 5 + close * 18,
      (.024 + Math.min(.175, duration * .058)) * Math.pow(intensity, .66));
  }

  FP.sfx = { play, jingle, drone, scrape, NAMES };
})();
