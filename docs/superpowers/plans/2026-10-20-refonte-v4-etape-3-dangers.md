# Refonte v4 — Étape 3 : zones toxiques et lixiviat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ramener les deux dangers diffus de la v3 : les zones toxiques (exposition qui dévie la croissance puis brûle la pointe au bout de ~1,1 s) et les limaces de lixiviat (trajet en va-et-vient, contact mortel, frôlement qui fait zoomer).

**Architecture:** La génération (`world/level.js`) ajoute toxiques puis limaces après les solides. Un nouveau système `world/hazards.js` calcule chaque frame la position courante des limaces. `world/collision.js` ajoute à la requête de pointe l'intensité toxique, le contact lixiviat et le danger de frôlement d'une limace. `play/flow.js` gère l'exposition toxique et les deux nouvelles morts ; `play/plant.js` applique la croissance déviée. Rendu dans `render/hazards.js`.

**Tech Stack:** JavaScript natif sur `window.FP`, Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§7 : zones toxiques diffuses qui ignorent le bouclier, limaces de lixiviat ; §11 étape 3).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes rôle / lit / écrit / expose complets.
- La simulation écrit, le rendu lit ; tous les réglages dans `config.js` ; aléatoire de génération via `state.rng`.
- Gamefeel fidèle à la v3.43.16 (constantes, durées, déviation, vitesse des limaces).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Placement des limaces indépendant de la caméra.** En v3, `tooCloseToLeak` ignorait les limaces hors écran au moment de la génération (dépendance accidentelle à la caméra) ; ici toutes les limaces comptent. Génération plus sûre et reproductible.
- **État d'exposition dans la pousse** : `plant.corruption`, `plant.toxicTimer`, `plant.recentToxic` (remis à zéro par `prepare`, comme `prepareStem` en v3). `flow` les écrit, `plant` lit `corruption` pour dévier la croissance.
- **Position courante des limaces dans l'état** : `hazards.update` écrit `leak.cx, leak.cy, leak.cr` (centre et rayon du corps cette frame) et fait décroître `leak.hitFlash` ; collision et rendu lisent ces valeurs, ils ne recalculent rien.
- **Hors périmètre** : ÉcoCrédits™ de frôlement de limace (étape 4), bouclier qui protège du lixiviat mais pas des toxiques (étape 5), son « contaminate » et particules acides (étape 7, mais les événements `toxicEnter`, `death` avec `cause` sont déjà émis).

## Review Focus

