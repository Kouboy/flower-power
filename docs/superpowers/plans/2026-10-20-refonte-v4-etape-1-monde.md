# Refonte v4 — Étape 1 : le monde — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Générer un niveau à partir de la graine (chemin sûr + obstacles PNG placés sans chevauchement, T-Rex signature) et l'afficher (sol illustré en cache, obstacles avec leur ancrage dans la terre), parcourable avec une caméra libre `?freecam=1`.

**Architecture:** La génération est pure (`world/level.js` lit `state.rng` et les dimensions du run, écrit `state.world`) et s'appuie sur `world/catalog.js` (métadonnées JSON des PNG → objets solides prêts) et `core/geom.js` (SAT, distances). Le rendu (`render/soil.js`, `render/obstacles.js`, `render/sprites.js`) ne fait que lire l'état. La caméra (`play/camera.js`) est un système de la boucle.

**Tech Stack:** JavaScript natif (scripts classiques sur `window.FP`), Canvas 2D. Aucune dépendance.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§7 périmètre, §11 étape 1).

## Global Constraints

- Ouverture par double-clic en `file://` ; pas d'`import`/`export`, pas de npm.
- 400 lignes maximum par fichier `src/**` ; en-tête rôle / lit / écrit / expose.
- La simulation écrit, le rendu lit ; tous les chiffres réglables dans `config.js`.
- Toute valeur aléatoire de génération passe par `state.rng` (jamais `Math.random()`).
- Le JSON authoré (via `window.FLOWER_POWER_AUTHORED_ASSETS`) est la source de vérité : worldWidth, pivot, mirrorSafe, polygone, grazeRadius, flyoverEligible.
- Les solides ne se chevauchent jamais visuellement ; la densité est une cible, pas un quota ; un chemin sûr existe toujours.
- Comparer visuellement avec `archive/v3.43.16/index.html` (référence de gamefeel).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Pas de parité de graine avec l'archive.** La v3 consomme des tirages aléatoires pour des éléments retirés (portes, variantes, 13 familles vectorielles) : `?seed=N` donne un niveau reproductible *dans la v4*, mais pas le même niveau que l'archive. La comparaison côte à côte porte sur le ressenti (densité, lisibilité, look), pas sur une disposition identique. (Remplace le point « 2 tirages T-Rex » de la revue de l'étape 0.)
- **Tables de spawn réduites aux 11 familles PNG**, en gardant leurs poids relatifs v3 (largeur de leur tranche de probabilité) et leurs plages d'angle, par bande de profondeur.
- **Le zoom de cadrage B (×1,18) et le zoom de frôlement arrivent à l'étape 2** : ils sont centrés sur la pointe de la pousse, qui n'existe pas encore.
- **Toxiques et lixiviat** sont générés à l'étape 3, à la suite des solides dans `level.generate`.
- **Caméra libre `?freecam=1`** (molette, flèches, glisser) dans `debug/freecam.js` : outil de debug permanent pour inspecter un niveau.

## Review Focus

1. **Fenêtre étroite ou très haute** (W = 300, H = 1200) : la génération termine, place au moins un solide, aucun hors-cadre → test `level: fenêtre étroite` en Task 3.
2. **PNG manquant ou en échec de chargement** : le jeu ne plante pas, l'obstacle n'est pas dessiné mais garde sa collision → vérification `sprites.get` renvoie `null` en Task 4.
3. **Asset sans polygone valide (< 3 points)** dans le manifeste : `catalog` l'exclut des familles disponibles au lieu de produire un solide sans collision → test `catalog: asset sans polygone exclu` en Task 2.
4. **Graine identique, deux générations** : niveau strictement identique (positions, angles, flips, familles) → test `level: déterministe` en Task 3.
5. **Caméra aux bornes** : jamais au-dessus de 0 ni sous `height − viewH`, même en caméra libre → tests en Task 5.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/core/geom.js` | `FP.geom` : point-segment, transformation locale→monde, SAT de polygones convexes |
| `src/core/config.js` | + `world`, `level`, `spawnTables`, `signature`, `camera`, `soil` |
| `src/core/state.js` | `createRun(seed, dims)` : `world.width/height/viewH/surfaceY`, `camera.y`, `signature` |
| `src/world/catalog.js` | `FP.catalog` : familles disponibles, `makeSolid()` |
| `src/world/level.js` | `FP.level.startRun(state)`, `FP.level.generate(state)` |
| `src/play/camera.js` | `FP.camera.update(state, dt)` |
| `src/debug/freecam.js` | `?freecam=1` |
| `src/render/sprites.js` | chargement des PNG, `FP.sprites.get(assetKey)` |
| `src/render/soil.js` | cache du ciel + pelouse + terre, tranche visible |
| `src/render/obstacles.js` | pochoir d'ancrage en cache + sprite |
| `src/render/frame.js` | translation caméra, sol, obstacles (le fond provisoire disparaît) |
| `src/ui/menu.js` | démarrage : `createRun` puis `FP.level.startRun` |

---

### Task 1: Géométrie, dimensions du run et configuration du monde

**Files:**
- Create: `src/core/geom.js`, `dev/tests/geom.test.js`
- Modify: `src/core/state.js`, `src/core/config.js`, `src/ui/menu.js` (appel `createRun`), `dev/tests/state.test.js`, `dev/check.html`, `index.html`

**Interfaces:**
- Consumes: `FP.config`, `FP.createRng`, `FP.params`.
- Produces:
  - `FP.geom.distPointToSegment(px,py,ax,ay,bx,by) → number`
  - `FP.geom.toWorld(o, x, y) → {x,y}` : rotation `o.a` puis translation `o.x,o.y`
  - `FP.geom.convexPolysOverlap(a, b) → boolean` (polygones `[{x,y}]`, toucher la marge n'est pas un chevauchement : tolérance 0,01) — port de `convexPolysOverlap` + `polyAxisRange` de l'archive
  - `FP.state.createRun(seed?, dims = FP.view) → State` où `dims = {W, H}` ; ajoute `world.width = W`, `world.viewH = H`, `world.height = max(H + config.world.extraMin, floor(H * config.world.heightRatio))`, `world.surfaceY` (inchangé), `world.safePath = []`, `world.safeRadius = 0`, `world.skyVariant = 0`, `world.lawnVariant = 0`, `camera.y = max(0, height − H)`, `camera.manual = false`, `signature = { armed:false, spawned:false, targetLevel:0 }`
  - `config.world = { extraMin: 620, heightRatio: 2.35 }`

- [ ] **Step 1: Tests (rouges)**

```js
// dev/tests/geom.test.js
FP.test('geom: distance point-segment', () => {
  FP.assertEqual(FP.geom.distPointToSegment(0, 5, -10, 0, 10, 0), 5);
  FP.assertEqual(FP.geom.distPointToSegment(13, 4, -10, 0, 10, 0), 5);
});
FP.test('geom: toWorld applique rotation puis translation', () => {
  const p = FP.geom.toWorld({ x: 100, y: 50, a: Math.PI / 2 }, 10, 0);
  FP.assert(Math.abs(p.x - 100) < 1e-9 && Math.abs(p.y - 60) < 1e-9, JSON.stringify(p));
});
const sq = (x, y, s) => [{x, y}, {x: x + s, y}, {x: x + s, y: y + s}, {x, y: y + s}];
FP.test('geom: SAT chevauchement', () => FP.assert(FP.geom.convexPolysOverlap(sq(0,0,10), sq(5,5,10))));
FP.test('geom: SAT disjoints', () => FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,10), sq(20,0,10))));
FP.test('geom: SAT bord à bord n’est pas un chevauchement', () => FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,10), sq(10,0,10))));
FP.test('geom: SAT carré tourné en diagonale', () => {
  const diamond = [{x: 15, y: 5}, {x: 20, y: 10}, {x: 15, y: 15}, {x: 10, y: 10}];
  FP.assert(!FP.geom.convexPolysOverlap(sq(0,0,9.9), diamond));
});
```

Dans `dev/tests/state.test.js` : remplacer le test `surfaceY…` par :

```js
FP.test('state: dimensions du monde à la création', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.assertEqual(s.world.width, 440);
  FP.assertEqual(s.world.viewH, 783);
  FP.assertEqual(s.world.height, 1840);          // max(783+620, floor(783*2.35))
  FP.assertEqual(s.world.surfaceY, 783 * .136);
  FP.assertEqual(s.camera.y, 1840 - 783);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 600 }).world.surfaceY, 82);
  FP.assertEqual(FP.state.createRun(1, { W: 440, H: 2000 }).world.surfaceY, 116);
});
FP.test('state: T-Rex signature désarmé à la création', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.assertEqual(s.signature.armed, false);
  FP.assertEqual(s.signature.spawned, false);
});
```

`dev/check.html` : ajouter `../src/core/geom.js` après `fp.js`, et `tests/geom.test.js`.

- [ ] **Step 2: Vérifier l'échec** — Run: `node dev/run-checks.js` · Expected: les nouveaux tests rouges (`FP.geom` indéfini, `world.width` indéfini).

- [ ] **Step 3: Implémenter** `src/core/geom.js`, puis `config.world` et `createRun(seed, dims)` (le paramètre `viewH` disparaît : `dims.H` le remplace ; défaut `FP.view` s'il existe, sinon `{W:0,H:0}`). `ui/menu.js` continue d'appeler `createRun()` sans argument. `index.html` : `src/core/geom.js` après `fp.js`.

- [ ] **Step 4: Vérifier le succès** — Run: `node dev/run-checks.js` · Expected: tout vert.

- [ ] **Step 5: Commit** `feat(core): géométrie SAT et dimensions du monde dans createRun`

---

### Task 2: Catalogue des obstacles authorés

**Files:**
- Create: `src/world/catalog.js`, `dev/tests/catalog.test.js`
- Modify: `dev/check.html` (charger `../assets/obstacles/manifest.js` en premier, puis `../src/world/catalog.js` après `state.js`), `dev/run-checks.js` (rien si le chemin relatif fonctionne), `index.html`, `src/core/config.js`

**Interfaces:**
- Consumes: `window.FLOWER_POWER_AUTHORED_ASSETS` (manifeste), `FP.geom.toWorld`, `config.level.padding`.
- Produces:
  - `FP.catalog.assets` : le manifeste, filtré des entrées sans polygone de ≥ 3 points
  - `FP.catalog.has(kind) → boolean`
  - `FP.catalog.makeSolid({kind, x, y, a, flip}) → Solid | null` (`null` si la famille n'existe pas) avec :
    `{ kind, assetKey: kind, x, y, a, flip /* ±1, forcé à 1 si mirrorSafe === false */, w, h /* w = worldWidth, h = w·srcH/srcW */, pivot: [px,py], collision /* [[x,y]] local : x = px·(w/srcW)·flip, y = py·(w/srcW) — calculer scale = w/srcW une fois */, grazeRadius, flyoverEligible, broadR /* max(hypot(w,h)/2, rayon max des points) */, signature: spawn.signature === true, footprint /* 4 points monde, rectangle rendu + padding */ }`
  - Padding du footprint : `spawn.visualPadding` du JSON s'il est fini, sinon `config.level.padding.signature` (12) pour un asset signature, sinon `config.level.padding.authored` (7). Rectangle local `[-px·w − pad, (1−px)·w + pad] × [-py·h − pad, (1−py)·h + pad]`, inversé en x si flip = −1, puis `FP.geom.toWorld`.
  - `FP.catalog.visibleFootprint(solid) → [{x,y}]` : même rectangle sans padding.

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('catalog: 12 assets, dont le T-Rex signature', () => {
  const keys = Object.keys(FP.catalog.assets).sort();
  FP.assertEqual(keys.join(','), 'battery,cone,drone,extinguisher,microwave,nuclear,sarcophagus,server,solar,tire,trashbag,trex_signature');
});
FP.test('catalog: dimensions et collision mises à l’échelle', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.w, 80);
  FP.assertEqual(o.h, 80 * 292 / 302);
  FP.assertEqual(o.collision[0][0], -142.474 * (80 / 302));
  FP.assertEqual(o.collision[0][1], -71.958 * (80 / 302));
  FP.assertEqual(o.grazeRadius, 16);
  FP.assertEqual(o.flyoverEligible, true);
});
FP.test('catalog: flip miroir sur x', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, -1);
  FP.assertEqual(o.collision[0][0], -142.474 * (80 / 302) * -1);
});
FP.test('catalog: T-Rex signature jamais retourné', () => {
  const o = FP.catalog.makeSolid({ kind: 'trex_signature', x: 0, y: 0, a: 0, flip: -1 });
  FP.assertEqual(o.flip, 1);
  FP.assertEqual(o.w, 200);
  FP.assertEqual(o.signature, true);
});
FP.test('catalog: footprint = rectangle rendu + padding', () => {
  const o = FP.catalog.makeSolid({ kind: 'server', x: 100, y: 200, a: 0, flip: 1 });
  FP.assertEqual(o.footprint.length, 4);
  FP.assertEqual(o.footprint[0].x, 100 - 40 - 7);
  FP.assertEqual(o.footprint[2].x, 100 + 40 + 7);
});
FP.test('catalog: famille inconnue → null', () => FP.assertEqual(FP.catalog.makeSolid({ kind: 'pipe', x: 0, y: 0, a: 0, flip: 1 }), null));
FP.test('catalog: asset sans polygone exclu', () => {
  FP.assert(!FP.catalog.filterAssets({ bad: { collision: { points: [[0,0],[1,1]] } } }).bad);
});
```

