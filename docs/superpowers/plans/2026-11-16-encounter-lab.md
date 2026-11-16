# Encounter Lab — plan d'implémentation (v5.12.0)

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche
> par tâche. Les étapes sont des cases à cocher (`- [ ]`).

**But :** un mode de test `?lab=N` qui enchaîne 6 micro-circuits faits à la main, avec deux sols (argile, sable), une impulsion
montante sur deux voies et une mesure par circuit.

**Architecture :**
- **Données :** les circuits sont décrits dans `assets/lab/circuits.js`, sur le modèle des plans de boss (proportions de la largeur et de
  la hauteur du circuit).
- **Génération :** `world/lab.js` pose le circuit dans un niveau qui lui est propre : murs-solides, zones de sol, voies d'impulsion,
  pièces, trajet de référence.
- **Jeu :**
  - `play/flow.js` enchaîne les circuits ;
  - `play/plant.js` applique les sols ;
  - `play/lab-pulse.js` fait vivre l'impulsion ;
  - `play/lab-stats.js` mesure.
- **Rendu :** `render/lab.js` dessine le béton, les sols, les buses, l'impulsion et sa flèche.

**Pile :** JavaScript vanilla sous `window.FP`, sans build. Banc maison (`FP.test`, `FP.assert`, `FP.assertEqual`) chargé par
`dev/check.html`.

**Spec :** `docs/superpowers/specs/2026-11-16-encounter-lab-design.md`.

## Contraintes globales

- **AGENTS.md :**
  - réglages dans `src/core/config.js`, sous `lab` ; dessin dans `src/render/*` ;
  - fichiers de moins de 400 lignes, pas de code mort ;
  - en-têtes Lit, Écrit et Expose ;
  - `index.html` et `dev/check.html` ne reçoivent que des lignes `<script>` et la version ;
  - une entrée au CHANGELOG (v5.12.0).
- **Jeu normal intact :** sans `?lab`, la génération, la boutique, les boss, la difficulté et la hauteur des niveaux ne changent pas.
- **La tige ne s'arrête jamais :** toute menace s'évite en changeant de voie.
- **Bande sûre :** murs, sols, buses et pièces entre `FP.camera.safeX(W)` et `W − safeX(W)`.
- **Canaux :** au moins `lab.channelMin` = 48 px à 360 px de large, mis à l'échelle × W / 360 comme chez les boss.
- **Valeurs de la spec :**
  - argile : braquage ×0,55, suivi du doigt ×0,55 ;
  - sable : vitesse ×1,35, braquage ×1,4 ;
  - transition 0,3 s ;
  - impulsion : 1,6 fois la vitesse de la pousse, annonce d'au moins 1 s jusqu'à la hauteur de la pointe, période de 1,6 s, colonne de
    0,4 écran ; plus lente dans le combiné (`slow` = 0,7) ;
  - circuits de 0,5 à 1,5 écran ; demi-écran libre au départ, demi-écran jusqu'à la surface ;
  - `?lab` invalide → circuit 1.
- **Banc :** `node <scratchpad>/focus.js "." "^(?!bossFight)"`, **sans le robot**, comme l'a demandé l'utilisateur. Banc ciblé :
  `focus.js "." "<regex>"`.
- **Fichiers de travail :** CRLF dans le dossier de travail, LF dans git. Garder les fins de ligne en éditant.

## Points d'attention de la revue

1. **Mort pendant une impulsion :** à la relance du même circuit, aucune impulsion ni zone mortelle ne reste active, et le cycle repart
   de zéro. Test en tâche 5.
2. **Pointe qui sort d'un sol par le côté, en plein virage :** la transition reste progressive, sans saut de direction. Test en tâche 4.
3. **`?lab=7`, `?lab=abc`, `?lab=0`, `?lab=` :** circuit 1, sans erreur. Test en tâche 2.
4. **Écran le plus étroit (280 px) au facteur d'étirement maximal :** chaque circuit reste traversable. Test en tâche 1.
5. **Sans `?lab` :** la même graine donne exactement le même niveau qu'avant (JSON des solides, nappes, limaces et pièces). Test en
   tâche 2.