1. **Graine ou chemin sûr pris dans une zone toxique** : la génération garde les toxiques à distance du chemin (`safeRadius + approx·.62 + 4`) ; jamais de toxique sur la graine → test `level: chemin sûr hors des toxiques` en Task 1.
2. **Sortir d'une zone avant la brûlure** : le compteur redescend 5× plus vite qu'il ne monte (×3,6 contre ×.72) ; un passage bref ne tue pas → test `flow: passage bref dans un toxique` en Task 3.
3. **Limace plus rapide au fil de la partie** : vitesse ×(1 + min(1,45, (pousses−1)·.12 + fleurs·.035 + âge·.018)), bornée → test `hazards: vitesse bornée` en Task 2.
4. **Limace sur le chemin sûr** : une limace peut approcher le chemin mais jamais le condamner (`safeRadius·.58 + r`) → test `level: limaces n’obstruent pas le chemin` en Task 1.
5. **Croissance déviée sans demi-tour** : même en zone toxique, la pousse ne redescend jamais (cône 74° contrôlé) → test `plant: déviée mais toujours vers le haut` en Task 3.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/world/level.js` | + `placeToxics`, `placeLeaks` (port de `generateSoil`) ; si > 400 lignes, extraire `src/world/hazardsGen.js` |
| `src/world/hazards.js` | `FP.hazards.update(state, dt)` : position courante des limaces, flash ; `FP.hazards.leakSpeedScale(state)` ; `FP.hazards.toxicIntensityAt(o, x, y)` |
| `src/world/collision.js` | + `toxic`, `leak`, danger lixiviat dans `queryPoint` |
| `src/play/flow.js` | + exposition toxique, morts « lixiviat » et « zone toxique » |
| `src/play/plant.js` | + croissance déviée, vitesse ×.90 sous corruption |
| `src/render/hazards.js` | base toxique, limaces et sillons, pellicule toxique, anneau d'exposition |
| `src/render/frame.js`, `render/plant.js`, `render/hud.js` | ordre de dessin v3, bourgeon jaunâtre sous corruption, ligne « croissance déviée » |

---

### Task 1: Génération des toxiques et des limaces

**Files:** Modify `src/world/level.js`, `src/core/config.js`, `src/core/state.js` (rien : `world.toxics`/`leaks` existent), `dev/tests/level.test.js`

**Interfaces:**
- Produces (dans `generate`, **après** les solides, dans cet ordre) :
  - `world.toxics = [{ x, y, rx, ry, a, pulse, lobes:[{a,r,sx,sy}×6], specks:[{x,y,r,light}×7] }]` — port fidèle de la boucle toxique v3 : `count = round((3 + min(4, floor(level·.14))) · worldScale · .70)`, 80 essais, cellule `r>0 && r<rows−1 && (tries>30 || depthK > (i%3!==0 ? .48 : .30))`, jitter .29, `rx = rng.range(30,58)·(k>.58 ? 1.08 : 1)`, `ry = rng.range(23,48)·(k>.58 ? 1.10 : 1)`, `a = rng.range(0, π)`, `pulse = rng.range(0,10)`, lobes et mouchetures comme en v3 ; accepté si `distToSafePath > safeRadius + max(rx,ry)·.62 + 4`.
  - `world.leaks = [{ x, y, len, angle, phase, rate, r, morph, debrisSeed, hitFlash:0, cx, cy, cr }]` — port fidèle de la boucle lixiviat v3 : `count = round((1 + min(3, floor(level·.10))) · worldScale · .68)`, 120 essais, 46 % « près de la route » (`y` dans `[surfaceY+86, height−142]`, `x = clamp(pathXAt(y) ± range(22,62), 42, W−42)`), sinon cellule `depthK > .22` (relâché après 32) jitter .24 ; angle : 90 % `angled[i] ± .24` sinon 0 ou π/2 ; `len = range(42,176) + min(54, level·3.2)·rng.next() + k·22` ; `r = range(11,16.2)` ; `morph ∈ clear|fat|debris` ; acceptée si tous les points du trajet sont dans `[24, W−24] × [surfaceY+48, height−116]`, si le centre n'est pas à moins de 20 px d'un solide (rectangle rendu tourné) ni dans un toxique (+8), et si la respiration avec les autres limaces est respectée (46 au centre, 28 sur le trajet) — **sans** filtre de caméra ; et si `clearOfSafePathLeak` (`safeRadius·.58 + r`) est vrai.
  - `FP.level.pathXAt(world, y)` exposé (port de `pathXAt`).
  - `config.level.toxics`, `config.level.leaks` : toutes les constantes ci-dessus.

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('level: toxiques et limaces générés et déterministes', () => {
  const pick = s => JSON.stringify([s.world.toxics.map(o => [o.x, o.y, o.rx]), s.world.leaks.map(l => [l.x, l.y, l.len])]);
  const a = gen(1234), b = gen(1234);
  FP.assertEqual(pick(a), pick(b));
  FP.assert(a.world.toxics.length >= 3, String(a.world.toxics.length));
  FP.assert(a.world.leaks.length >= 1, String(a.world.leaks.length));
});
FP.test('level: chemin sûr hors des toxiques', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const o of w.toxics) FP.assert(FP.level.distToSafePath(w, o.x, o.y) > w.safeRadius + Math.max(o.rx, o.ry) * .62 + 4, `${seed}`);
  }
});
FP.test('level: limaces n’obstruent pas le chemin', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const l of w.leaks) for (let i = 0; i <= 8; i++) {
      const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k, y = l.y + Math.sin(l.angle) * l.len * k;
      FP.assert(FP.level.distToSafePath(w, x, y) >= w.safeRadius * .58 + l.r, `${seed}`);
    }
  }
});
FP.test('level: limaces dans le cadre', () => {
  const w = gen(1234).world;
  for (const l of w.leaks) for (let i = 0; i <= 8; i++) {
    const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k, y = l.y + Math.sin(l.angle) * l.len * k;
    FP.assert(x > 24 && x < w.width - 24 && y > w.surfaceY + 48 && y < w.height - 116);
  }
});
```

