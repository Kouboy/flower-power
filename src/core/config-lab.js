// core/config-lab.js — réglages du Lab (?lab), à part de config.js (qui atteindrait 400 lignes). v5.15.0 : le Lab est une partie normale
// avec la tresse (spec docs/superpowers/specs/2026-11-19-tresse-design.md) ; les modules (v5.12–v5.14) sont retirés.
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.lab, FP.config.text.lab.
// Expose  : FP.config.lab, FP.config.text.lab.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  FP.config.text.lab = 'LAB';   // mention de l'écran titre en mode Lab
  FP.config.lab = {};
})();