Produit en plus : `FP.catalog.filterAssets(raw) → objet filtré` (utilisé pour construire `FP.catalog.assets`).

- [ ] **Step 2: Vérifier l'échec** — `node dev/run-checks.js` → nouveaux tests rouges.
- [ ] **Step 3: Implémenter** `src/world/catalog.js` et `config.level.padding = { authored: 7, signature: 12 }`. `index.html` : `src/world/catalog.js` après `state.js`.
- [ ] **Step 4: Vérifier le succès** — tout vert.
- [ ] **Step 5: Commit** `feat(world): catalogue des obstacles authorés`

---

### Task 3: Génération du niveau

**Files:**
- Create: `src/world/level.js`, `dev/tests/level.test.js`
- Modify: `src/core/config.js`, `src/ui/menu.js`, `dev/check.html`, `index.html`

**Interfaces:**
- Consumes: `state.rng`, `state.world.{width,height,surfaceY}`, `state.level`, `state.signature`, `FP.catalog.makeSolid/visibleFootprint`, `FP.geom.*`.
- Produces:
  - `FP.level.startRun(state)` : tire `signature.armed = rng.next() < config.signature.chance` puis `signature.targetLevel = minLevel + floor(rng.next() · (maxLevel − minLevel + 1))`, puis `generate(state)`.
  - `FP.level.generate(state)` : remplit `world.skyVariant`, `world.lawnVariant` (`floor(rng.next()·4)` chacun, dans cet ordre), `world.safePath`, `world.safeRadius`, `world.solids` ; vide `world.solids` avant.
  - `FP.level.distToSafePath(world, x, y) → number`
  - `FP.level.depthK(world, y) → [0,1]`, `FP.level.depthBand(world, y) → 'upper'|'middle'|'deep'` (seuils `config.level.bands = { upper: .26, middle: .58 }`)
  - `ui/menu.js` : `startRun()` appelle `FP.level.startRun(state)` après `createRun()` ; l'état du menu (avant clic) n'est pas généré.

