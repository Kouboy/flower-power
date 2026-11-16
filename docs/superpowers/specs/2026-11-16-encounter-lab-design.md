# Encounter Lab — design

Validé avec l'utilisateur le 2026-11-16, d'après son addendum de game design « Micro-circuits, sols à propriétés et menaces arrière »
(`Flower_Power_Addendum_GD_Micro_Circuits.docx`) et les réserves discutées ensemble.

## Intention

Les playtesteurs trouvent le jeu bien, mais pauvre en situations différentes. L'addendum fait le pari de créer de la profondeur par la
composition des situations, sans nouvelle commande :
- des micro-circuits courts, faits à la main ;
- des sols qui changent localement la conduite ;
- une menace qui vient d'en bas.

Avant de toucher au générateur des niveaux, on construit un **Encounter Lab** : un mode de test à part, `?lab=N`. Il enchaîne 6 circuits
et sert à juger **une seule chose : le plaisir de conduite et la qualité des décisions**.

Plus tard, un circuit pourra venir après un passage normal, sans circuit, dans un biome. Le Lab les isole.

## Objectifs

- 6 circuits jouables, un par niveau, tout de suite après un demi-écran de terre libre.
- Deux sols, l'argile et le sable, qui changent la conduite de façon sensible, lisible et sans brutalité.
- Une menace montante, l'impulsion, bien annoncée, qu'on évite en changeant de voie.
- Une mesure par circuit, que l'utilisateur peut relever chez ses testeurs.
- Un format de circuit réutilisable plus tard dans les vrais niveaux.

## Non-objectifs

- Ni kit visuel par biome ni identité Flower Power des circuits : béton neutre seulement.
- Pas d'intégration dans le générateur des niveaux ordinaires, ni dans les boss.
- Pas de troisième sol : les gravats ne seront testés que si l'argile laisse un manque.
- Pas d'autre menace que l'impulsion, et pas de nouvelle commande.

## Anti-objectifs

L'essai est raté, même s'il fonctionne, si :
- le joueur a l'impression que le jeu reprend le contrôle ;
- une mort survient sans avoir été lisible avant ;
- l'écran devient illisible sur téléphone ;
- le Lab altère le jeu normal (boss, difficulté, hauteur des niveaux, boutique).

## Contraintes du jeu actuel

- **La tige ne s'arrête jamais.** Elle monte entre 120 et 260 px/s, et on ne temporise qu'en serpentant. Toute menace s'évite donc en
  changeant de voie ou de côté, jamais en attendant.
- **Bande sûre** (v5.11.0, `FP.camera.safeX`) : tout élément qui compte reste dans la bande visible au zoom de cadrage, plus 12 px.
  - Il reste environ 290 px de large sur un écran de 375.
  - Les canaux font au moins 44 à 52 px.
  - D'où trois voies au maximum.
- **Mise en page 9:16 sur téléphone.** La caméra zoome à ×1,18, et davantage pendant un frôlement. La pointe est cadrée dans le haut de
  l'écran, donc on voit peu ce qui est en dessous d'elle.
- **Règles d'AGENTS.md :**
  - réglages dans `config.js`, dessin dans `render/*` ;
  - fichiers de moins de 400 lignes, pas de code mort ;
  - en-têtes Lit, Écrit et Expose ;
  - `index.html` et `dev/check.html` ne reçoivent que des lignes `<script>` ;
  - une entrée au CHANGELOG.
- **Robot de test :** il ne joue pas le Lab, et l'utilisateur teste lui-même. Le banc tourne sans les tests `bossFight:`.

## Approches envisagées

- **A. Un module de circuits à part (retenue).** Un format de données propre aux circuits, un générateur pour le Lab, des murs-obstacles
  en béton neutre, les sols dans le pilotage de la pousse, et l'impulsion bâtie sur le cycle avertissement → coup des défenses de boss.
  - Rien ne touche aux boss, et le format servira dans les vrais niveaux.
  - Il faut écrire un peu de neuf.