- [ ] **Step 2: rouge** · **Step 3: implémenter** · **Step 4: vert** (et le temps de génération ne dépasse pas ~2× celui de l'étape 2 : mesurer avec `console.time` dans un script Node du scratchpad, noter au ledger).
- [ ] **Step 5: Commit** `feat(world): génération des zones toxiques et des limaces de lixiviat`

---

### Task 2: Limaces en mouvement et requête de pointe

**Files:** Create `src/world/hazards.js`, `dev/tests/hazards.test.js` ; Modify `src/world/collision.js`, `dev/tests/collision.test.js`, `src/core/config.js`, `src/core/state.js`, `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - `FP.hazards.leakSpeedScale(state) → 1 + min(1.45, max(0, stemCount−1)·.12 + flowers·.035 + stemAge·.018)`.
  - `FP.hazards.update(state, dt)` (tous modes hors menu) : pour chaque limace, `k = (sin(time·rate·1.75·scale + phase) + 1)·.5 − .5`, `cx = x + cos(angle)·len·k`, `cy = y + sin(angle)·len·k`, `cr = r + sin(time·5 + phase)·2` ; `hitFlash = max(0, hitFlash − dt)`.
  - `FP.hazards.toxicIntensityAt(o, x, y)` : port de `toxicIntensityAt` (0 hors ellipse, sinon `clamp((1 − q)/.48, .18, 1)`).
  - `queryPoint(world, x, y)` renvoie en plus `toxic` (somme des intensités) et `leak` (somme des contacts `2.4·(1 − d/(cr+6))` si `d < cr + 6`, et `leakHit` = la limace touchée) ; frôlement de limace entre `r+7` et `r+38` → `danger = max(danger, min(.98, intensité))`. Le contact pose `hitFlash = .18` sur la limace (fait dans `collision.update`, pas dans `queryPoint` qui reste pure).
  - `config.hazards = { leakRateK: 1.75, leakScaleMax: 1.45, leakPerStem: .12, leakPerFlower: .035, leakPerSec: .018, leakWobbleFreq: 5, leakWobble: 2, leakHitPad: 6, leakHitGain: 2.4, leakGrazeInner: 7, leakGrazeOuter: 38, leakDangerMax: .98, hitFlash: .18, toxicFalloff: .48, toxicMin: .18 }`.

- [ ] **Step 1: Tests (rouges)**

```js
const hzRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('hazards: vitesse bornée', () => {
  const s = hzRun(); s.plant.stemCount = 50; s.score.flowers = 50; s.plant.stemAge = 500;
  FP.assertEqual(FP.hazards.leakSpeedScale(s), 2.45);
});
FP.test('hazards: la limace parcourt son trajet', () => {
  const s = hzRun(), l = s.world.leaks[0], seen = [];
  for (let i = 0; i < 600; i++) { s.time += 1 / 60; FP.hazards.update(s, 1 / 60); seen.push(Math.hypot(l.cx - l.x, l.cy - l.y)); }
  FP.assert(Math.max(...seen) > l.len * .4 && Math.max(...seen) <= l.len * .5 + 1e-6, String(Math.max(...seen)));
});
FP.test('hazards: intensité toxique', () => {
  const o = { x: 100, y: 100, rx: 40, ry: 30, a: 0 };
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 100, 100), 1);
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 141, 100), 0);
  FP.assertEqual(FP.hazards.toxicIntensityAt(o, 139, 100), .18);
});
```

```js
// collision.test.js (ajouts)
FP.test('collision: contact lixiviat', () => {
  const l = { x: 200, y: 300, len: 100, angle: 0, r: 12, cx: 200, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [], toxics: [], leaks: [l] }, 205, 300);
  FP.assert(q.leak > 0 && q.leakHit === l);
});
FP.test('collision: frôlement de limace → danger', () => {
  const l = { x: 200, y: 300, len: 100, angle: 0, r: 12, cx: 200, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [], toxics: [], leaks: [l] }, 200, 300 + 30);
  FP.assertEqual(q.leak, 0); FP.assert(q.danger > 0 && q.danger <= .98);
});
FP.test('collision: intensité toxique cumulée', () => {
  const o = { x: 200, y: 300, rx: 40, ry: 30, a: 0 };
  FP.assertEqual(FP.collision.queryPoint({ solids: [], toxics: [o, o], leaks: [] }, 200, 300).toxic, 2);
});
```

Les tests de collision existants passent `worldWith(...)` sans `toxics/leaks` : `queryPoint` traite leur absence comme des tableaux vides.

- [ ] **Step 2–4:** rouge → implémenter (`index.html` et `check.html` : `src/world/hazards.js` après `level.js`) → vert.
- [ ] **Step 5: Commit** `feat(world): limaces en mouvement et requête toxique/lixiviat`

---

### Task 3: Exposition, déviation et morts

**Files:** Modify `src/play/flow.js`, `src/play/plant.js`, `src/core/state.js`, `src/core/config.js`, `dev/tests/flow.test.js`, `dev/tests/plant.test.js`

**Interfaces:**
- Produces:
  - `plant = { …, corruption: 0, toxicTimer: 0, recentToxic: 0 }`, remis à 0 par `FP.plant.prepare`.
  - `FP.plant.update` : si `corruption > 0` → `desiredX += sin(time·12 + tip.y·.042)·.70 + sin(time·6.6)·.22`, `desiredY = min(desiredY + .24, −.13)`, cône 74° (contrôlé) au lieu de 89°, `steer` 9.2 (contrôlé) / 4.6 (libre), vitesse ×.90.
  - `FP.flow.update`, en `playing`, après le test de surface et de solide : `query.leak > 0` → mort cause `leak` (texte « lixiviat vivant : pointe brûlée », `hitFlash` déjà posé, secousse .24) ; sinon si `query.toxic > 0` → `toxicTimer += dt·.72`, `corruption = max(corruption, .28)`, si `recentToxic ≤ 0` → message « ZONE TOXIQUE : CROISSANCE DÉVIÉE » .82 s, `recentToxic = .72`, événement `toxicEnter` ; `toxicTimer > .82` → mort cause `toxic` (« pointe brûlée dans une zone toxique », secousse .22) ; sinon `toxicTimer = max(0, toxicTimer − dt·3.6)`. `corruption` et `recentToxic` décroissent de `dt` à chaque frame.
  - `die(state, cause, kind)` : l'événement `death` porte `cause ∈ solid|leak|toxic` et `kind`.
  - `config.toxic = { exposureRate: .72, recoveryRate: 3.6, burnAt: .82, corruption: .28, messageTime: .82, messageCooldown: .72 }`, `config.plant.corrupted = { swayFreq: 12, swayDepth: .042, swayAmp: .70, swayFreq2: 6.6, swayAmp2: .22, lift: .24, minUp: -.13, maxAngle: 74, steerControlled: 9.2, steerIdle: 4.6, speed: .90 }`, textes dans `config.text`.

- [ ] **Step 1: Tests (rouges)**

```js
// flow.test.js
const toxicAtTip = (s) => { const o = { x: s.plant.tip.x, y: s.plant.tip.y, rx: 60, ry: 60, a: 0 }; s.world.toxics = [o]; s.world.leaks = []; return o; };
FP.test('flow: rester dans un toxique brûle la pointe en ~1,14 s', () => {
  const s = flowRun(); s.world.solids = []; toxicAtTip(s);
  let t = 0;
  while (s.mode === 'playing' && t < 3) { FP.collision.update(s); FP.flow.update(s, 1 / 60); t += 1 / 60; }
  FP.assertEqual(s.mode, 'dying');
  FP.assert(Math.abs(t - .82 / .72) < .05, String(t));
  FP.assert(s.events.some(e => e.type === 'death' && e.cause === 'toxic'));
});
FP.test('flow: passage bref dans un toxique', () => {
  const s = flowRun(); s.world.solids = []; toxicAtTip(s);
  for (let i = 0; i < 40; i++) { FP.collision.update(s); FP.flow.update(s, 1 / 60); }   // 0,67 s
  s.world.toxics = [];
  for (let i = 0; i < 60; i++) { FP.collision.update(s); FP.flow.update(s, 1 / 60); }
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.plant.toxicTimer, 0);
});
FP.test('flow: contact lixiviat → mort', () => {
  const s = flowRun(); s.world.solids = []; s.world.toxics = [];
  s.world.leaks = [{ x: s.plant.tip.x, y: s.plant.tip.y, len: 50, angle: 0, r: 12, cx: s.plant.tip.x, cy: s.plant.tip.y, cr: 12, hitFlash: 0 }];
  FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.mode, 'dying');
  FP.assert(s.events.some(e => e.type === 'death' && e.cause === 'leak'));
});
```

```js
// plant.test.js
FP.test('plant: déviée mais toujours vers le haut', () => {
  const s = plantRun(); s.input = { x: 440, y: 400, down: true, active: true, pressed: false };
  for (let i = 0; i < 300; i++) { s.plant.corruption = .28; s.time += 1 / 60; FP.plant.update(s, 1 / 60); FP.assert(s.plant.dir.y < 0); }
});
FP.test('plant: corruption ralentit de 10 %', () => {
  const s = plantRun(), v = FP.plant.speed(s); s.plant.corruption = .2;
  FP.assertEqual(FP.plant.speed(s), v * .90);
});
```

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Commit** `feat(play): exposition toxique, croissance déviée et morts par lixiviat`

---

### Task 4: Rendu des dangers

**Files:** Create `src/render/hazards.js` ; Modify `src/render/frame.js`, `src/render/plant.js`, `src/render/hud.js`, `index.html`

**Interfaces:**
- Produces `FP.hazardsRender = { drawBase(ctx, state), drawLeaks(ctx, state), drawOverlay(ctx, state), drawExposure(ctx, state) }` : port fidèle de `drawToxicZoneBase`, de la partie limaces de `drawHazards` (sillon visqueux, corps orienté selon le trajet, taches, débris pour `morph === 'debris'`, antennes, flash), de `drawToxicZoneOverlay` et de l'anneau toxique de `drawShieldGauge` (rayon 28, fraction `toxicTimer/.82`). Culling vertical comme en v3. Les limaces sont dessinées à `(cx, cy)`.
- `frame.js` : ordre v3 — sol, `drawBase`, `drawLeaks`, obstacles, plante, `drawOverlay`, `drawExposure`.
- `render/plant.js` : bourgeon `#b9cc55` si `plant.corruption > 0`.
- `render/hud.js` : ligne d'effet centrée « croissance déviée » (port de la ligne `effect` du HUD v3) quand `corruption > 0`.