**Port fidèle depuis l'archive** (`archive/v3.43.16/index.html`), en remplaçant `rand()/rr()` par `state.rng.next()/range()`, `W` par `world.width`, `worldBottom()` par `world.height`, `game.surfaceY` par `world.surfaceY`, et en mettant chaque constante dans `config.level` :
- `makeSpawnGrid`, `pickCell` (sans choix libre → cellue tirée parmi toutes, non marquée), `cellPos` ;
- `generateSafePath` (rayon `25 + min(10, level·1.25)`), `pathXAt` si utile ;
- `objectFits` + `clearOfSafePathObject(o, 8)` (échantillons : centre + 8 points du rectangle rendu `w×h` tourné) + `clearOfSolidVisuals` (SAT entre footprints) ;
- réservation du T-Rex signature (si `armed && !spawned && level ≥ targetLevel`, 110 essais, cellule `r>1 && r<rows−2 && depthK>.55`, jitter .10, angle `±.18`, flip 1) ;
- boucle des solides : `solidCount = round((6 + min(6, floor(level·.18))) · worldScale · .84 · .92)` avec `worldScale = clamp((height − surfaceY)/(viewH − surfaceY), 1, 2.45)` ; bande préférée `i%3 → upper/middle/deep` ; 110 essais, prédicat relâché après 34 ; jitter .27 ; abandon silencieux si pas de place.
- **Tables de spawn** (`config.spawnTables`, poids = largeur de tranche v3, angle = ±valeur, `flip` = tirage `rng.next() < .5 ? −1 : 1` sauf `noFlip`) :

