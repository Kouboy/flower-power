// assets/lab/circuits.js — les modules de l'Encounter Lab. v5.13.0 : première livraison de 10 modules à silhouette nommable (spec
// docs/superpowers/specs/2026-11-18-modules-premiere-livraison-design.md, fiches docs/lab/modules.md). FP.labLevel.place (src/world/lab.js)
// les pose dans le monde, en miroir un passage réussi sur deux.
// Coordonnées en proportions : x de 0 à 1 sur la largeur du monde, y de 0 (haut du module) à 1 (bas) sur sa hauteur.
// { id, name, idea (l'idée en une ligne), height (écrans, de 0,5 à 1,5), walls: [poly] (béton ; peut toucher les bords du monde),
//   obstacles: [{ kind (Friche), x, y, a?, flip?, scale? }], slugs: [{ x0, y0, x1, y1, r?, period (s), phase? (0..1) }] (aller-retour),
//   toxics: [{ x, y, rx?, ry? }], turrets: [{ x, y, side (-1 : console vers la gauche, 1 : vers la droite), period (s), offset (s) }],
//   soils: [{ kind: 'argile' | 'sable', poly }] (gardés pour plus tard), lanes: [{ x0, x1, y0 (haut), y1 (bas, la buse) }],
//   pulse: null | { lanes, slow?, period? }, coins: [[x, y]] (une traînée), path / alt: trajets de référence de bas en haut (les options du dilemme) }.
// Rythmes comptés depuis l'entrée de la pointe dans le module (play/lab-hazards.js). Passages d'au moins config.lab.channelMin ; tout ce qui
// compte dans la bande sûre (x de .12 à .88 environ). Contrôlés par dev/tests/lab.test.js.
(function () {
  'use strict';
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const SIDES = [rect(0, 0, .1, 1), rect(.9, 0, 1, 1)];   // les flancs : le module ferme les bords du monde
  const base = { obstacles: [], slugs: [], toxics: [], turrets: [], soils: [], lanes: [], pulse: null, coins: [], alt: [] };

  window.FLOWER_POWER_LAB = [
    // 1. La Gueule : deux mâchoires dentelées ; la gorge (dents à frôler, pièces) ou les joues (larges, limaces).
    { ...base, id: 'gueule', name: 'LA GUEULE', idea: 'la gorge dentelée qui paie, ou les joues larges où patrouillent des limaces', height: 1,
      walls: [...SIDES,
        [[.29, .25], [.37, .25], [.37, .33], [.41, .37], [.37, .41], [.37, .53], [.41, .57], [.37, .61], [.37, .75], [.29, .75]],
        [[.71, .25], [.63, .25], [.63, .43], [.59, .47], [.63, .51], [.63, .63], [.59, .67], [.63, .71], [.63, .75], [.71, .75]]],
      slugs: [{ x0: .2, y0: .15, x1: .4, y1: .15, period: 2.8, phase: 0 }, { x0: .8, y0: .15, x1: .6, y1: .15, period: 3.4, phase: .5 }],
      coins: [[.48, .67], [.52, .57], [.48, .47], [.52, .37]],
      path: [[.5, 1], [.5, .8], [.48, .67], [.52, .57], [.48, .47], [.52, .37], [.5, .25], [.5, 0]],
      alt: [[[.5, 1], [.3, .9], [.195, .8], [.195, .2], [.3, .08], [.5, 0]]] },

    // 2. L'Escalier : des marches décalées ; une tourelle en bas tire dans le dos, une autre attend en haut ; chaque marche abrite de l'une ou de l'autre.
    { ...base, id: 'escalier', name: "L'ESCALIER", idea: 'monter entre deux feux, en s’abritant derrière chaque marche', height: 1.3,
      walls: [...SIDES, rect(.1, .74, .56, .8), rect(.44, .54, .9, .6), rect(.1, .34, .56, .4), rect(.44, .14, .9, .2)],
      turrets: [{ x: .83, y: .95, side: 1, period: 3.2, offset: .4 }, { x: .17, y: .03, side: -1, period: 3.2, offset: 2 }],
      coins: [[.66, .7], [.34, .5], [.66, .3], [.34, .1]],
      path: [[.5, 1], [.73, .86], [.73, .7], [.27, .64], [.27, .5], [.73, .44], [.73, .3], [.27, .24], [.27, .1], [.5, 0]],
      alt: [[[.5, 1], [.8, .86], [.8, .71], [.2, .63], [.2, .51], [.8, .43], [.8, .31], [.2, .23], [.2, .1], [.5, 0]]] },

    // 3. Le Peigne : quatre fentes ; à la sortie de chacune, une limace va et vient, à son rythme ; la plus étroite garde les pièces.
    { ...base, id: 'peigne', name: 'LE PEIGNE', idea: 'lire quatre rythmes et choisir sa fente', height: 1,
      walls: [...SIDES, rect(.28, .25, .32, .9), rect(.48, .25, .52, .9), rect(.66, .25, .7, .9)],
      slugs: [{ x0: .19, y0: .03, x1: .19, y1: .2, period: 2.2, phase: 0 }, { x0: .4, y0: .03, x1: .4, y1: .2, period: 2.9, phase: .3 },
        { x0: .59, y0: .03, x1: .59, y1: .2, period: 1.6, phase: .6 }, { x0: .8, y0: .03, x1: .8, y1: .2, period: 3.5, phase: .15 }],
      coins: [[.59, .8], [.59, .7], [.59, .6], [.59, .5], [.59, .4], [.59, .3]],
      path: [[.5, 1], [.2, .94], [.2, .15], [.3, .05], [.5, 0]],
      alt: [[[.5, 1], [.59, .94], [.59, .2], [.5, 0]]] },

    // 4. Le Sablier : large, un goulot, large ; une impulsion monte dans le goulot ; des pièces dans les poches.
    { ...base, id: 'sablier', name: 'LE SABLIER', idea: 'passer le goulot au bon moment, ou flâner dans les poches', height: 1.2,
      walls: [[[0, 0], [.12, 0], [.12, .28], [.42, .43], [.42, .57], [.12, .72], [.12, 1], [0, 1]],
        [[1, 0], [1, 1], [.88, 1], [.88, .72], [.58, .57], [.58, .43], [.88, .28], [.88, 0]]],
      lanes: [{ x0: .42, x1: .58, y0: .1, y1: .64 }], pulse: { lanes: [0], period: 2.6 },
      coins: [[.2, .9], [.18, .82], [.8, .82], [.82, .74], [.2, .2], [.8, .12]],
      path: [[.5, 1], [.5, .64], [.5, .36], [.5, 0]],
      alt: [[[.5, 1], [.2, .88], [.3, .75], [.5, .6], [.5, .4], [.7, .25], [.8, .12], [.5, 0]]] },

    // 5. Le Carrefour : une croix ; des limaces traversent le bras horizontal comme une circulation ; des pièces sur le bras.
    { ...base, id: 'carrefour', name: 'LE CARREFOUR', idea: 'traverser la circulation en rythme, ou dériver sur le bras', height: 1.2,
      walls: [[[0, 0], [.42, 0], [.42, .4], [.12, .4], [.12, .6], [.42, .6], [.42, 1], [0, 1]],
        [[1, 0], [1, 1], [.58, 1], [.58, .6], [.88, .6], [.88, .4], [.58, .4], [.58, 0]]],
      slugs: [{ x0: .2, y0: .46, x1: .8, y1: .46, period: 3, phase: 0 }, { x0: .8, y0: .54, x1: .2, y1: .54, period: 2.4, phase: .25 }],
      coins: [[.22, .5], [.3, .5], [.7, .5], [.78, .5]],
      path: [[.5, 1], [.5, 0]],
      alt: [[[.5, 1], [.5, .7], [.5, .58], [.24, .5], [.5, .42], [.5, 0]]] },

    // 6. Les Dents de scie : des parois en dents décalées, des nappes dans les creux ; coller aux pointes paie.
    { ...base, id: 'dents-de-scie', name: 'LES DENTS DE SCIE', idea: 'onduler entre les dents, au plus près pour les frôlements', height: 1.3,
      walls: [[[0, 0], [.28, 0], [.28, .05], [.42, .12], [.28, .19], [.28, .41], [.42, .48], [.28, .55], [.28, .77], [.42, .84], [.28, .91], [.28, 1], [0, 1]],
        [[1, 0], [1, 1], [.72, 1], [.72, .73], [.58, .66], [.72, .59], [.72, .37], [.58, .3], [.72, .23], [.72, 0]]],
      toxics: [{ x: .33, y: .3, rx: 12, ry: 9 }, { x: .67, y: .48, rx: 12, ry: 9 }, { x: .33, y: .66, rx: 12, ry: 9 }],
      coins: [[.4, .3], [.6, .48], [.4, .66]],
      path: [[.5, 1], [.56, .84], [.44, .66], [.56, .48], [.44, .3], [.56, .12], [.5, 0]],
      alt: [[[.5, 1], [.62, .84], [.4, .66], [.62, .48], [.4, .3], [.62, .12], [.5, 0]]] },

    // 7. Le Tetris : des blocs imbriqués, plusieurs itinéraires ; une tourelle en bas ; des chemins abrités, d'autres courts et à découvert.
    { ...base, id: 'tetris', name: 'LE TETRIS', idea: 'choisir entre l’abri des blocs et le chemin court à découvert', height: 1.4,
      walls: [...SIDES, rect(.1, .72, .4, .78), rect(.32, .58, .4, .78), rect(.6, .62, .9, .68), rect(.5, .4, .64, .5), rect(.1, .26, .36, .32),
        rect(.64, .14, .9, .2), rect(.64, .14, .72, .3)],
      turrets: [{ x: .79, y: .93, side: 1, period: 3.4, offset: 1 }],
      coins: [[.5, .62], [.5, .56], [.52, .3], [.5, .22]],
      path: [[.5, 1], [.5, .56], [.36, .45], [.5, .34], [.5, 0]],
      alt: [[[.5, 1], [.5, .74], [.5, .58], [.75, .52], [.76, .4], [.56, .34], [.5, .24], [.5, 0]]] },

    // 8. La Tour de guet : deux tourelles en bas, en alternance, des piliers pour s'abriter ; le centre rapporte, les bords protègent.
    { ...base, id: 'tour-de-guet', name: 'LA TOUR DE GUET', idea: 'traverser la chambre sous deux feux, de pilier en pilier', height: 1,
      walls: [[[0, 0], [.4, 0], [.4, .06], [.1, .06], [.1, .97], [.4, .97], [.4, 1], [0, 1]], [[1, 0], [1, 1], [.6, 1], [.6, .97], [.9, .97], [.9, .06], [.6, .06], [.6, 0]],
        rect(.27, .44, .35, .6), rect(.65, .44, .73, .6), rect(.46, .22, .54, .32)],
      turrets: [{ x: .21, y: .9, side: -1, period: 3.2, offset: .6 }, { x: .79, y: .9, side: 1, period: 3.2, offset: 2.2 }],
      coins: [[.5, .74], [.5, .64], [.5, .52], [.5, .42]],
      path: [[.5, 1], [.5, .44], [.34, .36], [.34, .2], [.5, .12], [.5, 0]],
      alt: [[[.5, 1], [.4, .84], [.19, .7], [.19, .38], [.38, .18], [.5, .1], [.5, 0]]] },

    // 9. La Herse : une rangée de piliers ; une nappe dans un créneau ; des limaces qui patrouillent derrière.
    { ...base, id: 'herse', name: 'LA HERSE', idea: 'choisir son créneau, puis improviser derrière', height: 1,
      walls: [[[0, 0], [.13, 0], [.13, 1], [0, 1]], [[1, 0], [1, 1], [.87, 1], [.87, 0]],
        rect(.2775, .58, .3275, .7), rect(.475, .58, .525, .7), rect(.6725, .58, .7225, .7)],
      toxics: [{ x: .4, y: .64, rx: 14, ry: 10 }],
      slugs: [{ x0: .2, y0: .4, x1: .8, y1: .4, period: 3.4, phase: 0 }, { x0: .8, y0: .2, x1: .2, y1: .2, period: 2.6, phase: .25 }],
      coins: [[.6, .64], [.6, .5], [.6, .32]],
      path: [[.5, 1], [.6, .8], [.6, .5], [.5, .3], [.5, 0]],
      alt: [[[.5, 1], [.2, .8], [.2, .5], [.3, .3], [.5, 0]]] },

    // 10. Le Grand Huit : deux boucles en S ; une impulsion remonte la corde intérieure ; l'extérieur est long et sûr.
    { ...base, id: 'grand-huit', name: 'LE GRAND HUIT', idea: 'la corde courte sous l’impulsion, ou les deux grandes boucles', height: 1.4,
      walls: [...SIDES, rect(.26, .53, .42, .92), rect(.58, .08, .74, .47)],
      lanes: [{ x0: .42, x1: .58, y0: .04, y1: .96 }], pulse: { lanes: [0], period: 2.8 },
      coins: [[.18, .8], [.18, .66], [.5, .5], [.82, .34], [.82, .2]],
      path: [[.5, 1], [.5, 0]],
      alt: [[[.5, 1], [.18, .96], [.18, .5], [.82, .5], [.82, .04], [.5, 0]]] }
  ];
})();
