# Refonte v4 — Étape 6 : éclosion, parterre, fondus et écran de fin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atteindre la surface fait éclore de vraies fleurs (1 + pollen) qui grandissent puis restent dans un parterre, mémoire visible de la partie ; la transition vers le niveau suivant passe par un fondu au noir ; l'écran de fin rappelle la cause de la mort.

**Architecture:** `play/flow.js` crée les fleurs à l'éclosion (`state.garden.flowers`, persistantes sur tout le run), les fait grandir, et enchaîne `bloom → fondu sortant → nouveau niveau → fondu entrant → ready` via `state.flow.stage` et `state.flow.fade`. Rendu : `render/flowers.js` (fleurs illustrées, cache des fleurs finies), anneau d'éclosion dans `effects.js`, voile de fondu dans `frame.js`, raison de la mort dans `hud.js`.

**Tech Stack:** JavaScript natif sur `window.FP`, Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (pilier 5 « Éclosion », §7 surface/éclosion/fleurs/records, §11 étape 6).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes complets.
- La simulation écrit, le rendu lit ; tous les réglages dans `config.js` ; les fleurs vivent dans l'état, donc leurs tirages passent par `state.rng`.
- Fidèle à la v3.43.16 (`bloom`, `flowerPalette`, croissance et cuisson des fleurs, `drawIllustratedFlower`, cache de fleurs, `fadeOut`/`fadeIn`, `drawFade`, panneau de fin de `die`).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Le parterre appartient au run** : `state.garden.flowers` survit aux changements de niveau (comme `game.flowers`/`bakedFlowers` en v3) et repart vide avec un nouveau run.
- **Une seule liste de fleurs** : la v3 déplaçait les fleurs finies dans `bakedFlowers` ; ici chaque fleur garde `age` et `size`, et c'est le rendu qui décide de la cuire dans son cache (fleur finie : `age > 1.05` et `size ≥ .94·max`). La simulation n'a pas à connaître le cache.
- **Fondus dans le mode `bloom`** : `state.flow.stage ∈ show | fadeOut | fadeIn` et `state.flow.fade ∈ [0, 1]` plutôt que deux nouveaux modes ; le cadrage reste celui de `bloom`. Durées v3 : 1,55 s, .46 s, .48 s.
- **Taille des fleurs** : `flowerPower` valait toujours 1 en v3 ; `maxSize = 1` pour la première fleur, `range(.78, .96)` pour les suivantes.
- **Pétales qui s'envolent** (particules) : étape 7.
- **Raison de la mort** sur l'écran de fin : `state.flow.overReason` (texte du dernier message de mort), comme le `<p>${reason}</p>` du panneau v3.

## Review Focus

