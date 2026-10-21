# Refonte v4 — Étape 0 : squelette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archiver la v3.43.16 jouable (avec `?seed=`), poser le squelette v4 (`FP`, config, état, boucle, menu, rendu de fond) et le banc d'assertions `dev/check.html`, plus `AGENTS.md` et les docs vivantes.

**Architecture:** Scripts classiques chargés dans un ordre fixe par `index.html`, chacun s'enregistrant sur `window.FP`. L'état unique est créé par `FP.state.createRun(seed)`. `FP.loop.step` exécute les systèmes dans l'ordre de la spec ; en étape 0 aucun système de gameplay n'existe encore, le rendu dessine seulement le fond.

**Tech Stack:** HTML, CSS, JavaScript natif (ES2020, sans modules), Canvas 2D. Aucune dépendance, aucun build.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md`

## Global Constraints

- Ouverture par double-clic de `index.html` et `dev/check.html` en `file://`, navigateur desktop récent sous Windows (Edge/Chrome/Firefox).
- Pas d'`import`/`export`, pas de npm, pas de build, pas de bibliothèque externe.
- 400 lignes maximum par fichier `src/**`.
- Chaque fichier `src/**` commence par un en-tête : rôle, lit, écrit, expose.
- Aucune variable mutable globale hors de `FP.state` (le module `FP.view` détient seulement canvas/contexte/dimensions).
- Tous les chiffres réglables dans `src/core/config.js`.
- Version : `4.0.0`. Clé de record : `flower_power_v4_best`.
- Branche : `refonte`. Rien n'est poussé sans accord.
- Messages de commit terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **`file://` partout** : `index.html`, `dev/check.html` et `archive/v3.43.16/index.html` s'ouvrent par double-clic sans erreur console (images et `manifest.js` de l'archive compris).
2. **`?seed=` invalide** : `?seed=abc` ou `?seed=-3` est ignoré (graine aléatoire), `?seed=0` est valide → test `parseParams` en Task 2.
3. **localStorage indisponible** (navigateur en mode strict, `file://` bloqué) : le jeu démarre quand même, record = 0 → test `storage` en Task 2.
4. **Onglet en arrière-plan puis retour** : un grand `dt` est plafonné à `0.033` → test `loop.step` en Task 4.
5. **Fenêtre redimensionnée** : le canvas garde le 9:16 et la netteté (DPR ≤ 1.15) → vérification manuelle en Task 4.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `archive/v3.43.16/index.html` | ancien jeu, référence gamefeel, + `?seed=` |
| `archive/docs/*` | anciennes docs + banque de gags |
| `src/core/fp.js` | `window.FP`, maths, RNG seedée, paramètres d'URL, stockage sûr |
| `src/core/config.js` | `FP.config` |
| `src/core/state.js` | `FP.state.createRun(seed)` |
| `src/core/loop.js` | `FP.loop.step`, `FP.loop.start` |
| `src/render/view.js` | canvas, DPR, redimensionnement 9:16 |
| `src/render/frame.js` | `FP.render.frame` : fond (ciel/terre) |
| `src/ui/menu.js` | menu → `mode='playing'` |
| `index.html`, `style.css` | coquille |
| `dev/check.html`, `dev/harness.js`, `dev/tests/*.test.js` | banc d'assertions |
| `AGENTS.md`, `README.md`, `CHANGELOG.md`, `docs/design.md`, `docs/architecture.md` | docs vivantes |

---

### Task 1: Archiver la v3.43.16 et ajouter `?seed=`

**Files:**
- Move: `index.html` → `archive/v3.43.16/index.html`
- Move: `docs/*.md` (les 9 fichiers v3) → `archive/docs/`
- Modify: `archive/v3.43.16/index.html` (en-tête `<head>`, `startGame()` ~ligne 1266)
- Create: `archive/docs/banque-de-gags.js`
- Modify: `archive/README.md`

**Interfaces:**
- Consumes: rien.
- Produces: `archive/v3.43.16/index.html?seed=N` jouable et reproductible, utilisé pour la comparaison de gamefeel à partir de l'étape 2.

