// core/config.js — tous les réglages du jeu. Un réglage ne se change qu'ici.
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.config.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  FP.config = {
    version: '4.1.0',
    storageKey: 'flower_power_v4_best',

    view: {
      aspect: 9 / 16,
      dprMax: 1.15,
      minW: 300,
      minH: 520,
      // Hauteur du ciel : H * surfaceRatio, bornée. v4.1.0 : plus haut que la v3 (.136, 82–116)
      // pour que le ciel du crépuscule reste visible sous le cadrage ×1,18.
      surfaceRatio: .19,
      surfaceMin: 100,
      surfaceMax: 160
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
      // maxOutside : de combien de px un obstacle peut dépasser du bord gauche/droit (il doit rester identifiable).
      fit: { centerMarginX: 26, centerTop: 48, centerBottom: 118, maxOutside: { authored: 8, signature: 70 }, edgeTop: 34, edgeBottom: 100, safeExtra: 8, safeApproxK: .38 },
      // Densité cible (jamais un quota forcé). .92 = densité du cadrage B.
      skyVariants: 4, lawnVariants: 4, mirrorChance: .5,   // palettes de ciel / pelouse, obstacles retournés
      solids: { base: 6, perLevel: .18, maxExtra: 6, scale: .84, framing: .92, worldScaleMax: 2.45, tries: 110, relaxAfter: 34, jitter: .27 },
      // Zones toxiques diffuses : plutôt en profondeur, jamais sur le chemin sûr.
      toxics: {
        base: 3, perLevel: .14, maxExtra: 4, scale: .70, tries: 80, relaxAfter: 30, jitter: .29,
        deepDepth: .48, shallowDepth: .30, rx: [30, 58], ry: [23, 48], bigDepth: .58, bigRx: 1.08, bigRy: 1.10,
        lobes: 6, specks: 7, lightChance: .42, safeK: .62, safeExtra: 4,
        // Forme des nappes : lobes (position et taille relatives au rayon) et taches.
        shape: { lobeR: [.32, .88], lobeSx: [.28, .58], lobeSy: [.22, .52], speckX: .64, speckY: .58, speckR: [1.2, 3.1] },
        minVisible: .5            // part minimale de la nappe dans l'écran (en largeur) : on doit pouvoir l'anticiper
      },
      // Limaces de lixiviat : trajets inclinés, une partie près de la route pour mettre la pression.
      leaks: {
        base: 1, perLevel: .10, maxExtra: 3, scale: .68, tries: 120, relaxAfter: 32, jitter: .24, minDepth: .22,
        nearRouteChance: .46, routeTop: 86, routeBottom: 142, routeOffset: [22, 62], routeMarginX: 42,
        angledChance: .90, angleJitter: .24, len: [42, 176], lenPerLevel: 3.2, lenLevelMax: 54, lenDepth: 22,
        rate: [.24, .92], r: [11, 16.2], marginX: 24, top: 48, bottom: 116,
        solidPad: 20, toxicPad: 8, spacingCenter: 46, spacingPath: 28, safeK: .58,
        // Angles inclinés (en fractions de π) et allures des limaces.
        shape: { angles: [1 / 8, 1 / 5, 1 / 3, 2 / 5, 3 / 5, 2 / 3, 4 / 5, 7 / 8], morphs: ['clear', 'fat', 'debris'] },
        minVisible: .5            // part minimale du trajet dans l'écran ; le centre du trajet reste dans [marginX, W − marginX]
      }
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

    // Pousse (v3.43.16, cadrage B : vitesse ×.88).
    plant: {
      seedOffset: 46, startWobble: .07, floorOffset: 22,
      speed: { base: 76, max: 196, perStem: 2.7, perFlower: 1.35, livePerSec: 1.45, liveMax: 16, framing: .88, controlled: .985 },
      swayFreq: 1.25, swayDepth: .018, swayAmp: .035,
      control: { lookAheadTop: 185, lookAheadBottom: 92, guideRate: 10, turnDivisor: 138, turnGain: 1.18, sharpTop: .88, sharpBottom: 1.28, desiredY: -.78 },
      idleGuideRate: 4, idleLookAhead: 140,
      maxAngleControlled: 89, maxAngleIdle: 42, steerControlled: 13.8, steerIdle: 5.4,
      edge: 12, bounceZone: 14, bounce: -.48, bounceShake: .035,
      trailStep: 8.6, trailMax: 340,
      // Battement de croissance (grattement + débris) : plus serré quand la tige va vite, plus rare près de la surface.
      tick: { slow: .095, fast: .052, speedRef: 190, nearDist: 150, nearMul: 1.42, jitterMin: .72, jitterMax: 1.28 },
      // Croissance déviée dans la terre contaminée : la tige se tord dans la main, sans demi-tour.
      corrupted: { swayFreq: 12, swayDepth: .042, swayAmp: .70, swayFreq2: 6.6, swayAmp2: .22, lift: .24, minUp: -.13, maxAngle: 74, steerControlled: 9.2, steerIdle: 4.6, speed: .90 }
    },

    // Exposition toxique : ~1,14 s dans une nappe brûle la pointe ; on récupère 5× plus vite.
    toxic: { exposureRate: .72, recoveryRate: 3.6, burnAt: .82, corruption: .28, messageTime: .82, messageCooldown: .72 },

    // Dangers diffus (v3.43.16).
    hazards: {
      leakRateK: 1.75, leakScaleMax: 1.45, leakPerStem: .12, leakPerFlower: .035, leakPerSec: .018,
      leakWobbleFreq: 5, leakWobble: 2, leakHitPad: 6, leakHitGain: 2.4,
      leakGrazeInner: 7, leakGrazeOuter: 38, leakDangerMax: .98, hitFlash: .18,
      toxicFalloff: .48, toxicMin: .18
    },

    // Frôlement (v3.43.16) : rien avant .22 s, puis le score monte avec la proximité ; payé à la sortie.
    graze: {
      minTime: .22, minScore: 55, minAward: 75, smooth: .35,
      base: 130, hotExp: 2.15, hotGain: 1980, closeExp: 2.4, closeGain: 95,
      holdPerSec: 120, holdMax: 900, peakExp: 2.2, peakGain: 360, step: 25, effBase: .45, effGain: .55,
      premium: { trex_signature: 1.18, nuclear: 1.18 }, leakMul: 1.12, leakFlashBase: .08, leakFlashGain: .18,
      broadPad: 10, minIntensity: .02   // phase large de la requête de pointe ; en dessous, pas de frôlement
    },

    // ÉcoCrédits™ : arrondis à 25, combo ×(1 + .22 par cran) si les gains s'enchaînent en moins de 2 s.
    scoring: { comboWindow: 2, comboMax: 8, comboGain: .22, step: 25, minAmount: 25, shakeBase: .035, shakePerCombo: .006, shakeMax: .06, flatShakeBase: .07, flatShakeMax: .08, flatShakeDiv: 18000 },

    // Flyover (v3.42) : contourner un obstacle en montant, de près et longtemps.
    flyover: {
      minH: 36, advanceK: .27, advanceMin: 17, advanceMax: 42,
      belowK: .10, belowMin: 6, belowMax: 16, aboveK: .08, aboveMin: 6, aboveMax: 14,
      progressK: .62, progressMin: 28, effOffset: .20, effSpan: .95,
      proxAvg: .62, proxPeak: .38, riskDuration: .47, riskProximity: .36, riskProgress: .17,
      minTime: .27, minPeak: .20, minProgress: .42, minRisk: .40, minEffective: .30,
      reportMinTime: .24,   // ?flydebug=1 : un frôlement plus court n'est pas un essai de flyover
      spore: { time: .82, risk: .66 }, water: { time: .52, risk: .48 }
    },

    // Récompenses de flyover (v3.42) : naissance devant la pointe, ramassage, spore.
    powerups: {
      formMax: .48, radius: { pollen: 13, water: 15, spore: 16 }, pickupPad: 9, missedBehind: 155, maxAge: 9.5,
      messageTime: { flyover: .95, water: 1.15, pollen: 1.05, sporeCleaned: 1.35, sporeEmpty: 1.18 },
      spawn: { dirCone: 48, idealAhead: 80, aheadRisk: 24, minAhead: 38, surfacePad: 48, aheadSlack: 7,
        nearSurfaceUp: 92, minProjectionNear: 32, minProjection: 58, marginX: 30, top: 42, bottom: 52,
        leadNearSurface: 16, lead: 30, nearSurfaceSpan: 105, solidPad: 13, toxicMax: .10, leakPad: 22, spacing: 58, probeR: 16 },
      spore: { radius: 92, solidK: .55, toxicK: .38, ecoPerSolid: 2000, shakeBase: .22, shakePerSolid: .035 }
    },

    // Bouclier organique : un choc absorbé, puis .48 s de grâce ; la pointe recule de 26 px sur sa trajectoire.
    shield: { grace: .48, back: 26, edge: 14, shake: .16, messageTime: .92 },

    // Parterre (v3 : bloom, flowerPalette) : 1 + pollen fleurs par éclosion, qui restent tout le run.
    garden: {
      spreadBase: 14, spreadPerBonus: 10, spreadMax: 54, jitter: 4, edge: 18, extraSize: [.78, .96], tilt: .22,
      growRate: 2.5, bakedAge: 1.05, bakedSize: .94,
      palettes: [
        ['#ff6ea8', '#ffd166', '#fff7ad', '#7cffc4'],
        ['#72d6ff', '#b28dff', '#fff0a6', '#ff9f7a'],
        ['#ff5f57', '#ffa94d', '#ffe66d', '#b8ff7a'],
        ['#f8a5ff', '#ffdf7e', '#9bf6ff', '#caffbf'],
        ['#ffd1dc', '#fefae0', '#a8dadc', '#95d5b2']
      ]
    },

    // Déroulé de partie.
    flow: {
      dyingTime: .85, bloomTime: 1.55, fadeOutTime: .46, fadeInTime: .48, oldTrailsMax: 6, trailSimplifyPx: 11, deathShake: .28,
      stemMessageTime: 1.35, deathMessageTime: 1.25, readyMessageTime: 2.2
    },

    // Textes affichés.
    text: {
      ready: 'TOUCHE POUR POUSSER',
      elanStep: 3,   // HUD : « élan » gagne 3 % par tige (affichage de la v3)
      spore: { cleaned: 'SPORE : {n} DÉPÔT{s} NETTOYÉ{s}', empty: 'SPORE : ZONE NETTOYÉE' },
      stem: 'POUSSE ',
      seedsLeft: ' · graines restantes : ',
      deathDefault: 'rupture : déchet',
      deathLeak: 'lixiviat vivant : pointe brûlée',
      deathToxic: 'pointe brûlée dans une zone toxique',
      toxicEnter: 'ZONE TOXIQUE : CROISSANCE DÉVIÉE',
      corrupted: 'croissance déviée',
      flyover: { pollen: 'FLYOVER : POLLEN LIBÉRÉ', water: 'FLYOVER : GOUTTE LIBÉRÉE', spore: 'FLYOVER RISQUÉ : SPORE LIBÉRÉE' },
      pickup: { pollen: 'POLLEN RARE : +1 FLEUR', water: 'GOUTTE D’EAU : BOUCLIER ORGANIQUE' },
      shieldBroken: 'BOUCLIER ORGANIQUE : MEMBRANE ROMPUE',
      shield: 'bouclier organique',
      death: {
        server: 'rupture : rack serveur', nuclear: 'rupture : fût irradié', tire: 'rupture : pneu écrasé',
        sarcophagus: 'rupture : cercueil', drone: 'rupture : drone cassé', solar: 'rupture : panneau solaire',
        battery: 'rupture : batterie', cone: 'rupture : cône mou', trashbag: 'rupture : sac gonflé',
        extinguisher: 'rupture : extincteur vide', microwave: 'rupture : micro-ondes', trex_signature: 'rupture : crâne enfoui'
      }
    },

    // Caméra : suit la pointe à 52 % de la hauteur. rateDown s'applique quand la caméra remonte vers la surface
    // (cible au-dessus), rateUp quand elle redescend. framing = cadrage B ×1,18 ; zoom de frôlement jusqu'à +22 %.
    camera: {
      followRatio: .52, rateDown: 7.8, rateUp: 5.4,
      framing: 1.18, grazeZoom: .22, nearIn: 26, nearOut: 18, zoomCurve: 1.55, zoomIn: 30, zoomOut: 22,
      // Point focal du zoom, borné dans la partie centrale de l'écran ; en dessous de zoomEpsilon, pas de zoom.
      focalX: { min: .22, max: .78 }, focalY: { min: .20, max: .78 }, zoomEpsilon: 1.002
    },

    loop: {
      maxDt: .033,      // plafond par frame (onglet revenu d'arrière-plan)
      fallbackDt: .016  // dt invalide (NaN, négatif, nul)
    },

    // Rendu du sol : la lisière d'herbe est dessinée 11 px sous surfaceY ; marge de tranche visible.
    soil: { surfaceOffset: 11, viewPad: 70 }
  };
})();
