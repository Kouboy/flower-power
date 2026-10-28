# Moteur de boss — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un vrai combat de boss à la fin de chaque milieu — 4 tronçons alternés, 4 points faibles à percer, défenses, trappe — avec des boss provisoires en blocs (v4.12.0).

**Architecture:** le niveau de boss reste un niveau ordinaire pour la pousse, la caméra et la collision. `world/boss.js` le construit (tronçons et trappe = obstacles marqués `boss`, couloir = `world.safePath`), `play/boss.js` fait vivre défenses, perçage et trappe, `render/boss.js` dessine. La persistance des points percés vit dans `state.bossFight`.

**Tech Stack:** JavaScript sans dépendance (IIFE sur `window.FP`), canvas via `FP.px`, Web Audio via `synth.js`, tests `dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-28-moteur-boss-design.md`

## Global Constraints

- Réglages dans `FP.config.boss` uniquement ; dessins dans `render/*` ; `world/*` ne lit pas `render/*` ; `render/*` et `ui/*` ne font que lire l'état.
- Fichiers sous 400 lignes ; pas de code mort (le texte « (combat en préparation) » et `text.cards.pending` disparaissent).
- `state.run` reste écrit par `play/flow.js` seul ; `state.bossFight` par `play/boss.js` seul (remise à zéro appelée par `flow.js`).
- Aucune image générée, aucun crédit SpriteCook dépensé.
- Tests : `node dev/run-checks.js </dev/null` ; version `4.12.0` ; une entrée de CHANGELOG ; commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Réglages (Task 1 les pose)

```js
boss: {
  segments: 4, segWidth: .45, corridorK: 1.3,
  weakR: 14, weakHit: 20, weakOut: 12,          // point faible : rayon dessiné, rayon de perçage, saillie hors du flanc
  top: 70, bottom: 160,                          // zone du boss : de surfaceY + top à height − bottom
  trap: { gap: 30, thick: 14 },                  // trappe : sous la pelouse (surfaceY + gap), épaisseur
  defense: { period: 2.6, warn: .7, strike: .6, speedup: .2, reach: .5, thick: 14, mountK: .25 },
  toxics: 2, pierceBonus: 200, bonus: 1500, tempoPerPierce: 6,
  pairs: { friche: ['piston', 'jet'], industrie: ['jet', 'arm'], decharge: ['arm', 'jet'], nucleaire: ['piston', 'arm'] }
}
```

## Review Focus

1. Mort au boss puis nouvelle graine : les points percés restent percés (dessin compris) et la trappe reste ouverte si les 4 l'étaient.
2. Dernière chance acceptée au boss : même chose.
3. Spore de la boutique qui explose près du boss : aucune pièce du boss ni la trappe n'est effacée.
4. Saison 2 : au boss de la friche, tous les points sont de nouveau intacts.
5. Écran étroit (largeur 300) : couloir franchissable, points faibles atteignables sans toucher le corps.

Tests : 1, 2, 4 dans la tâche 3 ; 3 et 5 dans la tâche 1.

---

### Task 1: le niveau de boss (génération)

