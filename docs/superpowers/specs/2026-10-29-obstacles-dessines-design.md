# Obstacles dessinés par le code — design (v4.14.0)

Les 14 obstacles, aujourd'hui des PNG détaillés réduits sur la grille de pixels, sont redessinés pixel par pixel par le code,
dans le style de la pousse (tige, graine, fleurs). Cette version est **un test séparé**, ouvert par l'adresse : sans le
paramètre, le jeu reste celui de la v4.13. Essai validé par l'utilisateur : `.superpowers/proto/obstacles.html` (prototype
jetable, hors dépôt ; pneu « v3 », cône sur socle plat, fût jaune).

## But

Des obstacles plus lisibles, plus colorés, plus simples et plus organiques, qui forment un seul univers avec la pousse ; une
méthode qui permettra ensuite de créer de nouveaux obstacles sans image générée (SpriteCook).

## La version test

- Ouverte par `?obstacles=dessin` (lu une fois au chargement, comme `sansboss`) ; combinable avec `?sansboss=1`.
- Sans le paramètre : rien ne change (PNG, collisions, apparences de la v4.13).
- Avec : les 14 familles sont dessinées par le code, leurs collisions viennent des dessins, les PNG ne sont pas chargés.
- Les familles, leurs noms (`tire`, `cone`, `nuclear`…), leurs tailles en jeu (`worldWidth`), leur pivot, leur miroir, leur
  rayon de frôlement, leur éligibilité au survol et leurs réglages d'apparition sont ceux de la v4.13 : l'équilibre du jeu ne
  change que par la forme exacte des collisions.

## Direction artistique

Règles communes :

- Recette de la pousse : **4 teintes par matière** (sombre, ombre, corps, reflet), aplats francs, lumière en haut à gauche.
- **Contour teinté** d'un pixel : la couleur de la matière, très assombrie (comme la tige, dont le contour est vert très
  sombre), jamais un noir commun.
