# Version playtest sans boss et difficulté en dents de scie — design (v4.13.0)

Spec parente : `docs/superpowers/specs/2026-10-27-milieux-design.md` (section « Le cycle »). Cette version ajoute un mode
de playtest sans boss, ouvert par l'adresse, et remplace la montée de difficulté au nombre de niveaux par une courbe en
dents de scie calée sur l'avancée dans les milieux, **commune aux deux versions** : ce qu'on règle après les playtests
sert tel quel à la version avec boss.

## But

Faire jouer des testeurs sur un parcours complet et lisible — 4 milieux, 6 pousses chacun, deux passages en boutique par
milieu — dont la difficulté monte sans plafonner à mi-partie, et récolter des réglages valables pour le jeu avec boss.

## Le mode playtest

- Ouvert par le paramètre d'adresse `?sansboss=1` (lu une fois au chargement, comme `seed`, `perf`…). Sans lui, le jeu
  reste celui de la v4.12 (à la courbe de difficulté près).
- **Un milieu** : 3 pousses réussies → bon de commande → 3 pousses → bon de commande → carton du milieu suivant. Jamais de
  niveau de boss ; la musique reste celle du milieu.
- **Fin** : l'éclosion de la 6ᵉ pousse du dernier milieu (site nucléaire) mène directement à l'écran de résultats, sans
  bon de commande. Pas de saison 2.
- **Écran de résultats** : le certificat de fin de partie, titre « SITE RÉHABILITÉ », la ligne des boss remplacée par les
  sites traversés (« 4/4 ») ; score et record comme d'habitude. On en repart comme après un game over.
- **Game over** : inchangé (réserves, dernière chance avec Graine Bio™ garantie, certificat) ; la ligne des sites montre
  les milieux traversés (« 2/4 »).
- **Records** : partagés avec la version avec boss (score, fleurs, milieu le plus lointain). Finir le playtest ne compte
  pas comme une saison terminée (`won` reste réservé à la version avec boss).
- **Repère** : « VERSION PLAYTEST » en petit sous le titre.

## La difficulté en dents de scie (les deux versions)

Une difficulté `d` de 0 à 1 remplace le compteur de niveaux comme entrée des réglages de génération. `d = 0` vaut le
niveau 0 d'aujourd'hui, `d = 1` le niveau 10 (fin de la rampe du chemin sûr de la v4.8, `safePath.hard.level`) : la
génération reçoit un **niveau équivalent** `d × 10` et tous les réglages par niveau existants (`radiusPerLevel`,
`perLevel`, `hard`, `lenPerLevel`…) restent inchangés.

- **Sommet** du milieu `m` (sur 4) : `(m + 1) / 4` → 0,25 ; 0,50 ; 0,75 ; 1.
- **Départ** : 0 pour le premier milieu, puis le sommet du milieu précédent moins la **descente** (0,15) → 0 ; 0,10 ;
  0,35 ; 0,60.
- **Montée** : linéaire du départ au sommet sur les pousses du milieu (6 sans boss, 3 avec boss) : la première pousse au
  départ, la dernière au sommet. Le niveau de boss se joue au sommet de son milieu.
- **Pollen** : chaque fleur en plus d'une éclosion avance la difficulté d'une pousse dans le milieu en cours, sans dépasser
  son sommet ; l'avance est perdue au milieu suivant.
- **Saison 2 et suivantes** (version avec boss) : `d = 1`, comme aujourd'hui où la rampe est saturée.
- Le compteur `state.level` reste un compteur : il sert toujours de graine (sillons, jetons) et au réveil du T-Rex.

Conséquence assumée : avec boss, la montée est plus douce qu'aujourd'hui (le maximum arrive au site nucléaire au lieu de
la zone industrielle). Les fuites, dont la longueur montait jusqu'au niveau 17, plafonnent au niveau équivalent 10.

## Réglages (config.js)

- `run.steps` (3, avec boss) ; `run.playtest = { steps: 6, shopEvery: 3 }`.
- `difficulty = { drop: .15, levelAtMax: 10 }`.
- Textes : sous-titre « VERSION PLAYTEST », ligne « Sites traversés » du certificat.

## Architecture

- `core/fp.js` : `FP.params.sansboss` (`?sansboss=1`).
- `play/difficulty.js` (nouveau) : `FP.difficulty.at(run, mode)` → `d` (pur) et `FP.difficulty.level(state)` → niveau
  équivalent pour la génération.
- `play/flow.js` : le déroulé du mode playtest (boutique toutes les 3 pousses, milieu suivant après 6, fin après le dernier
  milieu) et l'avance du pollen dans `state.run` (seul à l'écrire).
- `world/level.js`, `world/boss.js`, `world/coins.js` (si besoin) : lisent le niveau équivalent au lieu de `state.level`
  pour les réglages ; `state.level` reste pour les graines et le T-Rex.
- `ui/title.js` (repère), `ui/certificate.js` (titre de victoire, sites traversés).

## Tests

- Paramètre : `?sansboss=1` → `FP.params.sansboss` vrai ; absent ou autre valeur → faux.
- Déroulé playtest : 3 éclosions → bon de commande ; 3 de plus → bon de commande puis milieu suivant ; jamais de niveau de
  boss ; après la 6ᵉ éclosion du dernier milieu → écran de résultats, sans bon de commande ; game over inchangé.
- Version avec boss inchangée : 3 éclosions → bon de commande → boss → milieu suivant ; saison 2.
- Courbe : départs (0 ; 0,10 ; 0,35 ; 0,60), sommets (0,25 ; 0,50 ; 0,75 ; 1) aux deux longueurs de milieu ; boss au
  sommet ; pollen qui avance sans dépasser le sommet et remis à zéro au milieu suivant ; saison 2 à 1.
- Génération : à `d = 0` et `d = 1`, les mêmes réglages qu'aux niveaux 0 et 10 d'aujourd'hui.
- Certificat : titre de victoire et « 4/4 » en fin de playtest ; « sites traversés » au game over.
- Navigateur : une partie playtest jouée jusqu'au bout et une jusqu'au game over, sans erreur ; captures.

## Hors périmètre

Dangers signature des milieux, vraies images de boss, nouveaux réglages de prix ou de valeurs de jetons (ils viendront des
playtests).