**Files:**
- Create: `src/world/boss.js` ; `dev/tests/boss.test.js`
- Modify: `src/core/config.js` (`boss`, textes de mort), `src/core/state.js` (`bossFight`), `src/world/level.js` (délégation, `makeToxic` exposé), `src/render/obstacles.js` (ignore les solides `boss`), `src/play/powerups.js` (la spore garde les solides `boss`), `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - `state.bossFight = { pierced: [false, false, false, false] }` (createRun).
  - `FP.level.makeToxic(rng, x, y, big) → toxique` (extrait de `placeToxics`, même forme).
  - `FP.bossLevel.generate(state)` : appelé par `FP.level.generate` quand `state.run.boss` ; utilise `FP.createRng(seed)` avec `seed` = empreinte de `(state.seed, state.run.saison, state.run.milieu)` (pas `state.rng`) ; remplit `world.safePath`, `world.safeRadius`, `world.toxics`, puis `FP.coins.place(state)`.
  - `world.bossLevel = { segments: [{ side: -1 | 1, x0, x1, y0, y1, solid }], weak: [{ i, x, y }], defenses: [{ i, type: 'arm' | 'piston' | 'jet', side, x, y, reach, solid }], trap: { y0, y1, solid } }` ; tronçon `i` = `i`ᵉ du bas ; `side` −1 = accroché à gauche.
  - Solides du boss : `{ kind: 'boss' | 'defense' | 'trap', boss: true, x, y, a, flip: 1, collision: [[x, y]…] (repère local), broadR, flyoverEligible: false, off }` ; `off: true` = ignoré par la collision (défense au repos, trappe ouverte). Le point faible `i` est sur la face de son tronçon, à `weakOut` hors du flanc, à mi-hauteur ; la défense `i` est montée sur la même face à `mountK` du haut du tronçon, `type` = `pairs[milieu][i % 2]`, `reach` = `defense.reach × (largeur − largeur d'un tronçon)`.
- Consumes: `state.bossFight.pierced` (points déjà percés → `world.bossLevel` les respecte : trappe `off` si les 4 le sont).

- [ ] **Step 1: tests** (`boss.test.js`, helper `bossRun(W, milieu)` : `createRun(7, { W, H: Math.round(W * 16 / 9) })`, `startRun`, `run.milieu = milieu`, `run.boss = true`, `FP.level.generate`) :
  - `bossLevel: 4 tronçons alternés, chacun son point faible côté couloir` — `segments.length === 4`, `side` alterne, `weak[i]` à `weakOut` hors de la face, hors du polygone (`FP.collision.distanceTo(seg.solid, w.x, w.y) >= weakR - weakOut`).
  - `bossLevel: le couloir est franchissable et longe chaque point faible` — pour W ∈ {300, 440} et milieu ∈ 0..3 : chaque nœud de `world.safePath` à distance ≥ `safeRadius` de tout solide `boss` non `off` sauf la trappe ; pour chaque point faible, un segment du chemin passe à moins de `weakHit` ; le chemin part de `(width/2, bas)` et finit au-dessus de la trappe. `world.safeRadius` = rayon d'un niveau normal au même rang × `corridorK`.
  - `bossLevel: même niveau d'une tentative à l'autre` — deux `generate` successifs (state.rng avancé entre les deux) → mêmes `segments`, `weak`, `toxics`.
  - `bossLevel: un duel — ni obstacle habituel ni limace, 2 nappes hors des points faibles` — tous les solides ont `boss: true` ; `leaks.length === 0` ; `toxics.length <= 2`, chaque nappe à plus de `weakHit + max(rx, ry)` de chaque point faible.
  - `bossLevel: trappe pleine largeur sous la pelouse, fermée tant qu'il reste un point` — `trap.solid.off === false` ; avec `bossFight.pierced` tout à `true` puis `generate` → `off === true`.
  - `bossLevel: la spore ne détruit pas le boss` — `FP.powerups` : déclencher l'explosion au centre d'un tronçon (fonction existante de la spore) → aucun solide `boss` retiré.
  - `level: un niveau normal n'a pas de bossLevel` — `run.boss = false` → `world.bossLevel === null`.
- [ ] **Step 2: lancer** → échec (`FP.bossLevel` absent).
- [ ] **Step 3: implémenter** ; `obstacles.js` saute `o.boss` ; `powerups.js` : `keepSolid` vrai pour `o.boss` ; `level.generate` : `world.bossLevel = null` puis délégation ; textes `text.death.boss = 'écrasée contre le boss'`, `defense = 'fauchée par une défense'`, `trap = 'la trappe est fermée'`. En-têtes à jour.
- [ ] **Step 4: relancer** → vert. **Step 5: commit** `boss : niveau de boss (tronçons, points faibles, couloir, trappe)`.

### Task 2: les défenses

**Files:** Create `src/play/boss.js` (première partie) ; Modify `src/world/collision.js` (`if (o.off) continue;` dans `querySolids`), `src/core/loop.js` (`'boss'` entre `'hazards'` et `'collision'` dans `UPDATE_ORDER`), scripts ; tests dans `boss.test.js`.

**Interfaces:**
- Produces: `FP.boss.stageAt(i, t, pierced) → { stage: 'rest' | 'warn' | 'strike', k }` (pur ; période `period × (1 − speedup)^pierced`, de même pour `warn` et `strike` ; décalage `i × période / 4` ; `k` ∈ [0,1] dans l'étape) ; `FP.boss.update(state, dt)` met chaque solide de défense `off` hors du coup et règle sa forme pendant le coup : piston = rectangle qui sort de la face jusqu'à `reach × k` ; jet = rectangle fin (`thick × .7`) qui atteint `reach` dès `k = .2` ; bras = barre de longueur `reach` pivotant de la verticale (le long de la face) à l'horizontale (`a`).
- Consumes: `world.bossLevel.defenses` (tâche 1).

- [ ] **Step 1: tests** :
  - `boss: une défense prévient, frappe, se repose, aux durées réglées` — balayage de `stageAt(0, t, 0)` sur une période : `warn` dure 0,7 s, `strike` 0,6 s, le reste `rest`.
  - `boss: 20 % plus vite par point percé` — durée de `strike` avec `pierced = 2` = `0,6 × 0,8²`.
  - `boss: jamais toutes les défenses en coup au même instant` — t de 0 à 10 s par pas de 0,05 : jamais 4 `strike` simultanés.
  - `boss: une défense n'est un obstacle que pendant son coup, et laisse la moitié du couloir libre` — `update` à un t de repos : `solid.off` ; à un t de coup : `!off`, et tout point du polygone en monde reste du côté du flanc, à au plus `reach` (≤ moitié de la largeur libre) de la face.
  - `collision: un solide « off » est ignoré`.
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert. **Step 5: commit** `boss : défenses (bras, piston, jet)`.

### Task 3: perçage, trappe, persistance, victoire

**Files:** Modify `src/play/boss.js`, `src/play/flow.js`, `src/core/config.js` ; tests `boss.test.js`.

**Interfaces:**
- Produces: dans `FP.boss.update` (mode `playing` seulement) : pointe à moins de `weakHit` d'un point non percé → `bossFight.pierced[i] = true`, événement `{ type: 'bossPierce', i, x, y }`, `FP.scoring.awardFlat(state, x, y, pierceBonus)`, secousse ; quand les 4 sont percés et la trappe encore fermée → `trap.solid.off = true`, événement `{ type: 'bossTrap' }`. `FP.boss.reset(state)` remet `pierced` à `[false ×4]`. `flow.js` : `nextMilieu` appelle `FP.boss.reset` ; à l'éclosion d'un niveau de boss, `awardFlat(state, tip.x, surfaceY, bonus)` et événement `{ type: 'bossDown' }`.

- [ ] **Step 1: tests** :
  - `boss: la pointe perce un point faible une seule fois` — pointe sur `weak[1]` → `pierced[1]`, un seul `bossPierce`, éco + 200 × saison ; deuxième `update` → aucun nouvel événement.
  - `boss: 4 points percés → la trappe s'ouvre` — `bossTrap` une fois ; `trap.solid.off`.
  - `boss: trappe fermée atteinte → mort « la trappe est fermée »` — pointe dans la trappe, `collision.update`, `flow.update` → `death` avec `kind: 'trap'`, `flow.overReason === text.death.trap`.
  - `boss: une mort garde les points percés et la trappe ouverte` (Review Focus 1) — 4 percés, mort, `dying` jusqu'à `ready` → nouveau niveau : `pierced` tout vrai, `trap.solid.off`.
  - `boss: la dernière chance garde les points percés` (Review Focus 2) — `reserves = 1`, mort → `shop`, `afterShop(s, 'last')` avec réserve rachetée → 2 percés toujours.
  - `boss: victoire — bonus 1 500 × saison, carton BOSS VAINCU, milieu suivant` — trappe ouverte, éclosion → `bossDown`, éco + 1500 × saison, `run.card.kind === 'victory'` ; après le fondu, `pierced` remis à zéro.
  - `boss: saison 2, le boss de la friche est intact` (Review Focus 4) — partie poussée jusqu'à la saison 2 (aides de `flow.test.js` / `milieux.test.js`) puis jusqu'au boss de la friche → `pierced` tout faux.
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert. **Step 5: commit** `boss : perçage, trappe, persistance, victoire`.

### Task 4: rendu, carton, HUD, flèche

**Files:** Create `src/render/boss.js` ; Modify `src/render/frame.js` (après `FP.obstacles.draw`), `src/ui/cards.js`, `src/ui/hud.js`, `src/core/config.js` (supprimer `text.cards.pending`), `src/render/palette.js` (`boss` : teintes du boss provisoire par milieu, `weak` blanc-jaune incandescent `#fff4b0` / `#ffe060`, rayures de trappe), scripts ; tests `dev/tests/boss.test.js`, `cards.test.js`, `hud.test.js`, `px.test.js`.

**Interfaces:**
- Produces: `FP.bossRender.draw(g, state)` (tronçons en blocs : corps, rivets, rouille, coulures, panneau au nom du boss ; points faibles qui pulsent dans un anneau de cible, trou fumant une fois percés ; défenses selon `stageAt` — tremblement et lueur en `warn` ; trappe à rayures, ouverture en coulissant ; flèche au bord de l'écran vers le prochain point non percé hors écran) ; `FP.bossRender.arrowFor(state) → { x, y, dir } | null` (pur) ; `items.boss` du HUD : 4 icônes (`pierced`) sur un niveau de boss.

- [ ] **Step 1: tests** :
  - `cards: le carton du boss donne son ordre, plus de « combat en préparation »` — lignes `[name, order]` ; `text.cards.pending` absent.
  - `hud: 4 icônes de points faibles au boss, allumées selon les points percés` ; aucune hors boss.
  - `bossRender: flèche vers le prochain point faible hors écran, aucune s'il est à l'écran ou s'ils sont tous percés`.
  - `bossRender: dessine sans erreur, points faibles dans la teinte réservée` — faux contexte qui retient les rectangles (comme `decor.test.js`) : `draw` sur un niveau de boss, au moins un rectangle `#fff4b0`.
  - `palette: le blanc-jaune des points faibles n'est utilisé par aucun décor ni obstacle` — absent de `FP.palette.decor()` et des palettes `FP.decor[id].palette`, et à plus de 60 de chacune de leurs teintes.
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert. **Step 5: commit** `boss : rendu provisoire, carton, HUD, flèche`.

### Task 5: son et musique

**Files:** Modify `src/audio/sfx.js` (sons `pierce`, `trapOpen`, `bossDown` en FM), `src/audio/audio.js` (événements `bossPierce`, `bossTrap`, `bossDown`), `src/audio/music.js` (`tempoFor` : boss → `bpm + tempoPerPierce × points percés`) ; tests `music.test.js`, `audio.test.js`.

- [ ] **Step 1: tests** : `music: le thème du boss s'emballe de +6 BPM par point percé` (`tempoFor` sur un niveau de boss avec 0 puis 3 points → +18) ; `audio: perçage, trappe et victoire du boss ont leur son` (espion : un appel à `sfx.play` pour chacun des trois événements).
- [ ] **Step 2: lancer** → échec. **Step 3: implémenter.** **Step 4: relancer** → vert. **Step 5: commit** `boss : sons et emballement du thème`.

### Task 6: prompts des images, vérification, version

**Files:** Create `docs/art/prompts-boss.md` ; Modify `src/core/config.js` (`4.12.0`), `index.html` (`<title>`), `dev/tests/state.test.js`, `docs/architecture.md`, `CHANGELOG.md`.

- [ ] **Step 1: version** : test → `'4.12.0'`, échec, changement, vert.
- [ ] **Step 2: prompts** : pour chacun des 4 boss (noms de `FP.config.milieux`), prompt anglais « franchement toxique » (coulures luisantes, rouille, fumées, fûts qui suintent), modèle conseillé (celui des images existantes, `docs/art/spritecook-assets.json`), coût estimé, taille et découpage (2 à 3 morceaux d'environ 260 px de large sur fond transparent, une image « détruit »), et où tombent les 4 points faibles et les montures des défenses (repris de `world/boss.js`). Rien n'est généré.
- [ ] **Step 3: navigateur** (serveur local, partie invincible aux défenses désactivées sauf pour une vérification de mort) : un combat complet dans chaque milieu (4 perçages, trappe, éclosion, carton BOSS VAINCU) sans erreur ; une mort contre une défense et contre la trappe fermée ; captures du combat (début, point percé, trappe ouverte) sur 360×780 ; mesure de rendu (médiane par image, CPU ×6) vs `main`.
- [ ] **Step 4: docs et CHANGELOG** (architecture : `world/boss.js`, `play/boss.js`, `render/boss.js`, `state.bossFight`, ordre de mise à jour, liste des scripts) ; suite verte ; commit `v4.12.0 — Moteur de boss`.