| upper | middle | deep |
|---|---|---|
| cone .07 ±1.05 | microwave .09 ±.85 | microwave .09 ±.95 |
| extinguisher .08 ±.95 | extinguisher .08 ±1.05 | extinguisher .08 ±1.08 |
| solar .10 ±1.22 | cone .08 ±1.12 | cone .08 ±1.15 |
| drone .10 ±1.05 | server .09 ±.72 | tire .10 ±1.55 |
| trashbag .09 ±.95 | tire .09 ±1.55 | server .09 ±.75 |
| battery .08 ±.78 | solar .08 ±1.28 | trashbag .08 ±1.0 |
| | drone .08 ±1.08 | nuclear .08 ±.72 |
| | trashbag .08 ±.98 | sarcophagus .08 ±.65 noFlip |
| | battery .07 ±.82 | |
| | sarcophagus .07 ±.62 noFlip | |
| | nuclear .06 ±.68 | |

  Tirage d'un candidat : `r = rng.next()·Σpoids` → famille, puis `a = rng.range(−A, A)`, puis le flip.

- [ ] **Step 1: Tests (rouges)** — helper commun en tête du fichier :

```js
const gen = (seed, W = 440, H = 783, level = 0) => {
  const s = FP.state.createRun(seed, { W, H }); s.level = level; FP.level.generate(s); return s;
};
FP.test('level: déterministe', () => {
  const pick = s => JSON.stringify(s.world.solids.map(o => [o.kind, o.x, o.y, o.a, o.flip]));
  FP.assertEqual(pick(gen(1234)), pick(gen(1234)));
  FP.assert(pick(gen(1234)) !== pick(gen(1235)));
});
FP.test('level: aucun chevauchement visuel', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const so = gen(seed).world.solids;
    for (let i = 0; i < so.length; i++) for (let j = i + 1; j < so.length; j++)
      FP.assert(!FP.geom.convexPolysOverlap(so[i].footprint, so[j].footprint), `seed ${seed}: ${so[i].kind}/${so[j].kind}`);
  }
});
FP.test('level: chemin sûr dégagé', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const s = gen(seed), w = s.world;
    for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
      FP.assert(FP.level.distToSafePath(w, p.x, p.y) >= w.safeRadius, `seed ${seed}: ${o.kind}`);
  }
});
FP.test('level: obstacles dans le cadre', () => {
  const s = gen(1234), w = s.world;
  for (const o of w.solids) for (const p of FP.catalog.visibleFootprint(o))
    FP.assert(p.x >= 18 && p.x <= w.width - 18 && p.y >= w.surfaceY + 34 && p.y <= w.height - 100, o.kind);
});
FP.test('level: densité plausible, familles PNG uniquement', () => {
  const s = gen(1234);
  FP.assert(s.world.solids.length >= 8 && s.world.solids.length <= 14, String(s.world.solids.length));
  for (const o of s.world.solids) FP.assert(FP.catalog.has(o.kind) && o.kind !== 'trex_signature', o.kind);
});
FP.test('level: chemin sûr du fond vers la surface', () => {
  const w = gen(1234).world, p = w.safePath;
  FP.assertEqual(p[0].y, w.height - 54);
  FP.assertEqual(p[p.length - 1].y, w.surfaceY + 36);
  for (const n of p) FP.assert(n.x >= 52 && n.x <= w.width - 52, String(n.x));
});
FP.test('level: T-Rex signature une seule fois par run', () => {
  const s = FP.state.createRun(7, { W: 440, H: 783 });
  s.signature = { armed: true, spawned: false, targetLevel: 1 };
  s.level = 0; FP.level.generate(s);
  FP.assert(!s.world.solids.some(o => o.kind === 'trex_signature'), 'pas avant targetLevel');
  s.level = 1; FP.level.generate(s);
  FP.assertEqual(s.world.solids.filter(o => o.kind === 'trex_signature').length, 1);
  FP.assertEqual(s.signature.spawned, true);
  s.level = 2; FP.level.generate(s);
  FP.assert(!s.world.solids.some(o => o.kind === 'trex_signature'), 'jamais deux fois');
});
FP.test('level: fenêtre étroite ou très haute', () => {
  for (const [W, H] of [[300, 520], [300, 1200], [700, 900]]) {
    const s = gen(42, W, H);
    FP.assert(s.world.solids.length >= 1, `${W}x${H}`);
  }
});
FP.test('level: startRun arme le T-Rex de façon reproductible', () => {
  const a = FP.state.createRun(5, { W: 440, H: 783 }), b = FP.state.createRun(5, { W: 440, H: 783 });
  FP.level.startRun(a); FP.level.startRun(b);
  FP.assertEqual(JSON.stringify(a.signature), JSON.stringify(b.signature));
  FP.assert(a.signature.targetLevel >= 1 && a.signature.targetLevel <= 4);
});
```