1. **Fleurs au bord de l'écran** : position bornée à `[18, W − 18]`, même avec plusieurs fleurs et une pointe collée au bord → test Task 1.
2. **Mort ou nouvelle partie pendant une éclosion** : impossible de mourir en `bloom` ; un nouveau run repart avec un parterre vide → tests Task 1.
3. **Fondu interrompu** : redimensionner la fenêtre pendant le fondu ne casse pas l'enchaînement (le niveau est régénéré une seule fois) → test Task 2.
4. **Beaucoup de fleurs** (longue partie) : le coût de dessin reste constant grâce au cache (les fleurs finies ne sont redessinées que quand une nouvelle finit de pousser) → vérification au profilage manuel en Task 3.
5. **Écran de fin** : la raison de la mort est affichée, même si elle est longue (texte réduit pour tenir) → vérification navigateur Task 3.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/play/flow.js` | fleurs (création, croissance), étapes du fondu, `overReason` |
| `src/core/state.js` | `garden: { flowers: [] }`, `flow: { …, stage, fade, overReason }` |
| `src/render/flowers.js` | `drawIllustratedFlower` + cache des fleurs finies + fleurs qui poussent |
| `src/render/effects.js` | anneau d'éclosion (`bloom`) |
| `src/render/frame.js` | parterre dans le monde ; voile de fondu par-dessus tout |
| `src/render/hud.js` | raison de la mort sur l'écran de fin |

---

### Task 1: Fleurs et parterre

**Files:** Modify `src/play/flow.js`, `src/core/state.js`, `src/core/config.js`, `dev/tests/flow.test.js`

**Interfaces:**
- `state.garden = { flowers: [] }` ; fleur `{ x, size, maxSize, age, palette: [4 couleurs], tilt }`.
- À l'éclosion (port de `bloom`) : `count = 1 + flowerBonus` ; `spread = min(54, 14 + flowerBonus·10)` ; `mid = (count − 1)/2` ; pour chaque fleur `i` : `offset = (i − mid)·(count === 1 ? 0 : spread / max(1, mid + 1)) + rng.range(−4, 4)`, `x = clamp(tip.x + offset, 18, W − 18)`, `maxSize = i === 0 ? 1 : rng.range(.78, .96)`, `palette` = une des 5 palettes v3 (`flowerPalette`), `tilt = rng.range(−.22, .22)`, `size = 0`, `age = 0`. L'événement `bloom` porte `{ x: tip.x, y: surfaceY + soil.surfaceOffset − 9, count, bonus }`.
- `FP.flow.update` fait pousser les fleurs dans tous les modes : `age += dt`, `size = min(maxSize, size + dt·2.5·maxSize)`.
- `config.garden = { spreadBase: 14, spreadPerBonus: 10, spreadMax: 54, jitter: 4, edge: 18, extraSize: [.78, .96], tilt: .22, growRate: 2.5, bakedAge: 1.05, bakedSize: .94, palettes: [ …les 5 palettes v3… ] }`.

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('flow: éclosion → fleurs au parterre', () => {
  const s = flowRun(); s.score.flowerBonus = 2; s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  const f = s.garden.flowers;
  FP.assertEqual(f.length, 3);
  FP.assertEqual(new Set(f.map(x => Math.round(x.x))).size, 3);
  FP.assertEqual(f[0].maxSize, 1);
  FP.assert(f[1].maxSize >= .78 && f[1].maxSize <= .96);
  FP.assert(FP.config.garden.palettes.some(p => p === f[0].palette));
});
FP.test('flow: fleurs bornées au bord de l’écran', () => {
  const s = flowRun(); s.score.flowerBonus = 3; s.plant.tip = { x: 2, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (const f of s.garden.flowers) FP.assert(f.x >= 18 && f.x <= s.world.width - 18, String(f.x));
});
FP.test('flow: une fleur pousse en ~.4 s puis reste', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (let i = 0; i < 30; i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.garden.flowers[0].size, 1);
});
FP.test('flow: le parterre survit au niveau suivant, pas à un nouveau run', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  for (let i = 0; i < 200; i++) FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.garden.flowers.length, 1);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 783 }).garden.flowers.length, 0);
});
FP.test('flow: pas de mort pendant l’éclosion', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  s.query = { solid: { kind: 'server' }, leak: 0, toxic: 0, danger: 0, grazes: [] };
  FP.flow.update(s, 1 / 60); FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.plant.reserves, 3);
});
```

Le test existant `flow: surface → éclosion puis ready au niveau suivant` (`FP.flow.update(s, 1.6)` → `ready`) doit être adapté : avec les fondus, il faut ~2,5 s ; le faire avancer par pas de 1/60 s jusqu'à 3 s (Ruling dans le ledger).

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Commit** `feat(play): fleurs d'éclosion et parterre de la partie`

---

### Task 2: Fondus entre les niveaux et raison de la fin

**Files:** Modify `src/play/flow.js`, `src/core/state.js`, `src/core/config.js`, `dev/tests/flow.test.js`

**Interfaces:**
- `state.flow = { timer, message, messageTimer, stage: 'show', fade: 0, overReason: '' }`.
- En `bloom` (port de la machine `bloom → fadeOut → fadeIn → ready`) :
  - `stage 'show'` : `timer` (1,55 s) ; à 0 → `stage = 'fadeOut'`, `timer = .46`, `fade = 0` ;
  - `'fadeOut'` : `fade = clamp(1 − timer/.46, 0, 1)` ; à 0 → `FP.level.generate`, `FP.plant.prepare`, `stage = 'fadeIn'`, `timer = .48`, `fade = 1` ;
  - `'fadeIn'` : `fade = clamp(timer/.48, 0, 1)` ; à 0 → `fade = 0`, `mode = 'ready'`, message « TOUCHE POUR POUSSER » 2,2 s, `stage = 'show'`.
- À la mort sans graine restante : `flow.overReason = raison` (même texte que le message de mort).
- `config.flow` : `fadeOutTime: .46`, `fadeInTime: .48` (en plus de `bloomTime`).

- [ ] **Step 1: Tests (rouges)**

