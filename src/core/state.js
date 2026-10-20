// core/state.js — l'unique objet d'état d'une partie.
// Lit     : FP.params.seed (graine imposée par l'URL), FP.createRng, FP.config.view, FP.view.H.
// Écrit   : FP.state.current (via ui/menu.js et core/loop.js).
// Expose  : FP.state.createRun(seed?, viewH?), FP.state.current.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function pickSeed(seed) {
    if (Number.isInteger(seed) && seed >= 0) return seed;
    if (FP.params && FP.params.seed !== null) return FP.params.seed;
    return Math.floor(Math.random() * 999999);
  }

  // Hauteur du ciel, fixée pour toute la durée du run (comme en v3).
  function surfaceYFor(viewH) {
    if (!(viewH > 0)) return 0;
    const v = FP.config.view;
    return Math.max(v.surfaceMin, Math.min(v.surfaceMax, viewH * v.surfaceRatio));
  }

  // Chaque appel construit des objets neufs : deux runs ne partagent rien.
  // viewH : hauteur de la vue en px ; par défaut celle de FP.view si elle existe.
  function createRun(seed, viewH = FP.view ? FP.view.H : 0) {
    const s = pickSeed(seed);
    return {
      mode: 'menu',          // 'menu' | 'playing' | 'dying' | 'bloom'
      time: 0,
      seed: s,
      level: 0,
      rng: FP.createRng(s),
      camera: { y: 0, zoom: 1, shake: 0 },
      plant: { tip: null, dir: null, trail: [], stemAge: 0, reserves: 3 },
      world: { solids: [], toxics: [], leaks: [], surfaceY: surfaceYFor(viewH), height: 0 },
      graze: { active: new Map(), combo: 0, comboTimer: 0 },
      power: { shield: false, shieldGrace: 0, sporeTimer: 0, bonuses: [] },
      score: { eco: 0, flowers: 0, flowerBonus: 0 },
      fx: { particles: [], effects: [], message: null },   // écrit uniquement par render/*
      events: []                                            // vidé à chaque frame par core/loop.js
    };
  }

  FP.state = { createRun, current: null };
})();
