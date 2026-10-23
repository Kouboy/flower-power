// core/config.js — tous les réglages du jeu. Un réglage ne se change qu'ici.
// Lit     : rien.
// Écrit   : rien.
// Expose  : FP.config.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  FP.config = {
    version: '4.5.0',
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
      padding: { authored: 5, signature: 12 },   // v4.1.0 : 5 (v3 : 7), terrain plus dense
      // Bandes de profondeur (fraction entre surface et fond).
      bands: { upper: .26, middle: .58 },
      // Grille de spawn : 5 colonnes, une rangée tous les ~60 px (v3 : 72).
      grid: { cols: 5, rowPx: 60, minRows: 10, marginX: 36, topPad: 58, bottomPad: 126 },
      // Chemin sûr invisible : toujours possible, jamais un boulevard au centre.
      safePath: {
        startPad: 54, endPad: 36, segmentPx: 145, minNodes: 9, edge: 52,
        firstStep: [52, 86], swapChance: .18, swapNodes: [3, 6], spread: [.18, .34],
        baseStep: 58, stepBonusMax: 12, pull: .48, wobble: .42,
        centerDeadzone: 38, centerPush: [42, 72], endJitter: 44,
        // v4.3.0 : la marge du chemin sûr se resserre avec les niveaux (v3 : elle s'élargissait de 25 à 35), jusqu'à presque la tête.
        radiusBase: 25, radiusPerLevel: -1.625, radiusMin: 12
      },
      // Où un solide a le droit de se poser.
      // maxOutside : de combien de px un obstacle peut dépasser du bord gauche/droit (il doit rester identifiable).
      fit: { centerMarginX: 26, centerTop: 48, centerBottom: 118, maxOutside: { authored: 8, signature: 70 }, edgeTop: 34, edgeBottom: 100, safeExtra: 8, safeApproxK: .38 },
      // Densité cible (jamais un quota forcé). .92 = densité du cadrage B.
      skyVariants: 4, lawnVariants: 4, mirrorChance: .5,   // palettes de ciel / pelouse, obstacles retournés
      // v4.1.0 : plus dense dès le premier passage et plus vite (v3 : base 6, perLevel .18, maxExtra 6) ; plafond à la capacité du terrain (≈ 22 obstacles à 440 px).
      solids: { base: 8.5, perLevel: 1.2, maxExtra: 6, scale: .84, framing: .92, worldScaleMax: 2.45, tries: 110, relaxAfter: 34, jitter: .27,
        giveUpAfter: 4,              // 4 obstacles impossibles de suite : le niveau est plein
        sizeJitter: [.88, 1.12] },   // v4.1.0 : chaque obstacle a sa taille (collision comprise)
      // Zones toxiques diffuses : réparties sur les trois tiers de la hauteur, jamais sur le chemin sûr ; un peu plus grosses au fond.
      // v4.2.2 : plus nombreuses et plus grandes, et elles se multiplient vite (v3 : base 3, perLevel .14, maxExtra 4, rx 30-58, ry 23-48).
      toxics: {
        base: 5, perLevel: .6, maxExtra: 7, scale: .70, tries: 80, relaxAfter: 30, jitter: .29,
        rx: [36, 70], ry: [28, 58], bigDepth: .58, bigRx: 1.08, bigRy: 1.10,
        lobes: 6, specks: 7, lightChance: .42, safeK: .62, safeExtra: 4,
        // Forme des nappes : lobes (position et taille relatives au rayon) et taches.
        shape: { lobeR: [.32, .88], lobeSx: [.28, .58], lobeSy: [.22, .52], speckX: .64, speckY: .58, speckR: [1.2, 3.1] },
        minVisible: .5            // part minimale de la nappe dans l'écran (en largeur) : on doit pouvoir l'anticiper
      },
      // Limaces de lixiviat : trajets inclinés, une partie près de la route pour mettre la pression.
      leaks: {
        // v4.1.0 : plus de limaces, plus vite (v3 : base 1, perLevel .10, maxExtra 3).
        base: 2, perLevel: .35, maxExtra: 4, scale: .68, tries: 120, relaxAfter: 32, jitter: .24, minDepth: .22,
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
        { kind: 'trashbag', w: .09, a: .95 }, { kind: 'battery', w: .08, a: .78 },
        { kind: 'scooter', w: .08, a: .9 }                                                      // v4.1.0
      ],
      middle: [
        { kind: 'microwave', w: .09, a: .85 }, { kind: 'extinguisher', w: .08, a: 1.05 },
        { kind: 'cone', w: .08, a: 1.12 }, { kind: 'server', w: .09, a: .72 },
        { kind: 'tire', w: .09, a: 1.55 }, { kind: 'solar', w: .08, a: 1.28 },
        { kind: 'drone', w: .08, a: 1.08 }, { kind: 'trashbag', w: .08, a: .98 },
        { kind: 'battery', w: .07, a: .82 }, { kind: 'sarcophagus', w: .07, a: .62, noFlip: true },
        { kind: 'nuclear', w: .06, a: .68 },
        { kind: 'scooter', w: .07, a: .95 }, { kind: 'arcade', w: .08, a: .7 }                 // v4.1.0
      ],
      deep: [
        { kind: 'microwave', w: .09, a: .95 }, { kind: 'extinguisher', w: .08, a: 1.08 },
        { kind: 'cone', w: .08, a: 1.15 }, { kind: 'tire', w: .10, a: 1.55 },
        { kind: 'server', w: .09, a: .75 }, { kind: 'trashbag', w: .08, a: 1.0 },
        { kind: 'nuclear', w: .08, a: .72 }, { kind: 'sarcophagus', w: .08, a: .65, noFlip: true },
        { kind: 'arcade', w: .09, a: .75 }                                                      // v4.1.0
      ]
    },

    // T-Rex « NON AUX ESSAIS NUCLÉAIRES » : armé dans 38 % des runs, au plus une fois, à partir d'un niveau tiré entre 1 et 4.
    // maxWidthK : le squelette (280 de large) se règle sur l'écran pour laisser passer la tige (62 % de la largeur au plus).
    signature: { chance: .38, minLevel: 1, maxLevel: 4, tries: 110, minDepth: .55, jitter: .10, angle: .18, maxWidthK: .62 },

    // Pousse (v3.43.16, cadrage B : vitesse ×.88). v4.1.0 : accélération par pousse franche (v3 : perStem 2.7, perFlower 1.35),
    // v4.3.0 : départ 120 (v3 : 76), +6 par tige et par fleur, plafond 260 (v3 : 196) : les testeurs trouvaient le jeu trop facile.
    plant: {
      seeds: 3,   // graines de départ (vies)
      seedOffset: 46, startWobble: .07, floorOffset: 22,
      speed: { base: 120, max: 260, perStem: 6, perFlower: 6, livePerSec: 1.45, liveMax: 16, framing: .88, controlled: .985 },
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
    // v4.3.1 : l'exposition suit la distance parcourue dans la nappe (vitesse / refSpeed) : on brûle après ≈ burnAt / exposureRate × refSpeed
    // = 75 px, quelle que soit la vitesse de la tige (sinon, plus rapide, on traversait sans risque). messageCooldown : espace toxicEnter.
    toxic: { exposureRate: .72, recoveryRate: 3.6, burnAt: .82, corruption: .28, messageCooldown: .72, refSpeed: 65.85 },

    // Dangers diffus (v3.43.16).
    hazards: {
      leakRateK: 2.6, leakScaleMax: 2, leakPerStem: .18,   // v4.3.0 : limaces +50 %, accélèrent davantage (v3 : 1.75, 1.45, .12)
      leakPerFlower: .035, leakPerSec: .018,
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
      spawn: { dirCone: 48, idealAhead: 80, aheadRisk: 24, minAhead: 38, surfacePad: 48, aheadSlack: 7,
        nearSurfaceUp: 92, minProjectionNear: 32, minProjection: 58, marginX: 30, top: 42, bottom: 52,
        leadNearSurface: 16, lead: 30, nearSurfaceSpan: 105, solidPad: 13, toxicMax: .10, leakPad: 22, spacing: 58, probeR: 16 },
      spore: { radius: 92, solidK: .55, toxicK: .38, ecoPerSolid: 2000, shakeBase: .22, shakePerSolid: .035 }
    },

    // Bouclier organique : un choc absorbé, puis .48 s de grâce ; la pointe recule de 26 px sur sa trajectoire.
    shield: { grace: .48, back: 26, edge: 14, shake: .16 },

    // Parterre (v3 : bloom, flowerPalette) : 1 + pollen fleurs par éclosion, qui restent tout le run.
    // Circuits de pièces (v4.5.0) : par tranche d'une hauteur d'écran, un chapelet facile (chemin sûr) et un appât (près
    // d'un danger). Tirage propre (graine ^ salt ^ niveau) : jamais state.rng. Pièces de 25 Ɇ, bonus au chapelet complet.
    coins: {
      salt: 0x2c1b3c6d, sliceMargin: 70, easy: { min: 5, max: 7 }, bait: { min: 6, max: 9 }, spacing: 18,
      pickup: 14, radius: 5, missBelow: 40, value: 25, chainBonus: { easy: 150, bait: 400 }, toxicBite: 1 / 3,
      minChain: 4, spinFps: 6, sway: .6, edge: 4
    },

    // Boutique de fin de pousse (v4.6.0) : 3 articles tirés (un à −50 %), achetés au score ; effets sur la pousse suivante.
    // co2 : masse satirique ajoutée à la « livraison » (kg), sans effet en jeu. Tirage propre (graine ^ salt ^ passage).
    shop: {
      salt: 0x5f3759df, promo: .5, lobbyingK: .6, inTime: .25, stampTime: .35, outTime: .3,
      items: [
        { id: 'seed', price: 2500, co2: 8.6 }, { id: 'membrane', price: 700, co2: 3.1 }, { id: 'magnet', price: 500, co2: 4.9 },
        { id: 'premium', price: 600, co2: 2.4 }, { id: 'compost', price: 600, co2: 6.2 }, { id: 'spore', price: 800, co2: 5.5 },
        { id: 'filter', price: 700, co2: 7.3 }, { id: 'beer', price: 600, co2: 3.8 }, { id: 'lobbying', price: 900, co2: 9.8 }
      ],
      transports: ['DRONE', 'PORTE-CONTENEURS', 'JET PRIVÉ', 'SUV ÉLECTRIQUE']
    },

    // Casting des pousses (v4.4.0) : un personnage par pousse, tiré sans remise ; dessins dans render/cast*.js.
    cast: {
      ids: ['hippie', 'lapin', 'cyclope', 'binoclard', 'langue', 'antennes', 'punk', 'pendouille',
        'depareille', 'unedent', 'patate', 'gourou', 'champi', 'coquille', 'gobemouche', 'groucho'],
      salt: 0x9e3779b9   // graine de la pioche = graine de la partie ^ salt : jamais state.rng
    },

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

    // Déroulé de partie. hatchDelay : la motte se fend, puis la fleur sort (render/mound.js).
    flow: {
      dyingTime: .85, bloomTime: 1.55, hatchDelay: .24, hatchShake: .1, fadeOutTime: .46, fadeInTime: .48, oldTrailsMax: 6, trailSimplifyPx: 11, deathShake: .28
    },

    // Textes affichés.
    text: {
      ready: 'TOUCHER POUR POUSSER',
      pressStart: 'PRESS TO START',   // écran d'accueil figé, clin d'œil Mega Drive
      chain: ['KARMA !', 'GREEN !', '0 DÉCHET !'],   // cri du chapelet complet (v4.5.0), tiré au hasard
      // Bon de commande (v4.6.0).
      shop: {
        title: 'BON DE COMMANDE', from: 'ÉCO-BOUTIQUE · N° ', last: 'DERNIÈRE CHANCE !', order: 'COMMANDER', decline: 'NON MERCI',
        giveUp: 'ABANDONNER', delivery: 'LIVRAISON', offset: '(COMPENSÉS)', total: 'TOTAL', stamp: 'VALIDÉ',
        fine: 'PAPIER 100 % RECYCLÉ* *À 3 %',
        names: { seed: 'GRAINE BIO™', membrane: 'MEMBRANE ORGANIQUE', magnet: 'AIMANT À JETONS', premium: 'JETONS PREMIUM',
          compost: 'COMPOST LENT', spore: 'SPORE DE DÉPART', filter: 'FILTRE À CHARBON', beer: 'BIÈRE ANTI-LIMACES', lobbying: 'LOBBYING' },
        lines: { seed: 'une graine de plus', membrane: 'encaisse un choc', magnet: 'ramassage ×2', premium: 'chaque jeton vaut double',
          compost: 'pousse ×0,8', spore: 'ça déblaie', filter: 'les nappes ne brûlent plus', beer: 'elles trinquent ailleurs', lobbying: '-40 % de déchets' }
      },
      // Interface pixel (v4.2.0) : cris de mort hors obstacles, aide de première pousse, relance, pied du titre, certificat.
      shout: { leak: 'LIXIVIAT\u00a0!', toxic: 'BRÛLÉE\u00a0!' },   // espace insécable avant « ! »
      help: { hold: 'MAINTIENS POUR POUSSER', guide: 'GUIDE LA POINTE' },
      again: 'TOUCHER POUR REPOUSSER',
      footer: ['© 2026 ÉCOSOFT™', 'UNE FILIALE DE PÉTROFLORE'],
      certificate: { title: 'CERTIFICAT', subtitle: 'D’ÉCO-RESPONSABILITÉ', flowers: 'FLEURS PLANTÉES', eco: 'ÉCOCRÉDITS™',
        stems: 'TIGES SACRIFIÉES', record: 'RECORD', beaten: 'BATTU', flowersUnit: 'FLEURS', cause: 'CAUSE DU DÉCÈS :', stamp: 'VALIDÉ*', note: '* SOUS RÉSERVE' },
      deathDefault: 'rupture : déchet',
      deathLeak: 'lixiviat vivant : pointe brûlée',
      deathToxic: 'pointe brûlée dans une zone toxique',
      death: {
        server: 'rupture : rack serveur', nuclear: 'rupture : fût irradié', tire: 'rupture : pneu écrasé',
        sarcophagus: 'rupture : cercueil', drone: 'rupture : drone cassé', solar: 'rupture : panneau solaire',
        battery: 'rupture : batterie', cone: 'rupture : cône mou', trashbag: 'rupture : sac gonflé',
        extinguisher: 'rupture : extincteur vide', microwave: 'rupture : micro-ondes', trex_signature: 'rupture : dinosaure militant',
        scooter: 'rupture : trottinette fossile', arcade: 'rupture : borne d’arcade'
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
