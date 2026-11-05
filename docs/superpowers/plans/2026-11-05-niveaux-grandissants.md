# Niveaux qui s'agrandissent avec la vitesse — plan d'implémentation (v5.3.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la hauteur de chaque niveau suit la vitesse de lancement de la pousse (durée de traversée ≈ constante), avec la même densité d'obstacles par écran, boss compris.

**Architecture:** une fonction pure `FP.level.heightFor(state)` calcule `{ height, k }` ; `FP.level.generate` l'applique à `state.world` avant de construire le niveau (normal ou boss) ; les quantités de `world/level.js` sont calculées sur la hauteur de départ puis multipliées par `k` ; le reste du jeu lit déjà `world.height`.

**Tech Stack:** JavaScript sans module ni build (scripts sur `window.FP`), banc `FP.test` / `FP.assert` / `FP.assertEqual` (`dev/check.html`, `node dev/run-checks.js`, ≈ 10 min).

**Spec:** `docs/superpowers/specs/2026-11-05-niveaux-grandissants-design.md`

## Global Constraints

- Lire `AGENTS.md` et `docs/architecture.md` ; en-têtes Lit / Écrit / Expose à jour dans chaque fichier `src/**` touché.
- Réglages dans `config.js` uniquement ; aucun visuel dans `play/*` ; fichiers < 400 lignes ; pas de code mort ; `index.html` / `dev/check.html` : seulement des lignes `<script>` (et le titre de version).
- `config.world.growMax = 2.2` ; `k = clamp(v / v0, 1, growMax)` ; `v = min(speed.max, speed.base + perStem × (n − 1) + perFlower × flowers)` avec `n = stemCount + 1` (la pousse qui va partir), sans `liveRamp`, sans `framing`, sans doigt / compost / corruption ; `v0 = speed.base` ; `height = round(H0 × k)`, `H0 = worldHeightFor(viewH)` (la hauteur actuelle).
- Le tout premier niveau d'une partie a exactement la hauteur actuelle.
- La hauteur est décidée à chaque `FP.level.generate` (éclosion, mort, boss, Lobbying), figée ensuite ; le redimensionnement (`FP.state.applyView`) ne touche pas la hauteur du niveau en cours.
- Densité constante par écran : quantités d'obstacles, nappes et lixiviats × `k`.
- Commits en français, préfixes `feat(niveaux):` / `test(niveaux):` / `docs:`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ne pas fusionner ni pousser.

## Review Focus

- **Redimensionnement entre deux niveaux** : `H0` doit suivre la nouvelle vue au niveau suivant, sans casser la caméra du niveau en cours. → Tâche 1 : test `applyView` puis `generate`.
- **Caméra et graine après un changement de hauteur** : la pousse doit repartir du fond du nouveau niveau, caméra en bas (`FP.plant.prepare` après `generate`). → Tâche 1 : test du déroulé après éclosion et après mort.
- **Écran étroit (280 px) au facteur 2,2** : chemin sûr, chevauchements et T-Rex restent tenus. → Tâche 2.
- **Boss étirés** : canaux, flood fill « seule la tête », entrées esquivables et combat complet au facteur 2,2. → Tâche 3.
- **Perf du cache de terre** à ≈ 900 pixels d'art de haut. → Tâche 4 : rendu sans erreur à `k = 2,2` ; vérification `?perf=1` notée pour le playtest.

---

### Task 1: La règle de hauteur

**Files:**
- Modify: `src/core/config.js` (`world.growMax: 2.2`), `src/core/state.js` (`world.baseHeight`, `world.growK`), `src/world/level.js` (`heightFor`, application dans `generate`)
- Test: `dev/tests/grow.test.js` (nouveau, ligne `<script>` dans `dev/check.html`)

**Interfaces:**
- Produces: `FP.level.heightFor(state) → { height: number, k: number }` (pur) ; `state.world.baseHeight` (= `H0`, posé par `createRun` et remis à jour depuis `world.viewH` à chaque `generate`) ; `state.world.growK` (`k` du niveau en cours) ; `world.height` écrit par `generate` avant toute construction (y compris le niveau de boss).
- Helper de test exporté par le fichier de test (nom unique, `growRun(W, stems, flowers, seed = 7)`) : run créé à `{ W, H: round(W·16/9) }`, `plant.stemCount = stems`, `score.flowers = flowers`, puis `FP.level.generate`.

