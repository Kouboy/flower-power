// core/config-lab.js — réglages de l'Encounter Lab (v5.12.0, ?lab=N ; spec docs/superpowers/specs/2026-11-16-encounter-lab-design.md),
// à part de config.js (qui atteindrait 400 lignes). Lu par world/lab.js, play/plant.js, play/lab-pulse.js, play/lab-stats.js.
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.lab, FP.config.text.{lab, death.pulse, death.lab}.
// Expose  : FP.config.lab, FP.config.text.lab.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  FP.config.text.lab = 'LAB';   // mention de l'écran titre en mode Lab
  FP.config.text.death.pulse = 'soufflée par le gaz';   // mort par l'impulsion montante
  FP.config.text.death.lab = 'bétonnée';   // mort contre un mur d'un circuit (court : le cri tient sur l'écran le plus étroit)
  FP.config.lab = {
    channelMin: 48,   // passage minimal des circuits à 360 px de large (× W / 360)
    // Sols (play/plant.js) : blend = durée (s) de la transition à l'entrée et à la sortie ; argile : braquage et suivi du doigt × ;
    // sable : vitesse et braquage ×.
    soils: { blend: .3, argile: { turn: .55, guide: .55 }, sable: { speed: 1.35, turn: 1.4 } },
    // Impulsion (play/lab-pulse.js) : warn = annonce avant chaque départ (s) ; period = écart entre deux départs (s) ; length = longueur de
    // la colonne (× hauteur d'écran) ; speedK = vitesse × celle de la pousse (× pulse.slow du circuit).
    // Tourelle des modules (play/lab-turret.js, v5.13.0) : aim = durée de la visée avant la rafale (s, au moins 1) ; speed = vitesse d'un tir (px/s).
    // Le reste (figement, rafale, éventail, rayon) : config.boss.shot, comme au boss.
    turret: { aim: 1.2, speed: 400 },
    pulse: { warn: 1.5, period: 2.4, length: .15, speedK: 3 }   // v5.12.2 : annonce plus longue, bouffées plus espacées (période propre au circuit : pulse.period)
  };
})();
