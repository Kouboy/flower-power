// core/config-lab.js — réglages du Lab (?lab), à part de config.js (qui atteindrait 400 lignes). v5.15.0 : le Lab est une partie normale
// avec la tresse (spec docs/superpowers/specs/2026-11-19-tresse-design.md) ; les modules (v5.12–v5.14) sont retirés.
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.lab, FP.config.text.lab.
// Expose  : FP.config.lab, FP.config.text.lab.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  FP.config.text.lab = 'LAB';   // mention de l'écran titre en mode Lab
  // La tresse (world/braid.js) : cross = hauteur entre deux croisements (× hauteur d'écran) ; spread = écart maximal de B à A (× largeur) ;
  // radiusK = largeur garantie de B / celle de A (safeRadius) ; coinsOnB = part des traînées faciles qui suivent B ; toxicBite = une nappe
  // peut couvrir B jusqu'à toxicBite × sa largeur garantie, pas plus ; triesK = essais de placement des déchets × (densité gardée) ; salt = tirage propre de B (graine ^ salt ^ niveau).
  FP.config.lab = { braid: { cross: .9, spread: .3, radiusK: .6, coinsOnB: 2 / 3, toxicBite: .5, triesK: 3, salt: 0x627264 } };
})();
