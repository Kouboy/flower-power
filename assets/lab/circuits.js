// assets/lab/circuits.js — les 6 micro-circuits de l'Encounter Lab (v5.12.0), composés à la main (spec
// docs/superpowers/specs/2026-11-16-encounter-lab-design.md). FP.labLevel.place (src/world/lab.js) les pose dans le monde.
// Coordonnées en proportions : x de 0 à 1 sur la largeur du monde, y de 0 (haut du circuit) à 1 (bas) sur sa hauteur.
// { id, name, height (écrans, de 0,5 à 1,5), walls: [poly] (masses de béton ; elles peuvent toucher les bords du monde),
//   soils: [{ kind: 'argile' | 'sable', poly }], lanes: [{ x0, x1, y0 (haut), y1 (bas, la buse) }] (voies d'impulsion),
//   pulse: null | { lanes: [indices de voies], slow? (×, défaut 1), period? (s, sinon config.lab.pulse.period) }, coins: [[x, y]] (une traînée),
//   path: [[x, y]] (trajet de référence, de bas en haut), alt: [[[x, y]]] (autres trajets : branches d'une fourche) }.
// Passages d'au moins config.lab.channelMin (48 px à 360 de large, × W / 360) ; tout ce qui compte (passages, sols, voies, pièces) dans la
// bande sûre (x de .12 à .88) ; une idée dominante par circuit, une entrée et une sortie lisibles. Contrôlés par dev/tests/lab.test.js.
(function () {
  'use strict';
  // Slalom (1 et 2) : une chicane en S de .22 de large ; centres du couloir de bas en haut.
  const S = [[.5, 1], [.5, .9], [.33, .7], [.33, .6], [.67, .4], [.67, .3], [.5, .1], [.5, 0]];
  const slalomWalls = [
    [[0, 0], ...S.map(([x, y]) => [x - .11, y]).reverse(), [0, 1]].reverse(),
    [[1, 0], [1, 1], ...S.map(([x, y]) => [x + .11, y])]
  ];
  const slalomPath = S.map(([x, y]) => [x, y]);

  window.FLOWER_POWER_LAB = [
    { id: 'slalom', name: 'SLALOM', height: 1, walls: slalomWalls, soils: [], lanes: [], pulse: null, coins: [], path: slalomPath, alt: [] },

    // Même tracé ; l'argile aux deux virages ralentit le braquage : il faut préparer les courbes plus tôt.
    { id: 'slalom-argile', name: 'SLALOM ARGILE', height: 1, walls: slalomWalls,
      soils: [{ kind: 'argile', poly: [[.2, .56], [.46, .56], [.46, .78], [.2, .78]] }, { kind: 'argile', poly: [[.54, .24], [.8, .24], [.8, .46], [.54, .46]] }],
      lanes: [], pulse: null, coins: [], path: slalomPath, alt: [] },

    // La rigole : un couloir de sable rapide et nerveux (.36 de large), deux bosses de béton à contourner, en alternance.
    { id: 'rigole', name: 'LA RIGOLE', height: 1.2,
      walls: [[[0, 0], [.32, 0], [.32, .64], [.46, .67], [.46, .73], [.32, .76], [.32, 1], [0, 1]],
        [[1, 0], [1, 1], [.68, 1], [.68, .46], [.54, .43], [.54, .37], [.68, .34], [.68, 0]]],
      soils: [{ kind: 'sable', poly: [[.32, .04], [.68, .04], [.68, .96], [.32, .96]] }],
      lanes: [], pulse: null, coins: [[.6, .84], [.59, .78], [.58, .72], [.57, .66], [.44, .3], [.43, .24], [.43, .18]],
      path: [[.5, 1], [.58, .82], [.58, .6], [.42, .48], [.42, .26], [.5, .1], [.5, 0]], alt: [] },

    // La fourche : à gauche, courte et étroite, en argile ; à droite, longue (deux chicanes), en sable, avec une traînée de pièces.
    { id: 'fourche', name: 'LA FOURCHE', height: 1.3,
      walls: [[[0, 0], [.4, 0], [.4, .12], [.14, .28], [.14, .76], [.4, .92], [.4, 1], [0, 1]],
        [[1, 0], [1, 1], [.6, 1], [.6, .92], [.86, .76], [.86, .28], [.6, .12], [.6, 0]],
        [[.3, .34], [.38, .26], [.46, .34], [.46, .6], [.6, .6], [.6, .66], [.46, .66], [.46, .7], [.4, .74], [.3, .66]],
        [[.86, .4], [.86, .46], [.7, .46], [.7, .4]]],
      soils: [{ kind: 'argile', poly: [[.14, .32], [.3, .32], [.3, .7], [.14, .7]] }, { kind: 'sable', poly: [[.46, .28], [.86, .28], [.86, .76], [.46, .76]] }],
      lanes: [], pulse: null, coins: [[.66, .7], [.73, .62], [.78, .55], [.62, .5], [.57, .43], [.6, .35]],
      path: [[.5, 1], [.5, .9], [.7, .78], [.74, .6], [.76, .52], [.58, .5], [.58, .36], [.5, .2], [.5, 0]],
      alt: [[[.5, 1], [.5, .9], [.3, .78], [.22, .66], [.22, .34], [.31, .24], [.46, .15], [.5, .06], [.5, 0]]] },

    // La cheminée (v5.12.2) : deux voies séparées par une cloison en pointillés (un passage à moins d'une seconde de montée) ; une buse au
    // pied de chaque voie, bouffées en alternance : on change de voie au passage suivant.
    { id: 'cheminee', name: 'LA CHEMINÉE', height: 1.2,
      walls: [[[0, 0], [.28, 0], [.28, 1], [0, 1]], [[1, 0], [1, 1], [.72, 1], [.72, 0]],
        [[.48, .03], [.52, .03], [.52, .055], [.48, .055]], [[.48, .13], [.52, .13], [.52, .155], [.48, .155]], [[.48, .23], [.52, .23], [.52, .255], [.48, .255]], [[.48, .33], [.52, .33], [.52, .355], [.48, .355]], [[.48, .43], [.52, .43], [.52, .455], [.48, .455]], [[.48, .53], [.52, .53], [.52, .555], [.48, .555]], [[.48, .63], [.52, .63], [.52, .655], [.48, .655]], [[.48, .73], [.52, .73], [.52, .755], [.48, .755]], [[.48, .83], [.52, .83], [.52, .855], [.48, .855]], [[.48, .93], [.52, .93], [.52, .955], [.48, .955]]],
      soils: [], lanes: [{ x0: .28, x1: .48, y0: 0, y1: .96 }, { x0: .52, x1: .72, y0: 0, y1: .96 }],
      pulse: { lanes: [0, 1] }, coins: [],
      path: [[.38, 1], [.38, .81], [.62, .775], [.62, .41], [.38, .375], [.38, 0]], alt: [] },

    // Le combiné : un entonnoir qui débouche sur une fourche ; à gauche l'argile et l'impulsion (plus lente), à droite le sable et les pièces.
    { id: 'combine', name: 'LE COMBINÉ', height: 1.5,
      walls: [[[0, 0], [.4, 0], [.4, .08], [.14, .2], [.14, .6], [.4, .68], [.4, .76], [.18, 1], [0, 1]],
        [[1, 0], [1, 1], [.82, 1], [.6, .76], [.6, .68], [.86, .6], [.86, .2], [.6, .08], [.6, 0]],
        [[.36, .24], [.43, .2], [.5, .24], [.5, .56], [.43, .6], [.36, .56]]],
      soils: [{ kind: 'argile', poly: [[.14, .22], [.36, .22], [.36, .58], [.14, .58]] }, { kind: 'sable', poly: [[.5, .22], [.86, .22], [.86, .58], [.5, .58]] }],
      lanes: [{ x0: .14, x1: .36, y0: .1, y1: .6 }], pulse: { lanes: [0], slow: .7, period: 6 },
      coins: [[.6, .56], [.7, .5], [.76, .44], [.76, .38], [.7, .32], [.62, .26]],
      path: [[.5, 1], [.5, .8], [.5, .66], [.68, .54], [.68, .26], [.5, .12], [.5, 0]],
      alt: [[[.5, 1], [.5, .8], [.5, .66], [.3, .6], [.24, .5], [.24, .26], [.5, .1], [.5, 0]]] }
  ];
})();