- [ ] **Step 2: Vérifier l'échec** — rouge.
- [ ] **Step 3: Implémenter** `src/world/level.js` et `config.level` / `config.spawnTables` / `config.signature = { chance: .38, minLevel: 1, maxLevel: 4, tries: 110, minDepth: .55, jitter: .10, angle: .18 }`. Si `level.js` dépasse 400 lignes, extraire la grille dans `src/world/grid.js`.
- [ ] **Step 4: Vérifier le succès** — tout vert. Si `densité plausible` échoue sur la borne, relever le nombre réel et l'expliquer dans le ledger (Ruling) plutôt que de toucher la formule.
- [ ] **Step 5: Commit** `feat(world): génération du niveau (chemin sûr, placement SAT, T-Rex signature)`

---

### Task 4: Rendu du sol et des obstacles

**Files:**
- Create: `src/render/sprites.js`, `src/render/soil.js`, `src/render/obstacles.js`
- Modify: `src/render/frame.js`, `src/core/config.js` (`config.soil`), `index.html`

**Interfaces:**
- Consumes: `state.world.*`, `state.camera.y`, `FP.view`, `FP.catalog.assets`.
- Produces:
  - `FP.sprites.get(assetKey) → HTMLImageElement | null` (`null` tant que non chargé ou en échec ; un échec fait un `console.warn` une fois).
  - `FP.soil.draw(ctx, world, cameraY, viewH)` : cache offscreen `world.width × world.height` reconstruit quand `width`, `height`, `surfaceY`, `skyVariant` ou `lawnVariant` change ; dessine la tranche visible `[cameraY − 70, cameraY + viewH + 70]`.
  - `FP.obstacles.draw(ctx, world, cameraY, viewH)` : pour chaque solide visible (marge `broadR + 90`), pochoir d'ancrage en `multiply` puis sprite ; pochoir mis en cache sur l'objet solide sous `o._stencil` (seule écriture tolérée, cache de rendu non lu par la simulation — à noter dans l'en-tête).
  - `FP.render.frame(state)` : `ctx.save(); translate(0, −camera.y)`, clip `[−24, camera.y − 48, W + 48, viewH + 96]`, `soil.draw`, `obstacles.draw`, `restore`. Au menu (pas encore de niveau) : sol seul.

**Port fidèle depuis l'archive :** `drawCloudTo`, `buildSoilGrainPattern`, `rebuildSoilCache`, `rrLocal`, `drawSoil` → `soil.js` (couleurs de terre, nombres de détails et alphas dans `config.soil` uniquement s'ils sont des réglages évidents : les dégradés et motifs restent dans le code de rendu) ; `ensureObstacleStencilCache` et `drawObstacleSoilAnchorUnder` (branche authorée uniquement) + `drawPixelSolidSprite` → `obstacles.js`. Le pochoir se dessine **sans** miroir du contexte, directement depuis `o.collision` (déjà retourné) : supprime le jeu `ux`/`anchorFlip`.