- [ ] **Step 1: Déplacer les fichiers avec git**

```bash
mkdir -p archive/v3.43.16 archive/docs
git mv index.html archive/v3.43.16/index.html
git mv docs/game-design.md docs/obstacle-variants.md docs/roadmap.md docs/technical-decisions.md docs/test-checklist.md docs/v3.41-visual-slice.md docs/v3.41.1-asset-ingestion-test.md docs/v3.41.2-visual-spacing.md docs/visual-direction.md archive/docs/
```

- [ ] **Step 2: Faire résoudre les chemins depuis la racine**

Ajouter `<base href="../../">` juste après `<meta charset="utf-8" />` dans `archive/v3.43.16/index.html`. Cela fait pointer `assets/obstacles/manifest.js` et les `runtime.src` du manifeste vers la racine du dépôt.

- [ ] **Step 3: Ajouter `?seed=` à l'archive**

Près de `FORCE_TALISMAN` (~ligne 132), ajouter :

```js
const SEED_PARAM=(()=>{ const s=new URLSearchParams(location.search).get('seed'); return /^\d+$/.test(s||'')?Number(s):null; })();
```

Dans `startGame()`, remplacer `rngSeed=Math.floor(Math.random()*999999);` par `rngSeed=SEED_PARAM!==null?SEED_PARAM:Math.floor(Math.random()*999999);`. Dans les deux lignes `signatureTrex…` qui suivent, remplacer `Math.random()` par `(SEED_PARAM!==null?rand():Math.random())`. Ne rien changer d'autre.

- [ ] **Step 4: Extraire la banque de gags**

