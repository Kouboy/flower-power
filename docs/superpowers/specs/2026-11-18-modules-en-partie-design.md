# Modules du Lab en partie normale (`?modules`) — design

Date : 2026-11-18. Suite de la première livraison de modules (v5.13.x, `docs/superpowers/specs/2026-11-18-modules-premiere-livraison-design.md`,
fiches `docs/lab/modules.md`).

## Intention

Les 10 modules ont été conçus et testés seuls, au Lab (`?lab=N`). L'utilisateur veut voir ce qu'ils donnent **dans une vraie partie** :
mêlés au terrain tiré au hasard, à la vitesse réelle de la pousse, avec la pression d'une partie (graines, éco-crédits, boss). C'est un
essai : on joue, on juge, on garde ou on jette. Le jeu normal ne doit pas bouger tant que l'essai n'est pas adopté.

## Ce qu'on construit

Un interrupteur d'adresse `?modules` (jouable en ligne depuis `main`). Avec lui :

- **Où :** à partir du **2e niveau de chaque biome** (`run.step >= 1` : en partie normale, les niveaux 2 et 3 avant le boss ; en
  `?sansboss`, les niveaux 2 à 6). Jamais au 1er niveau d'un biome, jamais au niveau de boss, jamais au Lab.
- **Combien :** un module par niveau concerné ; **plusieurs dès que la hauteur du niveau le permet** (le niveau grandit avec la vitesse de
  la pousse). Pas de niveau allongé exprès pour faire de la place.
- **Lesquels :** une sélection par biome, tirage au hasard dans la sélection (pas deux fois le même module dans un niveau) :

  | Biome | Sélection |
  |---|---|
  | Friche | La Gueule, Les Dents de scie, La Herse, Le Carrefour |
  | Industrie | Le Peigne, Le Sablier, Le Grand Huit, Le Carrefour |
  | Décharge | L'Escalier, Le Tetris, La Herse, Les Dents de scie |
  | Nucléaire | La Tour de guet, L'Escalier, Le Grand Huit, Le Peigne |

