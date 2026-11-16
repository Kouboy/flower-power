// core/config-lab.js — réglages de l'Encounter Lab (v5.12.0, ?lab=N ; spec docs/superpowers/specs/2026-11-16-encounter-lab-design.md),
// à part de config.js (qui atteindrait 400 lignes). Lu par world/lab.js, play/plant.js, play/lab-pulse.js, play/lab-stats.js.
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.lab.
// Expose  : FP.config.lab.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  FP.config.lab = {
    channelMin: 48   // passage minimal des circuits à 360 px de large (× W / 360)
  };
})();
