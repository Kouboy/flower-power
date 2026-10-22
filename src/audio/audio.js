// audio/audio.js — chef d'orchestre du son (Web Audio, aucun fichier) : déblocage, effets, drone du frôlement, grattement, musique.
// Lit     : les événements de la frame (dont growthTick pour le grattement), state.mode, state.graze.active, state.query.grazes,
//           FP.synth (moteur), FP.music (musique), FP.state.current.
// Écrit   : rien dans l'état.
// Expose  : FP.audio.consume(events, state, dt), FP.audio.sfx(kind, intensity), FP.audio.unlock(),
//           FP.audio._backend (moteur de son ; remplaçable par un espion dans les tests, null tant que l'audio est muet).
//           Installe sur window les écouteurs pointerdown / keydown qui débloquent le son ; met le son en pause quand l'onglet est caché.
// Porté de la v3.43.16 (initAudio, ensureAudio, sfxAllowed, tone, noise, getNoiseBuffer, start/update/stopGrazeDrone,
// sfxGrowthScrape, sfx).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Les navigateurs n'autorisent le son qu'après un geste du joueur.
  function unlock() {
    try {
      if (!FP.audio._backend) {
        const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
        if (!AC) return;
        const b = FP.audio._backend = FP.synth.create(new AC());
        // La musique est planifiée sur sa propre horloge (25 ms), indépendante des images du jeu.
        setInterval(() => { try { FP.music.update(FP.state.current, [], b); } catch (e) { /* musique muette plutôt qu'une erreur */ } }, 25);
        // Onglet caché ou téléphone verrouillé : tout le son se met en pause (l'horloge audio s'arrête avec lui).
        document.addEventListener('visibilitychange', () => { if (document.hidden) b.suspend(); else b.resume(); });
      }
      const ac = FP.audio._backend.context;
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    } catch (e) { /* audio indisponible : le jeu reste muet */ }
  }

  // Anti-rafale par type de son, propre à chaque moteur (une spore qui paie dix fois ne joue qu'un « eco »).
  function allowed(b, kind, gap) {
    const n = b.now(), cooldowns = b.cooldowns || (b.cooldowns = {});
    if ((cooldowns[kind] || 0) > n) return false;
    cooldowns[kind] = n + gap;
    return true;
  }

  const GAPS = { grazeStart: .10, contaminate: .24 };

  // Recettes de la v3 : tone(fréquence, durée, forme, gain, délai, glissando) et noise(durée, gain, filtre, type, délai).
  const RECIPES = {
    start: (t, n) => { t(140, .16, 'sine', .075, 0, 1.32); t(280, .11, 'triangle', .060, .045, 1.15); n(.09, .030, 520, 'lowpass', .015); },
    growStart: (t, n) => { t(118, .070, 'sine', .090, 0, 1.95); t(236, .055, 'triangle', .062, .025, 1.38); n(.105, .065, 360, 'lowpass', .008); n(.042, .036, 1150, 'bandpass', .045); },
    bloom: (t, n) => {
      n(.20, .095, 980, 'bandpass', 0);
      t(392, .12, 'triangle', .075, 0, 1.22); t(587, .13, 'sine', .070, .055, 1.18); t(784, .16, 'triangle', .060, .115, 1.10);
      t(1175, .22, 'sine', .050, .18, .96); t(1568, .10, 'square', .024, .25, 1.12);
      n(.09, .042, 2600, 'highpass', .20);
    },
    eco: (t, n, i) => { t(1180, .055, 'square', .044 * i, 0, 1.18); t(1760, .075, 'square', .035 * i, .045, .86); n(.038, .022 * i, 2600, 'highpass', .01); },
    grazeStart: (t, n, i) => { t(620, .055, 'sawtooth', .055 * i, 0, 1.45); n(.070, .048 * i, 2100, 'bandpass', 0); },
    water: (t, n) => { t(260, .15, 'sine', .050, 0, 1.35); t(520, .20, 'sine', .040, .04, .76); n(.18, .030, 1200, 'bandpass', 0); },
    shieldBreak: (t, n) => { n(.16, .070, 1800, 'highpass', 0); t(420, .11, 'triangle', .050, 0, .62); t(210, .16, 'sine', .040, .035, .52); },
    bud: (t) => { t(660, .08, 'triangle', .055, 0, 1.22); t(990, .10, 'sine', .040, .06, 1.08); },
    bomb: (t, n) => { n(.32, .090, 420, 'lowpass', 0); t(62, .26, 'sine', .085, 0, .62); t(520, .13, 'square', .035, .12, 1.4); t(820, .11, 'square', .025, .18, 1.2); },
    hit: (t, n) => { n(.18, .105, 520, 'bandpass', 0); t(146, .20, 'sawtooth', .060, 0, .55); },
    acid: (t, n) => { n(.25, .090, 2400, 'highpass', 0); t(210, .22, 'sawtooth', .045, 0, .66); t(94, .15, 'sine', .040, .08, .55); },
    contaminate: (t, n) => { n(.22, .055, 1700, 'bandpass', 0); t(180, .20, 'sawtooth', .034, 0, .74); },
    ready: (t) => { t(220, .12, 'triangle', .038, 0, 1.18); t(330, .10, 'triangle', .030, .07, 1.12); }
  };

  function sfx(kind, intensity = 1) {
    const b = FP.audio._backend, recipe = RECIPES[kind];
    if (!b || !recipe) return;
    try {
      if (!allowed(b, kind, GAPS[kind] || .03)) return;
      recipe(b.tone, b.noise, clamp(intensity || 1, .2, 2.4));
    } catch (e) { /* un son raté ne doit jamais casser une frame */ }
  }

  // Événements de la frame → sons (noms de la v3).
  function play(e) {
    switch (e.type) {
      case 'runStart': return sfx('start');
      case 'stemStart': return sfx('growStart');
      case 'bloom': return sfx('bloom');
      case 'eco': return sfx('eco', e.flat ? clamp(e.amount / 2600, .6, 2.2) : clamp(e.amount / 650, .45, 1.8));
      case 'grazeStart': return sfx('grazeStart', e.intensity || .6);
      case 'pickup': return sfx(e.kind === 'water' ? 'water' : 'bud');
      case 'shieldBreak': return sfx('shieldBreak');
      case 'bomb': return sfx('bomb');
      case 'death': return sfx(e.cause === 'solid' ? 'hit' : 'acid');
      case 'toxicEnter': return sfx('contaminate');
      case 'bonusSpawn': case 'ready': return sfx('ready');
      case 'growthTick': return scrape(e.k);
    }
  }

  // --- Sons continus -------------------------------------------------------------

  // Événements qui coupent le drone net (v3 : stopGrazeDrone(true) au choc, à l'éclosion, au nouveau run).
  const HARD_STOP = new Set(['death', 'shieldBreak', 'bloom', 'runStart']);

  function updateDrone(b, state, events) {
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
    b.drone(true, 180 + close * 1780 + held * 360, 920 + close * 4700 + held * 1200, 5 + close * 18,
      (.024 + Math.min(.175, duration * .058)) * Math.pow(intensity, .66));
  }

  // Grattement de la pousse qui creuse, au rythme du battement de croissance (play/plant.js).
  function scrape(k) {
    const b = FP.audio._backend;
    if (!allowed(b, 'growthScrape', .032)) return;
    b.noise(.074, .086 + k * .050, 980 + Math.random() * 1050, 'bandpass', 0);
    b.noise(.052, .050 + k * .028, 260 + Math.random() * 320, 'lowpass', .004);
    if (Math.random() < .82) b.tone(78 + k * 64, .055, 'sawtooth', .042 + k * .020, 0, .72);
  }

  function consume(events, state, dt) {
    const b = FP.audio._backend;
    if (!b) return;
    try {
      for (const e of events) play(e);
      updateDrone(b, state, events);
      FP.music.update(state, events, b);
    } catch (e) { /* audio muet plutôt qu'une partie figée */ }
  }

  FP.audio = { consume, sfx, unlock, _backend: null };

  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
})();
