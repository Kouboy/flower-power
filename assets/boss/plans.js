// assets/boss/plans.js — plans des quatre boss (v5.1.0), composés à la main : pièces, salles, trajets de référence, nappes.
// Coordonnées en proportions : x de 0 à 1 sur la largeur du monde, y de 0 à 1 sur la zone du boss (0 = haut, de surfaceY + config.boss.top
// à height - config.boss.bottom). FP.bossPlan.toWorld (src/world/boss-plan.js) les pose dans le monde.
// pieces : { id, role: 'wall' | 'target' | 'head' | 'plate' | 'turret', poly, plate? (cible → id de sa plaque sur la tête) } ;
// rooms  : { id, rect: [x0, y0, x1, y1] (où agissent les menaces), defense, turrets } ;
// paths  : un trajet par cible et un vers la tête ('head') ; la graine (sous la zone) est ajoutée devant par toWorld ;
// toxics : centres des nappes.
// Composés sur un monde de 360 px de large : canaux d'au moins config.boss.ramp[milieu].channelMin (52 px au boss 1 … 44 au boss 4 ; le plus
// serré de chaque plan l'approche à 4 px près, retours de playtest), trajets toujours montants, en pente plutôt
// qu'à plat ; salles larges, tourelles sur leurs parois ; rien au-dessus de la tête jusqu'à la surface.
// Revue finale : le plafond est fermé d'un bord à l'autre, la tête comprise (un ergot de chaque paroi mord dans la tête, sous son
// sommet) ; chaque plaque est adossée à une paroi : tombée, elle ne laisse qu'une niche. On n'entre dans une salle que par une
// ouverture centrée sur son milieu (au plus 0,18 de large de chaque côté) : la tige y a le temps de passer dans l'autre moitié
// avant le coup de la défense. Contrôlés par dev/tests/bossplan.test.js (remplissage) et bossfight.test.js (esquive).
window.FLOWER_POWER_BOSS_PLANS = {
  // Bétonneuse (friche) : muraille à mi-hauteur percée de trois meurtrières (large, sinueuse, étroite), une vanne au débouché de
  // chacune dans la galerie ; un parapet ferme la galerie, sauf une ouverture vers la salle sous la toupie.
  friche: {
    form: 'muraille',
    pieces: [
      { id: 'mur-g', role: 'wall', poly: [[0, .451], [.039, .451], [.039, .608], [0, .608]] },   // muraille : bord gauche
      { id: 'mur-1', role: 'wall', poly: [[.306, .451], [.4, .451], [.367, .469], [.45, .521], [.367, .573], [.4, .608], [.306, .608]] },   // muraille : entre la meurtrière large et la sinueuse
      { id: 'mur-2', role: 'wall', poly: [[.656, .451], [.78, .451], [.78, .608], [.656, .608], [.622, .573], [.706, .521], [.622, .469]] },   // muraille : entre la sinueuse et l'étroite
      { id: 'mur-d', role: 'wall', poly: [[.942, .451], [1, .451], [1, .608], [.942, .608]] },   // muraille : bord droit
      { id: 'parapet-g', role: 'wall', poly: [[0, .26], [.348, .26], [.348, .3], [0, .3]] },   // parapet au-dessus de la galerie, à gauche de l'ouverture
      { id: 'parapet-d', role: 'wall', poly: [[.708, .26], [1, .26], [1, .3], [.708, .3]] },   // parapet, à droite de l'ouverture
      { id: 'plafond-g', role: 'wall', poly: [[0, 0], [.359, 0], [.359, .025], [.392, .025], [.392, .06], [.355, .06], [.355, .03], [0, .03]] },   // plafond gauche, ergot dans la toupie
      { id: 'plafond-d', role: 'wall', poly: [[1, 0], [.641, 0], [.641, .025], [.608, .025], [.608, .06], [.645, .06], [.645, .03], [1, .03]] },   // plafond droit, ergot dans la toupie
      { id: 'vanne-large', role: 'target', plate: 'plaque-g', poly: [[.117, .352], [.228, .352], [.228, .382], [.117, .382]] },   // vanne au-dessus de la meurtrière large
      { id: 'vanne-sinueuse', role: 'target', plate: 'plaque-h', poly: [[.615, .352], [.72, .352], [.72, .382], [.615, .382]] },   // vanne au débouché de la meurtrière sinueuse, à côté de l'ouverture
      { id: 'vanne-etroite', role: 'target', plate: 'plaque-d', poly: [[.806, .352], [.917, .352], [.917, .382], [.806, .382]] },   // vanne au-dessus de la meurtrière étroite
      { id: 'toupie', role: 'head', poly: [[.417, .017], [.583, .017], [.639, .035], [.639, .069], [.583, .087], [.417, .087], [.361, .069], [.361, .035]] },   // la toupie (tête), sous la surface
      { id: 'plaque-g', role: 'plate', poly: [[.278, .03], [.361, .03], [.361, .082], [.278, .082]] },   // blindage gauche de la toupie, sous le plafond
      { id: 'plaque-h', role: 'plate', poly: [[.403, .004], [.597, .004], [.597, .017], [.403, .017]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.639, .03], [.722, .03], [.722, .082], [.639, .082]] }    // blindage droit, sous le plafond
    ],
    rooms: [
      // la galerie des vannes, défendue en trois sections, chacune centrée sur le débouché de sa meurtrière (une seule salle d'un bord à
      // l'autre ne s'esquivait pas depuis les meurtrières des bords : la moitié épargnée était trop loin)
      { id: 'galerie-g', rect: [.056, .3, .348, .4], defense: 'beton', turrets: [] },
      { id: 'galerie-c', rect: [.348, .3, .708, .4], defense: 'beton', turrets: [] },
      { id: 'galerie-d', rect: [.708, .3, 1, .4], defense: 'beton', turrets: [] },
      { id: 'salle', rect: [.056, .13, 1, .26], defense: 'beton', turrets: [] }   // milieu à .528, celui de l'ouverture du parapet
    ],
    paths: {
      'vanne-large': [[.5, 1.042], [.172, .903], [.172, .608], [.172, .38]],
      'vanne-sinueuse': [[.5, .66], [.528, .608], [.494, .573], [.578, .521], [.494, .469], [.528, .451], [.62, .42], [.665, .37]],
      'vanne-etroite': [[.5, 1.042], [.861, .894], [.861, .608], [.861, .38]],
      head: [[.5, .66], [.528, .608], [.494, .573], [.578, .521], [.494, .469], [.528, .451], [.528, .3], [.528, .2], [.5, .085]]
    },
    toxics: [[.153, .998], [.847, .998]]
  },
  // Raffinerie (industrie) : colosse traversé ; tuyau principal qui s'évase en deux chambres, trois embranchements vers les cuves,
  // torchère au sommet sous le plafond.
  industrie: {
    form: 'colosse',
    pieces: [
      { id: 'pied-g', role: 'wall', poly: [[0, .781], [.345, .781], [.425, .86], [.425, .955], [0, .955]] },   // pied du colosse, à gauche du tuyau qui s'évase
      { id: 'pied-d', role: 'wall', poly: [[1, .781], [.655, .781], [.575, .86], [.575, .955], [1, .955]] },   // pied du colosse, à droite du tuyau
      { id: 'flanc-g', role: 'wall', poly: [[0, .434], [.056, .434], [.056, .781], [0, .781]] },   // flanc gauche de la chambre basse
      { id: 'flanc-d', role: 'wall', poly: [[.944, .434], [1, .434], [1, .781], [.944, .781]] },   // flanc droit de la chambre basse
      { id: 'niche-g', role: 'wall', poly: [[.056, .4], [.278, .4], [.278, .451], [.056, .451]] },   // dessus de la niche de la cuve gauche, plancher de la chambre haute
      { id: 'cloison-g', role: 'wall', poly: [[.278, .4], [.32, .4], [.32, .43], [.389, .48], [.389, .556], [.278, .556]] },   // entre la niche gauche et le tuyau, évasée vers la chambre haute
      { id: 'cloison-d', role: 'wall', poly: [[.68, .4], [.722, .4], [.722, .556], [.611, .556], [.611, .48], [.68, .43]] },   // entre le tuyau et la niche droite
      { id: 'niche-d', role: 'wall', poly: [[.722, .4], [.944, .4], [.944, .451], [.722, .451]] },   // dessus de la niche de la cuve droite
      { id: 'epaule-g', role: 'wall', poly: [[0, 0], [.415, 0], [.415, .07], [.44, .07], [.44, .1], [.415, .1], [.415, .082], [.361, .082], [.361, .152], [.389, .152], [.389, .226], [.111, .226], [.111, .434], [0, .434]] },   // épaule gauche et plafond, ergot dans la torchère
      { id: 'cloison-h', role: 'wall', poly: [[.611, .152], [.667, .152], [.667, .226], [.611, .226]] },   // entre le tuyau et l'embranchement de la cuve haute
      { id: 'plafond-d', role: 'wall', poly: [[1, 0], [.585, 0], [.585, .07], [.56, .07], [.56, .1], [.585, .1], [.585, .082], [.639, .082], [.639, .152], [.667, .152], [.667, .13], [1, .13]] },   // plafond droit, ergot dans la torchère, sur la cuve haute
      { id: 'epaule-d', role: 'wall', poly: [[.889, .13], [1, .13], [1, .434], [.889, .434]] },   // épaule droite
      { id: 'cuve-g', role: 'target', plate: 'plaque-g', poly: [[.097, .453], [.236, .453], [.236, .488], [.097, .488]] },   // cuve gauche, au bout de son embranchement
      { id: 'cuve-d', role: 'target', plate: 'plaque-d', poly: [[.764, .453], [.903, .453], [.903, .488], [.764, .488]] },   // cuve droite
      { id: 'cuve-h', role: 'target', plate: 'plaque-h', poly: [[.708, .13], [.847, .13], [.847, .165], [.708, .165]] },   // cuve haute, sous le plafond
      { id: 'torchere', role: 'head', poly: [[.417, .065], [.583, .065], [.569, .152], [.431, .152]] },   // la torchère (tête), coiffe du tuyau
      { id: 'plaque-g', role: 'plate', poly: [[.361, .082], [.417, .082], [.417, .148], [.361, .148]] },   // blindage gauche de la torchère
      { id: 'plaque-h', role: 'plate', poly: [[.417, .052], [.583, .052], [.583, .065], [.417, .065]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.583, .082], [.639, .082], [.639, .148], [.583, .148]] },   // blindage droit
      { id: 'tourelle-bas', role: 'turret', poly: [[.906, .668], [.944, .668], [.944, .694], [.906, .694]] },   // tourelle sur le flanc droit de la chambre basse
      { id: 'tourelle-haut', role: 'turret', poly: [[.111, .313], [.15, .313], [.15, .339], [.111, .339]] }    // tourelle sur l'épaule gauche de la chambre haute
    ],
    rooms: [
      { id: 'chambre-basse', rect: [.056, .625, .944, .781], defense: 'vapeur', turrets: ['tourelle-bas'] },
      { id: 'chambre-haute', rect: [.111, .291, .889, .4], defense: 'vapeur', turrets: ['tourelle-haut'] }
    ],
    paths: {
      'cuve-g': [[.5, .955], [.5, .85], [.5, .781], [.5, .72], [.25, .64], [.167, .556], [.167, .486]],
      'cuve-d': [[.5, .955], [.5, .85], [.5, .781], [.5, .72], [.75, .64], [.833, .556], [.833, .486]],
      'cuve-h': [[.5, .955], [.5, .85], [.5, .781], [.5, .434], [.5, .386], [.55, .33], [.694, .291], [.778, .226], [.778, .163]],
      head: [[.5, .955], [.5, .85], [.5, .781], [.5, .15]]
    },
    toxics: [[.833, .755], [.167, .981]]
  },
  // Incinérateur (décharge) : forteresse ; grille d'aération au pied du four, grande salle sous son ventre, trois brûleurs pendus, gueule au plafond.
  decharge: {
    form: 'forteresse',
    pieces: [
      { id: 'socle-g', role: 'wall', poly: [[0, .66], [.31, .66], [.31, .729], [.416, .729], [.458, .777], [.375, .829], [.416, .868], [0, .868]] },   // pied du four, à gauche de la grille
      { id: 'socle-d', role: 'wall', poly: [[.69, .66], [1, .66], [1, .868], [.584, .868], [.542, .829], [.625, .777], [.584, .729], [.69, .729]] },   // pied du four, à droite de la grille
      { id: 'four-g', role: 'wall', poly: [[0, .104], [.415, .104], [.415, .13], [.44, .13], [.44, .16], [.375, .16], [.375, .191], [.042, .191], [.042, .712], [0, .712]] },   // ventre et paroi gauche du four, ergot dans la gueule
      { id: 'four-d', role: 'wall', poly: [[1, .104], [.585, .104], [.585, .13], [.56, .13], [.56, .16], [.625, .16], [.625, .191], [.958, .191], [.958, .712], [1, .712]] },   // ventre et paroi droite du four, ergot dans la gueule
      { id: 'bruleur-bas', role: 'target', plate: 'plaque-g', poly: [[.217, .191], [.256, .191], [.256, .486], [.217, .486]] },   // brûleur pendu le plus bas
      { id: 'bruleur-milieu', role: 'target', plate: 'plaque-d', poly: [[.717, .191], [.756, .191], [.756, .382], [.717, .382]] },   // brûleur pendu à mi-hauteur
      { id: 'bruleur-haut', role: 'target', plate: 'plaque-h', poly: [[.328, .191], [.367, .191], [.367, .26], [.328, .26]] },   // brûleur pendu le plus haut
      { id: 'gueule', role: 'head', poly: [[.417, .122], [.583, .122], [.583, .187], [.417, .187]] },   // la gueule du four (tête), au plafond de la salle
      { id: 'plaque-g', role: 'plate', poly: [[.375, .122], [.417, .122], [.417, .187], [.375, .187]] },   // blindage gauche de la gueule
      { id: 'plaque-h', role: 'plate', poly: [[.417, .109], [.583, .109], [.583, .122], [.417, .122]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.583, .122], [.625, .122], [.625, .187], [.583, .187]] },   // blindage droit
      { id: 'tourelle-g', role: 'turret', poly: [[.042, .556], [.081, .556], [.081, .582], [.042, .582]] },   // tourelle sur la paroi gauche
      { id: 'tourelle-d', role: 'turret', poly: [[.919, .434], [.958, .434], [.958, .46], [.919, .46]] }    // tourelle sur la paroi droite
    ],
    rooms: [
      { id: 'salle', rect: [.042, .243, .958, .66], defense: 'flamme', turrets: ['tourelle-g', 'tourelle-d'] }
    ],
    paths: {
      'bruleur-bas': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.48, .6], [.236, .521], [.236, .484]],
      'bruleur-milieu': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.52, .6], [.736, .521], [.736, .38]],
      'bruleur-haut': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.48, .6], [.347, .556], [.347, .259]],
      head: [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .185]]
    },
    toxics: [[.861, .64], [.167, .955]]
  },
  // Réacteur (nucléaire) : circuit de refroidissement en lacets dans le socle, puis salle du cœur ; trois barres de contrôle descendent du dôme, le cœur au sommet.
  nucleaire: {
    form: 'reacteur',
    pieces: [
      { id: 'socle-g', role: 'wall', poly: [[0, .578], [.32, .578], [.32, .608], [.344, .608], [.344, .6155], [.594, .6765], [.594, .7215], [.094, .8425], [.094, .8495], [.344, .9195], [.344, .955], [0, .955]] },   // socle, à gauche du circuit
      { id: 'socle-d', role: 'wall', poly: [[.68, .578], [1, .578], [1, .955], [.656, .955], [.656, .9385], [.406, .8685], [.406, .8235], [.906, .7025], [.906, .6955], [.656, .6345], [.656, .608], [.68, .608]] },   // socle, à droite du circuit
      { id: 'dome-g', role: 'wall', poly: [[0, .087], [.415, .087], [.415, .095], [.44, .095], [.44, .125], [.375, .125], [.375, .13], [.167, .165], [.056, .226], [.056, .608], [0, .608]] },   // dôme et paroi gauche, ergot dans le cœur
      { id: 'dome-d', role: 'wall', poly: [[1, .087], [.585, .087], [.585, .095], [.56, .095], [.56, .125], [.625, .125], [.625, .13], [.833, .165], [.944, .226], [.944, .608], [1, .608]] },   // dôme et paroi droite, ergot dans le cœur
      { id: 'barre-g', role: 'target', plate: 'plaque-g', poly: [[.244, .148], [.283, .148], [.283, .399], [.244, .399]] },   // barre de contrôle gauche, la plus longue
      { id: 'barre-d', role: 'target', plate: 'plaque-d', poly: [[.744, .154], [.783, .154], [.783, .33], [.744, .33]] },   // barre de contrôle droite
      { id: 'barre-c', role: 'target', plate: 'plaque-h', poly: [[.633, .135], [.672, .135], [.672, .252], [.633, .252]] },   // barre de contrôle près du cœur, la plus courte
      { id: 'coeur', role: 'head', poly: [[.417, .074], [.583, .074], [.583, .139], [.417, .139]] },   // le cœur (tête), au sommet du dôme
      { id: 'plaque-g', role: 'plate', poly: [[.375, .082], [.417, .082], [.417, .139], [.375, .139]] },   // blindage gauche du cœur
      { id: 'plaque-h', role: 'plate', poly: [[.417, .061], [.583, .061], [.583, .074], [.417, .074]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.583, .082], [.625, .082], [.625, .139], [.583, .139]] },   // blindage droit
      { id: 'tourelle-g', role: 'turret', poly: [[.056, .451], [.094, .451], [.094, .477], [.056, .477]] },   // tourelle sur la paroi gauche
      { id: 'tourelle-d', role: 'turret', poly: [[.906, .373], [.944, .373], [.944, .399], [.906, .399]] }    // tourelle sur la paroi droite
    ],
    rooms: [
      { id: 'coeur', rect: [.056, .26, .944, .578], defense: 'radiation', turrets: ['tourelle-g', 'tourelle-d'] }
    ],
    paths: {
      'barre-g': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.264, .451], [.264, .398]],
      'barre-d': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.764, .451], [.764, .328]],
      'barre-c': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.653, .486], [.653, .25]],
      head: [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .137]]
    },
    toxics: [[.833, .55], [.167, .981]]
  }
};
