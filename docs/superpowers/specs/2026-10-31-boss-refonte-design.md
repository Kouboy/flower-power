# Refonte des boss — design (v5.1.0, puis v5.2.0 pour les images)

Remplace le moteur de boss de la v4.12.0 (`docs/superpowers/specs/2026-10-28-moteur-boss-design.md`) : couloir en zigzag,
points faibles effleurés, défenses sur horloge fixe, trappe sous la pelouse, boss en blocs avec panneau de texte.

## Pourquoi

Retours de playtest (2026-10-31) :

- percer les points faibles est facile — c'est bien, ça doit le rester ;
- survivre aux pistons est une loterie, vraiment frustrant. Cause : la tige ne s'arrête jamais (tenir le doigt la ralentit
  de 1,5 %), les défenses tournent sur une horloge fixe sans regarder la tige, et le piston sort de la face qu'on longe,
  juste au-dessus du point faible : impossible d'attendre, presque impossible de s'écarter à temps ;
- le plafond fermé ne se lit pas, ni son ouverture ;
- on a l'impression d'activer des mécanismes, pas de détruire quelque chose ;
- le boss est trop sommaire pour comprendre ce qu'on détruit ; le panneau de texte arrive comme une excuse.

## But

Un boss se lit tout seul : on voit ce qui protège sa tête, on se faufile dans un canal étroit, on choisit sa cible et on fonce
dessus pour la détruire, on esquive en se décalant (jamais en attendant), et la tête explose sous la fleur qui éclot.

## 1. Déroulé du combat

