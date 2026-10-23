# Circuits de pièces — design (v4.5.0)

Statut : validé en séance de conception le 2026-10-23, à relire avant le plan.
Maquette : `docs/art/maquette-jetons.html` (jeton A, « la pièce rouillée », et le son proposé).

## 1. Intention

Les playtests sont positifs mais tièdes : c'est un peu monotone. Deux causes retenues :
- **une seule décision, esquiver** : le frôlement est sévère et rapporte peu, donc on joue prudent ;
- **des récompenses molles** : des ÉcoCrédits™ abstraits, peu de retour.

C'est le premier de trois sous-projets, dans cet ordre : **circuits de pièces** (ce document), boutique de fin de pousse (les crédits deviennent utiles), bonus posés sur le terrain. Les pièces apportent le plaisir immédiat et créent une décision à chaque instant (« je reste sur le chemin ou je dévie vers l'appât ? ») ; elles alimentent l'économie que la boutique exploitera.

Critères de réussite :
- environ deux chapelets en vue à tout moment, l'un facile, l'autre appât ;
- chaque pièce ramassée se sent : image, son, compteur ;
- le joueur audacieux (appâts + frôlements enchaînés) gagne nettement plus que le prudent ;
- les niveaux (obstacles, nappes, limaces) sont identiques à ceux d'avant : les pièces ont leur propre tirage ;
- tout en code (pas d'image ni de fichier son), le jeu marche toujours en double-clic (file://).

Décisions de l'utilisateur :
- **Mélange** (option C) : chapelets faciles sur le chemin sûr + chapelets appâts, plus riches, près du danger.
- **Gains** (option C) : bonus de chapelet complet **et** pièces qui entretiennent le combo.
- **Jeton A, la pièce rouillée** : cuivre oxydé, vert-de-gris, Ɇ gravé, coulure de boue (pas de vert dominant, pas de gris).
- **Densité régulière** (option B) : ~2 chapelets en vue.
- **Placement par motifs ancrés** (approche 1), décidé à la génération du niveau.
- **Cri du chapelet complet** : tiré au hasard parmi « KARMA ! », « GREEN ! », « 0 DÉCHET ! ».

## 2. Règles en jeu

### Placement (à chaque génération de niveau, donc à chaque pousse)

- Le niveau est découpé en **tranches d'une hauteur d'écran** (`world.viewH`), de la surface (moins une marge) jusqu'au-dessus de la graine (plus une marge). Chaque tranche reçoit **un chapelet facile et un chapelet appât**.
- **Facile** : 5 à 7 pièces, motif tiré parmi ligne, arc, zigzag, posé sur le chemin sûr (`FP.level.pathXAt`) : chaque pièce est à au plus `world.safeRadius` du chemin.
- **Appât** : 6 à 9 pièces, ancré sur un danger de la tranche, choisi parmi ceux qui existent :
  - **longer** un obstacle frôlable : arc à distance de frôlement (dans `FP.collision.grazeBand`), côté chemin ;
  - **passer entre** deux obstacles dont l'écart laisse passer la pousse : ligne au milieu de l'écart ;
  - **mordre** une nappe : ligne qui entre dans la nappe sur au plus un tiers de son rayon ;
  - **croiser** le trajet d'une limace : ligne en travers de son parcours.
  S'il n'y a aucun danger dans la tranche, l'appât devient un deuxième facile, décalé du chemin.
- Contraintes sur chaque pièce : jamais dans un obstacle (distance au polygone ≥ rayon de la pièce + 2), dans la largeur du monde avec une marge, hors de l'herbe de surface. Une pièce qui viole une contrainte est retirée ; un chapelet réduit à moins de 4 pièces est abandonné.
- Espacement des pièces d'un chapelet : 18 px.
- Tirage : générateur propre, `FP.createRng((seed ^ coins.salt ^ (level * 2654435761)) >>> 0)` ; **`state.rng` n'est jamais consommé**.

### Ramassage

- Une pièce est prise quand la pointe passe à **14 px ou moins** de son centre (mode `playing`).
- **Pièce** : 25 Ɇ × multiplicateur du combo en cours ; elle **entretient** le combo (le délai de 2 s repart) **sans** le faire monter d'un cran. Si aucun combo n'est en cours, elle vaut 25 Ɇ et ne lance pas de combo.
- **Chapelet complet** (toutes ses pièces prises) : +150 Ɇ (facile) ou **+400 Ɇ (appât)**, versés comme un gain normal (`FP.scoring.award`) : le combo monte d'un cran. Le cri est tiré au hasard parmi les trois expressions (tirage sensoriel, `Math.random`).
- **Chapelet raté** : dès qu'une de ses pièces non prises est à plus de 40 px sous la pointe. Plus de bonus ; ses autres pièces se ramassent toujours.
- Une nouvelle pousse (nouveau niveau) repart avec de nouvelles pièces.

### Retours

- Les pièces tournent (4 images : face, ¾, tranche, ¾), décalées d'une pièce à l'autre, 6 images/s.
- Prise : éclat de 4 à 6 pixels cuivrés, « tink » FM dont la note monte avec le rang de la pièce dans son chapelet (mi mineur pentatonique : mi5 sol5 la5 si5 ré6 mi6 sol6 la6, puis plafonné), le compteur d'ÉcoCrédits™ saute (comportement existant du HUD).
- Chapelet complet : le cri en lettres dorées qui rebondissent, près de la pointe, avec le montant ; accord en mi ; petite secousse (celle de `FP.scoring.award`).
- Pas de nombre flottant par pièce.

## 3. Architecture

- **`src/world/coins.js`** (nouveau) : `FP.coins.place(state)` appelé à la fin de `FP.level.generate`, écrit `state.world.coins` (`{ x, y, chain, taken }`) et `state.world.chains` (`{ kind: 'easy'|'bait', anchor: 'path'|'graze'|'gap'|'toxic'|'leak', total, got, missed, done }`). Fonctions de motif pures et testées.
- **`src/play/coins.js`** (nouveau) : `FP.coinPlay.update(state)` à chaque image de jeu (après la collision) : ramassage, chapelets ratés ou complets, gains par `FP.scoring`, événements `coin { x, y, rank }` et `chainDone { x, y, kind, amount, word }`.
- **`src/play/scoring.js`** : `FP.scoring.awardCoin(state, x, y, base)` — gain au combo en cours, délai entretenu, combo inchangé, événement `eco` avec `kind: 'coin'` et `quiet: true` (pas de nombre flottant).
- **`src/render/coins.js`** (nouveau) : pièces qui tournent (jeton A), éclats de ramassage (dans `state.fx`). Couche : après les obstacles, avant la tige.
- **Interface** : le cri du chapelet dans `src/ui/shout.js` ou un petit module voisin, lettres dorées qui rebondissent près de la pointe (même mécanique que le cri de mort).
- **Son** : recettes FM `coin` (note selon le rang) et `chain` (accord) dans `src/audio/sfx.js`, déclenchées sur les événements.
- **`src/core/config.js`** : `coins: { salt, sliceMargin, easy: { min: 5, max: 7 }, bait: { min: 6, max: 9 }, spacing: 18, pickup: 14, radius: 5, missBelow: 40, value: 25, chainBonus: { easy: 150, bait: 400 }, toxicBite: 1/3, minChain: 4, spinFps: 6 }` ; textes `text.chain: ['KARMA !', 'GREEN !', '0 DÉCHET !']`.
- `index.html` et `dev/check.html` : ajout des balises `<script>`.
- `effects.js` ne crée pas de nombre flottant pour un `eco` marqué `quiet`.

## 4. Tests (TDD, sous Node)

- Placement :
  - chaque tranche a un facile et un appât (ou deux faciles s'il n'y a pas de danger) ;
  - aucune pièce dans un obstacle ; toutes dans le monde ;
  - pièces des faciles à au plus `safeRadius` du chemin ;
  - pièces d'appât `graze` dans la bande de frôlement de leur obstacle ; `toxic` : au plus un tiers du rayon dans la nappe ;
  - même graine et même niveau → mêmes pièces ;
  - la suite de `state.rng` après `FP.level.generate` est identique avec et sans pièces.
- Ramassage :
  - prise à 14 px, pas à 15 ;
  - 25 Ɇ sans combo ; 25 × multiplicateur avec combo ; délai entretenu, cran inchangé ;
  - chapelet complet : 150 / 400 Ɇ, +1 cran, `word` ∈ les trois expressions ;
  - pièce laissée à plus de 40 px sous la pointe → chapelet raté, pas de bonus ensuite ;
  - pas de ramassage hors du mode `playing`.
- Bout en bout : la pointe suit un chapelet → événements `coin` de rang 0 à n−1 puis `chainDone`, score attendu.
- Rendu : chaque image du jeton reste dans son carré 11 × 11 ; aucune couleur de `FP.palette.danger`.

## 5. Hors champ

- La boutique de fin de pousse (sous-projet 2) et les bonus posés sur le terrain (sous-projet 3).
- Aimant à pièces, pièces mobiles, pièces dans les nappes au-delà du premier tiers.
- Changement des règles du frôlement (il reste une source de crédits ; un éventuel élargissement sera décidé au playtest).
