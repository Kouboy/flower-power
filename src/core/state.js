// core/state.js — l'unique objet d'état d'une partie.
// Lit     : FP.params.seed (graine imposée par l'URL), FP.createRng, FP.config.view, FP.config.world, FP.view.
// Écrit   : FP.state.current (via ui/menu.js et core/loop.js).
// Expose  : FP.state.createRun(seed?, dims?), FP.state.applyView(state, dims), FP.state.current.
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
      mode: 'menu',          // 'menu' | 'ready' | 'playing' | 'dying' | 'bloom' | 'over'
      time: 0,
      seed: s,
      level: 0,
      rng: FP.createRng(s),
      signature: { armed: false, spawned: false, targetLevel: 0 },  // T-Rex signature, 1 par run max
      camera: { y: Math.max(0, height - dims.H), manual: false, near: 0, zoom: 1, shake: 0 },
      input: { x: 0, screenX: 0, y: 0, down: false, active: false, pressed: false },   // instantané du pointeur (x monde, y écran)
      plant: {
        seed: { x: 0, y: 0 }, tip: null, dir: { x: 0, y: -1 }, guide: { x: 0, y: 0 },
        trail: [], oldTrails: [], stemAge: 0, stemCount: 0, reserves: FP.config.plant.seeds,
        corruption: 0, toxicTimer: 0, recentToxic: 0,         // exposition toxique (écrite par play/flow.js)
        scrapeTimer: 0                                        // battement de croissance (play/plant.js)
      },
      world: {
        width: dims.W, height, viewH: dims.H, surfaceY: surfaceYFor(dims.H),
        skyVariant: 0, lawnVariant: 0, safePath: [], safeRadius: 0,
        solids: [], toxics: [], leaks: [], bonuses: []     // bonuses : récompenses de flyover (play/powerups.js)
      },
      query: { solid: null, danger: 0, near: null, toxic: 0, leak: 0, leakHit: null, grazes: [] },          // requête de pointe de la frame (world/collision.js)
      flow: { timer: 0, message: '', messageTimer: 0, stage: 'show', fade: 0, overReason: '', blossom: null },       // déroulé de partie (play/flow.js)
      garden: { flowers: [] },                                // parterre : fleurs écloses pendant tout le run
      graze: { active: new Map() },                           // frôlements en cours (play/graze.js)
      power: { shield: false, shieldGrace: 0 },              // bouclier organique (play/powerups.js)
      score: { eco: 0, flowers: 0, flowerBonus: 0, combo: 0, comboTimer: 0 },
      fx: { particles: [], effects: [], message: null },   // écrit uniquement par render/*
      events: []                                            // vidé à chaque frame par core/loop.js
    };
  }

  // Fenêtre redimensionnée pendant un run : le niveau garde ses coordonnées (largeur, hauteur, surface),
  // seule la hauteur visible change, et la caméra est ramenée dans ses nouvelles bornes.
  function applyView(state, dims) {
    const world = state.world;
    world.viewH = dims.H;
    const maxY = Math.max(0, world.height - world.viewH);
    state.camera.y = Math.max(0, Math.min(maxY, state.camera.y));
  }

  FP.state = { createRun, applyView, current: null };
})();