- [ ] **Step 1: Implémenter** les trois fichiers, `config.soil` si besoin, `frame.js` ; `index.html` : `sprites.js`, `soil.js`, `obstacles.js` avant `frame.js`.
- [ ] **Step 2: Vérifier** `node dev/run-checks.js` toujours vert (les fichiers `render/` ne sont pas chargés par le banc) et `wc -l src/render/*.js` < 400.
- [ ] **Step 3: Vérifier dans le navigateur** (serveur local) : `index.html?seed=1234` → clic → ciel avec deux nuages, pelouse ondulée, terre en strates avec grain, obstacles PNG avec leur halo sombre ; aucune erreur console. Comparer la ressemblance avec une capture de `archive/v3.43.16/index.html` à la même taille.
- [ ] **Step 4: Vérifier le PNG manquant** : dans la console, `FP.sprites.get('inconnu') === null` et renommer temporairement un PNG (puis le restaurer) → un `console.warn`, pas d'exception, les autres obstacles s'affichent.
- [ ] **Step 5: Commit** `feat(render): sol illustré en cache et obstacles PNG ancrés`

---

### Task 5: Caméra et caméra libre

**Files:**
- Create: `src/play/camera.js`, `src/debug/freecam.js`, `dev/tests/camera.test.js`
- Modify: `src/core/fp.js` (`freecam` dans `parseParams`), `dev/tests/fp.test.js`, `src/core/config.js`, `dev/check.html`, `index.html`

