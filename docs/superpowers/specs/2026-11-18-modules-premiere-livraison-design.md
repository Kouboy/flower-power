# Modules de level design, première livraison — design

Validé avec l'utilisateur le 2026-11-18, après ses essais de l'Encounter Lab v5.12.

## Intention

**Le retour sur le Lab v5.12 :** les modules sont intéressants mais manquent de personnalité. On a souvent deux choix, dont un clairement
mauvais. Les sols brouillent la lecture du level design : on les reporte à plus tard, une fois les modules conçus.

**Ce qu'un module réussi doit produire, selon l'utilisateur :**
- le joueur a fait des choix intéressants, sous pression ;
- il a manœuvré ce qu'il avait prévu ET improvisé ;
- s'il échoue, il se dit « je sais ce que j'ai mal fait », jamais « comment je pouvais savoir ? ».

**La référence :** les boss. Des tirs arrivent par derrière, les impulsions de zone s'annoncent, un point faible attend. L'utilisateur y est
« dans le flow » : il sait exactement quoi faire, il échafaude à la volée des hypothèses plus ou moins risquées, il anticipe et improvise au
dernier moment.

**Le but d'un module :** le traverser pour éclore, et si possible ramasser des ÉcoCrédits au passage (pièces, frôlements, flyovers). Aucun
objectif nouveau.

**La mémoire :** une silhouette reconnaissable. Le joueur finit par mémoriser les modules et y navigue en terrain connu. Plus il joue, mieux
il joue.

**Répartition du travail :** l'utilisateur n'a pas le temps de dessiner. Claude conçoit cette première livraison. Si elle convainc, on
continue ainsi ; sinon, l'utilisateur reprend la main avec un éditeur.

**Une première passe audacieuse :** des propositions contrastées. On écrèmera ensuite ce qui est de trop.

## La feuille de route

1. La grammaire : ce document.
2. La première livraison : 10 modules jouables dans le Lab, chacun avec sa fiche.
3. Les playtests de l'utilisateur, puis son verdict : on continue, on corrige la grammaire, ou il reprend la main.
4. Ensuite, selon le verdict : l'éditeur ; l'intégration des modules dans les vrais niveaux, après un passage normal dans un biome ; plus tard,
   les sols comme couche supplémentaire.

Seules les étapes 1 et 2 sont l'objet de ce design.

## La grammaire

1. **Une silhouette nommable,** reconnaissable même en béton neutre, avec un nom qui la dit.
2. **Un tracé fixe et des rythmes fixes.** Chaque menace d'un module bat toujours la même mesure, pour qu'on puisse l'apprendre. Seule
   variation : le miroir, un passage sur deux.
3. **Toujours au moins deux bonnes options :** une sûre qui rapporte peu, une risquée qui rapporte (pièces, frôlements). Aucune option
   clairement mauvaise.
4. **De quoi planifier, puis improviser :** on voit le module avant d'y entrer, ce qui permet de faire un plan ; une menace annoncée
   oblige ensuite à l'ajuster.
5. **Des échecs compréhensibles :** tout ce qui tue est visible ou annoncé au moins 1 s avant de pouvoir toucher la pointe.
6. **Des pressions croisées :** devant (le tracé, les limaces, les nappes) et derrière (une tourelle, une impulsion), comme au boss, mais
   jamais plus de deux à la fois.
7. **Pas de sols** dans cette livraison.

## Les 10 modules (Friche, béton neutre)

| N° | Nom | Silhouette et idée | Le dilemme |
| --- | --- | --- | --- |
| 1 | La Gueule | Deux mâchoires dentelées qui se referment au centre de l'écran. | La gorge étroite, avec des dents à frôler et des pièces ; ou les joues, larges, où patrouillent des limaces. |
| 2 | L'Escalier | Des marches décalées ; une tourelle en bas tire dans le dos à intervalle fixe. | Chaque marche abrite : on règle ses virages pour être derrière une marche au tir. Le plus court passe à découvert. |
| 3 | Le Peigne | Quatre fentes verticales côte à côte ; une limace balaie la sortie de chacune, à son rythme. | On lit les rythmes et on choisit sa fente ; la plus serrée garde les pièces. |
| 4 | Le Sablier | Large, un goulot, large ; une impulsion monte dans le goulot en rythme. | Les poches latérales gardent des pièces, mais y aller retarde le passage du goulot. |
| 5 | Le Carrefour | Une croix : le couloir horizontal est traversé par des limaces, comme une circulation. | On passe la traversée en rythme ; une traînée de pièces sur le bras horizontal tente de dériver. |
| 6 | Les Dents de scie | Un couloir vertical aux deux parois en dents décalées, des nappes dans les creux. | Coller aux pointes pour les frôlements, ou rester au milieu. |
| 7 | Le Tetris | Des blocs imbriqués qui forment plusieurs itinéraires ; une tourelle en bas. | Des chemins abrités des tirs, d'autres plus courts et à découvert. |
| 8 | La Tour de guet | Une chambre ; deux tourelles en bas, une de chaque côté, en alternance ; des piliers d'abri. | Le centre rapporte, les bords protègent. |
| 9 | La Herse | Une rangée de piliers en travers ; une nappe entre certains ; des limaces qui patrouillent derrière. | Le choix du créneau, puis l'improvisation derrière. |
| 10 | Le Grand Huit | Deux grandes boucles en S enchaînées ; une impulsion remonte la voie intérieure. | La corde intérieure, courte mais menacée ; l'extérieure, longue et sûre. |

## Contraintes

- **Seulement ce qui existe déjà :**
  - les obstacles du catalogue ;
  - les limaces ;
  - les nappes toxiques ;
  - les impulsions du Lab ;
  - les pièces, frôlements et flyovers ;
  - la tourelle des boss : même comportement (visée qui suit, se fige, puis rafale), même dessin, même son, réutilisée hors des boss.
  - Aucune mécanique nouvelle.