---

### Tâche 1 : format, génération et les 6 circuits

**Fichiers :**
- Créer : `assets/lab/circuits.js`, `src/world/lab.js`, `dev/tests/lab.test.js`.
- Modifier : `src/core/config.js` (bloc `lab`), `index.html` et `dev/check.html` (lignes `<script>` : les circuits après
  `assets/boss/plans.js`, `world/lab.js` après `world/boss.js`, le test après `bossintake.test.js`).

**Interfaces :**
- Produit `window.FLOWER_POWER_LAB = [circuit ×6]`, où
  `circuit = { id, name, height (écrans, de 0,5 à 1,5), walls: [poly], soils: [{ kind: 'argile' | 'sable', poly }], lanes: [{ x0, x1 }],
  pulse: null | { lanes: [indices], slow?: number }, coins: [[x, y]], path: [[x, y]] }`.
  - Coordonnées : x en proportion de la largeur, y de 0 (haut du circuit) à 1 (bas).
  - `path` est le trajet de référence, de bas en haut.
- Produit `FP.labLevel.place(circuit, world) → { top, bottom, walls: [poly monde], soils: [{ kind, poly }], lanes: [{ x0, x1 }],
  coins: [{ x, y }], path: [{ x, y }], channelMin }` (pur).
- Produit `FP.labLevel.heightFor(circuit, viewH) → px` : demi-écran, plus `circuit.height × viewH`, plus demi-écran, plus la marge de la
  surface du monde.
- Produit `FP.labLevel.generate(state)`, qui écrit `world.height`, `world.solids` (murs : `kind: 'lab'`, polygone, `grazeRadius` comme
  un obstacle moyen, `flyoverEligible: false`), `world.labLevel = { circuit, soils, lanes, top, bottom }`, `world.safePath`
  (= `path`), `world.coins` et `world.chains` (une traînée des `coins` du circuit), et vide les toxiques, limaces et bonus.
- Config : `lab: { channelMin: 48, soils: {...}, pulse: {...} }`. Les sols et l'impulsion servent aux tâches 4 et 5 ; leurs valeurs sont
  dans les contraintes globales.

- [ ] **Étape 1 : tests qui échouent** (`lab.test.js`), sur les 6 circuits, aux largeurs 280, 300, 360 et 440, avec et sans
  étirement maximal :
  - `lab: 6 circuits, dans l'ordre de la spec` : les identifiants sont `slalom`, `slalom-argile`, `rigole`, `fourche`, `cheminee`,
    `combine`, et chaque hauteur est entre 0,5 et 1,5 ;
  - `lab: le slalom argile reprend le tracé du slalom nu` : mêmes murs et même trajet ; seules les zones d'argile s'ajoutent ;
  - `lab: chaque circuit se traverse` : le trajet de référence reste à au moins `channelMin / 2` de tout mur, de son départ, sous le
    circuit, jusqu'à au-dessus du circuit ;
  - `lab: tout dans la bande sûre` : chaque point des murs, des sols, des voies et des pièces est entre `safeX` et `W − safeX`, pièces
    rayon compris ;
  - `lab: sols et voies attendus` :
    - slalom : aucun sol ;
    - slalom-argile : de l'argile seulement ;
    - rigole : du sable ;
    - fourche : de l'argile et du sable, avec les pièces côté sable ;
    - cheminée : exactement 2 voies et une impulsion sur les 2 ;
    - combiné : 2 sols, une impulsion sur 1 voie, `slow` < 1 et des pièces ;
  - `lab: hauteur du niveau` : `world.height` vaut `heightFor` ; le circuit commence à un demi-écran au-dessus du départ.