**Interfaces:**
- Consumes: `state.camera`, `state.plant.tip`, `state.world.{height,viewH}`.
- Produces:
  - `config.camera = { followRatio: .52, rateDown: 7.8, rateUp: 5.4 }`
  - `FP.camera.maxY(world) → max(0, height − viewH)`
  - `FP.camera.update(state, dt)` : si `camera.manual`, ne fait rien ; cible = `tip ? clamp(tip.y − viewH·followRatio, 0, maxY) : maxY` ; `rate = cible < y ? rateDown : rateUp` ; `y = lerp(y, cible, clamp(dt·rate, 0, 1))`.
  - `FP.camera.scrollBy(state, dy)` : `manual = true`, `y = clamp(y + dy, 0, maxY)`.
  - `FP.parseParams(...).freecam` (booléen, `?freecam=1`).
  - `debug/freecam.js` : si `FP.params.freecam`, molette (`deltaY`), flèches haut/bas (±60 px) et glisser vertical appellent `FP.camera.scrollBy(FP.state.current, dy)` ; `Home`/`End` → haut/bas du monde.

- [ ] **Step 1: Tests (rouges)**

```js
// dev/tests/camera.test.js
const run = () => FP.state.createRun(1, { W: 440, H: 783 });
FP.test('camera: sans pousse, reste en bas du monde', () => {
  const s = run(); s.camera.y = 0;
  for (let i = 0; i < 200; i++) FP.camera.update(s, .016);
  FP.assert(Math.abs(s.camera.y - FP.camera.maxY(s.world)) < .5, String(s.camera.y));
});
FP.test('camera: suit la pointe à 52 % de la hauteur', () => {
  const s = run(); s.plant.tip = { x: 220, y: 900 };
  for (let i = 0; i < 300; i++) FP.camera.update(s, .016);
  FP.assert(Math.abs(s.camera.y - (900 - 783 * .52)) < .5, String(s.camera.y));
});
FP.test('camera: bornée en haut', () => {
  const s = run(); s.plant.tip = { x: 220, y: 10 };
  for (let i = 0; i < 300; i++) FP.camera.update(s, .016);
  FP.assert(s.camera.y >= 0 && s.camera.y < .5, String(s.camera.y));
});
FP.test('camera: scrollBy borné et manuel', () => {
  const s = run();
  FP.camera.scrollBy(s, -1e6); FP.assertEqual(s.camera.y, 0);
  FP.camera.scrollBy(s, 1e6); FP.assertEqual(s.camera.y, FP.camera.maxY(s.world));
  FP.assertEqual(s.camera.manual, true);
  const before = s.camera.y; FP.camera.update(s, .5); FP.assertEqual(s.camera.y, before);
});
```

