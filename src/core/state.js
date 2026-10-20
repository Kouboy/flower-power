// core/state.js — l'unique objet d'état d'une partie.
// Lit     : FP.params.seed (graine imposée par l'URL), FP.createRng, FP.config.view, FP.config.world, FP.view.
// Écrit   : FP.state.current (via ui/menu.js et core/loop.js).
// Expose  : FP.state.createRun(seed?, dims?), FP.state.current.
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

  function worldHeightFor(viewH) {
    if (!(viewH > 0)) return 0;
    const w = FP.config.world;
    return Math.max(viewH + w.extraMin, Math.floor(viewH * w.heightRatio));
  }

  // Chaque appel construit des objets neufs : deux runs ne partagent rien.
  // dims : taille de la vue {W, H} en px ; par défaut FP.view s'il existe.
  function createRun(seed, dims = FP.view || { W: 0, H: 0 }) {
    const s = pickSeed(seed);
    const height = worldHeightFor(dims.H);
    return {
      mode: 'menu',          // 'menu' | 'playing' | 'dying' | 'bloom'
      time: 0,
      seed: s,
      level: 0,
      rng: FP.createRng(s),
      signature: { armed: false, spawned: false, targetLevel: 0 },  // T-Rex signature, 1 par run max
      camera: { y: Math.max(0, height - dims.H), manual: false, zoom: 1, shake: 0 },
      plant: { tip: null, dir: null, trail: [], stemAge: 0, reserves: 3 },
      world: {
        width: dims.W, height, viewH: dims.H, surfaceY: surfaceYFor(dims.H),
        skyVariant: 0, lawnVariant: 0, safePath: [], safeRadius: 0,
        solids: [], toxics: [], leaks: []
      },
      graze: { active: new Map(), combo: 0, comboTimer: 0 },
      power: { shield: false, shieldGrace: 0, sporeTimer: 0, bonuses: [] },
      score: { eco: 0, flowers: 0, flowerBonus: 0 },
      fx: { particles: [], effects: [], message: null },   // écrit uniquement par render/*
      events: []                                            // vidé à chaque frame par core/loop.js
    };
  }

  FP.state = { createRun, current: null };
})();
