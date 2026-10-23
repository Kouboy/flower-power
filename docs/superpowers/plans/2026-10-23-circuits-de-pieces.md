# Circuits de pièces — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** des chapelets de jetons rouillés (un facile sur le chemin sûr, un appât près d'un danger, par hauteur d'écran) qui se ramassent avec un « tink » montant, entretiennent le combo et paient un bonus au chapelet complet avec un cri satirique.

**Architecture:** `world/coins.js` pose les chapelets à la fin de `FP.level.generate` avec son propre générateur ; `play/coins.js` (`FP.coinPlay.update`) ramasse et paie via `FP.scoring` ; `render/coins.js` dessine les jetons et leurs éclats ; `ui/cheer.js` affiche le cri ; `sfx.js` reçoit deux recettes.

**Tech Stack:** JavaScript vanilla (IIFE sur `window.FP`), Canvas 2D par `FP.px`, Web Audio FM existant, banc `node dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-23-circuits-de-pieces-design.md` ; maquette `docs/art/maquette-jetons.html` (jeton A, son).

## Global Constraints

- Double-clic (file://) : pas d'image ni de fichier son ; pas de `getImageData` dans `src/ui`.
- `index.html` / `dev/check.html` : seulement des balises `<script>` ajoutées.
- Fichiers < 400 lignes, en-têtes Lit / Écrit / Expose à jour, pas de code mort.
- `state.rng` jamais consommé par les pièces : générateur `FP.createRng((seed ^ coins.salt ^ Math.imul(level, 2654435761)) >>> 0)`.
- Seul `src/audio/synth.js` crée des nœuds Web Audio ; les sons passent par `FP.sfx` / `FP.audio`.
- Aucune couleur de `FP.palette.danger` dans les jetons.
- Valeurs (config `coins`) : `easy {min:5,max:7}`, `bait {min:6,max:9}`, `spacing: 18`, `pickup: 14`, `radius: 5`, `missBelow: 40`, `value: 25`, `chainBonus {easy:150, bait:400}`, `toxicBite: 1/3`, `minChain: 4`, `spinFps: 6` ; textes `['KARMA !', 'GREEN !', '0 DÉCHET !']`.
- Version `4.5.0`, CHANGELOG ; commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Un chapelet facile posé là où le chemin sûr frôle un bord du monde : toutes ses pièces restent dans le monde (marge) — test Task 1.
2. Pousse qui meurt au milieu d'un chapelet puis nouvelle pousse : pièces neuves, ancien chapelet sans bonus — test Task 3.
3. Deux pièces prises dans la même image (chapelet serré, pousse rapide) : deux événements `coin` de rangs consécutifs, bonus une seule fois — test Task 3.
4. Pièce d'appât `toxic` : l'arrivée sur la pièce n'impose pas plus d'un tiers de rayon dans la nappe — test Task 2.
5. Les ÉcoCrédits d'une pièce ne font pas sonner le son `eco` (seul `coin` sonne) et ne créent pas de nombre flottant — test Task 5.

---

### Task 1: Placement des chapelets faciles

**Files:**
- Create: `src/world/coins.js` ; Test: `dev/tests/coins.test.js` (après `level.test.js` dans `dev/check.html`)
- Modify: `src/core/config.js` (bloc `coins`, `text.chain`), `src/world/level.js` (`generate` appelle `FP.coins.place(state)` en dernier ; en-tête), `index.html` + `dev/check.html` (script après `world/level.js`)

**Interfaces:**
- Produces: `FP.coins.place(state)` → écrit `state.world.coins: { x, y, chain, rank, taken: false }[]` et `state.world.chains: { kind: 'easy'|'bait', anchor: 'path'|'graze'|'gap'|'toxic'|'leak', total, got: 0, missed: false, done: false }[]` ; `FP.coins.shape(name, n, spacing, rng)` → points relatifs `{x, y}[]` pour `'line'|'arc'|'zigzag'` (le chapelet monte : y décroissant avec le rang) ; `FP.coins.slices(world)` → `{ top, bottom }[]` (tranches de `viewH`, de `surfaceY + sliceMargin` à `height - sliceMargin`). `rank` = ordre de ramassage attendu (du bas vers le haut).

- [ ] **Step 1: Tests qui échouent** (partie `createRun(seed, { W: 440, H: 783 })` + `FP.level.startRun`)
  - `coins: chaque tranche a un chapelet facile` — `chains.filter(c => c.kind === 'easy').length >= slices(world).length` sur les graines 1 à 20.
  - `coins: les faciles suivent le chemin sûr` — toute pièce d'un chapelet `anchor: 'path'` est à ≤ `world.safeRadius` de `FP.level.distToSafePath`.
  - `coins: aucune pièce dans un obstacle ni hors du monde` — `FP.collision.distanceTo(o, x, y) >= radius + 2` pour tout solide ; `x ∈ [radius + 4, width - radius - 4]` ; `y > surfaceY + sliceMargin` (graines 1 à 20, niveaux 0, 4, 8).
  - `coins: chapelets de 4 pièces au moins, espacées de 18` — `total >= 4` ; deux rangs consécutifs à 18 ± 1.
  - `coins: même graine, mêmes pièces` — `JSON.stringify(world.coins)` égal pour deux parties de graine 7.
  - `coins: state.rng intact` — après `startRun`, `rng.next()` d'une partie normale = celui d'une partie où `FP.coins.place` est remplacé par une fonction vide.
- [ ] **Step 2:** `node dev/run-checks.js` → ✘ (`FP.coins` undefined).
- [ ] **Step 3: Implémenter** `world/coins.js` (motifs, tranches, facile ancré sur `FP.level.pathXAt`, filtre des contraintes, abandon sous `minChain`) ; appel en fin de `generate`.
- [ ] **Step 4:** ✔ tout le banc.
- [ ] **Step 5: Commit** `feat: chapelets de pièces faciles sur le chemin sûr`.

### Task 2: Chapelets appâts

**Files:** Modify `src/world/coins.js` ; Test `dev/tests/coins.test.js`

**Interfaces:** Consumes Task 1 ; `FP.collision.{distanceTo, grazeBand}`, `world.toxics` (`x, y, rx, ry, a`), `world.leaks` (`x, y, len, angle`), `FP.level.distToSafePath`.
- Ancrages, dans cet ordre de préférence tiré au hasard parmi ceux possibles dans la tranche : `graze` (arc à mi-bande de frôlement d'un solide `flyoverEligible`, côté chemin), `gap` (ligne verticale au milieu de deux solides dont l'écart de bord à bord ≥ 2 × `safeRadius`), `toxic` (ligne qui entre dans la nappe jusqu'à ⅓ du rayon, coordonnée elliptique normalisée ≥ ⅔), `leak` (ligne en travers du trajet, par son centre). Aucun → facile décalé de `safeRadius × 1.5` du chemin, `kind: 'bait'`, `anchor: 'path'`.

- [ ] **Step 1: Tests qui échouent**
  - `coins: chaque tranche a un appât` — `chains.filter(c => c.kind === 'bait').length >= slices.length` (graines 1 à 20).
  - `coins: les appâts graze restent dans la bande de frôlement` — pour chaque pièce `graze`, il existe un solide avec `0 < distanceTo ≤ grazeBand(o)`.
  - `coins: un appât toxic mord au plus un tiers de la nappe` — coordonnée elliptique normalisée (dans le repère tourné de `a`) ≥ 2/3 pour chaque pièce dans une nappe.
  - `coins: au moins trois sortes d'appâts sur 30 graines`.
- [ ] **Step 2:** ✘. **Step 3:** implémenter. **Step 4:** ✔ tout le banc.
- [ ] **Step 5: Commit** `feat: chapelets appâts près des dangers`.

### Task 3: Ramassage et gains

**Files:**
- Create: `src/play/coins.js` ; Test: `dev/tests/coinplay.test.js`
- Modify: `src/play/scoring.js` (`awardCoin`), `src/core/loop.js` (`UPDATE_ORDER` : `'coinPlay'` après `'graze'`, avant `'scoring'`), `src/render/effects.js` (pas de nombre flottant si `e.quiet`), `index.html` + `dev/check.html`

**Interfaces:**
- Produces: `FP.scoring.awardCoin(state, x, y, base)` — combo en cours : montant `base × (1 + (combo − 1) × comboGain)` arrondi au pas de 25, `comboTimer = comboWindow`, combo inchangé ; sans combo : `base`, combo et délai inchangés ; événement `{ type: 'eco', x, y, amount, combo, kind: 'coin', quiet: true }`. `FP.coinPlay.update(state)` : en mode `playing`, prend toute pièce à ≤ `pickup` de `state.plant.tip` (par rang croissant), émet `{ type: 'coin', x, y, rank: chain.got - 1 }` ; chapelet `got === total` et non raté → `FP.scoring.award(state, x, y, chainBonus[kind], 'chain')` puis `{ type: 'chainDone', x, y, kind, amount, word }` (`word` tiré par `Math.random` dans `text.chain`) ; pièce non prise à plus de `missBelow` sous la pointe (`y > tip.y + missBelow`) → `missed = true`.

- [ ] **Step 1: Tests qui échouent** (partie lancée ; on pose à la main `world.coins` / `world.chains`)
  - `coinPlay: prise à 14 px, pas à 15`.
  - `coinPlay: une pièce sans combo vaut 25 et ne lance pas de combo` (combo 0, délai 0 après).
  - `scoring: awardCoin entretient le combo sans le monter` — combo 3, délai .5, `awardCoin(s, 0, 0, 100)` → +150 Ɇ, `comboTimer === 2`, combo toujours 3, événement `quiet`.
  - `coinPlay: chapelet complet → bonus 400 (appât), combo +1, chainDone avec un mot de la liste`.
  - `coinPlay: deux pièces dans la même image → rangs 0 et 1, un seul chainDone`.
  - `coinPlay: pièce laissée 41 px sous la pointe → chapelet raté, pas de bonus même si on prend le reste`.
  - `coinPlay: rien hors du mode playing`.
  - `coinPlay: nouvelle pousse → nouvelles pièces, aucun chainDone hérité` (`prepare` + `FP.level.generate` + `launch`).
  - `effects: un eco quiet ne crée pas de nombre flottant`.
- [ ] **Step 2:** ✘. **Step 3:** implémenter. **Step 4:** ✔ tout le banc (les tests de loop listent l'ordre : mettre à jour s'il le vérifie).
- [ ] **Step 5: Commit** `feat: ramassage des pièces, combo entretenu, bonus de chapelet`.

### Task 4: Jetons rouillés à l'écran

**Files:**
- Create: `src/render/coins.js` ; Test: `dev/tests/coinsrender.test.js` (réutilise `fakeCtx`)
- Modify: `src/render/palette.js` (`FP.palette.coin` : couleurs du jeton A de la maquette), `src/render/frame.js` (après `FP.obstacles.draw`, avant `drawBonuses`), `index.html` + `dev/check.html`

**Interfaces:**
- Produces: `FP.coinsRender.token(g, x, y, frame)` (coin haut-gauche, `frame` 0 à 3 : face, ¾, tranche, ¾) ; `FP.coinsRender.draw(g, state)` (caméra appliquée, pièces non prises visibles seulement, image = `floor(time × spinFps + rank) % 4`, éclats de 4 à 6 pixels cuivrés sur les événements `coin`, vie .3 s, dans `state.fx.coinSparks`).

- [ ] **Step 1: Tests qui échouent** — `coinsRender: chaque image tient dans 11 × 11` ; `coinsRender: la face montre le Ɇ gravé` (au moins 5 pixels de la couleur de gravure) ; `coinsRender: aucune couleur de danger dans FP.palette.coin`.
- [ ] **Step 2:** ✘. **Step 3:** implémenter (dessin de la maquette porté sur `FP.px`). **Step 4:** ✔.
- [ ] **Step 5: Commit** `feat: jetons rouillés qui tournent et leurs éclats`.

### Task 5: Cri du chapelet et sons

**Files:**
- Create: `src/ui/cheer.js` ; Test: `dev/tests/cheer.test.js`, `dev/tests/audio.test.js`
- Modify: `src/ui/ui.js` (`FP.cheer.draw` après `FP.shout.draw`), `src/audio/sfx.js` (recettes `coin` et `chain`), `src/audio/audio.js` (`coin` → `play(b, 'coin', rank)`, `chainDone` → `play(b, 'chain')`, `eco` de `kind: 'coin'` → silence), `index.html` + `dev/check.html`

**Interfaces:**
- Produces: `FP.cheer.textFor(event)` → `event.word + ' +' + amount` (pur) ; `FP.cheer.draw(g, state)` : sur `chainDone`, mémorise `{ text, t0, x, y }` dans `state.fx.ui.cheer` ; lettres dorées (`FP.font.COLORS.gold`, échelle 2) qui tombent et rebondissent au-dessus de la pointe (repère d'interface : `x/2`, `(y − camera.y)/2`, borné à l'écran), durée 1 s.
- Recettes : `coin(n, z, d, rank)` → cloche dont la note est `[76, 79, 81, 83, 86, 88, 91, 93][min(rank, 7)]` ; `chain` → accord 76, 83, 88, 91 sonnant (~.7 s).

- [ ] **Step 1: Tests qui échouent**
  - `cheer: textFor` → `'KARMA ! +400'` pour `{ word: 'KARMA !', amount: 400 }`.
  - `cheer: le cri reste dans l’écran même pointe au bord` (mesure via `FP.font.measure`, x ∈ [0, ui.w]).
  - `audio: une pièce sonne plus aigu au rang 3 qu’au rang 0` (espion de moteur : note du bus `sfx`).
  - `audio: un eco de pièce ne sonne pas, un chainDone sonne`.
- [ ] **Step 2:** ✘. **Step 3:** implémenter. **Step 4:** ✔.
- [ ] **Step 5: Commit** `feat: cri du chapelet complet et sons des pièces`.

### Task 6: Bout en bout, version, vérification en jeu

**Files:** Test `dev/tests/e2e.test.js` ; Modify `src/core/config.js` (`version: '4.5.0'`), test de version, `index.html` (`<title>`), `CHANGELOG.md`, `docs/architecture.md` (modules, ordre de mise à jour, `world.coins/chains`)

- [ ] **Step 1: Test qui échoue** — `e2e: suivre un chapelet facile paie chaque pièce puis le bonus` : la pointe est posée sur chaque pièce dans l'ordre des rangs (vrais `collision`, `coinPlay`, `scoring`) → événements `coin` de rang 0 à n−1, puis `chainDone` ; `score.eco` = somme attendue.
- [ ] **Step 2:** ✘ (avant le câblage complet) ou ✔ si déjà vrai : dans ce cas le noter comme test de non-régression dans le registre.
- [ ] **Step 3:** version, CHANGELOG (`## v4.5.0 — Circuits de pièces`), architecture.
- [ ] **Step 4:** `node dev/run-checks.js` ✔ ; navigateur (412 × 915, `?seed=3`) : pièces visibles et qui tournent, ramassage avec éclat, cri au chapelet complet, aucune erreur console ; `?perf=1` sans hausse notable.
- [ ] **Step 5: Commit** `chore: v4.5.0 circuits de pièces`.