Dans `fp.test.js`, test `params: perf et flydebug` → ajouter `FP.assert(FP.parseParams('?freecam=1').freecam)`.

- [ ] **Step 2: Vérifier l'échec** — rouge.
- [ ] **Step 3: Implémenter** `camera.js`, `freecam.js`, `config.camera`, `parseParams`. `index.html` : `src/play/camera.js` après `level.js`, `src/debug/freecam.js` juste avant `ui/menu.js`. `dev/check.html` : `camera.js` + son test.
- [ ] **Step 4: Vérifier le succès** — tout vert ; navigateur : `index.html?seed=1234&freecam=1` → clic → la molette parcourt tout le niveau du fond à la surface, sans dépasser les bornes.
- [ ] **Step 5: Commit** `feat(play): caméra défilante et caméra libre ?freecam=1`

---

### Task 6: Docs de l'étape

**Files:** Modify `docs/architecture.md` (carte : ✅ geom, catalog, level, camera, freecam, sprites, soil, obstacles ; ordre des scripts), `README.md` (statut « étape 1/7 », `?freecam=1`), `CHANGELOG.md` (entrée `v4.0.0-etape1 — Le monde`), `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§9 : la comparaison côte à côte porte sur le ressenti, pas sur une disposition identique).

- [ ] **Step 1: Mettre à jour les 4 documents.**
- [ ] **Step 2: Vérification finale** — `node dev/run-checks.js` vert ; `wc -l src/*/*.js` tous < 400 ; navigateur : `index.html?seed=1234&freecam=1` parcourable, 0 erreur console.
- [ ] **Step 3: Commit** `docs: étape 1 — le monde`
