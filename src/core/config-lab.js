// core/config-lab.js — réglages de l'Encounter Lab (v5.12.0, ?lab=N ; spec docs/superpowers/specs/2026-11-16-encounter-lab-design.md),
// à part de config.js (qui atteindrait 400 lignes). Lu par world/lab.js, world/modules.js (v5.14.0, ?modules), play/plant.js, play/lab-*.js.
// Lit     : FP.config (déjà posé par config.js).
// Écrit   : FP.config.lab, FP.config.text.{lab, modules, death.pulse, death.lab}.
// Expose  : FP.config.lab, FP.config.text.{lab, modules}.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  FP.config.text.lab = 'LAB';   // mention de l'écran titre en mode Lab
  FP.config.text.modules = 'MODULES';   // v5.14.0 : mention de l'écran titre avec ?modules
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
    pulse: { warn: 1.5, period: 2.4, length: .15, speedK: 3 },   // v5.12.2 : annonce plus longue, bouffées plus espacées (période propre au circuit : pulse.period)
    // Modules en partie normale (world/modules.js, v5.14.0, ?modules) : sets = sélection par biome (ids de assets/lab/circuits.js) ;
    // from = run.step minimal (1 : à partir du 2e niveau du biome) ; bottom, top, gap = marges sous le module le plus bas, au-dessus du plus
    // haut, entre deux (× hauteur d'écran ; un module de 1,5 écran tient toujours dans le niveau le plus court) ; approach = hauteur sur
    // laquelle le chemin sûr rejoint une porte (× hauteur d'écran) ; pad = rien de tiré au hasard à moins de pad px d'un module ;
    // salt = tirage propre des modules (graine du run ^ salt ^ niveau : state.rng n'est pas touché).
    modules: {
      sets: {
        friche: ['gueule', 'dents-de-scie', 'herse', 'carrefour'],
        industrie: ['peigne', 'sablier', 'grand-huit', 'carrefour'],
        decharge: ['escalier', 'tetris', 'herse', 'dents-de-scie'],
        nucleaire: ['tour-de-guet', 'escalier', 'grand-huit', 'peigne']
      },
      from: 1, bottom: .3, top: .2, gap: .3, approach: .25, pad: 24, salt: 0x6d6f64
    }
  };
})();