Copier le littéral `const OBSTACLE_VARIANTS={…};` (à partir de la ligne ~163 de l'archive) dans `archive/docs/banque-de-gags.js`, précédé d'un commentaire : « Banque de gags v3.40, à réutiliser pour les futurs PNG. Non chargé par le jeu. »

- [ ] **Step 5: Mettre à jour `archive/README.md`**

Une section « v3.43.16 » : ce que contient le dossier, l'URL de comparaison `archive/v3.43.16/index.html?seed=1234`, et la mention que les docs v3 sont dans `archive/docs/`.

- [ ] **Step 6: Vérifier dans le navigateur**

Ouvrir `archive/v3.43.16/index.html?seed=1234` par double-clic (ajouter `?seed=1234` dans la barre d'adresse). Attendu : aucune erreur console ; les obstacles PNG s'affichent ; après deux démarrages successifs (rechargement), le premier niveau a la même disposition d'obstacles.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: archiver la v3.43.16 jouable avec ?seed=

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `FP` de base et banc d'assertions

**Files:**
- Create: `src/core/fp.js`
- Create: `dev/harness.js`, `dev/check.html`, `dev/tests/fp.test.js`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `FP.TAU`
  - `FP.math.clamp(v,a,b)`, `FP.math.lerp(a,b,k)`, `FP.math.dist(ax,ay,bx,by)`
  - `FP.createRng(seed:number) → { seed:number, next():number /*[0,1)*/, range(a,b):number }` — même LCG que la v3 : `s=(s*1664525+1013904223)>>>0; return s/4294967296`
  - `FP.parseParams(search:string) → { seed:number|null, perf:boolean, flydebug:boolean }`
  - `FP.params` = `FP.parseParams(location.search)`
  - `FP.storage.readNumber(key, fallback, backend=localStorage) → number` et `FP.storage.write(key, value, backend=localStorage) → boolean`, sans jamais lever d'exception
  - Banc : `FP.test(name, fn)`, `FP.assert(cond, msg)`, `FP.assertEqual(actual, expected, msg)` ; `dev/check.html` affiche chaque test vert/rouge et un total `N/N OK`

- [ ] **Step 1: Écrire le banc et les tests (qui échouent)**

`dev/harness.js` définit `window.FP = window.FP || {}` puis `FP.test` / `FP.assert` / `FP.assertEqual` ; les tests sont enregistrés puis exécutés au `DOMContentLoaded`. Une exception = échec avec son message. `dev/check.html` charge, dans l'ordre : `../src/core/fp.js`, `harness.js`, puis `tests/*.test.js` (une balise par fichier).

`dev/tests/fp.test.js` :

```js
FP.test('rng: reproduit le LCG de la v3', () => {
  const r = FP.createRng(1234);
  FP.assertEqual(r.next(), 0.7143076679203659);
  FP.assertEqual(r.next(), 0.20701311994343996);
  FP.assertEqual(r.next(), 0.7495418272446841);
});
FP.test('rng: même graine, même suite', () => {
  const a = FP.createRng(42), b = FP.createRng(42);
  for (let i = 0; i < 50; i++) FP.assertEqual(a.next(), b.next());
});
FP.test('rng: range reste dans [a,b)', () => {
  const r = FP.createRng(7);
  for (let i = 0; i < 200; i++) { const v = r.range(-3, 5); FP.assert(v >= -3 && v < 5, String(v)); }
});
FP.test('math: clamp et lerp', () => {
  FP.assertEqual(FP.math.clamp(5, 0, 1), 1);
  FP.assertEqual(FP.math.lerp(0, 10, .25), 2.5);
});
FP.test('params: seed valide, 0 compris', () => {
  FP.assertEqual(FP.parseParams('?seed=1234').seed, 1234);
  FP.assertEqual(FP.parseParams('?seed=0').seed, 0);
});
FP.test('params: seed invalide ignorée', () => {
  FP.assertEqual(FP.parseParams('?seed=abc').seed, null);
  FP.assertEqual(FP.parseParams('?seed=-3').seed, null);
  FP.assertEqual(FP.parseParams('').seed, null);
});
FP.test('params: perf et flydebug', () => {
  const p = FP.parseParams('?perf=1&flydebug=1');
  FP.assert(p.perf && p.flydebug);
  FP.assert(!FP.parseParams('?perf=0').perf);
});
FP.test('storage: backend qui lève → fallback, pas d’exception', () => {
  const broken = { getItem(){ throw new Error('blocked'); }, setItem(){ throw new Error('blocked'); } };
  FP.assertEqual(FP.storage.readNumber('k', 0, broken), 0);
  FP.assertEqual(FP.storage.write('k', 5, broken), false);
});
FP.test('storage: valeur non numérique → fallback', () => {
  const mem = { getItem(){ return 'xyz'; }, setItem(){} };
  FP.assertEqual(FP.storage.readNumber('k', 0, mem), 0);
});
```

- [ ] **Step 2: Vérifier l'échec**

Ouvrir `dev/check.html`. Attendu : tests rouges (`FP.createRng is not a function`…), total `0/9 OK`.

- [ ] **Step 3: Implémenter `src/core/fp.js`**

`window.FP = window.FP || {}` (le banc et le jeu peuvent le créer en premier). En-tête de fichier conforme. Le LCG est celui de la v3 (signature ci-dessus) ; `range(a,b)=a+(b-a)*next()`. `parseParams` accepte une graine uniquement si elle correspond à `/^\d+$/`. `storage` entoure chaque accès d'un `try/catch` ; `readNumber` renvoie le fallback si la valeur n'est pas un nombre fini.

- [ ] **Step 4: Vérifier le succès**

Recharger `dev/check.html`. Attendu : `9/9 OK`, aucune erreur console.

- [ ] **Step 5: Commit**

```bash
git add src/core/fp.js dev/
git commit -m "feat(core): espace FP, RNG seedée, paramètres, stockage sûr + banc check.html

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Configuration et état unique

**Files:**
- Create: `src/core/config.js`, `src/core/state.js`
- Create: `dev/tests/state.test.js`
- Modify: `dev/check.html` (ajouter les deux sources après `fp.js`, et le test)

**Interfaces:**
- Consumes: `FP.createRng`, `FP.params`.
- Produces:
  - `FP.config = { version:'4.0.0', storageKey:'flower_power_v4_best', view:{ aspect:9/16, dprMax:1.15, minW:300, minH:520, surfaceRatio:.136, surfaceMin:82, surfaceMax:116 }, loop:{ maxDt:.033, fallbackDt:.016 }, palette:{ skies:[…], lawns:[…], soilBands:[…] } }` — palettes recopiées telles quelles depuis `SOIL_SKIES`, `SOIL_LAWNS`, `SOIL_BANDS` de l'archive (lignes ~144–162).
  - `FP.state.createRun(seed?:number) → State` avec exactement la forme de la spec §6 : `mode:'menu'`, `time:0`, `seed`, `level:0`, `rng` (instance `FP.createRng(seed)`), `camera:{y:0,zoom:1,shake:0}`, `plant:{tip:null,dir:null,trail:[],stemAge:0,reserves:3}`, `world:{solids:[],toxics:[],leaks:[],surfaceY:0,height:0}`, `graze:{active:new Map(),combo:0,comboTimer:0}`, `power:{shield:false,shieldGrace:0,sporeTimer:0,bonuses:[]}`, `score:{eco:0,flowers:0,flowerBonus:0}`, `fx:{particles:[],effects:[],message:null}`, `events:[]`.
  - Sans argument, la graine vaut `FP.params.seed` si elle existe, sinon `Math.floor(Math.random()*999999)`.
  - `FP.state.current` : l'état en cours (affecté par `ui/menu.js` et `loop.js`).

- [ ] **Step 1: Écrire les tests (qui échouent)**

```js
FP.test('state: forme complète', () => {
  const s = FP.state.createRun(1234);
  for (const k of ['mode','time','seed','level','rng','camera','plant','world','graze','power','score','fx','events'])
    FP.assert(k in s, 'clé manquante: ' + k);
  FP.assertEqual(s.mode, 'menu');
  FP.assertEqual(s.seed, 1234);
  FP.assertEqual(s.plant.reserves, 3);
  FP.assertEqual(s.power.shield, false);
  FP.assertEqual(s.events.length, 0);
});
FP.test('state: deux runs ne partagent rien', () => {
  const a = FP.state.createRun(1), b = FP.state.createRun(1);
  a.events.push({type:'x'}); a.world.solids.push({});
  FP.assertEqual(b.events.length, 0);
  FP.assertEqual(b.world.solids.length, 0);
});
FP.test('state: rng du run suit la graine', () => {
  FP.assertEqual(FP.state.createRun(1234).rng.next(), 0.7143076679203659);
});
FP.test('state: graine aléatoire si absente', () => {
  const s = FP.state.createRun();
  FP.assert(Number.isInteger(s.seed) && s.seed >= 0 && s.seed < 999999, String(s.seed));
});
FP.test('config: version et clé de record', () => {
  FP.assertEqual(FP.config.version, '4.0.0');
  FP.assertEqual(FP.config.storageKey, 'flower_power_v4_best');
  FP.assertEqual(FP.config.palette.skies.length, 4);
});
```

Note : le test « graine aléatoire » suppose que `dev/check.html` est ouvert sans `?seed=`.

- [ ] **Step 2: Vérifier l'échec**

Ouvrir `dev/check.html`. Attendu : les 5 nouveaux tests rouges, `9/14 OK`.

- [ ] **Step 3: Implémenter `config.js` puis `state.js`**

Valeurs exactes : voir Interfaces. `createRun` construit des objets et tableaux neufs à chaque appel.

- [ ] **Step 4: Vérifier le succès**

Attendu : `14/14 OK`.

- [ ] **Step 5: Commit**

```bash
git add src/core/config.js src/core/state.js dev/
git commit -m "feat(core): config v4 et état unique createRun

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Boucle, vue, rendu de fond, menu et coquille HTML

**Files:**
- Create: `src/core/loop.js`, `src/render/view.js`, `src/render/frame.js`, `src/ui/menu.js`
- Create: `index.html`, `style.css`
- Create: `dev/tests/loop.test.js`
- Modify: `dev/check.html` (ajouter `../src/core/loop.js` et le test ; **pas** les fichiers `render/` ni `ui/`)

**Interfaces:**
- Consumes: `FP.config`, `FP.state.createRun`, `FP.state.current`, `FP.params`.
- Produces:
  - `FP.loop.UPDATE_ORDER = ['input','plant','collision','graze','powerups','scoring']` — ordre de la spec §6.
  - `FP.loop.step(state, rawDt) → void` :
    1. `dt = rawDt` fini et > 0 ? `min(rawDt, config.loop.maxDt)` : `config.loop.fallbackDt` ;
    2. `state.time += dt` ;
    3. si `state.mode === 'playing'`, appelle `FP[name].update(state, dt)` pour chaque `name` de `UPDATE_ORDER` dont le module existe ;
    4. appelle `FP.audio.consume(state.events)` si `FP.audio` existe ;
    5. appelle `FP.render.frame(state)` si `FP.render` existe ;
    6. vide `state.events` (`state.events.length = 0`).
  - `FP.loop.start()` : boucle `requestAnimationFrame` qui appelle `step(FP.state.current, (now-last)/1000)`.
  - `FP.view = { canvas, ctx, W, H, DPR, resize() }` : logique de `resize()` de l'archive (lignes 556–571) avec les valeurs de `config.view` ; met à jour `FP.state.current.world.surfaceY`.
  - `FP.render.frame(state)` : ciel en dégradé (`palette.skies[0]`) au-dessus de `surfaceY`, pelouse (`palette.lawns[0]`), terre `#221912` avec les `soilBands`, et en mode `'playing'` un texte centré `v4.0.0 — squelette`.
  - `ui/menu.js` : au chargement, `FP.state.current = FP.state.createRun()` ; un `pointerdown` sur la page remplace l'état par `createRun()` avec `mode='playing'` et masque `#menu`.

- [ ] **Step 1: Écrire les tests de boucle (qui échouent)**

```js
FP.test('loop: ordre des systèmes de la spec', () => {
  const calls = [], saved = {};
  for (const n of FP.loop.UPDATE_ORDER) { saved[n] = FP[n]; FP[n] = { update(){ calls.push(n); } }; }
  try {
    const s = FP.state.createRun(1); s.mode = 'playing';
    FP.loop.step(s, .016);
    FP.assertEqual(calls.join(','), 'input,plant,collision,graze,powerups,scoring');
  } finally { for (const n of FP.loop.UPDATE_ORDER) FP[n] = saved[n]; }
});
FP.test('loop: rien ne tourne au menu', () => {
  let called = false; const saved = FP.plant;
  FP.plant = { update(){ called = true; } };
  try { FP.loop.step(FP.state.createRun(1), .016); FP.assert(!called); }
  finally { FP.plant = saved; }
});
FP.test('loop: dt plafonné et dt invalide remplacé', () => {
  const s = FP.state.createRun(1);
  FP.loop.step(s, 5); FP.assertEqual(s.time, .033);
  FP.loop.step(s, NaN); FP.assertEqual(Math.round(s.time*1000), 49);
});
FP.test('loop: events consommés puis vidés', () => {
  const s = FP.state.createRun(1); let seen = 0; const saved = FP.audio;
  FP.audio = { consume(ev){ seen = ev.length; } };
  try { s.events.push({type:'a'},{type:'b'}); FP.loop.step(s, .016); }
  finally { FP.audio = saved; }
  FP.assertEqual(seen, 2); FP.assertEqual(s.events.length, 0);
});
```

- [ ] **Step 2: Vérifier l'échec**

Attendu : `14/18 OK`, les 4 tests de boucle rouges.

- [ ] **Step 3: Implémenter `src/core/loop.js`**

Selon Interfaces. Pas d'autre logique.

- [ ] **Step 4: Vérifier le succès**

Attendu : `18/18 OK`.

- [ ] **Step 5: Coquille `index.html` + `style.css`**

`style.css` : le CSS de l'archive (lignes 8–25) **sans** les règles `.scale-test`. `index.html` : `<title>Flower Power v4.0.0</title>`, `<link rel="stylesheet" href="style.css">`, le `#wrap`/`canvas#game` et le panneau `#menu` de l'archive avec ces changements : retirer le paragraphe « Test d'intégration… », retirer le bloc `.scale-test`, ligne `.small` = `v4.0.0 · refonte · ÉcoCrédits™`. Puis les scripts dans cet ordre :

```html
<script src="assets/obstacles/manifest.js"></script>
<script src="src/core/fp.js"></script>
<script src="src/core/config.js"></script>
<script src="src/core/state.js"></script>
<script src="src/render/view.js"></script>
<script src="src/render/frame.js"></script>
<script src="src/core/loop.js"></script>
<script src="src/ui/menu.js"></script>
<script>FP.loop.start();</script>
```

- [ ] **Step 6: Implémenter `view.js`, `frame.js`, `menu.js`**

Selon Interfaces. `view.js` écoute `resize` (passif) et s'exécute une fois au chargement.

- [ ] **Step 7: Vérifier dans le navigateur**

Double-cliquer `index.html`. Attendu : menu Flower Power par-dessus un fond ciel/pelouse/terre en 9:16 ; clic → menu masqué, texte `v4.0.0 — squelette` ; redimensionner la fenêtre garde le 9:16 net ; aucune erreur console. `dev/check.html` toujours `18/18 OK`.

- [ ] **Step 8: Vérifier la taille des fichiers**

Run: `wc -l src/**/*.js` (bash). Attendu : chaque fichier < 400 lignes.

- [ ] **Step 9: Commit**

```bash
git add index.html style.css src/ dev/
git commit -m "feat: boucle v4, vue 9:16, fond, menu et coquille HTML

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Contrat d'itération et docs vivantes

**Files:**
- Create: `AGENTS.md`, `docs/design.md`, `docs/architecture.md`
- Modify: `README.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: les documents que lira toute IA à partir de l'étape 1.

- [ ] **Step 1: `AGENTS.md`**

Les 6 règles du §8 de la spec, mot pour mot, plus : « Lire `docs/architecture.md` avant toute modification », « Lancer `dev/check.html` (tout vert) et faire une partie avant chaque commit », « Comparer le gamefeel avec `archive/v3.43.16/index.html?seed=N` ».

- [ ] **Step 2: `docs/architecture.md`**

Carte des fichiers (§4 de la spec, en marquant ce qui existe déjà vs à venir), les 4 règles (§5), la forme de l'état et l'ordre d'une frame (§6), la liste des scripts d'`index.html` et de `dev/check.html` et l'ordre à respecter pour en ajouter.

- [ ] **Step 3: `docs/design.md`**

Piliers, dangers, power-ups et règle d'exclusivité, repris de `archive/docs/game-design.md` et `technical-decisions.md` v3.42–v3.42.4, mis à jour avec le périmètre v4 (§7 de la spec : 12 familles PNG, sans portes ni `amber`).

- [ ] **Step 4: `README.md` et `CHANGELOG.md`**

`README.md` : lancer (double-clic), contrôles, `?seed=` / `?perf=1` / `?flydebug=1`, `dev/check.html`, statut « v4.0.0 en reconstruction — étape 0/7 », lien vers l'archive. `CHANGELOG.md` : nouvelle entrée `## v4.0.0-etape0 — Squelette` en tête, l'historique v3 conservé en dessous.

- [ ] **Step 5: Vérification finale**

Double-cliquer `index.html` et `dev/check.html` (`18/18 OK`), puis `archive/v3.43.16/index.html?seed=1234`. Aucun fichier `src/**` ≥ 400 lignes. `git status` propre après commit.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md CHANGELOG.md docs/design.md docs/architecture.md
git commit -m "docs: contrat d'itération AGENTS.md et docs vivantes v4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