- [ ] **Step 1: Write the failing tests** (`dev/tests/grow.test.js`) :
  - `grow: premier niveau à la hauteur actuelle` — `createRun` + `startRun` : `world.height === worldHeightFor(viewH)` (même valeur qu'avant le chantier), `growK === 1` ;
  - `grow: la hauteur suit la vitesse de lancement` — `heightFor` strictement croissant avec `stemCount` puis avec `flowers` ; `k = v / v0` exact avant le plafond (ex. `stemCount = 4, flowers = 2` → `v = 120 + 6·4 + 6·2 = 156`, `k = 1.3`) ;
  - `grow: plafond à growMax` — `stemCount = 40` → `k === 2.2`, `height === round(H0 × 2.2)` ;
  - `grow: durée de traversée à peu près constante` — `(height − surfaceY) / v` à `k = 1` et `k = 2.2` diffèrent de moins de 10 % ;
  - `grow: figée pendant un niveau, recalculée à la génération suivante` — avancer la pousse (`FP.plant.update` 3 s) : `world.height` inchangé ; éclosion par le vrai déroulé (helper de `dev/tests/flow.test.js` ou équivalent) puis nouveau niveau : hauteur recalculée ; même chose après une mort ;
  - `grow: après un changement de hauteur, la pousse repart du fond, caméra en bas` (graine à `height − seedOffset`, `camera.y === height − viewH`) ;
  - `grow: redimensionnement — le niveau en cours garde sa hauteur, le suivant suit la nouvelle vue` (`applyView` puis `generate`) ;
  - `grow: le niveau de boss prend aussi la hauteur calculée`.
- [ ] **Step 2:** `node dev/run-checks.js` — les nouveaux tests échouent.
- [ ] **Step 3:** implémenter `heightFor` et son application en tête de `generate` (avant `if (state.run.boss)`) ; `createRun` pose `baseHeight = height` et `growK = 1`.
- [ ] **Step 4:** suite complète verte (les tests existants qui supposent une hauteur fixe sur plusieurs niveaux sont adaptés au calcul, jamais affaiblis).
- [ ] **Step 5:** commit `feat(niveaux): la hauteur du niveau suit la vitesse de lancement`.

### Task 2: Densité constante par écran

**Files:**
- Modify: `src/world/level.js` (`worldScaleOf` sur `baseHeight`, quantités × `growK` dans `placeSolids`, `countFor`)
- Test: `dev/tests/grow.test.js`

**Interfaces:**
- Consumes: `world.baseHeight`, `world.growK`, `growRun` (tâche 1).

- [ ] **Step 1: Write the failing tests** :
  - `grow: densité par écran stable entre k = 1 et k = 2,2` — moyenne sur 12 graines à W 440, à niveau de difficulté égal (`state.difficulty` fixé) : obstacles, nappes, lixiviats et jetons divisés par `(height − surfaceY)` ; écart relatif < 15 % entre `k = 1` et `k = 2.2` pour chacun ;
  - `grow: au facteur 2,2, règles des niveaux tenues` — à W 280 et 440, graines 1 à 8 : aucun chevauchement visuel, chemin sûr dégagé (mêmes assertions que `dev/tests/level.test.js`), nappes hors du chemin, lixiviats franchissables (non `crossing` à distance, `crossing` libres au bout de leur course) ;
  - `grow: au facteur 2,2, le T-Rex trouve sa place` (même critère que le test existant, milieu nucléaire, W 360).
- [ ] **Step 2:** lancer — le test de densité échoue (plafond `worldScaleMax`).
- [ ] **Step 3:** implémenter : `worldScaleOf` calcule sur `baseHeight` (niveau de départ), puis `placeSolids` et `countFor` multiplient par `world.growK`.
- [ ] **Step 4:** suite complète verte ; vérifier que le premier niveau (`k = 1`) génère exactement les mêmes niveaux qu'avant pour quelques graines (même nombre d'obstacles, même positions) — les tests déterministes existants doivent passer sans retouche.
- [ ] **Step 5:** commit `feat(niveaux): même densité par écran sur des niveaux plus hauts`.

### Task 3: Les boss au facteur 2,2

**Files:**
- Modify (si nécessaire seulement) : `assets/boss/plans.js`
- Test: `dev/tests/bossplan.test.js`, `dev/tests/boss.test.js`, `dev/tests/bossfight.test.js`

**Interfaces:**
- Consumes: `growRun` / `heightFor` (tâche 1) ; les helpers de test boss existants (`bossRun`, `steerAlong`, flood fill, `roomEntries` / `dodgeFrom`, combat complet).

- [ ] **Step 1: Write the failing tests** — rejouer au facteur 2,2 (monde créé avec `stemCount` assez grand pour `k = 2.2`, boss forcé) les vérifications existantes : largeur des canaux de chaque boss, flood fill « seule la tête mène à la surface » (tous les sous-ensembles de cibles détruites, 280/300/360/440), entrées de salle esquivables (vitesse lente et vitesse max), robot piloté vers chaque cible puis la tête, combat complet gagné en ≤ 10 pousses.
- [ ] **Step 2:** lancer — noter ce qui échoue (ou passe déjà).
- [ ] **Step 3:** si un plan échoue, le retoucher à la main pour qu'il passe aux facteurs 1 ET 2,2 sans affaiblir aucun test ; si un boss devient injouable pour le robot, NE PAS assouplir l'assertion : le signaler (DONE_WITH_CONCERNS) avec les chiffres.
- [ ] **Step 4:** suite complète verte.
- [ ] **Step 5:** commit `test(niveaux): les boss restent jouables au facteur 2,2` (ou `feat(niveaux): …` si des plans ont changé).

### Task 4: Rendu, documentation, version

**Files:**
- Modify: `docs/architecture.md` (règle de hauteur, `world.baseHeight` / `growK`, densité), `CHANGELOG.md` (v5.3.0), `src/core/config.js` (`version: '5.3.0'`), `dev/tests/state.test.js`, `index.html` (titre)
- Test: `dev/tests/grow.test.js`

- [ ] **Step 1: Write the failing test** — `grow: la terre et le décor de chaque milieu se dessinent à k = 2,2` (fausse surface comme les tests de rendu existants ; `FP.soil.draw` et le décor des 4 milieux sans erreur, caméra en haut et en bas du niveau).
- [ ] **Step 2:** lancer, implémenter ce qui manque (rien si le cache suit déjà `world.height`), documentation et version.
- [ ] **Step 3:** suite complète verte ; ouvrir le jeu dans le navigateur (serveur `http://localhost:8765`, configuration `../.claude/launch.json`), forcer un niveau à `k = 2,2` et vérifier à l'œil la terre, la caméra et l'absence d'erreur console ; noter dans le rapport la vérification `?perf=1` sur téléphone comme restant à faire au playtest.
- [ ] **Step 4:** commit `docs: niveaux qui s'agrandissent (v5.3.0)`.
