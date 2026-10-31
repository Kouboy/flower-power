// assets/boss/plans.js — plans des quatre boss (v5.1.0), composés à la main : pièces, salles, trajets de référence, nappes.
// Coordonnées en proportions : x de 0 à 1 sur la largeur du monde, y de 0 à 1 sur la zone du boss (0 = haut, de surfaceY + config.boss.top
// à height - config.boss.bottom). FP.bossPlan.toWorld (src/world/boss-plan.js) les pose dans le monde.
// pieces : { id, role: 'wall' | 'target' | 'head' | 'plate' | 'turret', poly, plate? (cible → id de sa plaque sur la tête) } ;
// rooms  : { id, rect: [x0, y0, x1, y1] (où agissent les menaces), defense, turrets } ;
// paths  : un trajet par cible et un vers la tête ('head') ; la graine (sous la zone) est ajoutée devant par toWorld ;
// toxics : centres des nappes.
// Composés sur un monde de 360 px de large : canaux d'au moins config.boss.channelMin, trajets toujours montants, en pente plutôt
// qu'à plat ; salles larges, tourelles sur leurs parois ; rien au-dessus de la tête jusqu'à la surface.
window.FLOWER_POWER_BOSS_PLANS = {
  // Bétonneuse (friche) : muraille à mi-hauteur percée de trois meurtrières (large, sinueuse, étroite), une vanne au débouché de chacune, salle sous la toupie.
  friche: {
    form: 'muraille',
    pieces: [
      { id: 'mur-g', role: 'wall', poly: [[0, .451], [.039, .451], [.039, .608], [0, .608]] },   // muraille : bord gauche
      { id: 'mur-1', role: 'wall', poly: [[.306, .451], [.4, .451], [.367, .469], [.45, .521], [.367, .573], [.4, .608], [.306, .608]] },   // muraille : entre la meurtrière large et la sinueuse
      { id: 'mur-2', role: 'wall', poly: [[.656, .451], [.767, .451], [.767, .608], [.656, .608], [.622, .573], [.706, .521], [.622, .469]] },   // muraille : entre la sinueuse et l'étroite
      { id: 'mur-d', role: 'wall', poly: [[.956, .451], [1, .451], [1, .608], [.956, .608]] },   // muraille : bord droit
      { id: 'vanne-large', role: 'target', plate: 'plaque-g', poly: [[.117, .352], [.228, .352], [.228, .382], [.117, .382]] },   // vanne au-dessus de la meurtrière large
      { id: 'vanne-sinueuse', role: 'target', plate: 'plaque-h', poly: [[.472, .352], [.583, .352], [.583, .382], [.472, .382]] },   // vanne au-dessus de la meurtrière sinueuse
      { id: 'vanne-etroite', role: 'target', plate: 'plaque-d', poly: [[.806, .352], [.917, .352], [.917, .382], [.806, .382]] },   // vanne au-dessus de la meurtrière étroite
      { id: 'toupie', role: 'head', poly: [[.417, .017], [.583, .017], [.639, .035], [.639, .069], [.583, .087], [.417, .087], [.361, .069], [.361, .035]] },   // la toupie (tête), sous la surface
      { id: 'plaque-g', role: 'plate', poly: [[.278, .03], [.361, .03], [.361, .082], [.278, .082]] },   // blindage gauche de la toupie
      { id: 'plaque-h', role: 'plate', poly: [[.403, .004], [.597, .004], [.597, .017], [.403, .017]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.639, .03], [.722, .03], [.722, .082], [.639, .082]] }    // blindage droit
    ],
    rooms: [
      { id: 'salle', rect: [0, .13, 1, .391], defense: 'beton', turrets: [] }
    ],
    paths: {
      'vanne-large': [[.5, 1.042], [.172, .903], [.172, .608], [.172, .38]],
      'vanne-sinueuse': [[.5, .66], [.528, .608], [.494, .573], [.578, .521], [.494, .469], [.528, .451], [.528, .38]],
      'vanne-etroite': [[.5, 1.042], [.861, .894], [.861, .608], [.861, .38]],
      head: [[.5, .66], [.528, .608], [.494, .573], [.578, .521], [.494, .469], [.528, .451], [.569, .434], [.708, .386], [.708, .286], [.5, .191], [.5, .085]]
    },
    toxics: [[.153, .998], [.847, .998]]
  },
  // Raffinerie (industrie) : colosse traversé ; tuyau principal sinueux, deux chambres, trois embranchements vers les cuves, torchère au sommet.
  industrie: {
    form: 'colosse',
    pieces: [
      { id: 'pied-g', role: 'wall', poly: [[0, .781], [.25, .781], [.25, .833], [.389, .894], [.389, .955], [0, .955]] },   // pied du colosse, à gauche du tuyau
      { id: 'pied-d', role: 'wall', poly: [[.472, .781], [1, .781], [1, .955], [.611, .955], [.611, .894], [.472, .833]] },   // pied du colosse, à droite du tuyau
      { id: 'flanc-g', role: 'wall', poly: [[0, .434], [.056, .434], [.056, .781], [0, .781]] },   // flanc gauche de la chambre basse
      { id: 'flanc-d', role: 'wall', poly: [[.944, .434], [1, .434], [1, .781], [.944, .781]] },   // flanc droit de la chambre basse
      { id: 'niche-g', role: 'wall', poly: [[.056, .434], [.278, .434], [.278, .451], [.056, .451]] },   // dessus de la niche de la cuve gauche
      { id: 'cloison-g', role: 'wall', poly: [[.278, .434], [.389, .434], [.389, .556], [.278, .556]] },   // entre la niche gauche et le tuyau
      { id: 'cloison-d', role: 'wall', poly: [[.611, .434], [.722, .434], [.722, .556], [.611, .556]] },   // entre le tuyau et la niche droite
      { id: 'niche-d', role: 'wall', poly: [[.722, .434], [.944, .434], [.944, .451], [.722, .451]] },   // dessus de la niche de la cuve droite
      { id: 'epaule-g', role: 'wall', poly: [[0, .152], [.389, .152], [.389, .226], [.111, .226], [.111, .434], [0, .434]] },   // épaule gauche, autour de la chambre haute
      { id: 'cloison-h', role: 'wall', poly: [[.611, .152], [.667, .152], [.667, .226], [.611, .226]] },   // entre le tuyau et l'embranchement de la cuve haute
      { id: 'epaule-d', role: 'wall', poly: [[.889, .152], [1, .152], [1, .434], [.889, .434]] },   // épaule droite
      { id: 'cuve-g', role: 'target', plate: 'plaque-g', poly: [[.097, .453], [.236, .453], [.236, .488], [.097, .488]] },   // cuve gauche, au bout de son embranchement
      { id: 'cuve-d', role: 'target', plate: 'plaque-d', poly: [[.764, .453], [.903, .453], [.903, .488], [.764, .488]] },   // cuve droite
      { id: 'cuve-h', role: 'target', plate: 'plaque-h', poly: [[.708, .13], [.847, .13], [.847, .165], [.708, .165]] },   // cuve haute, sur l'épaule
      { id: 'torchere', role: 'head', poly: [[.417, .065], [.583, .065], [.569, .152], [.431, .152]] },   // la torchère (tête), coiffe du tuyau
      { id: 'plaque-g', role: 'plate', poly: [[.361, .082], [.417, .082], [.417, .148], [.361, .148]] },   // blindage gauche de la torchère
      { id: 'plaque-h', role: 'plate', poly: [[.417, .052], [.583, .052], [.583, .065], [.417, .065]] },   // blindage du dessus
      { id: 'plaque-d', role: 'plate', poly: [[.583, .082], [.639, .082], [.639, .148], [.583, .148]] },   // blindage droit
      { id: 'tourelle-bas', role: 'turret', poly: [[.906, .668], [.944, .668], [.944, .694], [.906, .694]] },   // tourelle sur le flanc droit de la chambre basse
      { id: 'tourelle-haut', role: 'turret', poly: [[.111, .313], [.15, .313], [.15, .339], [.111, .339]] }    // tourelle sur l'épaule gauche de la chambre haute
    ],
    rooms: [
      { id: 'chambre-basse', rect: [.056, .625, .944, .729], defense: 'vapeur', turrets: ['tourelle-bas'] },
      { id: 'chambre-haute', rect: [.111, .291, .889, .378], defense: 'vapeur', turrets: ['tourelle-haut'] }
    ],
    paths: {
      'cuve-g': [[.5, .955], [.5, .894], [.361, .833], [.361, .781], [.375, .738], [.306, .677], [.25, .625], [.167, .556], [.167, .486]],
      'cuve-d': [[.5, .955], [.5, .894], [.361, .833], [.361, .781], [.375, .738], [.556, .686], [.722, .608], [.833, .556], [.833, .486]],
      'cuve-h': [[.5, .955], [.5, .894], [.361, .833], [.361, .781], [.375, .738], [.494, .677], [.5, .625], [.5, .434], [.5, .386], [.694, .291], [.778, .226], [.778, .163]],
      head: [[.5, .955], [.5, .894], [.361, .833], [.361, .781], [.375, .738], [.494, .677], [.5, .625], [.5, .15]]
    },
    toxics: [[.833, .755], [.167, .981]]
  },
  // Incinérateur (décharge) : forteresse ; grille d'aération au pied du four, grande salle sous son ventre, trois brûleurs pendus, gueule au plafond.
  decharge: {
    form: 'forteresse',
    pieces: [
      { id: 'socle-g', role: 'wall', poly: [[0, .712], [.394, .712], [.394, .729], [.436, .777], [.353, .829], [.394, .868], [0, .868]] },   // pied du four, à gauche de la grille
      { id: 'socle-d', role: 'wall', poly: [[.606, .712], [1, .712], [1, .868], [.606, .868], [.564, .829], [.647, .777], [.606, .729]] },   // pied du four, à droite de la grille
      { id: 'four-g', role: 'wall', poly: [[0, .104], [.375, .104], [.375, .191], [.042, .191], [.042, .712], [0, .712]] },   // ventre et paroi gauche du four
      { id: 'four-d', role: 'wall', poly: [[.625, .104], [1, .104], [1, .712], [.958, .712], [.958, .191], [.625, .191]] },   // ventre et paroi droite du four
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
      'bruleur-bas': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.236, .521], [.236, .484]],
      'bruleur-milieu': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.736, .521], [.736, .38]],
      'bruleur-haut': [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .66], [.347, .556], [.347, .259]],
      head: [[.5, .868], [.458, .829], [.542, .777], [.5, .729], [.5, .185]]
    },
    toxics: [[.861, .686], [.167, .955]]
  },
  // Réacteur (nucléaire) : circuit de refroidissement en lacets dans le socle, puis salle du cœur ; trois barres de contrôle descendent du dôme, le cœur au sommet.
  nucleaire: {
    form: 'reacteur',
    pieces: [
      { id: 'socle-g', role: 'wall', poly: [[0, .608], [.344, .608], [.344, .625], [.594, .686], [.594, .712], [.094, .833], [.094, .859], [.344, .929], [.344, .955], [0, .955]] },   // socle, à gauche du circuit
      { id: 'socle-d', role: 'wall', poly: [[.656, .608], [1, .608], [1, .955], [.656, .955], [.656, .929], [.406, .859], [.406, .833], [.906, .712], [.906, .686], [.656, .625]] },   // socle, à droite du circuit
      { id: 'dome-g', role: 'wall', poly: [[0, .087], [.375, .087], [.375, .13], [.167, .165], [.056, .226], [.056, .608], [0, .608]] },   // dôme et paroi gauche
      { id: 'dome-d', role: 'wall', poly: [[1, .087], [.625, .087], [.625, .13], [.833, .165], [.944, .226], [.944, .608], [1, .608]] },   // dôme et paroi droite
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
      { id: 'coeur', rect: [.056, .26, .944, .556], defense: 'radiation', turrets: ['tourelle-g', 'tourelle-d'] }
    ],
    paths: {
      'barre-g': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.264, .451], [.264, .398]],
      'barre-d': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.764, .451], [.764, .328]],
      'barre-c': [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .564], [.653, .486], [.653, .25]],
      head: [[.5, .955], [.5, .929], [.25, .859], [.25, .833], [.75, .712], [.75, .686], [.5, .625], [.5, .137]]
    },
    toxics: [[.833, .582], [.167, .981]]
  }
};
