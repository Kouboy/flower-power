# Modules en partie normale (`?modules`) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** avec `?modules`, des modules du Lab posés dans les niveaux tirés au hasard, à partir du 2e niveau de chaque biome ; un ou plusieurs selon la hauteur du niveau.

**Architecture :** `world.labLevel` (un module) devient `world.modules` (une liste) ; chaque module porte son état de jeu (horloge, impulsion, tourelle) dans `module.live`, recréé avec le niveau. Un nouveau fichier `src/world/modules.js` choisit les modules, place leurs bandes, raccorde le chemin sûr à leurs portes et dit si une hauteur est dans une bande ; les placements tirés au hasard (obstacles, signature, nappes, limaces, pièces, bonus) refusent les bandes. Le Lab devient un niveau à un seul module.

**Tech Stack :** JS sans build (`window.FP`), banc `dev/check.html` (runner `focus.js` du scratchpad en ligne de commande).

**Spec :** `docs/superpowers/specs/2026-11-18-modules-en-partie-design.md`

## Contraintes globales

- `AGENTS.md` : réglages dans `src/core/config-lab.js` (`config.js` est plein) ; dessin dans `render/*` ; fichiers < 400 lignes (découper d'abord, dans une étape à part) ; pas de code mort ; en-têtes Lit/Écrit/Expose à jour ; `index.html` et `dev/check.html` ne reçoivent que des `<script>`.
- Sans `?modules` : **aucun tirage de plus** ; l'empreinte du test « lab: jeu normal intact » (`'2481539369,4256782594'`) ne bouge pas.
- Le Lab (`?lab=N`) garde son comportement : miroir un passage réussi sur deux, mesure, « LAB » au titre, enchaînement.
- Sélections par biome (ids de `assets/lab/circuits.js`) : friche `['gueule', 'dents-de-scie', 'herse', 'carrefour']` ; industrie `['peigne', 'sablier', 'grand-huit', 'carrefour']` ; decharge `['escalier', 'tetris', 'herse', 'dents-de-scie']` ; nucleaire `['tour-de-guet', 'escalier', 'grand-huit', 'peigne']`.
- Version : v5.14.0.

## Points d'attention de la revue

1. **Le niveau le plus court** (tous formats d'écran, `growK = 1`) : un module de 1,5 écran doit tenir avec ses marges. Test en tâche 3.
2. **Deux modules dans un niveau** : un tir ou une bouffée d'un module ne s'arrête pas parce que la pointe est dans l'autre ; chaque module a sa propre horloge. Test en tâche 2.
3. **Un obstacle tiré dont la boîte déborde dans une bande** (centre hors bande, coin dedans). Test en tâche 3 (sur la boîte, pas le centre).
4. **Mort dans un module en partie** : graine perdue, niveau retiré (nouveaux modules), rien ne reste des tirs et bouffées. Test en tâche 3.
5. **Le chemin sûr** : il doit entrer par la porte du bas et sortir par celle du haut, sans pente impossible en dehors des bandes. Test en tâche 3.

---

### Tâche 1 : découper `world/level.js` (aucun changement de comportement)

**Fichiers :** créer `src/world/level-hazards.js` (`placeToxics`, `placeLeaks` et leurs aides `leakPoints`, `nearSolid`, `nearToxic`, `nearLeak`, `toxicClear`) ; modifier `src/world/level.js` (393 lignes) ; `index.html` et `dev/check.html` (script après `world/level.js`).

**Interfaces :** produit `FP.levelHazards.{placeToxics(state, grid), placeLeaks(state, grid)}` ; `level.js` les appelle à la même place. Les aides partagées dont les deux fichiers ont besoin (`pickCell`, `cellPos`, `pathSamples`, `distToSafePath`, `segmentToSafePath`, `depthK`, `countFor`, `makeToxic`) restent dans `level.js` et sont exposées par `FP.level` si `level-hazards.js` les utilise.

- [ ] Déplacer le code tel quel ; en-têtes des deux fichiers à jour.
- [ ] Lancer `focus.js "." "^lab: jeu normal|^level|^hazard|^coins"`. Attendu : tout vert, empreinte inchangée.
- [ ] Commit `refactor: placement des nappes et limaces dans world/level-hazards.js`.

### Tâche 2 : une liste de modules par niveau (le Lab ne change pas)

**Fichiers :** `src/world/lab.js`, `src/play/lab-hazards.js`, `src/play/lab-pulse.js`, `src/play/lab-turret.js`, `src/play/lab-stats.js`, `src/play/flow.js`, `src/play/plant.js` (sols), `src/render/lab.js`, `src/render/lab-turret.js`, `src/world/level.js` (`world.modules = []` à la génération), `dev/tests/lab.test.js`, `dev/tests/lab-mechanics.test.js`.

**Interfaces :**
- `FP.labLevel.place(circuit, world, mirror, bottom?)` : `bottom` (monde) optionnel ; sans lui, la place du Lab d'aujourd'hui. `top = bottom − circuit.height × viewH`. Le trajet rendu (`path`, `alt`) ne garde la graine et la surface qu'au Lab (sans `bottom`) ; avec `bottom`, il va de la porte du bas à la porte du haut.
- `FP.labLevel.build(state, circuit, mirror, bottom?, index)` → `{ module, solids, toxics, leaks, coins }` : un module posé ; `module = { index, circuit, mirror, top, bottom, channelMin, walls, soils, lanes, path, alt, turrets, live }` avec `live = { t: 0, on: false, pulse: { active: false, next: 0, k: 0, shots: [] }, turret: { aims: {}, shots: [] } }` ; les limaces portent `lab: { period, phase, module: index }`.
- `FP.labLevel.generate(state, circuit?)` (Lab) : `world.modules = [module]`, le reste comme aujourd'hui.
- `FP.labLevel.moduleAt(world, y)` → le module dont la bande contient `y`, ou `null` (pur).
- `soilAt(world, x, y)` cherche dans tous les modules.
- `labHazards.update`, `labPulse.update`, `labTurret.update` bouclent sur `world.modules` ; chaque module ne s'active que si la pointe est dans **sa** bande ; à la sortie de sa bande (ou mort, ou éclosion), on vide **ses** tirs et bouffées. `FP.labPulse.speedFor(state, module)`, `FP.labTurret.pose(state, module, q)`.
- Plus de `state.labClock`, `state.labPulse`, `state.labTurret`, ni de `world.labLevel` : tout passe par `world.modules[i].live`.
- Le Lab (mesure, `labPasses` dans `flow.js`) lit `world.modules[0]` quand `run.lab`.
- `render/lab.js` : le calque peint les murs et sols de tous les modules (clé : ids, miroir, top de chaque module, taille du monde) ; `drawThreats` boucle sur les modules.

- [ ] Test d'abord, dans `lab-mechanics.test.js` : « modules: deux modules dans un niveau, chacun son horloge » — un niveau d'essai à deux modules (le module d'essai `LAB_FIXTURE` posé deux fois, bandes séparées, via `build` avec deux `bottom`) ; pointe dans le module du bas pendant 4 s : sa tourelle vise et tire, celle du haut ne vise pas (`live.on === false`) ; pointe passée dans le module du haut : les tirs du bas disparaissent, l'horloge du haut part de 0. Le voir échouer.
- [ ] Adapter les tests existants qui lisent `state.labClock`, `state.labPulse`, `state.labTurret` ou `world.labLevel` au nouveau nom (`world.modules[0]`, `.live`) sans changer ce qu'ils vérifient.
- [ ] Implémenter.
- [ ] Lancer `focus.js "." "^lab|^modules"`. Attendu : tout vert. Puis le banc complet sans robot en tâche de fond.
- [ ] Commit `refactor: plusieurs modules par niveau (world.modules)`.

### Tâche 3 : `?modules` — choisir, placer, raccorder, réserver

**Fichiers :** créer `src/world/modules.js` ; modifier `src/core/fp.js` (`modules: q.has('modules')`), `src/core/state.js` (`run.modules`), `src/core/config-lab.js`, `src/world/level.js`, `src/world/level-hazards.js`, `src/world/coins.js`, `src/play/powerups.js`, `src/ui/title.js` (mention « MODULES »), `index.html`, `dev/check.html` ; tests : créer `dev/tests/modules.test.js`.

**Réglages** (`config-lab.js`) : `FP.config.lab.modules = { sets: {…ids ci-dessus…}, from: 1 (run.step minimal), bottom: .35, top: .25, gap: .3 (× viewH : marges sous le module le plus bas, au-dessus du plus haut, entre deux), approach: .25 (× viewH : le chemin sûr rejoint la porte sur cette hauteur), pad: 24 (px : rien de tiré au hasard à moins de pad d'une bande), salt: 0x6d6f64 }` ; `FP.config.text.modules = 'MODULES'`.

**Interfaces :** `FP.levelModules` :
- `eligible(state)` → booléen : `run.modules && !run.lab && !run.boss && run.step >= from`.
- `pick(state, rng)` → `[{ circuit, mirror }]` : tirage sans remise dans la sélection du biome (`FP.config.milieux[run.milieu].id`), miroir au hasard ; autant que la hauteur le permet (au moins un).
- `bands(world, picks)` → `[bottom]` (monde), du bas vers le haut ; l'espace libre restant réparti en parts égales entre les marges et les intervalles. Pur.
- `generate(state)` : appelé par `level.generate` après la hauteur et **avant** le chemin sûr ; ne fait rien si `!eligible`. Tirage propre `FP.createRng((state.seed ^ salt ^ Math.imul(state.level, 2654435761)) >>> 0)` (`state.rng` n'est pas touché pour le choix). Remplit `world.modules`, ajoute murs et obstacles des modules à `world.solids`, leurs nappes et limaces à `world.toxics` / `world.leaks`.
- `joinPath(world)` : après `generateSafePath`, retire les nœuds du chemin sûr situés dans `[top − approach, bottom + approach]` de chaque module et les remplace par le trajet de référence du module (porte du bas → porte du haut).
- `blocked(world, y0, y1)` → vrai si `[y0, y1]` touche une bande élargie de `pad`. Pur. Faux quand `world.modules` est vide.
- Les pièces des modules sont ajoutées après `FP.coins.place` (une chaîne `easy` d'ancre `'lab'` par module).

**Refus des bandes :** `objectFits` (obstacles et signature, sur la boîte visible `FP.catalog.visibleFootprint`), `placeToxics` (`y ± max(rx, ry)`), `placeLeaks` (les extrémités et le corps), `coins.fits`, `powerups.spawnClear` appellent `FP.levelModules.blocked`.

- [ ] Tests d'abord, dans `modules.test.js` (aide : une partie `?modules` simulée en posant `state.run.modules = true`, `run.milieu`, `run.step`, puis `FP.level.generate`), les voir échouer :
  - « modules: paramètre » : `?modules` → vrai, absent → faux.
  - « modules: jamais au 1er niveau d'un biome, ni au boss, ni au Lab, ni sans ?modules » (step 0, `run.boss`, `run.lab`, sans le drapeau : `world.modules.length === 0`).
  - « modules: au moins un dès le 2e niveau, dans la sélection du biome, sans doublon » : 4 biomes × steps 1 et 2 × largeurs `[280, 360, 440]` × 6 graines.
  - « modules: le niveau le plus court a la place d'un module de 1,5 écran » (`growK = 1`, `viewH` de 480 à 1000 par pas de 40).
  - « modules: plusieurs quand le niveau grandit » : avec `plant.stemCount` et `score.flowers` assez hauts pour `growK` max, au moins un niveau à 2 modules ; bandes sans chevauchement, entre `surfaceY` et le départ.
  - « modules: rien de tiré au hasard dans une bande » : aucun solide hors murs et obstacles du module, aucune nappe, limace, pièce (hors celles du module) dont l'emprise touche une bande élargie de `pad` ; bonus refusés par `spawnClear` dans une bande.
  - « modules: le chemin sûr passe par les portes » : il contient la porte du bas et la porte du haut de chaque module ; dans la bande, il suit le trajet de référence ; hors bandes, chaque segment a une pente ≤ celle permise par `config.level.safePath.maxSlope` (sauf les segments de raccord, de hauteur `approach`).
  - « modules: une mort dans un module coûte une graine et retire le niveau » : pointe dans un mur d'un module, mort, `reserves − 1`, nouveau niveau sans tir ni bouffée restants.
  - L'empreinte « lab: jeu normal intact » et les tests du Lab restent verts.
- [ ] Implémenter ; « MODULES » au titre quand `?modules` (même place que « LAB »).
- [ ] Lancer `focus.js "." "^modules|^lab"`, puis le banc complet sans robot en tâche de fond. Attendu : tout vert.
- [ ] Commit `feat: modules du Lab en partie normale (?modules)`.

### Tâche 4 : version, docs, revue

**Fichiers :** `src/core/config.js` (`version: '5.14.0'`), `index.html` (titre), `dev/tests/state.test.js`, `CHANGELOG.md` (entrée v5.14.0 avec le lien `https://kouboy.github.io/flower-power/?modules`), `docs/architecture.md` (nouveaux fichiers, `world.modules`), `docs/lab/modules.md` (sélections par biome).

- [ ] Mettre à jour ; banc complet sans robot ; une partie lancée avec `?modules` dans le navigateur (capture d'un niveau à module, console sans erreur).
- [ ] Commit `chore: v5.14.0`.
- [ ] Revue finale de la branche (relecteur opus), une passe de corrections, puis demander à l'utilisateur avant de fusionner et de mettre en ligne.