- **Le niveau** : même hauteur qu'un niveau normal, même caméra ; la pousse part de sa graine au fond. Graine propre au boss
  (comme aujourd'hui : partie, saison, milieu) : le niveau est identique d'une tentative à l'autre. Ni obstacles ordinaires,
  ni lixiviats : le boss, quelques jetons, et les nappes toxiques que son plan prévoit.
- **Trois cibles secondaires** (vannes, cuves, brûleurs, barres), chacune reliée à une plaque du blindage de la tête.
  La pointe qui en touche une :
  - la cible explose et reste détruite ;
  - la pousse meurt dans l'explosion — un **assaut**, pas un échec : la tige ne compte pas parmi les « tiges sacrifiées » ;
  - la plaque reliée se détache de la tête et tombe ;
  - une graine jaillit de l'épave et vole jusqu'au compteur du HUD, avec un gros « +1 GRAINE » : la réserve ne baisse pas ;
  - la pousse suivante repart du fond.
- **La tête** (la toupie, la torchère, la gueule du four, le cœur), sous la surface :
  - blindée tant qu'il lui reste une plaque : la percuter est une mort normale (une graine perdue, rien de détruit) ;
  - à nu, elle s'allume (lueur du point faible) et devient la cible finale ;
  - **assaut final** : la pointe la transperce sans mourir ; arrêt sur image bref, explosion, secousse, le plafond s'ouvre ; la
    tige reprend sa course à travers l'épave et la fleur éclot dans le ciel. Puis le cycle de victoire actuel : carton
    « BOSS VAINCU », bonus, milieu suivant.
- **Mourir ailleurs** (paroi, canal, défense, tir) : mort normale, une graine. Les cibles détruites et les plaques tombées
  le restent (comme les points percés aujourd'hui) ; tout revient à zéro au milieu suivant.
- **Graines et boutique** : inchangées — bon de commande avant chaque boss, dernière chance si la dernière graine meurt contre
  autre chose qu'une cible.
- **Score** : un bonus par cible détruite (l'actuel `pierceBonus`), le gros bonus à la tête (`bonus`, × saison).

## 2. Les quatre plans

Une forme par boss, pour comparer le ressenti au playtest. Les canaux sont étroits mais sans menace (passage d'adresse) ; les
menaces n'agissent que dans les espaces larges.

| Boss | Forme | Plan |
|---|---|---|
| Bétonneuse (friche) | muraille à meurtrières | mur de béton à mi-hauteur percé de trois meurtrières (large, sinueuse, étroite) ; chacune débouche sur une vanne à béton (cible) juste au-dessus ; au-dessus du mur, une salle sous la toupie (tête) |
| Raffinerie (industrie) | colosse traversé | le corps occupe presque tout l'écran ; on remonte son tuyau principal, qui serpente et s'élargit en chambres ; trois embranchements mènent aux cuves (cibles) ; la torchère (tête) coiffe le tuyau |
| Incinérateur (décharge) | forteresse | grille d'aération (canal étroit) au pied du four, puis grande salle sous son ventre où pendent trois brûleurs (cibles) à des hauteurs différentes ; la gueule du four (tête) au plafond de la salle |
| Réacteur (nucléaire) | circuit puis cœur | circuit de refroidissement en lacets dans le socle (canal), puis salle du cœur : trois barres de contrôle (cibles) descendent du dôme ; le cœur (tête) au sommet |

Le panneau au nom du boss disparaît du niveau ; le nom et l'ordre restent sur le carton d'annonce (« PERCE SES… » devient
un ordre d'assaut, par exemple « DÉTRUIS SES 3 VANNES, PUIS SA TOUPIE »).

## 3. Les menaces

Règles communes : actives seulement quand la pointe est dans leur salle (elles se taisent quand elle en sort) ; jamais dans un
canal ; jamais pendant l'arrêt sur image final. Une défense ou un tir qui touche tue comme une paroi.

**Défense signature** (tous les boss) : coulée de béton (Bétonneuse), jet de vapeur (Raffinerie), colonne de flamme
(Incinérateur), zone de radiation (Réacteur).

- elle vise **la moitié de la salle où se trouve la pointe** ;
- **avertissement 1,2 s** : la pièce tremble, la zone se couvre de hachures orange qui clignotent de plus en plus vite, un son
  qui monte ;
- **coup 0,8 s** : la zone est mortelle, puis se retire ; **repos 1,5 s** ; puis de nouveau sur la moitié de la pointe ;
- jamais plus de la moitié d'une salle ;
- chaque cible détruite raccourcit le cycle de 10 % ; l'avertissement ne descend jamais sous 1 s.

**Tirs visés** (à partir du boss 2 : Raffinerie, Incinérateur, Réacteur) :

- une tourelle du boss suit la pointe avec une ligne de visée pendant 1 s ;
- la ligne se fige 0,3 s avant le tir (couleur qui change, « clic ») ; un projectile rapide part le long de la ligne figée :
  on esquive en déviant après le clic ;
- une seule tourelle à la fois, 3 s au moins entre deux tirs ; pas de tir pendant un coup de la défense signature ; pas de
  visée sur une pointe dans un canal.

## 4. Organisation

**Plans en données** : `assets/boss/plans.js` (`window.FLOWER_POWER_BOSS_PLANS`, un plan par milieu). Coordonnées en
proportion : x de 0 à 1 sur la largeur du monde, y de 0 à 1 sur la zone du boss (de `surfaceY + top` à `height - bottom`).

- `pieces` : `{ id, role: 'wall' | 'target' | 'head' | 'plate' | 'turret', poly, plate? (cible → id de sa plaque) }` ;
- `rooms` : `{ id, rect, defense: type, turrets: [ids] }` ;
- `paths` : trajets de référence (caméra, jetons, tests), un de la graine vers chaque cible et un vers la tête ;
- `toxics` : emplacements des nappes, s'il y en a.

En v5.1 les pièces sont des polygones dessinés en formes simples par le code ; en v5.2 chaque pièce reçoit son image PixelLab
et sa collision vient de la silhouette de l'image (chaîne d'import des obstacles : `dev/tools/import-pixel.js`,
`dev/tools/silhouette.js`), les plans se recalent sur les images.

**Fichiers** :

- `world/boss.js` (réécrit) : plan → solides (`kind` : `boss` paroi, `target`, `head`, `plate`, `turret`), `bossLevel`
  `{ plan, targets, head, plates, rooms, turrets }` ; garde la graine propre au boss.
- `play/boss.js` (réécrit) : état du combat dans `state.bossFight` (`destroyed` par cible, `headOpen`), plaques qui tombent, tête
  vulnérable ; seul à écrire `state.bossFight`.
- `play/boss-threats.js` (nouveau) : défense signature par salle (avertissement, coup, repos, moitié visée), tourelles et
  projectiles ; écrit les solides de menace (`kind` : `defense`, `shot`).
- `play/flow.js` : trois issues nouvelles à la collision — cible (assaut : explosion, graine rendue, pousse suivante, pas de
  tige comptée), tête blindée (mort normale), tête à nu (arrêt sur image, puis la pousse continue et éclot : victoire).
- `world/collision.js` : la requête de pointe signale une cible ou une tête à nu sans en faire une mort ordinaire.
- `render/boss.js` (réécrit) : pièces provisoires, plaques, hachures d'avertissement, lignes de visée, projectiles ;
  `render/boss-fx.js` (nouveau) : explosions de cible et de tête, plaque qui tombe, graine qui vole au compteur avec
  « +1 GRAINE ». Découpe dès qu'un fichier approche 400 lignes.
- HUD et cartons : trois icônes de cibles et une icône de tête (blindée, à nu, détruite) remplacent les quatre points ;
  textes du carton dans `config.text` / `config.milieux[].boss`.
- Audio : explosion de cible, graine rendue, avertissement qui monte, clic de visée, tir, explosion de tête.
- **Retirés** : points faibles, couloir en zigzag, trappe et `trapSlide`, flèche vers le prochain point faible, colonnes de
  liaison, réglages correspondants de `config.boss`.
- **Réglages** dans `config.boss` : durées (avertissement, coup, repos, accélération, plancher), tirs (suivi, figé, vitesse,
  espacement), arrêt sur image, bonus, largeur minimale des canaux.

**Outil de réglage** : `dev/boss.html` affiche les quatre plans à 360 et 440 px de large, avec collisions, salles, zones de
défense, tourelles et trajets de référence.

## Tests

- **Plans** : chaque pièce dans le cadre ; chaque canal au moins `config.boss.channelMin` de large à 360 px (60 px de monde au départ, à régler au playtest) ; chaque trajet de
  référence reste à distance sûre des parois et atteint sa cible (ou la tête) ; aucune zone de menace ni tourelle ne
  vise un canal ; chaque cible a sa plaque, chaque plaque sa cible.
- **Combat** : percuter une cible la détruit, fait tomber sa plaque et laisse la réserve de graines inchangée ; les
  destructions survivent à une mort et s'effacent au milieu suivant ; la tête tue tant qu'il reste une plaque ; transpercer
  la tête à nu ne tue pas, mène à l'éclosion, au bonus et au milieu suivant ; une tige d'assaut ne compte pas parmi les
  tiges sacrifiées.
- **Menaces** : avertissement ≥ 1 s à tout rythme ; la défense vise la moitié de la pointe et ne couvre jamais plus de la
  moitié de sa salle ; silence hors de la salle ; le tir visé se fige avant de partir ; pas de tir pendant un coup ; pas de
  tir au boss 1.
- Banc complet vert, puis un combat joué contre chaque boss avant la mise en ligne.

## Hors de portée (v5.2.0 et après)

- **v5.2.0, images** : 5 à 7 images PixelLab par boss (corps, cibles intactes et détruites, tête blindée et à nu, plaques),
  un boss d'abord pour valider le style. Il reste 6 générations d'essai (+5 par jour) : abonnement ou génération étalée,
  à décider avec l'utilisateur au moment de la v5.2.
- Réglage fin des durées et des largeurs de canaux après playtest.
- Le temporisateur des lixiviats de la v4.17.0 (« on passe en attendant son moment ») suppose de pouvoir attendre ; à revoir au
  playtest, hors de cette spec.
