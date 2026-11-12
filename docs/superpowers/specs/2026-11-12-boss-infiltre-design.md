# Boss infiltré — design (v5.8.0)

Validé avec l'utilisateur le 2026-11-12, après son retour de jeu sur la v5.7.0.

## Retour de jeu (v5.7.0) et intention

- **Tourelles :** elles ne sont toujours pas une menace, et on ne les voit presque pas. Elles sont collées aux bords de l'écran (x ≥ 0,94),
  justement là où le zoom de la caméra rogne.
- **Points faibles :** ce sont des images sur un « rectangle gris ». Ils doivent être animés et intégrés à la machinerie.
- **Cœur :** un disque orange qui manque de définition et de détails.
- **Zones dangereuses :** elles vont un peu mieux, mais l'effet doit être sur un fond transparent (des jets de vapeur…) plutôt qu'un gros
  rectangle avec des lignes claires.
- **Impression d'ensemble :** tout semble encore disjoint, « on a l'impression d'affronter un parcours piégé plutôt qu'un Boss ».

**Intention de l'utilisateur :** « on s'infiltre en lui ». Les éléments du boss (tunnels, points faibles, murs, cœur) sont reliés par des
éléments qui donnent son échelle : des **premiers plans qui relient les éléments sans être des obstacles**. Derrière les couloirs, on garde
**la terre**, avec la machine dedans.

**Réussite :**
- on se sent à l'intérieur d'une machine immense et d'un seul tenant ;
- on comprend sans texte ce qu'il faut frapper ;
- les dangers se lisent comme des effets de la machine, pas comme des zones peintes ;
- les tourelles se voient et forcent à virer ;
- la géométrie et les collisions des murs ne changent pas ;
- le robot de test bat toujours chaque boss.

**Choix de l'utilisateur :**
- voir le boss « en entier » par l'échelle et les liaisons, pas par un dézoom ni un boss d'un seul écran ;
- la terre reste derrière ;
- tourelles en **rafales de 3 tirs** ;
- design ci-dessous approuvé tel quel ;
- tout est dessiné par le code : **aucune génération PixelLab**.

## 1. Structures de liaison (premier plan opaque, sans collision)

Trois familles, toutes fixées au monde (même vitesse que les murs, **sans parallaxe**) et dessinées devant le boss, les tuyaux et la pousse,
mais sous les menaces :

- **Poutrelles et entretoises :** poutrelles rivetées de 6 à 8 px d'art qui traversent un couloir d'un mur à l'autre, horizontales ou
  légèrement en biais, avec des goussets à chaque bout. C'est le squelette de la machine.
- **Engrenages :** grands engrenages (rayon de 12 à 22 px d'art) accrochés à un mur, à moitié dans le mur et à moitié devant le couloir. Ils
  tournent lentement, de plus en plus vite à mesure que les pompes cassent, puis s'arrêtent à la mort du boss.
- **Câbles et chaînes :** câbles qui pendent en chaînette d'un mur à l'autre, au-dessus ou au-dessous d'un passage.

**Placement :**
- calculé depuis les plans posés dans le monde, avec un hasard fixé par le niveau ;
- là où deux murs se font face à moins d'un écran de large, des ancrages sur les deux bords, espacés d'environ un demi-écran en hauteur ;
- les engrenages sur les bords de murs qui donnent sur un couloir ou une salle.

**Contraintes :**
- un élément ne recouvre jamais une pompe, la tête, une plaque ni une tourelle (à au moins 8 px de leurs polygones) ;
- au plus 2 éléments traversants par hauteur d'écran ;
- une poutre ou un câble ne traverse jamais la moitié frappée d'une salle pendant un coup ; on ne les place donc pas dans les salles, seulement
  dans les couloirs ;
- rien ne bouge quand le boss meurt : les éléments accrochés à un mur effondré disparaissent avec lui.

## 2. Pompes animées et intégrées

- Plus de rectangle gris ni d'image PixelLab pour la pompe : la cible est une **pompe dessinée par le code**, encastrée dans son mur (le
  polygone de la cible reste la zone de collision).
- Ce qu'on y voit :
  - un châssis riveté aux couleurs du biome ;
  - une **cuve vitrée** au centre, où le liquide jaune lumineux bouillonne (bulles qui montent) ;
  - un **volant** qui tourne ;
  - **deux pistons** qui montent et descendent en alternance ;
  - le tuyau qui part vers le cœur (v5.7.0).