```js
const bloomNow = (s) => { s.plant.tip = { x: 220, y: s.world.surfaceY - 1 }; FP.collision.update(s); FP.flow.update(s, 0); };
const advance = (s, sec) => { for (let t = 0; t < sec - 1e-9; t += 1 / 60) FP.flow.update(s, 1 / 60); };
FP.test('flow: fondu sortant puis nouveau niveau puis fondu entrant', () => {
  const s = flowRun(), before = JSON.stringify(s.world.solids.map(o => [o.x, o.y]));
  bloomNow(s);
  advance(s, 1.55 + .23);
  FP.assertEqual(s.flow.stage, 'fadeOut'); FP.assert(s.flow.fade > .4 && s.flow.fade < .6, String(s.flow.fade));
  FP.assertEqual(JSON.stringify(s.world.solids.map(o => [o.x, o.y])), before);   // pas encore régénéré
  advance(s, .3);
  FP.assertEqual(s.flow.stage, 'fadeIn'); FP.assert(s.flow.fade > .5);
  FP.assert(JSON.stringify(s.world.solids.map(o => [o.x, o.y])) !== before);
  advance(s, .5);
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.flow.fade, 0);
});
FP.test('flow: le niveau n’est régénéré qu’une fois par éclosion', () => {
  const s = flowRun(); let n = 0; const gen = FP.level.generate;
  FP.level.generate = (st) => { n++; gen(st); };
  try { bloomNow(s); advance(s, 3); } finally { FP.level.generate = gen; }
  FP.assertEqual(n, 1);
});
FP.test('flow: la raison de la dernière mort est gardée pour l’écran de fin', () => {
  const s = flowRun(); s.plant.reserves = 1;
  const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); s.plant.tip = { x: 220, y: 900 };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'over'); FP.assertEqual(s.flow.overReason, 'rupture : rack serveur');
});
```

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Commit** `feat(play): fondus entre les niveaux et raison de la fin de partie`

---

### Task 3: Rendu — fleurs, anneau d'éclosion, fondu, écran de fin

**Files:** Create `src/render/flowers.js` ; Modify `src/render/effects.js`, `src/render/frame.js`, `src/render/hud.js`, `index.html`

**Interfaces:**
- `FP.flowersRender.draw(ctx, state)` (repère monde, base `surfaceY + soil.surfaceOffset`) — port de `drawIllustratedFlower` (tige contourée, deux feuilles, 5 pétales irréguliers, cœur ponctué ; léger balancement pour les fleurs qui poussent), de `rebuildFlowerCache` / `drawFlowerCache` (canvas `W × 144`, origine à −126 sous la base ; reconstruit quand le nombre de fleurs finies ou la largeur change) ; les fleurs finies passent par le cache, les autres sont dessinées animées ; culling vertical comme en v3.
- `effects.js` : événement `bloom` → anneau d'éclosion (rayon `68 + 13·bonus`, 1,18 s, 10 rayons qui tournent) — port de la branche `bloom` de `drawEffects`.
- `frame.js` : fleurs dessinées après la plante (comme `drawPlant` en v3) ; voile `#020201` d'opacité `flow.fade` sur tout l'écran, après le HUD (`drawFade`).
- `hud.js` : écran de fin avec la raison (`flow.overReason`) sous le nombre de fleurs, réduite pour tenir dans la largeur ; correction de l'en-tête (« le pollen reçu arrive à l'étape 5 », relevé de la revue précédente).

- [ ] **Step 1: Implémenter.** `index.html` : `render/flowers.js` avant `frame.js`.
- [ ] **Step 2:** tests verts ; `wc -l` < 400.
- [ ] **Step 3: Navigateur** : atteindre la surface → anneau doré, fleur qui pousse avec le bon balancement ; avec un pollen → 2 fleurs écartées ; fondu au noir puis retour sur la graine du niveau suivant ; plusieurs éclosions → parterre qui s'étoffe ; fin de partie → raison affichée. 0 erreur console. Comparer avec l'archive.
- [ ] **Step 4: Commit** `feat(render): fleurs illustrées, parterre en cache, anneau d'éclosion, fondus et écran de fin`

---

### Task 4: Docs de l'étape

**Files:** `docs/architecture.md` (`garden`, `flow.stage/fade/overReason`, rendu des fleurs), `README.md` (« étape 6/7 »), `CHANGELOG.md` (`v4.0.0-etape6 — Éclosion`).

- [ ] **Step 1: Mettre à jour.** · **Step 2: Vérification finale.** · **Step 3: Commit** `docs: étape 6 — éclosion`
