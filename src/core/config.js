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
      padding: { authored: 7, signature: 12 },
      // Bandes de profondeur (fraction entre surface et fond).
      bands: { upper: .26, middle: .58 },
      // Grille de spawn : 5 colonnes, une rangée tous les ~72 px.
      grid: { cols: 5, rowPx: 72, minRows: 10, marginX: 36, topPad: 58, bottomPad: 126 },
      // Chemin sûr invisible : toujours possible, jamais un boulevard au centre.
      safePath: {
        startPad: 54, endPad: 36, segmentPx: 145, minNodes: 9, edge: 52,
        firstStep: [52, 86], swapChance: .18, swapNodes: [3, 6], spread: [.18, .34],
        baseStep: 58, stepBonusMax: 12, pull: .48, wobble: .42,
        centerDeadzone: 38, centerPush: [42, 72], endJitter: 44,
        radiusBase: 25, radiusPerLevel: 1.25, radiusMax: 10
      },
      // Où un solide a le droit de se poser.
      fit: { centerMarginX: 26, centerTop: 48, centerBottom: 118, edgeX: 18, edgeTop: 34, edgeBottom: 100, safeExtra: 8, safeApproxK: .38 },
      // Densité cible (jamais un quota forcé). .92 = densité du cadrage B.
      solids: { base: 6, perLevel: .18, maxExtra: 6, scale: .84, framing: .92, worldScaleMax: 2.45, tries: 110, relaxAfter: 34, jitter: .27 }
    },

    // Tables d'apparition par bande : poids v3 (largeur de tranche), angle ±a (radians), noFlip si jamais retourné.
    spawnTables: {
      upper: [
        { kind: 'cone', w: .07, a: 1.05 }, { kind: 'extinguisher', w: .08, a: .95 },
        { kind: 'solar', w: .10, a: 1.22 }, { kind: 'drone', w: .10, a: 1.05 },
        { kind: 'trashbag', w: .09, a: .95 }, { kind: 'battery', w: .08, a: .78 }
      ],
      middle: [
        { kind: 'microwave', w: .09, a: .85 }, { kind: 'extinguisher', w: .08, a: 1.05 },
        { kind: 'cone', w: .08, a: 1.12 }, { kind: 'server', w: .09, a: .72 },
        { kind: 'tire', w: .09, a: 1.55 }, { kind: 'solar', w: .08, a: 1.28 },
        { kind: 'drone', w: .08, a: 1.08 }, { kind: 'trashbag', w: .08, a: .98 },
        { kind: 'battery', w: .07, a: .82 }, { kind: 'sarcophagus', w: .07, a: .62, noFlip: true },
        { kind: 'nuclear', w: .06, a: .68 }
      ],
      deep: [
        { kind: 'microwave', w: .09, a: .95 }, { kind: 'extinguisher', w: .08, a: 1.08 },
        { kind: 'cone', w: .08, a: 1.15 }, { kind: 'tire', w: .10, a: 1.55 },
        { kind: 'server', w: .09, a: .75 }, { kind: 'trashbag', w: .08, a: 1.0 },
        { kind: 'nuclear', w: .08, a: .72 }, { kind: 'sarcophagus', w: .08, a: .65, noFlip: true }
      ]
    },

    // T-Rex « NON AUX ESSAIS NUCLÉAIRES » : armé dans 38 % des runs, au plus une fois, à partir d'un niveau tiré entre 1 et 4.
    signature: { chance: .38, minLevel: 1, maxLevel: 4, tries: 110, minDepth: .55, jitter: .10, angle: .18 },

    // Caméra : suit la pointe à 52 % de la hauteur ; descend plus vite qu'elle ne monte.
    camera: { followRatio: .52, rateDown: 7.8, rateUp: 5.4 },

    loop: {
      maxDt: .033,      // plafond par frame (onglet revenu d'arrière-plan)
      fallbackDt: .016  // dt invalide (NaN, négatif, nul)
    },

    // Rendu du sol : la lisière d'herbe est dessinée 11 px sous surfaceY ; marge de tranche visible.
    soil: { surfaceOffset: 11, viewPad: 70 },

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