- [ ] **Step 1: Implémenter.** `index.html` : `src/render/hazards.js` avant `frame.js`.
- [ ] **Step 2:** `node dev/run-checks.js` vert ; `wc -l` < 400.
- [ ] **Step 3: Navigateur** (serveur local, `?seed=1234&freecam=1` puis partie normale) : nappes toxiques verdâtres qui respirent sous et devant les sprites, limaces qui font l'aller-retour sur leur sillon (vitesse comparable à l'archive), traverser une nappe → message, bourgeon jaunâtre, anneau qui se remplit, croissance qui tremble ; rester → « pointe brûlée dans une zone toxique » ; toucher une limace → « lixiviat vivant : pointe brûlée » et flash ; frôler une limace → zoom. 0 erreur console. Comparer avec l'archive à la même taille.
- [ ] **Step 4: Commit** `feat(render): zones toxiques, limaces et anneau d'exposition`

---

### Task 5: Docs de l'étape

**Files:** `docs/architecture.md` (carte : `world/hazards.js`, `render/hazards.js`, état `plant.corruption/toxicTimer/recentToxic`, `leak.cx/cy/cr/hitFlash`), `README.md` (« étape 3/7 »), `CHANGELOG.md` (`v4.0.0-etape3 — Zones toxiques et lixiviat`), et les en-têtes incomplets relevés à l'étape 2 (`plant.js`, `flow.js`).

- [ ] **Step 1: Mettre à jour.** · **Step 2: Vérification finale.** · **Step 3: Commit** `docs: étape 3 — zones toxiques et lixiviat`
