// core/config-braid.js — réglages de la tresse (v5.15.0 au Lab ; v5.17.0 dans le jeu normal, avec ses îlots ; specs
// docs/superpowers/specs/2026-11-19-tresse-design.md et 2026-11-19-tresse-ilots-design.md), à part de config.js (plein à 400 lignes).
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.braid.
// Expose  : FP.config.braid.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  // La tresse (world/braid.js) : cross = hauteur entre deux croisements (× hauteur d'écran) ; spread = écart maximal de B à A (× largeur) ;
  // radiusK = largeur garantie de B / celle de A (safeRadius) ; coinsOnB = part des traînées faciles qui suivent B ; toxicBite = une nappe
  // peut couvrir B jusqu'à toxicBite × sa largeur garantie, pas plus ; triesK = échecs de suite tolérés avant d'arrêter de poser des déchets × (densité gardée) ; salt = tirage propre de B (graine ^ salt ^ niveau).
  // Îlots (world/islands.js, v5.17.0) : la terre entre A et B, d'un croisement au suivant. step = écart vertical entre deux déchets d'îlot
  // (px) ; tries = déchets du biome tirés, à leur taille, pour en trouver un qui tienne (v5.17.1 : plus de réduction, qui faussait les tailles) ;
  // bite = part de la largeur garantie de A et de B qu'un déchet d'îlot peut mordre en débordant (v5.17.2) ;
  // pool = nappe d'un îlot resté vide : rx = demi-largeur cherchée (px, de la plus grande à la plus petite), ryK = allongement, tilt = inclinaison (rad),
  // edgeK = bord de la nappe à au moins edgeK × hazardRadius du milieu de A (les autres nappes : .5, et leur centre plus loin). turret = la tourelle enfouie, au plus une par îlot (play/island-turrets.js) :
  // chance = probabilité par îlot, par biome (index de FP.config.milieux : rien au premier) ; r = rayon (px) ; range = portée depuis la pointe
  // (px) ; speed = vitesse d'un tir (px/s) ; gap = attente après une rafale (s) ; lead = part de l'avance
  // de la pousse visée au verrouillage (v5.17.2 : 1 = là où elle sera si elle file droit). Visée, verrouillage et rafale : ceux des boss (boss.shot).
  FP.config.braid = { cross: .9, spread: .3, radiusK: .6, coinsOnB: 2 / 3, toxicBite: .5, triesK: 3, salt: 0x627264,
    islands: { step: 70, tries: 8, bite: .5, pool: { rx: [16, 44], ryK: 1.8, tilt: .25, edgeK: .6 }, turret: { chance: [0, .35, .5, .6], r: 14, range: 300, speed: 320, gap: 3, lead: .8 } } };
})();