- **Miroir :** tiré au hasard pour chaque module posé.
- **Règles :** celles de la partie normale. Une mort dans un module coûte une graine ; les pièces d'un module comptent comme les autres ;
  les frôlements des murs paient comme au Lab. Béton du Lab dans tous les biomes (pour l'essai).
- **Rythmes :** inchangés (réglés à la vitesse d'un premier niveau) ; la pousse va plus vite en partie, c'est justement ce que l'essai
  doit montrer.

Le reste du niveau (au-dessus, en dessous et entre les modules) est tiré comme aujourd'hui : chemin sûr, obstacles, nappes, limaces,
pièces, bonus, signature.

## Objectifs, non-objectifs, anti-objectifs

- Objectifs : jouer une partie complète avec des modules ; juger le raccord avec le terrain tiré, la difficulté par biome, et la place
  qu'ils prennent quand ils sont plusieurs.
- Non-objectifs : nouveaux modules, réglage des rythmes à la vitesse, habillage par biome, sols, mesure (`labStats`) en partie.
- Anti-objectifs : **sans `?modules`, le jeu normal doit être identique** (même niveau pour une même graine, vérifié par l'empreinte
  existante du banc) ; un module dont l'entrée ou la sortie serait bouchée par un obstacle tiré au hasard ; un objet tiré au hasard
  (obstacle, nappe, limace, pièce, bonus, signature) à l'intérieur d'un module ; un niveau que le chemin ne peut pas traverser.

## Contraintes

- Règles du dépôt (`AGENTS.md`) : réglages dans les fichiers de config (`config.js` plein : `config-lab.js`), dessin dans `render/*`,
  fichiers de moins de 400 lignes, pas de code mort, en-têtes Lit/Écrit/Expose, `index.html` reçoit seulement des `<script>`.
- Le Lab (`?lab=N`) continue de marcher et de passer ses tests.
- Le banc complet (hors robot de combat) reste vert.

## Approches considérées

- **A. Insérer les modules dans le niveau tiré (retenue par l'utilisateur).** Le générateur réserve des bandes, y pose les modules, fait
  passer le chemin sûr par leurs portes ; « le module du niveau » devient une liste de modules, chacun avec horloge, tourelles et
  impulsion. Le Lab devient un niveau à un seul module. Le plus gros chantier, mais le seul qui teste vraiment l'intégration.
- B. Un niveau-module seul intercalé entre deux niveaux normaux : presque gratuit, mais ni mélange avec le terrain ni plusieurs modules.
- C. A limité à un module par niveau : plus rapide, mais à refaire pour le multi, qui est l'essentiel.

## Ce qui est décidé du comment

- **Plusieurs modules par niveau :** `world.labLevel` (un seul) devient `world.modules` (une liste, éventuellement vide) ; chaque entrée
  porte ce que porte `labLevel` aujourd'hui (circuit, mirror, top, bottom, walls, lanes, turrets, path, alt…). Au Lab, la liste a un seul
  élément. Horloge, patrouille des limaces, tourelles et impulsion vivent **par module** ; chacun ne s'active que pendant que la pointe
  est dans sa bande (comme aujourd'hui pour le module unique).
- **Bandes :** placées du bas vers le haut, en gardant libre une marge en bas du niveau (le départ) et en haut (avant la surface), et
  un intervalle de terrain libre entre deux modules. Nombre = autant que la hauteur du niveau le permet, dans la limite de la sélection.
  Les valeurs (marges, intervalle) sont des réglages dans `config-lab.js`.
- **Raccord :** le chemin sûr tiré passe par la porte du bas et la porte du haut de chaque module (le premier et le dernier point de son
  trajet de référence) ; dans la bande, le chemin sûr suit le trajet de référence du module. Rien de tiré au hasard dans une bande, ni
  assez près de ses portes pour les boucher.
- **Interrupteur :** `?modules` lu comme les autres paramètres (`FP.parseParams`) ; sans lui, aucun tirage supplémentaire dans le
  générateur (la suite aléatoire du jeu normal est intacte).

## Précisions (relecture)

- **Comptage des niveaux :** `run.step` repart à 0 à chaque biome (`nextMilieu`, `play/flow.js`). Condition exacte : `?modules`, ni Lab ni
  boss, `run.step >= 1`.
- **Au moins un module :** garanti. Un niveau fait au moins 2,35 écrans, un module au plus 1,5 : les marges et l'intervalle sont réglés
  pour qu'un module de 1,5 écran tienne toujours dans le niveau le plus court (appel du constructeur).
- **Après une mort :** comme en partie normale, un nouveau niveau est tiré (`FP.level.generate`). Les modules sont donc tirés à nouveau,
  et leurs horloges, tourelles et impulsions repartent de zéro avec le nouveau niveau.
- **Largeur :** les modules sont en proportions de la largeur du monde, murs compris (ils ferment les bords). Rien à recentrer.
- **Horloge :** chaque module garde la règle du Lab : son horloge part quand la pointe entre dans sa bande ; la phase d'entrée est donc
  toujours la même.
- **Tirage :** sans `?modules`, aucun tirage de plus (empreinte identique). Avec, le choix des modules et du miroir vient d'un tirage à
  part, dérivé de la graine du niveau ; le reste du niveau change forcément (il évite les bandes) (appel du constructeur).
- **Ce qui passe à la liste :** tout ce qui lit `world.labLevel` (pose, horloge et limaces, tourelle, impulsion, dessin, frôlement des
  murs, sols). La mesure (`labStats`), le titre « LAB », l'enchaînement des modules et le miroir un passage sur deux restent propres au
  Lab (appel du constructeur).

## Laissé au constructeur

- Les valeurs des marges et de l'intervalle ; la façon de choisir la place des bandes quand il y a plus de place que nécessaire (au
  milieu, réparties…).
- Le rangement du code (nouveau fichier pour la pose dans le niveau normal, découpage de `world/lab.js` si besoin).
- La forme exacte des tests, pourvu qu'ils couvrent : empreinte du jeu normal sans `?modules` ; Lab inchangé ; avec `?modules`, aucun
  module au 1er niveau d'un biome ni au boss, au moins un aux niveaux suivants, sélection du bon biome, pas de doublon, bandes qui ne
  se chevauchent pas et tiennent dans le niveau, rien de tiré au hasard dans une bande, chemin sûr qui passe par les portes, deux
  modules actifs indépendamment (horloges, tourelles, impulsions).
