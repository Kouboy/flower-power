# Habillage des boss — design (v5.6.0, puis v5.7.0)

Validé avec l'utilisateur le 2026-11-11, section par section.

## Intention

Les quatre boss sont aujourd'hui des formes simples dessinées par le code (parois, cibles, tête, plaques, tourelles). Le but est de les rendre
**menaçants** : de vraies usines en pixel art, dans le style des obstacles PixelLab, avec de la profondeur (arrière-plan lointain, premier plan
flou en parallaxe, idée de l'utilisateur). Réussite : le boss impressionne au premier regard, le jeu reste aussi lisible et juste qu'aujourd'hui
(géométrie, collisions et tirs inchangés), et ça tourne aussi bien sur téléphone.

Choix de l'utilisateur :
- tout habiller (pièces, matière des parois, arrière-plan, premier plan), en un chantier découpé en deux versions ;
- images PixelLab retouchées à l'atelier gratuit (pixelart_workbench) ; **aucune génération sans son feu vert, série par série** ;
- **machines pures** : pas de visage ; la menace vient de la masse, des lumières, de la fumée et du premier plan ;
- le premier plan **peut traverser l'écran** (pas seulement les bords) ;
- parois remplies d'une **matière répétable** par boss, pièces en images (« Matières + pièces ») ; une grande image par boss est écartée
  (elle casse l'étirement des niveaux, v5.3.0, et dépasse les tailles PixelLab).

## Couches, de l'arrière vers l'avant

1. Ciel et sous-sol du milieu : inchangés.
2. **Arrière-plan du boss** (nouveau) : silhouette sombre d'usine derrière les salles, répétée en largeur, à **0,6×** la vitesse de la caméra,
   assombrie pour que les parois ressortent. Uniquement dans la zone du boss.
3. **Le boss** : parois remplies de la matière du boss, contour sombre et rivets dessinés par le code ; cibles, tête, plaques et tourelles en
   images. Collisions inchangées (plans de `assets/boss/plans.js`).
4. Tige, pièces, fleurs, effets : inchangés.
5. **Premier plan** (nouveau) : 2 éléments par boss, entre **1,4× et 1,8×** la vitesse de la caméra, floutés et légèrement transparents ;
   ils peuvent traverser l'écran.
6. **Menaces par-dessus tout** : hachures d'avertissement, visée des tourelles et projectiles sont dessinés **après** le premier plan.
   Un élément flou peut cacher du décor, jamais un tir ni un avertissement.

Secousse : pendant l'avertissement d'une défense et à la mort du boss, la secousse est plus forte sur le premier plan que sur le fond
(facteur dans config.js).

## Les quatre boss

Images PixelLab par boss (8) : matière des parois (motif carré répétable), cible, tête, plaque de blindage, tourelle, arrière-plan
(répétable en largeur), deux éléments de premier plan. Faits par le code, sans image : cible détruite (assombrie, fissurée, fumante, comme
aujourd'hui), tête à nu (lueur qui pulse), tirs. Total : **32 images**, plus une marge de reprises.

| Boss | Matière | Cible | Tête | Tourelle | Arrière-plan | Premier plan |
|---|---|---|---|---|---|---|
| Bétonneuse (friche) | béton fissuré, coulures | vanne à volant | toupie de bétonnière | buse à béton | silos, grue | chaîne de grue qui pend, grillage de chantier |
| Raffinerie (industrie) | tôle rouillée rivetée | manomètre | colonne de distillation | canon à vapeur | torchères, cuves | tuyaux qui fuient, passerelle grillagée |
| Incinérateur (décharge) | brique noircie de suie | brûleur | gueule de four | lance-flammes | cheminées, montagne d'ordures | fumée noire, chaîne à crochet |
| Réacteur (nucléaire) | béton peint, bandes jaunes et noires | barre de contrôle | dôme du cœur | émetteur | tours de refroidissement | câbles qui pendent, vapeur |

Style : celui des obstacles (vue de côté, aplats, peu de détails, contour noir, coulures vertes toxiques). Les points faibles (cibles, tête à
nu) restent **la seule chose claire et lumineuse** du boss ; matière, arrière-plan et premier plan restent sombres et peu saturés.

Pose : chaque image de pièce est ajustée à la boîte de son polygone, puis découpée par lui. Forme et collisions restent celles d'aujourd'hui.
La matière est répétée en motif dans chaque paroi, ancrée au monde (elle ne glisse pas quand la caméra bouge).

Budget : compte PixelLab d'essai, 6 générations + bonus du jour (jusqu'à 20, +5 par nuit). Ordre : la **Bétonneuse complète d'abord**
(8 images), validée en jeu par l'utilisateur, puis les trois autres. Chaque série ne part qu'avec son accord.

## Technique

- `assets/boss/art/<milieu>/` : PNG retouchés, importés par la chaîne existante (`dev/tools/import-pixel.js`, étendue aux boss).
- `assets/boss/art.js` : table des images par boss et par rôle (matière, cible, tête, plaque, tourelle, arrière-plan, premier plan).
- `src/render/boss-skin.js` (nouveau) : charge les images, peint la matière dans chaque paroi (motif découpé par le polygone), puis le
  contour et les rivets, et pose les images des pièces. Le tout entre dans le calque que `boss.js` met déjà en cache : aucun coût par image
  tant que rien ne casse.
- `src/render/boss-depth.js` (nouveau) : arrière-plan et premier plan, avec parallaxe. Le flou est **préparé une seule fois** par image,
  sur une toile cachée (`ctx.filter = 'blur()'`) ; sur un navigateur sans `ctx.filter`, l'élément est seulement plus transparent.
- `src/render/boss.js` : sépare le corps du boss et les menaces (`draw` et `drawThreats`). `src/render/frame.js` dessine dans l'ordre :
  arrière-plan, boss, tige et le reste, premier plan, menaces.
- `src/core/config.js` (`boss.skin`) : vitesses de parallaxe, flou, transparence, espacement du premier plan, facteur de secousse.
- Placement du premier plan : tiré de la graine du niveau (même boss, même placement à chaque tentative) ; au plus un élément qui traverse
  à l'écran ; en moyenne un toutes les 1 à 1,5 hauteurs d'écran.
- Règles AGENTS.md : réglages dans config.js, dessin dans render/*, fichiers sous 400 lignes, pas de code mort ; index.html et
  dev/check.html ne reçoivent que les lignes `<script>`.

## Cas d'erreur

Image manquante, en échec ou pas encore chargée : la pièce garde sa forme actuelle dessinée par le code (même règle que les obstacles) ;
pas d'arrière-plan ni de premier plan. Sous Node (tests), rien n'est chargé : tout passe par ce chemin de secours. On peut donc livrer
la Bétonneuse habillée pendant que les trois autres boss restent provisoires.

## Tests

- chemin de secours sans images (chaque boss se dessine sans erreur, comme aujourd'hui) ;
- les menaces sont dessinées après le premier plan ;
- calcul de la parallaxe (position à l'écran selon la caméra et le facteur) ;
- placement du premier plan identique d'une tentative à l'autre, au plus un élément à la fois à l'écran ;
- aucun flou recalculé pendant la partie (préparé une seule fois par image) ;
- la table `assets/boss/art.js` couvre chaque rôle des boss habillés, et chaque fichier cité existe ;
- le robot de test bat toujours chaque boss (collisions inchangées) ;
- banc complet vert et vérification en jeu, dont le téléphone (`?perf=1`) au facteur d'étirement maximal.

## Versions

- **v5.6.0** : moteur d'habillage (matière, pièces, arrière-plan, premier plan, ordre des menaces) avec la Bétonneuse complète.
- **v5.7.0** : Raffinerie, Incinérateur, Réacteur, après validation de la Bétonneuse en jeu.

## Hors de portée

Visages de boss (refusés : machines pures) ; changement de géométrie ou de collisions ; nouvelles défenses ; animation image par image des
pièces (la fumée et les lueurs restent faites par le code).