- **B. Réutiliser le moteur des boss.** Les circuits seraient des plans de boss sans pompes ni tête.
  - On profite des murs et des tests existants.
  - Mais il faudrait désactiver au cas par cas la musique, le HUD, les défenses, la cinématique et la victoire du boss, et les circuits
    ressembleraient aux boss.
- **C. Tracer les circuits avec les obstacles existants.** L'addendum l'écarte : les silhouettes irrégulières empêchent des formes nettes.

L'utilisateur a choisi **A**.

## Ce qui a été décidé

### Déroulé du Lab

- **Lancement :** `?lab=1` lance le circuit 1, `?lab=N` démarre au circuit N. Une valeur invalide (0, texte, plus de 6) ramène au
  circuit 1 (choix de conception).
- **Un niveau par circuit :** un demi-écran de terre libre au départ, le circuit, puis la surface et l'éclosion.
- **Enchaînement :** une éclosion passe au circuit suivant ; après le 6e, retour au 1er.
- **Mort :** on recommence le même circuit, avec des graines illimitées.
- **Exclusions :** ni boutique, ni boss, ni biome suivant.
- **Décor et ambiance :** terre, ciel et musique de la Friche, mais **sans obstacles, nappes ni limaces tirés au hasard** : seul le
  circuit compose le niveau.
- **Hauteur d'un niveau du Lab :** un demi-écran libre au départ, la hauteur du circuit, puis un demi-écran jusqu'à la surface. Ce calcul
  est propre au Lab et ne passe pas par `FP.state.levelHeightFor` du jeu normal (choix de conception).
- **Vitesse :** celle d'un premier niveau, sans rampe de difficulté ni accélération par pousse, pour que les passages se comparent
  (choix de conception).
- **Écran titre :** il montre une mention « LAB » tant que `?lab` est présent.

### Les 6 circuits

| N° | Nom | Ce qu'on teste |
| --- | --- | --- |
| 1 | Slalom nu | Une chicane en S sur terre normale, la référence. |
| 2 | Slalom argile | Le même tracé, avec des poches d'argile aux virages : on compare avec le 1. |
| 3 | La rigole | Un couloir de sable rapide et nerveux, avec quelques obstacles légers. |
| 4 | La fourche | Une voie courte et étroite en argile, contre une voie longue en sable avec une traînée de pièces. |
| 5 | La cheminée | Un couloir vertical à deux voies, avec des impulsions montantes en alternance. |
| 6 | Le combiné | Un entonnoir qui débouche sur une fourche : deux sols, une impulsion plus lente sur une seule voie, une tentation (pièces ou flyover). |

- Chaque circuit fait **de 0,5 à 1,5 écran** de haut.
- Il a une **entrée et une sortie lisibles**, et **une idée dominante**.

### Sols

- **Mécanisme :** une zone de sol modifie le pilotage de la pousse tant que la pointe y est, sur le modèle de l'état « contaminé » de
  `plant.js`.
- **Transition douce :** environ 0,3 s à l'entrée comme à la sortie. Sortir rend le contrôle normal.
- **Argile :**
  - braquage à environ 55 % ;
  - la pousse suit le doigt plus lentement ;
  - visuel : une poche ocre et lisse, au bord net et un peu plus clair.
- **Sable :**
  - vitesse ×1,35 environ ;
  - braquage ×1,4 environ ;
  - visuel : du grain pâle, des rides qui suivent la pente, des grains qui volent au passage de la pointe.
- **Lisibilité :** la frontière d'un sol est visible avant que la pointe l'atteigne.
- **Ce que le sable ne change pas :** ni la hauteur du niveau, ni la difficulté, ni la vitesse de défilement attendue en dehors de
  la zone.
- **Frôlement :** payé comme ailleurs. On jugera au Lab si le sable le rend trop facile.
- **Réglages :** tous les coefficients vont dans `config.js`, sous `lab.soils`.

### Impulsion montante

- **Une buse par voie,** au pied du couloir.
- **Annonce :** une seconde avant, la buse s'allume et siffle, avec le son d'avertissement des boss.
  - Si la buse est sous l'écran, une petite flèche lumineuse au bas de l'écran indique sa voie.
