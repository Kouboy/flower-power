// core/config.js — tous les réglages du jeu. Un réglage ne se change qu'ici.
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.config.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  FP.config = {
    version: '4.0.0',
    storageKey: 'flower_power_v4_best',

    view: {
      aspect: 9 / 16,
      dprMax: 1.15,
      minW: 300,
      minH: 520,
      // Hauteur du ciel : H * surfaceRatio, bornée.
      surfaceRatio: .136,
      surfaceMin: 82,
      surfaceMax: 116
    },

    // Hauteur du monde : la graine part bien plus bas que l'écran visible.
    world: {
      extraMin: 620,     // height >= viewH + extraMin
      heightRatio: 2.35  // height >= viewH * heightRatio
    },

    level: {
      // Marge de respiration autour du rectangle rendu de chaque PNG (placement sans chevauchement).
      padding: { authored: 7, signature: 12 }
    },

    loop: {
      maxDt: .033,      // plafond par frame (onglet revenu d'arrière-plan)
      fallbackDt: .016  // dt invalide (NaN, négatif, nul)
    },

    // Palettes v3.43 : plus terre/papier, pour laisser respirer les sprites.
    palette: {
      skies: [
        ['#6eabb9', '#a8ced0', '#dbe1c5', '#ead49d'],
        ['#75b2bd', '#b4d3cf', '#e8e4c5', '#eed7a5'],
        ['#718fae', '#aabbd0', '#d8d9c8', '#ead9aa'],
        ['#78b4ad', '#b8d5c9', '#e3e3c2', '#efd2a0']
      ],
      lawns: [
        ['rgba(132,165,72,.98)', 'rgba(75,116,57,.98)', 'rgba(48,79,43,.72)'],
        ['rgba(151,175,73,.98)', 'rgba(86,123,57,.98)', 'rgba(51,81,43,.72)'],
        ['rgba(113,158,83,.98)', 'rgba(64,111,68,.98)', 'rgba(45,76,52,.72)'],
        ['rgba(164,170,72,.98)', 'rgba(95,119,55,.98)', 'rgba(57,78,42,.72)']
      ],
      soilBands: [
        { a: 0, b: .18, c: 'rgba(189,125,68,.15)' },
        { a: .18, b: .34, c: 'rgba(132,82,48,.15)' },
        { a: .34, b: .53, c: 'rgba(91,56,39,.17)' },
        { a: .53, b: .74, c: 'rgba(48,31,24,.20)' },
        { a: .74, b: 1, c: 'rgba(10,7,6,.28)' }
      ]
    }
  };
})();