- La cuve lumineuse reste la seule chose claire du boss : la cible évidente.
- **Pompe cassée :** cuve brisée, liquide répandu, volant arrêté, fumée (l'épave actuelle est gardée en plus).

## 3. Le cœur

Le disque orange devient un **réacteur dessiné par le code** :
- anneaux concentriques rivetés ;
- pales qui tournent ;
- noyau lumineux qui bat au rythme du flux qui arrive.

À chaque pompe cassée, il ralentit, tousse (un raté de battement) et crache des étincelles. À nu, il est grand ouvert, ses pales arrêtées,
et son noyau pulse fort.

L'image PixelLab de la tête (la toupie de la Bétonneuse) devient inutile et est retirée, comme celle de la pompe.

## 4. Zones dangereuses sur fond transparent

- **Plus d'aplat.** Pendant le coup, l'effet de la machine se dessine **par-dessus le décor** :
  - **vapeur :** jets blancs qui fusent de la paroi ;
  - **béton :** coulées grises qui tombent de la goulotte ;
  - **flammes :** langues orange et jaunes ;
  - **radiation :** éclairs et voile vert pointillé.
- **Lisibilité :** l'effet reste assez dense pour se lire comme une zone : chaque rangée de la moitié frappée contient de l'effet sur au
  moins 35 % de sa largeur, et le liseré d'avertissement garde le contour.
- Les machines au repos et leurs préparations (v5.7.0) ne changent pas.

## 5. Tourelles visibles et dangereuses

- **Visibilité :** les tourelles sont déplacées vers l'intérieur. Dans les plans, leur centre est à au moins 10 % de la largeur de chaque
  bord, toujours sur un mur de leur salle, et elles grossissent à 24 px d'art (socle, canon et lentille agrandis).
- **Menace :**
  - visée raccourcie (`shot.track` de 1 s à 0,7 s) ;
  - puis une **rafale de 3 tirs** en éventail serré (± 8°), espacés de 0,12 s ;
  - les écarts entre deux visées (`ramp[id].shot.gap`) ne changent pas.
- **Juge :** le robot de test (`bossfight.test.js`) doit toujours gagner chaque combat. S'il perd, on en parle avant de régler quoi que ce
  soit.

## Technique

- **Nouveaux fichiers de rendu** (moins de 400 lignes chacun) :
  - `src/render/boss-struts.js` : poutrelles, engrenages, câbles, avec leur placement et leur dessin, sous calque mis en cache sauf les
    engrenages qui tournent ;
  - `src/render/boss-core.js` : pompes et cœur dessinés par le code, appelés par `render/boss.js` à la place de `targetCore` / `head`.
- **`render/boss-machines.js`** : `strike()` dessine les effets sans aplat ; les tourelles passent à 24 px.
- **`play/boss-threats.js`** : rafale de 3 tirs. Les réglages vont dans `config.boss.shot` : `track`, `burst: 3`, `burstGap: .12`,
  `spread: 8°`.
- **`assets/boss/plans.js`** : positions des tourelles déplacées vers l'intérieur. Tests de plan existants, plus un test de marge de 10 %.
- **Images retirées :** le rôle `target` (pompe) et `head` (toupie) de la Bétonneuse dans `assets/boss/art.js`, et les deux images.
  `boss-skin` garde la matière, les plaques et le socle de tourelle.
- **Ordre du dessin :**
  1. terre ;
  2. anciennes tiges ;
  3. nappes ;
  4. corps du boss ;
  5. terre qui ronge ;
  6. tuyaux ;
  7. machines et tourelles ;
  8. pousse et effets ;
  9. **structures de liaison** ;
  10. menaces.
- **Réglages** dans `config.boss.struts` (espacement, épaisseur, rayon des engrenages, vitesse de rotation) ; **couleurs** dans
  `FP.palette.boss`.
- **Règles AGENTS.md :** réglages dans config.js, dessin dans render/*, fichiers sous 400 lignes, pas de code mort, en-têtes. index.html et
  dev/check.html ne reçoivent que des lignes `<script>`.

## Tests

- **Structures :**
  - aucune ne recouvre une pompe, la tête, une plaque ni une tourelle ;
  - aucune poutre ni câble dans une salle ;
  - au plus 2 traversants par écran ;
  - placement identique d'une tentative à l'autre ;
  - aucun solide créé ;
  - les éléments d'un mur effondré disparaissent ;
  - les engrenages accélèrent quand une pompe casse.
- **Pompes :** la cuve est la zone la plus claire ; quelque chose bouge (volant, pistons, bulles) entre deux images ; une pompe cassée a sa cuve
  brisée et son volant arrêté.
- **Cœur :** les pales tournent tant qu'une pompe vit, sont arrêtées à nu, et le noyau bat.
- **Coup sur fond transparent :** aucun aplat qui couvre la moitié ; chaque rangée a de l'effet sur au moins 35 % de sa largeur.
- **Tourelles :**
  - marge de 10 % dans les plans ;
  - taille de 24 px ;
  - rafale de 3 tirs espacés de `burstGap` dans l'éventail.
- **Robot :** il bat toujours chaque boss, au facteur d'étirement 1 et au maximum.
- **Banc et jeu :** banc complet vert, et vérification en jeu au format téléphone, avec captures envoyées à l'utilisateur.

## Hors de portée

- Dézoom de la caméra ou boss d'un seul écran : refusés, on donne l'échelle par les liaisons.
- Arrière-plan d'intérieur de machine : refusé, la terre reste.
- Nouvelles images PixelLab.
- Changements de la géométrie des murs.