- [ ] **Étape 2 : lancer** `focus.js "." "lab:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter** le format, `place`, `heightFor` et `generate`, puis **dessiner la géométrie des 6 circuits** selon la
  spec : une idée dominante par circuit, une entrée et une sortie lisibles, 3 voies au plus. La fourche a une voie courte et étroite en
  argile, et une voie longue en sable avec ses pièces. La cheminée a deux voies séparées par une cloison, avec une buse au pied de
  chacune.
- [ ] **Étape 4 : lancer** `focus.js "." "lab:"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: format et géométrie des circuits du Lab`.

### Tâche 2 : le mode Lab (lancement, enchaînement, morts)

**Fichiers :**
- Modifier : `src/core/fp.js` (`parseParams`), `src/core/state.js` (`run.lab`), `src/world/level.js` (`generate` délègue au Lab),
  `src/play/flow.js` (éclosion, mort), `src/play/plant.js` (`speed`), `src/ui/title.js` (mention « LAB »), `src/core/config.js`
  (`text.lab`).
- Tests : `dev/tests/lab.test.js`, `dev/tests/state.test.js` si besoin.

**Interfaces :**
- `FP.params.lab` vaut un entier de 1 à 6, ou `null`. `FP.params.stats` vaut `true`, `'reset'` ou `false`.
- `FP.state.createRun` pose `run.lab = FP.params.lab` (index de circuit 1..6, ou `null`).
- Si `state.run.lab`, alors :
  - `FP.level.generate(state)` appelle `FP.labLevel.generate(state)` ;
  - `bloom` pose `run.lab = run.lab % 6 + 1` et `flow.next = null` : ni boutique ni boss, et la suite passe par `afterShop` ;
  - `die` ne retire pas de graine ;
  - `speed()` ignore la rampe par pousse et par fleur, mais garde la rampe pendant la pousse.

- [ ] **Étape 1 : tests qui échouent :**
  - `lab: paramètre` : `parseParams('?lab=3').lab === 3`, et `?lab=7`, `?lab=abc`, `?lab=0`, `?lab=` donnent tous 1 ;
    `parseParams('').lab === null` ; `?lab=2&stats=reset` donne `stats === 'reset'` ;
  - `lab: une éclosion passe au circuit suivant, le 6e ramène au 1er`, sans `shopOpen` ni boss ;
  - `lab: une mort relance le même circuit sans perdre de graine` ;
  - `lab: vitesse d'un premier niveau` : `speed` est la même avec `stemCount` à 1 et à 30, en mode Lab ;
  - `lab: jeu normal intact` : sans `run.lab`, le JSON des solides, nappes, limaces et pièces d'une graine fixe est identique à une
    empreinte calculée avant la modification (la noter en dur dans le test au moment de l'écrire).
- [ ] **Étape 2 : lancer** `focus.js "." "lab:|state:|flow:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter** les branchements. Le titre affiche `config.text.lab` (« LAB ») sous le logo quand `FP.params.lab`
  existe, comme la mention de la version playtest.
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: mode Lab (?lab=N), un niveau par circuit`.

### Tâche 3 : dessin du béton et des sols

**Fichiers :**
- Créer : `src/render/lab.js` (murs et sols ; buses et impulsion en tâche 5).
- Modifier : `src/render/frame.js` (appel après `FP.obstacles.draw`), `src/render/palette.js` (`lab: { concrete: [4], crack, dirt,
  argile: [3], sable: [3] }`), `index.html`, `dev/check.html`.
- Tests : `dev/tests/lab.test.js`.

**Interfaces :**
- `FP.labRender.draw(g, state)` dessine :
  - les sols d'abord, dans un calque refait par circuit : l'argile ocre et lisse au bord plus clair, le sable en grain pâle avec des rides
    ;
  - puis les murs en béton neutre (arêtes, fissures, taches de terre ; ni rivets ni tuyaux).
  - Rien n'est dessiné hors du mode Lab.
- `FP.labRender.sandGrains(state)` : les grains qui volent au passage de la pointe dans le sable, sur le modèle des particules existantes.

- [ ] **Étape 1 : tests qui échouent :**
  - `labRender: béton et sols dessinés, rien hors Lab` : avec une toile espion, on trouve des pixels `palette.lab.concrete`,
    `palette.lab.argile` et `palette.lab.sable` sur le circuit `fourche`, et aucun hors Lab ;
  - `labRender: la frontière d'un sol se voit` : le bord d'une zone d'argile porte la teinte claire `palette.lab.argile[0]`.
- [ ] **Étape 2 : lancer** `focus.js "." "labRender"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "labRender|lab:"`. Résultat attendu : tout est vert. Puis faire une capture en jeu de chaque
  circuit au format téléphone (Playwright, dossier `.playwright-mcp/`).
- [ ] **Étape 5 : commit** `feat: béton et sols du Lab dessinés`.

### Tâche 4 : les sols changent la conduite

**Fichiers :**
- Modifier : `src/play/plant.js` (`speed`, le braquage, le suivi du doigt), `src/core/config.js` (`lab.soils`), `src/core/state.js`
  (`plant.soil`).
- Tests : `dev/tests/lab.test.js`.

**Interfaces :**
- Produit `FP.labLevel.soilAt(world, x, y) → 'argile' | 'sable' | null` (pur).
- `state.plant.soil = { argile: 0..1, sable: 0..1 }` : le mélange de chaque sol suit en `lab.soils.blend` = 0,3 s la présence de la
  pointe.
- Avec ce mélange :
  - braquage (`steerControlled`, `steerIdle`) × `lerp(1, 0.55, argile) × lerp(1, 1.4, sable)` ;
  - suivi du doigt (`guideRate`) × `lerp(1, 0.55, argile)` ;
  - vitesse × `lerp(1, 1.35, sable)`.
- La hauteur du niveau et la difficulté ne lisent pas le sol.

- [ ] **Étape 1 : tests qui échouent :**
  - `lab: l'argile ralentit le braquage, le sable accélère` : la pointe immobile au centre d'une zone, après 1 s. Dans l'argile, le
    braquage effectif vaut 0,55 ± 0,02 fois la normale. Dans le sable, la vitesse vaut 1,35 ± 0,02 fois, et le braquage 1,4 ± 0,02 fois ;
  - `lab: transition douce` : à 0,1 s de l'entrée, le mélange est entre 0,2 et 0,5. En sortant par le côté, en plein virage, l'angle de
    `dir` ne saute jamais de plus de 4° d'une image à l'autre à 60 images/s. Une seconde après la sortie, tout est revenu à 1 ;
  - `lab: hors Lab, aucun sol` : `soilAt` vaut `null` sans `world.labLevel`, et le pilotage reste celui d'avant (même `dir` après 60 pas
    qu'avec le code actuel, valeur notée en dur).
- [ ] **Étape 2 : lancer** `focus.js "." "lab:|plant"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: argile et sable changent la conduite`.

### Tâche 5 : l'impulsion montante

**Fichiers :**
- Créer : `src/play/lab-pulse.js`.
- Modifier : `src/core/loop.js` (`UPDATE_ORDER` : `labPulse` après `bossThreats`), `src/core/state.js` (`labPulse`), `src/core/config.js`
  (`lab.pulse`, `text.death.pulse` = « soufflée par le gaz »), `src/render/lab.js` (buses, colonne, flèche), `src/audio/audio.js`
  (`labWarn` → le son `bossWarn` sur 1 s ; `labPulse` → `bossShot`), `index.html`, `dev/check.html`.
- Tests : `dev/tests/lab.test.js`.

**Interfaces :**
- Produit `FP.labPulse.update(state, dt)`, qui gère `state.labPulse = { active, next, lane, shots: [{ lane, y, warnT }] }`.
  - Le cycle démarre quand la pointe entre entre `top` et `bottom` du circuit, et s'arrête à la sortie, à la mort et à la génération.
  - Chaque colonne est un solide `kind: 'pulse'` dans `world.solids`, rectangle de la largeur de sa voie et haut de 0,4 écran.
  - Événements : `labWarn { lane }`, puis `labPulse { lane }`.
- Règles :
  - la première impulsion part dans la voie où la pointe n'est pas, puis les voies alternent ;
  - période de 1,6 s ;
  - vitesse de 1,6 × la vitesse de la pousse × `slow` ;
  - l'annonce commence assez tôt pour durer au moins 1 s avant que la colonne atteigne la hauteur de la pointe.
- Dessin : la buse s'allume pendant l'annonce ; la colonne de gaz est semi-transparente, avec des volutes. Une flèche lumineuse au bas de
  l'écran, sur la voie, apparaît quand la buse est sous l'écran.

- [ ] **Étape 1 : tests qui échouent :**
  - `lab: l'impulsion est annoncée au moins 1 s avant d'atteindre la pointe` : on simule la cheminée avec la pointe dans chaque voie et
    chaque vitesse de la pousse ; entre `labWarn` et le contact possible avec la hauteur de la pointe, il y a toujours au moins 1 s ;
  - `lab: la première impulsion vise l'autre voie, puis elles alternent` ;
  - `lab: une pointe dans l'autre voie n'est jamais touchée` ;
  - `lab: une impulsion tue` (cause `solid`, kind `pulse`, texte de mort) ;
  - `lab: rien ne reste après une mort, une génération ou hors du circuit` : aucun solide `pulse` actif, `labPulse` remis à zéro ;
  - `lab: le combiné, une seule voie et plus lent` ;
  - `lab: hors Lab, rien` : `update` ne fait rien sans `world.labLevel`.
- [ ] **Étape 2 : lancer** `focus.js "." "lab:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert. Puis faire une capture en jeu de la cheminée,
  avec une impulsion en vol et une annonce.
- [ ] **Étape 5 : commit** `feat: impulsion montante du Lab`.

### Tâche 6 : la mesure

**Fichiers :**
- Créer : `src/play/lab-stats.js`, `src/ui/lab-stats.js`.
- Modifier : `src/core/loop.js` (lecture des événements), `src/ui/ui.js` (le tableau en mode menu quand `FP.params.stats`),
  `index.html`, `dev/check.html`.
- Tests : `dev/tests/lab.test.js`.

**Interfaces :**
- Produit `FP.labStats.record(state, events)`. Il suit le passage en cours (temps passé entre `top` et `bottom`, frôlements payés, pièces
  prises sur pièces posées) et l'enregistre à l'éclosion ou à la mort.
- Stockage : `localStorage['flower_power_lab_stats'] = { [id]: { runs, deaths, causes: { [kind]: n }, time, grazes, coins, coinsTotal } }`.
  - Chaque accès est entouré d'un `try/catch` ; sans stockage, la mesure vit en mémoire.
- Produit `FP.labStats.summary() → [{ id, name, runs, deaths, avgTime, grazesPerRun, coinsPerRun, causes }]` (pur sur le stockage).
- Produit `FP.labStats.reset()`, appelé au chargement quand `FP.params.stats === 'reset'`.
- Produit `FP.labStatsView.draw(g, state)`, un tableau lisible au format téléphone : une ligne par circuit.

- [ ] **Étape 1 : tests qui échouent :**
  - `lab: un passage réussi enregistre temps, frôlements et pièces` ;
  - `lab: une mort compte avec sa cause` ;
  - `lab: summary fait les moyennes, reset vide` ;
  - `lab: sans localStorage, rien ne casse`.
- [ ] **Étape 2 : lancer** `focus.js "." "lab:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert. Puis faire une capture du tableau.
- [ ] **Étape 5 : commit** `feat: mesure du Lab par circuit`.

### Tâche 7 : version, doc et vérification

**Fichiers :** `src/core/config.js` (version 5.12.0), titres de `index.html`, `dev/tests/state.test.js`, `CHANGELOG.md` (avec le lien
`?lab=1` et `&stats`), `docs/architecture.md` (nouveaux fichiers, ordre de mise à jour et de dessin).

- [ ] **Étape 1 :** monter la version et écrire la doc.
- [ ] **Étape 2 :** lancer `focus.js "." "^(?!bossFight)"`. Résultat attendu : tous les tests passent.
- [ ] **Étape 3 :** jouer chaque circuit au format téléphone. Vérifier qu'il n'y a pas d'erreur dans la console. Envoyer les captures à
  l'utilisateur.
- [ ] **Étape 4 :** revue finale de la branche par un sous-agent opus. Pour chaque problème important, un test qui échoue puis le
  correctif.
- [ ] **Étape 5 : commit** `chore: v5.12.0 (Encounter Lab)`. Ensuite, demander à l'utilisateur avant tout merge ou push.
