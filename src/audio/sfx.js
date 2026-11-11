// audio/sfx.js — effets sonores en FM (même moteur que la musique, accordés en mi ; ramassages dans la gamme du milieu) : sons de jeu, sons d'interface, jingles,
// bourdonnement continu du frôlement et grattement de la tige qui creuse.
// Lit     : state.mode, state.graze.active, state.query.grazes, FP.songs.jingles, FP.sequencer.notesBetween, FP.synth.DRUMS.
// Écrit   : rien dans l'état (le moteur audio uniquement ; anti-rafale rangé sur le moteur).
// Expose  : FP.sfx.play(backend, name, intensity?, key?) (key : id du milieu, gamme des ramassages ; friche par défaut), FP.sfx.jingle(backend, name), FP.sfx.drone(backend, state, events), FP.sfx.hum(backend, state, events) (nappe toxique, effort de germination),
//           FP.sfx.scrape(backend, k), FP.sfx.NAMES.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;
  const SFX = { bus: 'sfx' };

  // Anti-rafale par type de son, propre à chaque moteur (une spore qui paie dix fois ne joue qu'un « kling »).
  const GAPS = { bossBlast: .07, bossCrumble: .1, grazeStart: .10, contaminate: .24, scrape: .032, letter: .02, type: .02 };
  function allowed(b, kind) {
    const n = b.now(), cd = b.cooldowns || (b.cooldowns = {});
    if ((cd[kind] || 0) > n) return false;
    cd[kind] = n + (GAPS[kind] || .03);
    return true;
  }

  // Recettes : (note, bruit, batterie, t, intensité). note(inst, midi, délai, durée, vel, bend?) ; bruit(délai, durée, gain, Hz, type, q?).
  // Phrases des jetons (v4.7.1) : une octave au-dessus de la musique. Chaque traînée a la sienne (d'après son numéro), qui
  // boucle tous les 8 jetons : montée, descente, arche, question-réponse, vague, escalier. En degrés (v5.5.0) de la gamme du milieu.
  const COIN_PHRASES = [[0, 1, 2, 3, 4, 5, 4, 3], [5, 4, 3, 2, 1, 0, 1, 2], [0, 2, 4, 5, 4, 2, 1, 0],
    [1, 2, 3, 2, 4, 3, 2, 1], [0, 3, 1, 4, 2, 5, 3, 4], [0, 1, 0, 2, 1, 3, 2, 4]];
  // Gammes des ramassages (v5.5.0) : pentatonique (6 notes, octave comprise) tirée de la gamme de la musique du milieu, variantes et
  // boss compris (contrôlé par les tests) ; chord : accord du chapelet complet (cloches, puis cuivre grave).
  const KEYS = {
    friche: { scale: [88, 91, 93, 95, 98, 100], chord: [76, 83, 88, 91], brass: 64 },      // mi sol la si ré : mi mineur
    industrie: { scale: [88, 91, 93, 96, 98, 100], chord: [76, 81, 84, 88], brass: 57 },   // mi sol la do ré : la mineur
    decharge: { scale: [90, 91, 94, 96, 98, 102], chord: [74, 79, 82, 86], brass: 55 },    // fa♯ sol si♭ do ré : sol mineur harmonique
    nucleaire: { scale: [88, 90, 92, 95, 97, 100], chord: [76, 83, 88, 92], brass: 64 }    // mi fa♯ sol♯ si do♯ : mi majeur
  };
  const coinNote = (k, rank, chain) => k.scale[COIN_PHRASES[Math.max(0, chain || 0) % COIN_PHRASES.length][Math.max(0, Math.round(rank)) % 8]];
  const rnd = (a, b) => a + Math.random() * (b - a);   // variations sensorielles : chaque froissement est différent
  const GRAINS = ['grainA', 'grainB', 'grainC'];
  // Papier froissé : count craquements FM de hauteurs et de timbres variés, serrés au début puis qui s'espacent, sur len secondes.
  function crumple(n, count, len) {
    for (let i = 0; i < count; i++) { const k = i / count; n(GRAINS[Math.floor(Math.random() * 3)], rnd(78, 100), len * k * k * 1.1 + rnd(0, .012), rnd(.015, .045), 1 - k * .6); }
  }
  const RECIPES = {
    start: (n, z) => { n('brass', 52, 0, .35, 1.3); n('brass', 59, .04, .35, 1.2); n('brass', 64, .08, .4, 1.2); n('bell', 76, .12, .5, 1); z(0, .25, .06, 3000, 'highpass'); },
    growStart: (n, z) => { n('pluck', 40, 0, .08, 1.3); n('pluck', 47, .03, .08, 1); z(0, .1, .08, 400, 'lowpass'); },
    grazeStart: (n, z, d, i, k) => { n('pluck', k.scale[3] - 24, 0, .06, i); z(0, .07, .05 * i, 2100, 'bandpass'); },
    eco: (n, z, d, combo, k) => { const i = Math.min(3, Math.max(0, Math.round(combo) - 1)); n('bell', k.scale[i] - 12, 0, .12, 1); n('bell', k.scale[i + 2] - 12, .05, .14, .8); z(0, .04, .02, 2600, 'highpass'); },
    // Pièce (v4.5.0) : « tink » qui suit la phrase de sa traînée dans la gamme du milieu, puis l'accord du chapelet complet.
    coin: (n, z, d, c, k) => { n('glass', coinNote(k, c.rank, c.chain), 0, .15, .13); },   // c = { rank, chain } ; .18 → .09 (v5.3.2) → .13 (v5.5.0)
    chain: (n, z, d, i, k) => { for (const m of k.chord) n('bell', m, 0, .7, .42); n('brass', k.brass, .02, .4, .35); },
    // Bon de commande (v4.6.0), en FM pur : papier froissé (apparition, départ), gratouillis de crayon, tiroir-caisse.
    // Germination (v4.7.0) : la graine craque (deux fois), puis la pousse part dans un « pop » qui monte.
    germCrack: (n) => { n('grainA', 70, 0, .03, 1); n('clonk', 45, 0, .06, .4); },
    germPop: (n) => { n('pluck', 64, 0, .12, .8, 1.5); n('bell', 79, .04, .15, .5); },
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
    burp: (n, z) => { n('lowbrass', 43, 0, .22, 1.1, .6); n('organ', 50, .03, .12, .6, .5); z(0, .2, .05, 500, 'bandpass', 2); },   // rot de la limace saoule qui éclate (v5.2.0)
    acid: (n, z) => { z(0, .3, .09, 2400, 'highpass'); n('clav', 46, 0, .25, 2, .66); },
    crack: (n, z, d) => { z(0, .12, .12, 300, 'lowpass'); z(.05, .08, .08, 900, 'bandpass'); d('snare', .02, .6); },
    // Boss : explosion d'une cible (retours de playtest : bien plus grosse — double coup sourd, souffle grave, déchirure aiguë, ferraille,
    // basse qui s'effondre, grondement qui traîne), graine rendue, avertissement qui monte, clic de la visée figée, tir, explosion de la tête ; boss battu (impact et fanfare qui monte).
    bossTarget: (n, z, d) => {
      d('kick', 0, 1.9); d('snare', .02, 1.3); d('kick', .16, 1.4);
      z(0, 1, .2, 700, 'lowpass'); z(.02, .3, .12, 2800, 'bandpass'); z(.14, 1.2, .1, 240, 'lowpass');
      n('sub', 31, 0, 1, 1.6, .8); n('slap', 38, 0, .3, 1.1, .5); n('clonk', 45, .03, .2, 1); n('clonk', 41, .09, .2, .8);
      n('lowbrass', 40, .04, .7, 1.2, .7); n('lowbrass', 35, .1, .8, 1.1, .7); n('organ', 28, .12, 1.1, 1.2, .8); n('bell', 84, .02, .4, .6, .6);
    },
    bossSeed: (n) => { n('bell', 76, .08, .14, .8); n('bell', 83, .16, .14, .9); n('bell', 88, .24, .35, 1); },
    bossWarn: (n, z, d, dur) => { for (let at = 0; at < dur - .06; at += .16 - .1 * at / dur) { const k = at / dur; n('organ', 52 + Math.round(16 * k), at, .1, .8 + .5 * k); } },   // dur : l'avertissement (s), qui monte et accélère jusqu'au coup
    bossLock: (n, z) => { n('clav', 88, 0, .04, 1.3); z(0, .04, .1, 3200, 'highpass'); },
    bossShot: (n, z) => { z(0, .16, .12, 1800, 'bandpass'); n('pluck', 60, 0, .1, 1, .5); },
    bossHead: (n, z, d) => { d('kick', 0, 1.8); d('snare', .05, 1); z(0, .8, .16, 300, 'lowpass'); n('sub', 31, 0, .8, 1.5); for (const [m, at] of [[52, .1], [59, .18], [64, .26]]) n('brass', m, at, .3, 1.1); },
    // Mort du boss : chaque paroi explose (coup sourd, souffle), puis s'effondre (grondement, ferraille qui tombe) ; le paroxysme lance le jingle (audio.js).
    bossBlast: (n, z, d) => { d('kick', 0, 1.6); z(0, .5, .14, 500, 'lowpass'); n('sub', 33, 0, .4, 1.2, .8); n('clonk', 43, .02, .15, .7); },
    bossCrumble: (n, z, d) => { z(0, .9, .1, 220, 'lowpass'); d('kick', .05, .9); for (let i = 0; i < 4; i++) n('clonk', 40 - i * 2, .08 + i * .09, .12, .6 - i * .1); },
    bossDown: (n, z, d) => { d('kick', 0, 1.6); z(0, .4, .12, 350, 'lowpass'); n('sub', 33, 0, .5, 1.2); for (const [m, at] of [[64, .12], [71, .2], [76, .28], [83, .36]]) n('brass', m, at, .3, 1.1); n('bell', 88, .36, .6, .9); },
    ready: (n) => { n('organ', 52, 0, .3, 1.5); n('organ', 59, .12, .3, 1.3); },
    // Interface.
    wake: (n) => { n('organ', 52, 0, .9, 1.5); n('organ', 56, 0, .9, 1.3); n('organ', 59, 0, .9, 1.3); n('sitar', 64, .2, .6, 1, 1.06); },
    letter: (n, z) => { n('pluck', 47, 0, .04, .8); z(0, .02, .03, 1500, 'bandpass'); },
    type: (n, z) => { z(0, .025, .05, 4000, 'bandpass'); n('pluck', 88, 0, .02, .3); },
    stamp: (n, z, d) => { d('kick', 0, 1.5); z(0, .15, .12, 700, 'lowpass'); n('slap', 28, 0, .2, 1); },
    toggle: (n) => { n('pluck', 76, 0, .05, .8); }
  };
  const NAMES = Object.keys(RECIPES);

  function play(b, name, intensity, key) {
    const r = RECIPES[name];
    if (!b || !r || !allowed(b, name)) return;
    const t = b.now();
    const n = (inst, midi, at, dur, vel, bend) => b.note(inst, midi, t + at, dur, vel, bend ? { bus: 'sfx', bend } : SFX);
    const z = (at, dur, gain, hz, type, q) => b.burst(t + at, dur, gain, hz, type, SFX, q);
    const d = (kind, at, vel) => b.drum(kind, t + at, vel, SFX);
    r(n, z, d, intensity === undefined ? 1 : intensity, KEYS[key] || KEYS.friche);
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
  // Joué une quinzaine de fois par seconde : sur trois voix permanentes (v4.7.5), sans créer de nœuds à chaque battement.
  let drillStep = 0;
  const DRILL = { bus: 'sfx', mono: 'drill' }, SOIL = { bus: 'sfx', mono: 'soil' }, SCRATCH = { bus: 'sfx', mono: 'scratch' };
  function scrape(b, k) {
    if (!allowed(b, 'scrape')) return;
    const t = b.now();
    b.note('drill', drillStep++ % 2 ? 59 : 52, t, .06, .8 + k * .4, DRILL);   // mi3 / si3 : audible même sur des haut-parleurs d'ordinateur portable
    b.burst(t, .05, .025 + k * .015, 240, 'lowpass', SOIL);
    if (drillStep % 2) b.burst(t + .01, .03, .02 + k * .015, 1300 + Math.random() * 500, 'bandpass', SCRATCH);   // grattement discret, un battement sur deux
  }

  // Bourdonnement du frôlement (logique de la v3) : proximité = hauteur et brillance, durée = puissance ; coupé net sur un choc.
  const HARD_STOP = new Set(['death', 'shieldBreak', 'bloom', 'runStart', 'germPop']);
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

  // Nappe toxique (v4.7.0) : le grincement monte en hauteur, en rugosité et en volume avec l'exposition (0 → brûlure) ;
  // il s'éteint en sortant de la nappe, net à la mort.
  // Germination (v4.7.3) : la même voix fait « forcer » la graine — un grondement grave qui monte avec la germination, avec un
  // tremblement rapide et irrégulier (l'effort) ; lâcher le laisse retomber, le pop de départ le coupe net.
  function hum(b, state, events) {
    if (!b.hum) return;
    const g = state.plant.germ || 0;
    if (state.mode === 'ready' && state.input.down && g > 0 && !events.some(e => e.type === 'germPop')) {
      const shake = 1 + .025 * Math.sin(state.time * 37) + .015 * Math.sin(state.time * 23.3);
      b.hum(true, (55 + 90 * g) * shake, 3 + 3 * g, .04 + .07 * g);
    } else if (state.mode === 'playing' && state.query && state.query.toxic > 0) {
      const k = clamp(state.plant.toxicTimer / FP.config.toxic.burnAt, 0, 1);
      b.hum(true, 70 + 190 * k, 2 + 4 * k, .03 + .08 * k);
    } else b.hum(false, events.some(e => HARD_STOP.has(e.type)));
  }

  FP.sfx = { play, jingle, drone, hum, scrape, NAMES };
})();