- **Rond et organique** : pas d'angle droit, coins arrondis d'au moins 2 à 3 pixels d'art, même pour les objets « carrés » ;
  silhouettes vivantes (bords qui ondulent, objets qui bombent, s'affaissent ou ploient sous leur poids) ; modelé en volumes
  ronds (reflet en croissant, ombre douce plus dense au pied), pas de bandes droites d'une face à l'autre.
- Couleurs franches, peu de détails : l'objet se reconnaît à sa silhouette.
- Tout est **usé** : rouille, éraflures, bosses, boue ; coulures vert acide, plus jaunes que la tige.
- **Interdits** : le violet des dangers (`FP.palette.danger`) et le blanc-jaune des points faibles (`FP.palette.boss.weak`).
- Chaque obstacle est **d'un seul tenant** (aucune goutte détachée) : sa collision en dépend.

Les 14 familles (taille en pixels d'art = `worldWidth` / 2) :

| Famille | Direction |
|---|---|
| `tire` (pneus) | l'essai v3 : gris ardoise délavé, pneu du haut affaissé et entaillé (fils d'acier), sculptures rasées, craquelures, boue |
| `cone` (cône) | orange et blanc, penché, sur socle plat ; la bouche coule |
| `nuclear` (fût) | jaune, cerclages, trèfle noir, couvercle qui déborde |
| `server` (serveur) | baie gris-bleu bombée et de travers, voyants rouges et verts, câbles arrachés |
| `sarcophagus` (sarcophage) | béton gris-beige fissuré, ferraille rouillée qui dépasse, symbole effacé |
| `drone` | coque blanche rayée, hélices tordues, une patte cassée |
| `solar` (panneau solaire) | cellules bleu nuit quadrillées, verre étoilé, cadre alu, pied plié |
| `battery` (batterie) | bloc rouge et noir, bornes vertes de sulfate, flanc gonflé qui suinte |
| `extinguisher` (extincteur) | rouge vif cabossé, manomètre, tuyau qui pend |
| `microwave` (micro-ondes) | caisse crème, vitre noire, porte de travers, coins rouillés |
| `trashbag` (sac poubelle) | noir brillant, nœud jaune, déchirure d'où sortent canette et peau de banane |
| `arcade` (borne d'arcade) | bleu roi et magenta franc (jamais le violet des dangers), écran fendu, joystick tordu |
| `scooter` (trottinette) | vert électrique de location, guidon plié, roue voilée |
| `trex_signature` (squelette de T-Rex) | os ivoire et beige, crâne de profil, quelques côtes ; le plus grand dessin (140 pixels d'art) |

**Variantes** : 4 par famille, choisies par l'empreinte de l'obstacle (famille et position, comme `FP.obstacles.look`). Elles
ne changent que **l'intérieur** de la silhouette (taches d'usure, rouille, longueur des coulures intérieures), jamais son
contour ni ses couleurs de matière. Le décalage de teinte par filtre de la v4.13 ne s'applique pas aux obstacles dessinés ;
le bas à moitié enterré et le halo sombre d'ancrage restent.

## Architecture

- `core/fp.js` : `FP.params.obstacles` (`'dessin'` si `?obstacles=dessin`, sinon `null`).
- `assets/obstacles/dessin/kit.js` (nouveau) : la boîte à outils des dessins, pure (aucun DOM) — matières (4 teintes et
  contour teinté), grille de pixels, volume arrondi, ellipses et rectangles aux coins arrondis, bords ondulés, coulures,
  tirage d'usure déterministe.
- `assets/obstacles/dessin/<famille>.js` (un fichier par famille) : déclare la famille sous son nom de jeu, sa taille en
  pixels d'art, ses réglages repris de la fiche PNG (pivot, miroir, frôlement, survol, apparition) et sa fonction de dessin
  `paint(grid, variant)`, qui peint une grille de pixels. Aucun DOM : testable sous Node.
- `world/catalog.js` : avec le paramètre, fabrique pour chaque dessin une **fiche au même format que les fiches PNG**
  (`source` = taille de la grille, `render.worldWidth`, `collision.points` calculés depuis la silhouette, etc.) ; sans lui,
  inchangé. Le reste du monde (placement, collisions, frôlement, survol, T-Rex) ne voit pas la différence.
- Collision depuis la silhouette (fonction pure, dans `world/` ou le kit, testée) : silhouette = pixels peints (contour
  compris) de la variante 0, rétrécie de `FP.config.obstacles.drawnInset` pixels d'art (1 par défaut) ; bord extérieur
  suivi puis simplifié (tolérance ≈ 1 pixel d'art) ; creux gardés, trous intérieurs ignorés ; 48 points au plus ; coordonnées
  relatives au pivot, dans le repère de la grille.
- `render/obstacles.js` : pour une fiche dessinée, l'image de la famille vient de la grille peinte (une fois par famille,
  sens et variante), au lieu de la réduction du PNG ; mise à l'échelle par obstacle, ancrage et bas enterré inchangés ; pas
  de filtre de teinte.
- `render/sprites.js` : ne charge pas les PNG dans la version dessinée.
- `index.html` et `dev/check.html` : lignes `<script>` du kit et des 14 dessins.
- `dev/obstacles.html` (nouveau) : galerie de développement — les 14 familles et leurs 4 variantes sur la terre de chaque
  milieu, collision affichable, zoom.

## Réglages (config.js)

- `obstacles.drawnInset` : marge de rétrécissement de la silhouette avant le calcul de la collision (pixels d'art, 1).

## Tests

- Paramètre : `?obstacles=dessin` → `FP.params.obstacles === 'dessin'` ; absent ou autre valeur → `null`.
- Catalogue : sans le paramètre, fiches identiques à celles de la v4.13 ; avec, les mêmes 14 familles, mêmes tailles en jeu,
  mêmes réglages d'apparition, pivot, miroir, frôlement et survol.
- Chaque dessin : reste dans son cadre ; un seul morceau (connexité 4) ; aucune couleur de `FP.palette.danger` ni
  `FP.palette.boss.weak` ; ses 4 variantes ont exactement la même silhouette ; même dessin → mêmes pixels.
- Collision : le polygone couvre au moins 95 % des pixels de la silhouette rétrécie et en déborde de moins de 3 % (en
  surface) ; 48 points au plus ; au moins 3 points ; ne se recoupe pas.
- Génération des niveaux en version dessinée : aucun chevauchement visuel, chemin sûr dégagé, T-Rex placé sur écran étroit
  (les tests existants, rejoués avec le catalogue dessiné).
- Navigateur : une partie jouée dans chaque milieu avec `?obstacles=dessin` (et une avec `?sansboss=1&obstacles=dessin`),
  sans erreur ; captures ; la galerie affiche les 14 familles.

## Hors périmètre

Nouveaux obstacles (version suivante, une fois la méthode rodée) ; abandon des PNG et passage du dessin par défaut (quand
l'utilisateur aura validé le style) ; boss ; décor des milieux.