- **La tige ne s'arrête jamais,** ne redescend pas et braque avec du retard. On voit environ un écran devant soi, et le zoom de cadrage
  rogne les bords.
- **Bande sûre** (`FP.camera.safeX`) : passages, menaces, pièces et tourelles restent dans la partie visible. Les murs peuvent toucher les
  bords du monde.
- **Passages** d'au moins `config.lab.channelMin` (48 px à 360 de large).
- **Règles AGENTS.md :**
  - réglages dans les fichiers de config, dessin dans `render/*` ;
  - fichiers de moins de 400 lignes, pas de code mort ;
  - en-têtes Lit, Écrit et Expose ;
  - `index.html` et `dev/check.html` : seulement des lignes `<script>` ;
  - une entrée au CHANGELOG.
- **Tests :** le banc sans les tests du robot, sans simulation lente (voir mémoire). L'utilisateur juge le jeu lui-même, en ligne.
- **Jeu normal :** sans `?lab`, rien ne change.

## Approches envisagées

- **Étendre le Lab (retenue).** Le format des circuits apprend à placer des obstacles, des limaces, des nappes et des tourelles, en plus des
  murs, des voies d'impulsion et des pièces. Le Lab enchaîne les 10 modules et garde sa mesure.
- **Des gabarits générés :** écarté. C'est trop tôt, et des variations casseraient la mémorisation.
- **Directement dans les vrais niveaux :** écarté. On doit pouvoir juger les modules isolément.

## Ce qui est décidé

- **Remplacement :** les 10 modules remplacent les 6 circuits du Lab v5.12. `?lab=N` va de 1 à 10 ; une valeur invalide ramène au module 1.
- **Miroir :** un passage sur deux du même module est retourné en miroir gauche-droite. Les murs, menaces, pièces et trajets sont
  retournés, ainsi que les angles des obstacles et des limaces. Choix de conception, après relecture :
  - le compteur est propre à chaque module ;
  - le premier passage est normal ;
  - une mort fait rejouer le même sens : on retente exactement ce qu'on vient de rater ;
  - seul un passage réussi fait changer de sens à la fois suivante.
- **Rythmes fixes :** chaque tourelle et chaque impulsion a, dans le module, sa période et son décalage de départ. Ils sont comptés à
  partir de l'entrée de la pointe dans le module, pour que le joueur retrouve la même mesure à chaque passage.
- **La tourelle hors des boss :**
  - elle a une position, un côté de console et un rythme ;
  - elle vise la pointe pendant au moins 1 s (grammaire, règle 5), se fige, puis tire sa rafale de 3 avec les réglages des boss ;
  - ses tirs s'arrêtent dans les murs du module ;
  - elle se dessine comme au boss (socle, canon qui pivote, lentille, ligne de visée) ;
  - elle fait les mêmes sons ;
  - elle n'agit que tant que la pointe est dans son module.
- **Placement fixe :** obstacles, limaces et nappes sont placés à la main, avec des positions, angles, trajets et rythmes fixes.
- **Limaces du Lab** (choix de conception, après relecture) : une patrouille périodique pure. Chacune fait un aller-retour sur son trajet,
  avec une période et une phase fixes, recalées à l'entrée de la pointe dans le module. Elles n'accélèrent pas et n'éclatent pas à la bière
  (il n'y a ni boutique ni bière au Lab). Ce code est isolé de celui des limaces du jeu normal, qui ne change pas.
- **Fiches :** un document `docs/lab/modules.md` donne la fiche de chaque module : nom, silhouette, idée, dilemme, ce qui rapporte, comment
  on peut échouer.
- **Les sols :** le mécanisme des sols reste dans le code, prêt pour plus tard. Aucun module de cette livraison n'en utilise.
- **Visuel :** béton neutre, comme le Lab v5.12. Les modules restent lisibles sans habillage par biome.
- **Version :** v5.13.0.

## Laissé au constructeur

- La géométrie précise de chaque module, dans la grammaire et les contraintes. Elle est vérifiée :
  - par des tests (traversée possible à toutes les largeurs, bande sûre, passages assez larges) ;
  - par des captures envoyées à l'utilisateur.
- Les rythmes et les placements précis.
- Le format exact des nouveaux éléments du module.
- La mise en œuvre de la tourelle hors des boss : réutiliser le code des boss ou en extraire une version commune, sans changer le
  comportement des boss.

## Tests attendus

Ces tests sont géométriques et temporels, pas des simulations de pilotage (choix de conception, après relecture). La survie face aux
menaces cadencées et l'intérêt des dilemmes sont jugés par l'utilisateur en jeu.

- **Chaque module :**
  - se traverse par au moins deux trajets de référence (les deux options du dilemme), à 280, 360 et 440 px. Les trajets passent à au
    moins `channelMin / 2` des murs et des obstacles fixes ;
  - tout ce qui compte est dans la bande sûre ;
  - les passages ont au moins `channelMin`.
- **Miroir :** un passage sur deux est retourné, et le module retourné se traverse aussi.
- **Tourelle :**
  - au moins 1 s de visée avant le premier tir possible ;
  - rafale de 3 tirs ;
  - les tirs s'arrêtent dans un mur ;
  - rien hors du module ou après une mort ;
  - le comportement des boss est inchangé (leurs tests existants passent).
- **Limaces, nappes et obstacles placés :** déterministes d'un passage à l'autre.
- **Rythmes :** la même mesure à chaque entrée dans le module.
- **Lab :** 10 modules, `?lab=1..10`, enchaînement, mort sans perte de graine, mesure par module.
- **Jeu normal intact :** la même empreinte de génération qu'avant.
