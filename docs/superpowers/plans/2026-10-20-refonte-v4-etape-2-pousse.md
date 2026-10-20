# Refonte v4 — Étape 2 : la pousse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le jeu jouable : la pousse grandit et se pilote au doigt/à la souris, meurt au contact d'un obstacle, repart d'une nouvelle graine (3 graines), et passe au niveau suivant en atteignant la surface ; caméra zoomée (cadrage ×1,18 + zoom de frôlement).

**Architecture:** Systèmes de simulation dans l'ordre de la boucle : `input` (instantané du pointeur) → `plant` (croissance, pilotage, trace) → `collision` (requête unique de pointe) → `flow` (mort, éclosion, transitions, fin de partie) → `camera` (défilement + zoom). Le rendu (`render/plant.js`, `render/hud.js`, zoom dans `frame.js`) lit l'état. Tout est porté de la v3.43.16.

**Tech Stack:** JavaScript natif sur `window.FP`, Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§6 frame, §7 périmètre, §11 étape 2).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes rôle / lit / écrit / expose.
- La simulation écrit, le rendu lit ; tous les réglages dans `config.js` ; aléatoire de gameplay via `state.rng`.
- Le gamefeel (vitesse, virage, rampe, rebond aux bords, caméra, zoom) reproduit la v3.43.16 : comparer côte à côte avec `archive/v3.43.16/index.html`.
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Obstacles rognés par les bords** (demande du 2026-10-20) : un obstacle peut dépasser du bord gauche/droit de l'écran tant qu'il reste identifiable. Réglage `config.level.fit.maxOutside = { authored: 8, signature: 70 }` (px au-delà du bord). Le chemin sûr et les limites haut/bas ne changent pas.
- **Modes** : `menu | ready | playing | dying | bloom | over` (la spec listait 4 modes ; `ready` = attente d'un toucher après éclosion, `over` = plus de graines).
- **La boucle appelle les systèmes dans tous les modes sauf `menu`** ; chaque système décide selon le mode (la caméra doit bouger pendant `dying`/`bloom`, `flow` gère les minuteries). Nouveau système `flow` entre `scoring` et `camera`.
- **Éclosion minimale** : atteindre la surface compte une fleur (`score.flowers += 1`, `level += 1`), garde la trace, attend 1,55 s puis génère le niveau suivant en mode `ready`. Les fleurs dessinées, le fondu et le bloom visuel arrivent à l'étape 6.
- **Fin de partie minimale** : écran dessiné sur le canvas (« Plus de graines · N fleurs · touche pour recommencer ») ; le vrai écran de records arrive à l'étape 6.
- **Particules de terre, son, secousse visuelle** : étape 7 (effets). La secousse est quand même enregistrée dans `camera.shake` pour ne pas perdre l'information.
- **Les zones toxiques et le lixiviat n'existent pas encore** : `corruption` et le danger du lixiviat arrivent à l'étape 3 ; le zoom de frôlement ne réagit qu'aux solides.

## Review Focus

1. **Onglet en arrière-plan puis retour** : le `dt` plafonné ne téléporte pas la pousse à travers un obstacle (pas maxi par frame ≈ 196·0,033 ≈ 6,5 px < épaisseur des polygones) → test `plant: pas maximal par frame` en Task 2.
2. **Clic maintenu pendant la mort ou l'éclosion** : la nouvelle pousse ne part pas « dans le vide » ; en `ready`, il faut un nouvel appui (front montant), pas un bouton resté enfoncé → test `flow: ready exige un nouvel appui` en Task 4.
3. **Pointeur hors du canvas / relâché hors fenêtre** : `pointerup`/`pointercancel` sur `window` relâchent le contrôle → vérification navigateur Task 3.
4. **Pousse collée au bord** : rebond sans sortir de `[12, W − 12]`, même avec une fenêtre élargie en cours de partie (bord = `world.width`) → test `plant: bords` en Task 2.
5. **Tip NaN** (relevé de la revue de l'étape 1) : la caméra ignore une cible non finie → test `camera: cible non finie ignorée` en Task 5.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/world/level.js` | + règle `maxOutside` |
| `src/core/geom.js` | + `pointInPoly`, `sdPoly` (distance signée à un polygone) |
| `src/core/state.js` | + `plant` complet, `input`, `query`, `flow`, `camera.near/zoom` |
| `src/play/plant.js` | `FP.plant` : `launch(state)`, `update(state, dt)`, `speed(state)` |
| `src/world/collision.js` | `FP.collision.update(state)`, `FP.collision.queryPoint(world, x, y)` |
| `src/play/flow.js` | `FP.flow.update(state, dt)` |
| `src/ui/input.js` | événements pointeur → tampon ; `FP.input.update(state)` ; `FP.input.toWorldX(...)` |
| `src/play/camera.js` | + zoom de frôlement, cible non finie ignorée |
| `src/core/loop.js` | ordre `input, plant, hazards, collision, graze, powerups, scoring, flow, camera` ; systèmes appelés hors `menu` |
| `src/render/plant.js` | anciennes traces, trace courante, graine, bourgeon, guide du pointeur |
| `src/render/hud.js` | message central, graines restantes, écran `ready`/`over` |
| `src/render/frame.js` | zoom ×1,18·zoom de frôlement centré sur la pointe |
| `src/ui/menu.js` | démarrage → `FP.plant.launch` ; `over` → touche → nouveau run |

---

### Task 1: Obstacles rognés par les bords

**Files:** Modify `src/core/config.js`, `src/world/level.js` (`objectFits`), `dev/tests/level.test.js`

**Interfaces:**
- Produces: `config.level.fit.maxOutside = { authored: 8, signature: 70 }` ; `fit.edgeX` est supprimé. Dans `objectFits`, les points du footprint visible doivent vérifier `x ≥ −m` et `x ≤ W + m` avec `m = o.signature ? maxOutside.signature : maxOutside.authored`. Le centre reste soumis à `centerMarginX`.

- [ ] **Step 1: Tests (rouges)** — dans `level.test.js`, remplacer `obstacles dans le cadre` par :

```js
FP.test('level: obstacles identifiables (rognés de quelques px au plus)', () => {
  for (const seed of [1, 2, 3, 1234]) {
    const s = gen(seed), w = s.world;
    for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
      FP.assert(p.x >= -8 && p.x <= w.width + 8 && p.y >= w.surfaceY + 34 && p.y <= w.height - 100, `${seed} ${o.kind}`);
  }
});
FP.test('level: le T-Rex signature trouve sa place sur écran étroit', () => {
  let placed = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = FP.state.createRun(seed, { W: 360, H: 780 });
    s.signature = { armed: true, spawned: false, targetLevel: 1 }; s.level = 1;
    FP.level.generate(s);
    if (s.world.solids.some(o => o.kind === 'trex_signature')) placed++;
  }
  FP.assert(placed >= 15, `placé ${placed}/20`);
});
```

- [ ] **Step 2: Vérifier l'échec** — le test T-Rex échoue (0/20 attendu d'après la revue).
- [ ] **Step 3: Implémenter.** Si le T-Rex reste sous 15/20 avec 70 px, relever `maxOutside.signature` jusqu'à 90 au plus et le noter en Ruling.
- [ ] **Step 4: Vérifier le succès** — tout vert.
- [ ] **Step 5: Commit** `feat(world): obstacles rognés par les bords tant qu'ils restent identifiables`

---

### Task 2: Pousse — croissance, pilotage, trace

**Files:** Create `src/play/plant.js`, `dev/tests/plant.test.js` ; Modify `src/core/state.js`, `src/core/config.js`, `src/core/geom.js` (rien ici), `dev/check.html`, `index.html`

**Interfaces:**
- Consumes: `state.input = { x, y, down, active, pressed }` (`x` monde, `y` écran 0..viewH ; `pressed` = front montant de cette frame) — produit en Task 3, initialisé par `createRun` à `{x:0,y:0,down:false,active:false,pressed:false}`.
- Produces:
  - État `plant = { seed:{x,y}, tip:null|{x,y}, dir:{x,y}, trail:[], oldTrails:[], guide:{x,y}, stemAge:0, stemCount:0, reserves:3 }` dans `createRun`.
  - `FP.plant.prepare(state)` : graine en `(width/2, height − 46)`, `tip = null`, `trail = []`, `camera.y = maxY` (graine posée, pousse pas encore lancée).
  - `FP.plant.launch(state)` : `prepare`, puis `tip` = graine, `dir = (rng.range(−.07,.07), −1)`, `trail = [tip]`, `guide = (tip.x, tip.y − 140)`, `stemAge = 0`, `stemCount += 1`, `camera.y = maxY`, `mode = 'playing'`, événement `{type:'stemStart', n: stemCount}`.
  - `FP.plant.speed(state) → px/s` = `min(196, 76 + max(0, stemCount−1)·2.7 + flowers·1.35 + min(16, stemAge·1.45)) · .88` (·.985 si `input.down`).
  - `FP.plant.update(state, dt)` (seulement en `playing`) : port fidèle de la partie « croissance » de `update()` v3 — `desiredX = sin(time·1.25 + tip.y·.018)·.035`, contrôle (`lookAhead = lerp(185, 92, y01)`, `guide.x = lerp(guide.x, input.x, dt·10)`, `turn = clamp(dx/138, −1, 1)`, `sharp = lerp(.88, 1.28, y01)`, `desiredX += turn·1.18·sharp`, `desiredY = −.78`), sans contrôle `guide` revient vers la pointe ; `clampUpAngle` à 89° (contrôlé) ou 42° (libre) ; `steer = 13.8` (contrôlé) ou `5.4` ; `dir` re-clampé à 89° ; avance ; bords `[12, W−12]` avec rebond `dir.x *= −.48` et `camera.shake = max(shake, .035)` sous 14 px du bord ; fond `height − 22` ; point de trace tous les 8,6 px, 340 points max.
  - `FP.geom.clampUpAngle(x, y, maxDeg) → {x,y}` (déplacé dans `geom.js`).
  - `config.plant = { seedOffset: 46, ... }` avec toutes les constantes ci-dessus.

- [ ] **Step 1: Tests (rouges)**

```js
const plantRun = () => { const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.generate(s); s.world.solids = []; FP.plant.launch(s); return s; };
FP.test('plant: lancement depuis la graine', () => {
  const s = plantRun(), w = s.world;
  FP.assertEqual(s.mode, 'playing');
  FP.assertEqual(s.plant.tip.x, w.width / 2);
  FP.assertEqual(s.plant.tip.y, w.height - 46);
  FP.assertEqual(s.plant.stemCount, 1);
  FP.assert(s.events.some(e => e.type === 'stemStart'));
});
FP.test('plant: vitesse de départ v3 (cadrage B)', () => {
  const s = plantRun();
  FP.assertEqual(FP.plant.speed(s), 76 * .88);
});
FP.test('plant: monte sans contrôle', () => {
  const s = plantRun(), y0 = s.plant.tip.y;
  for (let i = 0; i < 60; i++) FP.plant.update(s, 1 / 60);
  FP.assert(y0 - s.plant.tip.y > 55 && y0 - s.plant.tip.y < 75, String(y0 - s.plant.tip.y));
  FP.assert(s.plant.trail.length > 5);
});
FP.test('plant: tourne vers le pointeur sans jamais redescendre', () => {
  const s = plantRun();
  s.input = { x: 20, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 120; i++) { FP.plant.update(s, 1 / 60); FP.assert(s.plant.dir.y < 0); }
  FP.assert(s.plant.tip.x < s.world.width / 2 - 40, String(s.plant.tip.x));
});
FP.test('plant: bords', () => {
  const s = plantRun();
  s.input = { x: -500, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 600; i++) { FP.plant.update(s, 1 / 60); FP.assert(s.plant.tip.x >= 12 && s.plant.tip.x <= s.world.width - 12); }
});
FP.test('plant: pas maximal par frame', () => {
  const s = plantRun(); s.plant.stemCount = 99; s.plant.stemAge = 99;
  const y0 = s.plant.tip.y; FP.plant.update(s, .033);
  FP.assert(y0 - s.plant.tip.y <= 196 * .88 * .033 + 1e-9);
});
FP.test('plant: trace bornée à 340 points', () => {
  const s = plantRun(); s.world.height = 1e6; s.plant.tip.y = 9e5;
  for (let i = 0; i < 6000; i++) FP.plant.update(s, 1 / 30);
  FP.assert(s.plant.trail.length <= 340);
});
```

- [ ] **Step 2: Vérifier l'échec.**
- [ ] **Step 3: Implémenter** `plant.js`, `geom.clampUpAngle`, `config.plant`, l'état. `index.html` et `check.html` : `src/play/plant.js` après `level.js`.
- [ ] **Step 4: Vérifier le succès.**
- [ ] **Step 5: Commit** `feat(play): croissance et pilotage de la pousse`

---

### Task 3: Entrée pointeur

**Files:** Create `src/ui/input.js`, `dev/tests/input.test.js` ; Modify `src/core/state.js`, `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - `FP.input.toWorldX(screenX, zoom, focalX) → number` = `zoom > 1.002 ? focalX + (screenX − focalX)/zoom : screenX` (port de `setPointer`).
  - `FP.input.focalX(state) → clamp(tip ? tip.x : width/2, W·.22, W·.78)` avec `W = world.width`.
  - `FP.input.update(state)` : copie le tampon d'événements dans `state.input` (`x` converti avec `camera.zoom` et `focalX`, `y` écran ramené à la hauteur de vue, `down`, `active`, `pressed` = front montant depuis la frame précédente, puis remet le front à faux).
  - Écoute `pointerdown/move` sur le canvas, `pointerup/pointercancel` sur `window` ; coordonnées = `(clientX − rect.left)·(W/rect.width)`.

- [ ] **Step 1: Tests (rouges)** — seules les fonctions pures et `update` avec un tampon injecté :

```js
FP.test('input: conversion écran → monde sous zoom', () => {
  FP.assertEqual(FP.input.toWorldX(300, 1, 220), 300);
  FP.assertEqual(FP.input.toWorldX(300, 1.18, 220), 220 + 80 / 1.18);
});
FP.test('input: point focal borné', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  s.plant.tip = { x: 5, y: 500 };
  FP.assertEqual(FP.input.focalX(s), 440 * .22);
});
FP.test('input: front montant une seule frame', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.input._inject({ x: 100, y: 200, down: true });
  FP.input.update(s); FP.assert(s.input.pressed && s.input.down);
  FP.input.update(s); FP.assert(!s.input.pressed && s.input.down);
  FP.input._inject({ down: false }); FP.input.update(s); FP.assert(!s.input.down);
});
```

`FP.input._inject(partial)` : point d'entrée de test qui modifie le tampon comme le ferait un événement (documenté comme tel dans l'en-tête).

- [ ] **Step 2: Vérifier l'échec.** · **Step 3: Implémenter** (`input.js` sans DOM au chargement si `document` absent : les écouteurs ne s'installent que si `FP.view` existe). `index.html` : `src/ui/input.js` avant `ui/menu.js`. · **Step 4: Vérifier le succès.**
- [ ] **Step 5: Vérifier dans le navigateur** que relâcher le clic hors de la fenêtre relâche le contrôle.
- [ ] **Step 6: Commit** `feat(ui): entrée pointeur avec conversion sous zoom`

---

### Task 4: Collision de pointe et déroulé de partie

**Files:** Create `src/world/collision.js`, `src/play/flow.js`, `dev/tests/collision.test.js`, `dev/tests/flow.test.js` ; Modify `src/core/geom.js`, `src/core/loop.js`, `dev/tests/loop.test.js`, `src/core/state.js`, `src/core/config.js`, `src/ui/menu.js`, `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - `FP.geom.sdPoly(px, py, pts) → distance signée` (négative à l'intérieur ; `pts = [[x,y]]`), `FP.geom.pointInPoly(px, py, pts)`.
  - `FP.collision.queryPoint(world, x, y) → { solid: Solid|null, danger: 0..1, near: Solid|null }` : pour chaque solide, broad phase `broadR + band + 10` (band = `flyoverEligible ? grazeRadius : 0`), point ramené au repère local (rotation −a), `d = sdPoly` ; `d ≤ 0` → `solid` (premier trouvé) ; `0 < d < band` → `intensity = 1 − d/band`, `danger = max`, `near` = solide le plus intense.
  - `FP.collision.update(state)` : en `playing`, `state.query = queryPoint(world, tip.x, tip.y)` ; sinon `state.query = { solid:null, danger:0, near:null }`.
  - `FP.flow.update(state, dt)` :
    - `playing` : si `tip.y ≤ surfaceY` → éclosion (`score.flowers += 1`, `level += 1`, `plant.oldTrails.push(trace simplifiée)` (6 max, simplification v3 `simplifyTrail` à 11 px), `mode = 'bloom'`, `flow.timer = 1.55`, événement `bloom`) ; sinon si `query.solid` → mort (`reserves −= 1`, événement `{type:'death', kind}`, `fx` non touché, `camera.shake = max(shake, .28)`, message `config.text.death[kind]` ou `'rupture : déchet'`, puis `reserves ≤ 0 ? mode = 'over' : (mode = 'dying', flow.timer = .85)`).
    - `dying` : à 0 → `FP.level.generate(state)` puis `FP.plant.launch(state)`.
    - `bloom` : à 0 → `FP.level.generate(state)`, `FP.plant.prepare(state)`, `mode = 'ready'`, message « TOUCHE POUR POUSSER ».
    - `ready` : si `input.pressed` → `FP.plant.launch(state)`.
    - `over` : rien (le menu gère la relance).
  - Message courant : `state.flow = { timer, message, messageTimer }` (le HUD l'affiche ; décrémenté ici).
  - `loop.js` : `UPDATE_ORDER = ['input','plant','hazards','collision','graze','powerups','scoring','flow','camera']`, systèmes appelés si `mode !== 'menu'`.
  - `ui/menu.js` : au démarrage `FP.level.startRun(state)` puis `FP.plant.launch(state)` ; en mode `over`, un appui crée un run neuf et le lance.
  - `config.flow = { dyingTime: .85, bloomTime: 1.55, oldTrailsMax: 6, trailSimplifyPx: 11, readyMessage: 'TOUCHE POUR POUSSER' }`, `config.text.death = { server: 'rupture : rack serveur', … }` (11 familles + `trex_signature: 'rupture : crâne enfoui'`, textes v3).

- [ ] **Step 1: Tests (rouges)**

```js
// collision.test.js
const solidAt = (x, y, kind = 'server') => FP.catalog.makeSolid({ kind, x, y, a: 0, flip: 1 });
const worldWith = (...solids) => ({ solids });
FP.test('collision: point dans le polygone → solide', () => {
  const o = solidAt(200, 300);
  FP.assertEqual(FP.collision.queryPoint(worldWith(o), 200, 300).solid, o);
});
FP.test('collision: dans la bande de frôlement → danger', () => {
  const o = solidAt(200, 300);
  const q = FP.collision.queryPoint(worldWith(o), 200 + 47, 300);   // bord droit du serveur ≈ 200+40, bande 16
  FP.assertEqual(q.solid, null);
  FP.assert(q.danger > 0 && q.danger < 1, String(q.danger));
  FP.assertEqual(q.near, o);
});
FP.test('collision: loin → rien', () => {
  const q = FP.collision.queryPoint(worldWith(solidAt(200, 300)), 400, 700);
  FP.assertEqual(q.solid, null); FP.assertEqual(q.danger, 0);
});
FP.test('collision: rotation et miroir respectés', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 200, y: 300, a: Math.PI / 2, flip: -1 });
  for (const [lx, ly] of o.collision.slice(0, 4)) {
    const p = FP.geom.toWorld(o, lx * .8, ly * .8);
    FP.assertEqual(FP.collision.queryPoint(worldWith(o), p.x, p.y).solid, o);
  }
});
FP.test('geom: sdPoly signe', () => {
  const sq = [[0,0],[10,0],[10,10],[0,10]];
  FP.assertEqual(FP.geom.sdPoly(5, 5, sq), -5);
  FP.assertEqual(FP.geom.sdPoly(13, 5, sq), 3);
});
```

```js
// flow.test.js
const flowRun = () => { const s = FP.state.createRun(11, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
const tick = (s, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) FP.loop.step(s, dt); };
FP.test('flow: contact → mort puis nouvelle pousse sur un nouveau niveau', () => {
  const s = flowRun(), before = JSON.stringify(s.world.solids.map(o => [o.x, o.y]));
  const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, 2);
  FP.assert(s.events.some(e => e.type === 'death'));
  FP.flow.update(s, .9);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.stemCount, 2);
  FP.assert(JSON.stringify(s.world.solids.map(o => [o.x, o.y])) !== before);
});
FP.test('flow: plus de graines → over', () => {
  const s = flowRun(); s.plant.reserves = 1;
  const o = FP.catalog.makeSolid({ kind: 'server', x: 220, y: 900, a: 0, flip: 1 }); s.world.solids.push(o); s.plant.tip = { x: o.x, y: o.y };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'over');
});
FP.test('flow: surface → éclosion puis ready au niveau suivant', () => {
  const s = flowRun(); s.plant.tip = { x: 220, y: s.world.surfaceY - 1 };
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'bloom'); FP.assertEqual(s.score.flowers, 1); FP.assertEqual(s.level, 1);
  FP.assertEqual(s.plant.oldTrails.length, 1);
  FP.flow.update(s, 1.6);
  FP.assertEqual(s.mode, 'ready');
});
FP.test('flow: ready exige un nouvel appui', () => {
  const s = flowRun(); s.mode = 'ready';
  s.input = { x: 0, y: 0, down: true, active: true, pressed: false };
  FP.flow.update(s, .1); FP.assertEqual(s.mode, 'ready');
  s.input.pressed = true; FP.flow.update(s, .1); FP.assertEqual(s.mode, 'playing');
});
FP.test('flow: une partie complète tourne sans exception', () => {
  const s = flowRun(); tick(s, 60 * 40);
  FP.assert(['playing', 'dying', 'bloom', 'ready', 'over'].includes(s.mode));
});
```

`loop.test.js` : ordre attendu `input,plant,hazards,collision,graze,powerups,scoring,flow,camera` ; le test « rien ne tourne au menu » reste.

- [ ] **Step 2: Vérifier l'échec.** · **Step 3: Implémenter.** · **Step 4: Vérifier le succès.**
- [ ] **Step 5: Commit** `feat(play): collision de pointe, mort, éclosion minimale et fin de partie`

---

### Task 5: Caméra zoomée

**Files:** Modify `src/play/camera.js`, `src/core/config.js`, `src/core/state.js`, `dev/tests/camera.test.js`

**Interfaces:**
- Produces:
  - `state.camera = { y, manual, near: 0, zoom: 1, shake }`.
  - `FP.camera.update` : cible = `tip` s'il existe et que le mode n'est pas `ready`, sinon `maxY` (comme en v3) ; cible non finie → ne bouge pas ; zoom de frôlement porté de `updateCamera` v3 : `target = mode === 'playing' ? query.danger : 0`, `near = lerp(near, target, dt·(target > near ? 26 : 18))`, `punch = near^1.55`, `zoomTarget = 1 + punch·.22`, `zoom = lerp(zoom, zoomTarget, dt·(zoomTarget > zoom ? 30 : 22))` ; `shake = max(0, shake − dt)`.
  - `FP.camera.totalZoom(state) → camera.zoom · config.camera.framing (1.18)` en `playing`/`ready`/`bloom`, sinon 1.
  - `config.camera += { framing: 1.18, grazeZoom: .22, nearIn: 26, nearOut: 18, zoomCurve: 1.55, zoomIn: 30, zoomOut: 22 }`, et correction du commentaire (`rateDown` s'applique quand la caméra remonte vers la surface).

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('camera: zoom de frôlement monte avec le danger', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing'; s.plant.tip = { x: 220, y: 1500 };
  s.query = { solid: null, danger: 1, near: null };
  for (let i = 0; i < 120; i++) FP.camera.update(s, 1 / 60);
  FP.assert(Math.abs(s.camera.zoom - 1.22) < .01, String(s.camera.zoom));
  FP.assert(Math.abs(FP.camera.totalZoom(s) - 1.22 * 1.18) < .02);
});
FP.test('camera: pas de cadrage hors partie', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'dying';
  FP.assertEqual(FP.camera.totalZoom(s), 1);
});
FP.test('camera: cible non finie ignorée', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing';
  const y = s.camera.y; s.plant.tip = { x: 220, y: NaN };
  FP.camera.update(s, .1);
  FP.assertEqual(s.camera.y, y);
});
```

Les tests existants qui appellent `camera.update` sans `mode` doivent passer `s.mode = 'playing'` si nécessaire (Ruling si un test change).

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Commit** `feat(play): zoom de cadrage et de frôlement`

---

### Task 6: Rendu de la pousse, HUD et zoom

**Files:** Create `src/render/plant.js`, `src/render/hud.js` ; Modify `src/render/frame.js`, `index.html`

**Interfaces:**
- Consumes: `state.plant`, `state.input`, `state.flow`, `state.mode`, `state.camera`, `FP.camera.totalZoom`, `FP.input.focalX`.
- Produces:
  - `FP.plantRender.draw(ctx, state)` (monde) : port fidèle de `drawTrail` (anciennes traces atténuées, trace courante avec grain, taches, feuilles primitives), de la graine (`drawPlant`) et du bourgeon terminal (en `playing`).
  - `FP.plantRender.drawPointer(ctx, state)` (écran) : port de `drawPointer` (cercle du doigt, guide, trajectoire prévue en pointillés) en `playing`.
  - `FP.hud.draw(ctx, state)` (écran) : message `flow.message` centré (fondu sur `messageTimer`), graines restantes en bas à droite, écran `over` (« Plus de graines », fleurs, « Touche pour recommencer »).
  - `frame.js` : si `totalZoom > 1.002`, `translate(fx, fy) · scale(z) · translate(−fx, −fy)` avec `fx = focalX`, `fy = clamp(tipScreenY, H·.20, H·.78)` (port de `draw()` v3), puis caméra, sol, obstacles, plante ; ensuite, hors zoom, pointeur et HUD.

- [ ] **Step 1: Implémenter** les deux fichiers et le zoom. `index.html` : `render/plant.js` et `render/hud.js` avant `frame.js`.
- [ ] **Step 2: Vérifier** `node dev/run-checks.js` vert ; `wc -l` < 400.
- [ ] **Step 3: Vérifier dans le navigateur** (serveur local, `?seed=1234`) : la pousse part de la graine, monte, suit le doigt avec le guide et la trajectoire prévue, rebondit au bord, meurt au contact (message « rupture : … », nouvelle pousse 0,85 s plus tard sur un autre niveau), éclot à la surface (« TOUCHE POUR POUSSER », nouvelle graine au niveau suivant), écran de fin après 3 morts, relance au toucher. Zoom ×1,18 visible, et zoom de frôlement en rasant un obstacle. 0 erreur console.
- [ ] **Step 4: Comparer côte à côte** avec `archive/v3.43.16/index.html` à la même taille : taille des obstacles, vitesse de montée, nervosité du virage, rendu de la tige.
- [ ] **Step 5: Commit** `feat(render): pousse, guide du pointeur, HUD minimal et zoom de cadrage`

---

### Task 7: Docs de l'étape

**Files:** Modify `docs/architecture.md` (carte, modes, ordre de boucle, scripts), `docs/design.md` (règle des obstacles rognés), `README.md` (statut « étape 2/7 — jouable »), `CHANGELOG.md` (`v4.0.0-etape2 — La pousse`), spec §6 (ordre de boucle avec `flow`, modes).

- [ ] **Step 1: Mettre à jour.** · **Step 2: Vérification finale** (tests verts, tailles, partie jouée). · **Step 3: Commit** `docs: étape 2 — la pousse`