- **L'impulsion :** une colonne de gaz qui remonte la voie à environ **4 fois la vitesse de la pousse** (v5.12.1 ; 1,6 fois en v5.12.0 bloquait les deux voies à la fois), mortelle au contact, puis
  qui se dissipe en haut du circuit.
- **Cheminée :** les deux voies s'alternent.
- **Combiné :** une seule voie de la fourche, avec une impulsion plus lente.
- **Comportement attendu :** on survit en passant dans l'autre voie à temps.
- **Pression locale :** l'impulsion ne vit que dans son circuit, pas sur tout le niveau.
- **Déclenchement et cadence** (choix de conception, après la relecture) :
  - le cycle démarre quand la pointe entre dans la zone du circuit, et s'arrête quand elle en sort ou qu'elle meurt ;
  - le délai d'au moins 1 s se compte entre le début de l'annonce et le moment où la colonne atteint la hauteur de la pointe, pas
    entre l'annonce et le départ de la buse ;
  - la première impulsion part toujours dans la voie où la pointe n'est pas à son entrée. Ensuite, c'est l'alternance ;
  - une période d'environ 1,6 s entre deux départs, et une colonne d'environ 0,15 écran de long (v5.12.1 ; 0,4 en v5.12.0) ;
  - une cheminée d'environ 1,2 écran donne donc 3 à 4 impulsions par passage ;
  - réglages dans `config.js`, sous `lab.pulse`, à affiner au Lab.

### Mesure

Chaque passage d'un circuit enregistre :
- le temps passé dans le circuit ;
- les morts et leur cause ;
- les frôlements ;
- les pièces prises sur les pièces posées.

`?lab=…&stats` affiche, par circuit, un tableau à capturer à l'écran (choix de conception) :
- le nombre de passages réussis et de morts ;
- le temps moyen d'un passage réussi ;
- les frôlements et les pièces, en moyenne par passage ;
- les causes de mort, comptées.

`&stats=reset` vide les chiffres.

### Visuel des circuits

- **Murs :** en béton neutre (teintes grises, arêtes, quelques fissures et taches de terre), dans la terre de la Friche.
- **Ce qu'on évite :** les rivets, tuyaux et machines des boss, pour que les circuits ne ressemblent pas à des boss.

## Laissé au constructeur

- Le format exact d'un circuit : polygones des murs en proportions de la largeur, zones de sol, voies d'impulsion, traînées de pièces,
  trajets de référence pour les tests de passage.
- La mise en œuvre des murs, qui doivent compter comme des solides pour la collision et le frôlement.
- Le dessin du béton, de l'argile, du sable, de l'impulsion et de son annonce.
- Le stockage de la mesure (localStorage) et le tableau.
- La géométrie précise de chaque circuit, dans les contraintes ci-dessus. On la vérifie par des tests :
  - passage possible à toutes les largeurs d'écran ;
  - canaux d'au moins `channelMin` ;
  - tout dans la bande sûre.

## Tests attendus

- **Passage :**
  - chaque circuit se traverse, du départ à la surface, par un trajet de référence, à toutes les largeurs (280 à 440 px) et au facteur
    d'étirement maximal ;
  - aucun mur ni sol hors de la bande sûre.
- **Sols :** dans l'argile, le braquage atteint au plus environ 55 % ; dans le sable, la vitesse atteint environ ×1,35 ; tout revient à
  la normale en sortant, avec une transition progressive.
- **Impulsion :**
  - l'annonce précède toujours le danger d'au moins 1 s ;
  - une pointe dans l'autre voie n'est jamais touchée ;
  - rien ne reste actif hors du circuit ni après une mort.
- **Lab :**
  - `?lab=N` lance le bon circuit ;
  - une éclosion passe au suivant ;
  - une mort relance le même, sans perte de graine ;
  - ni boutique ni boss.
- **Jeu normal intact :** sans `?lab`, la génération, la boutique et les boss ne changent pas.
- **Mesure :** un passage enregistre ses chiffres, et le tableau les relit.
