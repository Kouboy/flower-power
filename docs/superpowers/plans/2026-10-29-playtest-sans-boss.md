# Version playtest sans boss — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un mode `?sansboss=1` (4 milieux × 6 pousses, boutique toutes les 3, résultats à la fin) et une difficulté en dents de scie calée sur l'avancée dans les milieux, commune aux deux versions.

**Architecture:** une fonction pure `FP.difficulty` donne la difficulté `d` (0 → 1) d'après `state.run` ; `play/flow.js`, seul à écrire `state.run`, écrit aussi le nouveau champ `state.difficulty` (niveau équivalent `d × 10`) à chaque avancée ; la génération (`world/level.js`, `world/boss.js`) lit `state.difficulty` là où elle lisait `state.level` pour ses réglages. `state.level` reste un compteur (graines des sillons et des jetons, réveil du T-Rex).

**Tech Stack:** JavaScript sans dépendance, canvas, banc maison (`dev/check.html`, `node dev/run-checks.js </dev/null`).

**Spec:** `docs/superpowers/specs/2026-10-29-playtest-sans-boss-design.md`

## Global Constraints

- `AGENTS.md` : réglages dans `config.js` uniquement ; visuel dans `render/*` ; pas de code mort ; fichiers < 400 lignes ; une entrée de CHANGELOG par version ; `index.html` ne gagne que des lignes `<script>` (et le `<title>` de version).
- Couches : `world/*` ne lit jamais `render/*` ; `render/*` et `ui/*` ne font que lire l'état ; `state.run` n'est écrit que par `play/flow.js` (création exceptée, dans `core/state.js`) ; `state.difficulty` aussi.
- Doit marcher depuis `file://`. Chaque nouveau script : une ligne dans `index.html` ET dans `dev/check.html`, au même rang.
- En-tête de chaque fichier touché (Lit / Écrit / Expose) tenu à jour.
- Valeurs : `run.steps: 3` ; `run.playtest: { steps: 6, shopEvery: 3 }` ; `difficulty: { drop: .15, levelAtMax: 10 }` ; textes « VERSION PLAYTEST », « SITES TRAVERSÉS », « SITE RÉHABILITÉ ».
- Version 4.13.0 (`<title>` d'`index.html`, CHANGELOG).
- Tests : `node dev/run-checks.js </dev/null` (2 à 5 min ; timeout 600000). PIÈGE connu : un `// commentaire` inséré au milieu d'une ligne commente le code qui suit.

## Review Focus

1. Lobbying (boutique) regénère le niveau en cours : il doit garder la difficulté de la pousse en cours, pas en prendre une autre.
2. Mort pendant une pousse : la nouvelle tentative a la même difficulté (rien n'avance sans éclosion).
3. Partie relancée depuis le certificat : tout repart à zéro (difficulté, avance du pollen, `done`) et le mode playtest est conservé.
4. Dernière chance refusée sur la 6ᵉ pousse du dernier milieu : c'est un game over (« 3/4 »), pas une victoire.
5. Version avec boss en saison 2 : difficulté au maximum, boutique toujours seulement avant le boss.

---

### Task 1: difficulté en dents de scie, paramètre et état

**Files:**
- Create: `src/play/difficulty.js`, `dev/tests/difficulty.test.js`
- Modify: `src/core/fp.js`, `src/core/state.js`, `src/core/config.js`, `index.html` (ligne `<script>` avant `src/play/flow.js`), `dev/check.html` (script avant `flow.js` + `tests/difficulty.test.js`), `dev/tests/fp.test.js`, `dev/tests/state.test.js`

**Interfaces:**
- Produces: `FP.params.sansboss` (booléen, vrai seulement pour `sansboss=1`) ; dans `createRun` : `state.difficulty = 0`, `state.run.playtest = !!(FP.params && FP.params.sansboss)`, `state.run.push = 0`, `state.run.done = false` ; `FP.config.run.playtest`, `FP.config.difficulty` ;
  `FP.difficulty.steps(run)` → pousses par milieu (`run.playtest ? config.run.playtest.steps : config.run.steps`) ;
  `FP.difficulty.at(run)` → `d` ∈ [0, 1] ; `FP.difficulty.level(run)` → `at(run) × config.difficulty.levelAtMax`.

Formule de `at(run)` (M = nombre de milieux, S = `steps(run)`, m = `run.milieu`) : saison > 1 → 1 ; sommet `(m + 1) / M` ; départ `m === 0 ? 0 : m / M - drop` ; niveau de boss (`run.boss`) → sommet ; sinon `départ + (sommet − départ) × min(1, (run.step + run.push) / (S − 1))`.

- [ ] **Step 1: tests qui échouent** (`dev/tests/difficulty.test.js`, plus les ajouts aux tests existants)
  - `fp: sansboss=1 active le mode playtest` : `parseParams('?sansboss=1').sansboss === true` ; `''`, `'?sansboss=0'`, `'?sansboss=oui'` → `false`.
  - `state: une partie neuve part à difficulté 0, sans avance ni fin` : `difficulty 0`, `run.push 0`, `run.done false`, `run.playtest false` (sans paramètre) ; avec `FP.params.sansboss` vrai (rétabli après), `createRun` → `run.playtest true` (une partie relancée garde le mode).
  - `difficulty: départs et sommets des quatre milieux, avec et sans boss` : pour `playtest` vrai (S = 6) et faux (S = 3), à `step 0` → 0 ; 0,10 ; 0,35 ; 0,60 et à `step S − 1` → 0,25 ; 0,50 ; 0,75 ; 1 (tolérance 1e-9).
  - `difficulty: montée linéaire dans un milieu` : playtest, milieu 1 (0,10 → 0,50), `step 3` → 0,34.
  - `difficulty: le boss se joue au sommet de son milieu` : `boss: true`, milieu 2, `step 3` → 0,75.
  - `difficulty: le pollen avance sans dépasser le sommet` : playtest, milieu 0, `step 1, push 2` → 0,15 ; `step 4, push 5` → 0,25.
  - `difficulty: saison 2 au maximum, niveau équivalent` : `saison 2` → `at` 1, `level` 10 ; milieu 0 `step 0` → `level` 0.
- [ ] **Step 2:** `node dev/run-checks.js </dev/null` → ÉCHEC sur ces tests (`FP.difficulty` indéfini, `sansboss` absent).
- [ ] **Step 3:** implémenter `parseParams` (`sansboss: q.get('sansboss') === '1'`), les champs de `createRun`, les réglages de `config.js` (près de `run`, commentés comme leurs voisins) et `src/play/difficulty.js` (fichier pur, en-tête Lit/Écrit/Expose).
- [ ] **Step 4:** suite verte.
- [ ] **Step 5:** commit `difficulté en dents de scie : FP.difficulty, ?sansboss=1, champs de partie`.

### Task 2: la génération lit `state.difficulty`

**Files:**
- Modify: `src/world/level.js` (les quatre usages de réglage : `generateSafePath(world, rng, state.level)`, nombre de solides, nombre de nappes/limaces, longueur des fuites), `src/world/boss.js` (rayon du couloir, ligne `normal`), leurs en-têtes ; tests qui posent `s.level = X` avant de générer : `dev/tests/level.test.js`, `milieux.test.js`, `coins.test.js`, `boss.test.js`, `bosspath.test.js`, `hazardsrender.test.js`.

**Interfaces:**
- Consumes: `state.difficulty` (Task 1).
- Produces: rien de nouveau ; `state.level` ne sert plus qu'au T-Rex (`placeSignature`) et aux graines (`coins.js`, `soil.js`).

- [ ] **Step 1: tests qui échouent** (`dev/tests/level.test.js`)
  - `level: la difficulté règle le chemin, pas le compteur de niveaux` : même graine, `s.level = 10, s.difficulty = 0` → `world.safeRadius === 25` ; `s.level = 0, s.difficulty = 10` → `world.safeRadius === 12`.
  - `boss: le couloir suit la difficulté` (`dev/tests/boss.test.js`) : niveau de boss à `difficulty 0` puis `10`, `level` fixe : le rayon du couloir est strictement plus petit à 10.
- [ ] **Step 2:** suite → ÉCHEC sur ces deux tests.
- [ ] **Step 3:** remplacer les cinq usages ; dans les tests existants qui posent `s.level = X` pour régler la difficulté, ajouter `s.difficulty = X` à côté (garder `s.level` : les graines des jetons en dépendent, le comportement des tests reste identique). Ne pas toucher aux tests du T-Rex qui jouent sur `level` / `targetLevel`.
- [ ] **Step 4:** suite verte (aucun autre test ne doit changer de résultat).
- [ ] **Step 5:** commit `génération : la difficulté vient de state.difficulty, state.level reste un compteur`.

### Task 3: déroulé du mode playtest et avance du pollen

**Files:**
- Modify: `src/play/flow.js` (en-tête compris), `dev/tests/flow.test.js` (ou nouveau `dev/tests/playtest.test.js`, à ajouter à `dev/check.html`)

**Interfaces:**
- Consumes: `FP.difficulty.steps(run)`, `FP.difficulty.level(run)`, `config.run.playtest.shopEvery`, `run.playtest`, `run.push`, `run.done`, `state.difficulty`.
- Produces: `state.run.done = true` et `state.mode = 'over'` en fin de playtest (lus par la Task 4).

Règles (dans `bloom` et `bloomStages`) :
- Éclosion hors boss : `step += 1` ; `push += count − 1` ; puis, si `playtest` : `step >= steps` et dernier milieu → `next = 'end'` ; `step >= steps` → `next = 'milieu'` (bon de commande, puis milieu suivant) ; `step % shopEvery === 0` → `next = 'shop'`. Sans playtest : comme aujourd'hui (`step >= steps` → `boss`). Puis `state.difficulty = FP.difficulty.level(run)`.
- `nextMilieu` remet `push` à 0 et réécrit `state.difficulty` (après le changement de milieu ou de saison).
- Fondu : `'end'` → au noir, `run.done = true`, `state.mode = 'over'` (pas de nouveau niveau, pas de bon de commande ; l'écran de résultats prend le relais) ; `'milieu'` en playtest → milieu suivant puis bon de commande (`FP.shop.open(state, { after: 'bloom' })`) ; `'shop'` → bon de commande ; boss vaincu : inchangé (milieu suivant sans bon).
- Le mode playtest ne crée jamais de niveau de boss.

- [ ] **Step 1: tests qui échouent** (helpers existants `flowRun`, `bloomNow`, `skipShop`, `advance`)
  - `playtest: bon de commande toutes les 3 pousses, milieu suivant après 6` : `run.playtest = true` ; éclosions 1, 2 → `ready` sans bon ; 3 → `shop` ; 4, 5 → `ready` ; 6 → `shop` puis, après lui, `run.milieu === 1`, `step === 0`, carton `milieu`.
  - `playtest: jamais de niveau de boss` : 24 éclosions d'affilée (bons refusés) → `run.boss` jamais vrai, `world.bossLevel` jamais présent.
  - `playtest: fin après la 6ᵉ pousse du dernier milieu` : milieu 3, `step 5` → éclosion → (fondu) `mode === 'over'`, `run.done === true`, aucun bon ouvert, `run.saison === 1`, `run.won === false`.
  - `playtest: game over inchangé` : réserves à 1, mort, dernière chance refusée → `over`, `run.done === false`.
  - `flow: avec boss, toujours 3 pousses puis bon puis boss` : sans playtest, 3 éclosions → bon → `run.boss` vrai.
  - `difficulty: la difficulté suit les éclosions, pas les morts` : `state.difficulty` après 1, 2, 3 éclosions (playtest, milieu 0) = 0,5 ; 1 ; 1,5 ; une mort ne la change pas ; un Lobbying (`FP.level.generate(s, { lobbying: true })`) ne la change pas.
  - `difficulty: le pollen pousse, et l'avance s'efface au milieu suivant` : éclosion avec `score.flowerBonus = 2` → `run.push === 2` ; après le changement de milieu, `push === 0` et `state.difficulty` = départ du milieu 1 × 10 (1,0).
  - `flow: saison 2 au maximum` : sans playtest, après le 4ᵉ boss → `saison 2`, `state.difficulty === 10`.
- [ ] **Step 2:** suite → ÉCHEC sur ces tests.
- [ ] **Step 3:** implémenter les règles ci-dessus dans `flow.js` (rester sous 400 lignes ; mettre à jour la ligne « Écrit » de l'en-tête : `state.difficulty`, `run.push`, `run.done`).
- [ ] **Step 4:** suite verte.
- [ ] **Step 5:** commit `mode playtest : boutique toutes les 3 pousses, milieu suivant après 6, fin après le dernier milieu`.

### Task 4: écran de résultats, repère, version

**Files:**
- Modify: `src/ui/certificate.js`, `src/ui/title.js`, `src/core/config.js` (textes), `dev/tests/certificate.test.js`, `dev/tests/title.test.js`, `index.html` (`<title>` 4.13.0), `CHANGELOG.md`, `docs/architecture.md`

**Interfaces:**
- Consumes: `run.playtest`, `run.done`, `run.milieu` (Task 3).
- Produces: `config.text.certificate.wonTitle = 'SITE RÉHABILITÉ'`, `config.text.certificate.crossed = 'SITES TRAVERSÉS'`, `config.text.playtest = 'VERSION PLAYTEST'`.

- [ ] **Step 1: tests qui échouent**
  - `certificate: fin de playtest` : `run.playtest`, `run.done` → `lines(s).title === 'SITE RÉHABILITÉ'`, ligne `SITES TRAVERSÉS` = `'4/4'`, `cause === ''`.
  - `certificate: game over en playtest` : `run.playtest`, milieu 2, pas `done` → ligne `SITES TRAVERSÉS` = `'2/4'`, titre `'CERTIFICAT'`, cause non vide.
  - `certificate: version avec boss inchangée` : ligne `SITES RÉHABILITÉS` en `bosses/4`.
  - `title: repère VERSION PLAYTEST seulement en mode playtest` : le texte dessiné par `FP.title.draw` (espion sur `FP.font.draw`, comme les tests existants de `title.test.js`) contient `VERSION PLAYTEST` quand `FP.params.sansboss` est vrai, ne le contient pas sinon (rétablir `FP.params` après).
- [ ] **Step 2:** suite → ÉCHEC sur ces tests.
- [ ] **Step 3:** implémenter : `lines` choisit titre / ligne des sites selon `run.playtest` et `run.done` ; le dessin n'affiche pas l'étiquette « CAUSE DU DÉCÈS » quand la cause est vide ; le titre dessine `text.playtest` en petit sous le logo (couleur discrète, sans chevaucher le record ni « TOUCHER POUR JOUER »), d'après `FP.params.sansboss`.
- [ ] **Step 4:** suite verte.
- [ ] **Step 5:** version 4.13.0, entrée CHANGELOG (mode `?sansboss=1`, dents de scie communes, pollen qui pousse dans le milieu, compte de tests), `docs/architecture.md` (difficulté, mode playtest, liste des scripts) ; commit `v4.13.0 : écran de résultats du playtest, repère, version`.

### Vérification de fin (contrôleur)

- Navigateur, `?sansboss=1` : une partie jouée jusqu'au certificat de victoire (outils de test pour accélérer : sauts d'éclosion par l'état), une jusqu'au game over ; sans paramètre : 3 pousses → bon → boss. Aucune erreur console ; captures du certificat de victoire et du repère.
