# Rendu pixel Mega Drive (v4.1.0) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** dessiner tout le monde du jeu sur une grille de pixels d'art de grain 2, dans le style Mega Drive / *Earthworm Jim*. La pointe devient un héros à visage et chaque fleur garde ce visage, avec ses variantes. La simulation ne change pas.

**Architecture :**
- Une toile monde à mi-résolution (`FP.view.art`) reçoit tout le monde.
- `frame.js` l'agrandit sans lissage vers l'écran, avec la secousse et le zoom, puis dessine la couche nette (HUD, doigt, fondu).
- Le dessin en code passe par une boîte à outils pixel pure (`FP.px`) et des palettes nommées (`FP.palette`).
- Les modules pas encore convertis dessinent dans la toile monde sous une transformation ½ (mode « hérité »).

**Tech :** JS classique sur `window.FP`, Canvas 2D ; banc `node dev/run-checks.js` (182 tests au départ).

**Spec :** `docs/superpowers/specs/2026-10-21-rendu-pixel-design.md`. Référence visuelle : `docs/art/reference-crepuscule.png`.

## Contraintes globales

- **Grain :** `FP.px.SCALE = 2` (1 pixel d'art = 2 px CSS) ; toile monde `artW = ceil(W / 2)`, `artH = ceil(viewH / 2)`.
- **Dessin pixel :** tout dessin converti écrit des pixels entiers par `fillRect` ou `drawImage` / `putImageData` sur la toile monde. `imageSmoothingEnabled = false` sur la toile monde et à l'agrandissement. Pas de `arc` / `ellipse` / `stroke` dans un module converti.
- **Palettes :** le vert acide et le violet sont réservés aux dangers (`FP.palette.danger`) et absents de toute palette de décor.
- **Hiérarchie des contours :** pas de contour noir dans le décor. Contours sombres d'un pixel pour les obstacles, la tige, le héros, les bonus et les limaces.
- **Simulation intacte :** le rendu ne fait que lire l'état (sauf `state.fx` et ses caches privés). Les 182 tests existants restent verts sans modification.
- **Chargement :** `px.js`, `palette.js`, `hero.js` et `flowers.js` ne touchent pas au DOM au chargement ; leurs caches sont créés à la première utilisation. Ils sont chargés par `dev/check.html`.
- **Fichiers :** 400 lignes au plus par fichier ; en-têtes rôle / Lit / Écrit / Expose ; constantes purement visuelles dans `render/`.
- **Performance :** rendu ≤ 4 ms par frame avec `?perf=1`.
- **Fin d'étape :** chaque tâche se termine par une capture en jeu envoyée à l'utilisateur (`SendUserFile`), avant / après. Le dépôt garde les captures dans `.superpowers/` (ignoré par git).

## Points de vigilance

1. **Fenêtre redimensionnée en pleine partie :** la toile monde suit la nouvelle taille dès la frame suivante, sans étirement ni bande noire → test Tâche 1 (`FP.view.art` recalculé par `resize`) et vérification navigateur.
2. **Zoom de frôlement et secousse :** le monde reste aligné sur le pointeur (`FP.input.toWorldX` inchangé) ; on ne voit jamais de bord vide sous la toile pendant une secousse → vérification navigateur Tâche 1 (fond `#020201` peint sous la toile).
3. **Sprite PNG pas encore chargé :** l'obstacle n'est pas dessiné, et son cache pixel se construit à la première frame où l'image est prête, sans erreur → test Tâche 3 (`FP.px.downscale` sur une image vide ou transparente).
4. **Mort sur la dernière graine** (passage direct à `over`) : le héros affiche bien son visage de mort, pas « calme » → test Tâche 4 (`mood` en mode `over` après un événement `death`).
5. **Parterre de 30 fleurs ou plus :** pas d'effet copier-coller et pas de chute de performance → test Tâche 5 (≥ 20 variantes distinctes sur 30) et mesure `?perf=1`.

---

### Task 1: Toile monde, boîte à outils pixel, palettes

**Fichiers :**
- Créer : `src/render/px.js`, `src/render/palette.js`, `dev/tests/px.test.js`.
- Modifier : `src/render/view.js`, `src/render/frame.js`, `index.html`, `dev/check.html`.

**Interfaces :**
- Produit `FP.px` (pur, sans DOM) :
  - `SCALE = 2` ;
  - `toArt(v) → Math.round(v / SCALE)` ;
  - `rect(ctx, x, y, w, h, color)` ;
  - `line(ctx, x0, y0, x1, y1, color, thick = 1)` : Bresenham, tampon carré `thick` ;
  - `disc(ctx, cx, cy, r, color)` : pixel (dx, dy) plein si `dx² + dy² <= r² + r` ;
  - `ring(ctx, cx, cy, r, color, thick = 1)` : pleins pour `r`, vides pour `r - thick` (même métrique) ;
  - `dither(ctx, x, y, w, h, colorA, colorB, level)` : motif de Bayer 4×4, `level` de 0 (tout A) à 16 (tout B), pixel B si `BAYER[y & 3][x & 3] < level` ;
  - ajoutés à la Tâche 3 : `downscale(img, w, h) → img`, `posterize(img, levels = 8) → img`, `outline(img, color) → img`.

  Toutes les coordonnées de `rect` à `dither` sont en pixels d'art entiers. Un `img` est `{ width, height, data: Uint8ClampedArray }` (comme `ImageData`).
- Produit `FP.palette` (pur) :
  - `sky[0..3]`, `strata.{humus,clay,stone}` (4 teintes chacune), `lawn[0..3]`, `stem`, `hero`, `flowers[0..4]` : tableaux de couleurs `#rrggbb` ;
  - `danger` : vert acide et violet ;
  - `decor()` : renvoie toutes les couleurs de ciel, strates et pelouse ;
  - `strataBounds = { humus: .22, clay: .62 }` : profondeur relative (0 = surface, 1 = fond) où commence la strate suivante.
- Produit `FP.view.art = { canvas, ctx, w, h }`, recalculé par `FP.view.resize()`.
- Produit, dans `frame.js`, la fonction interne `legacy(actx, camY, fn)` : elle applique `setTransform(1/2, 0, 0, 1/2, 0, -camY/2)`, appelle `fn(actx)`, puis restaure.

- [ ] **Étape 1 : tests rouges** (`dev/tests/px.test.js`, chargé dans `check.html` après les tests existants ; `px.js` et `palette.js` chargés avec les sources).

```js
const fakeCtx = () => { const px = new Map(); return { px, set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; }, fillRect(x, y, w, h) { for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) px.set((x + i) + ',' + (y + j), this._c); } }; };
FP.test('px: conversion monde → pixel d’art arrondie', () => { FP.assertEqual(FP.px.toArt(5), 3); FP.assertEqual(FP.px.toArt(4.9), 2); FP.assertEqual(FP.px.toArt(-3), -1); });
FP.test('px: un rectangle n’écrit que des pixels entiers', () => { const c = fakeCtx(); FP.px.rect(c, 1, 2, 3, 2, '#fff'); FP.assertEqual(c.px.size, 6); FP.assert([...c.px.keys()].every(k => k.split(',').every(n => Number.isInteger(+n)))); });
FP.test('px: disque symétrique, rangée centrale de 2r + 1', () => {
  const c = fakeCtx(); FP.px.disc(c, 10, 10, 4, '#fff');
  let row = 0; for (let x = 0; x < 20; x++) if (c.px.has(x + ',10')) row++; FP.assertEqual(row, 9);
  for (const k of c.px.keys()) { const [x, y] = k.split(',').map(Number); FP.assert(c.px.has((20 - x) + ',' + y) && c.px.has(x + ',' + (20 - y))); }
});
FP.test('px: anneau creux', () => { const c = fakeCtx(); FP.px.ring(c, 10, 10, 5, '#fff'); FP.assert(!c.px.has('10,10')); FP.assert(c.px.has('15,10') && c.px.has('5,10')); });
FP.test('px: ligne continue (8-connexe)', () => {
  const c = fakeCtx(); FP.px.line(c, 0, 0, 9, 4, '#fff');
  const pts = [...c.px.keys()].map(k => k.split(',').map(Number)).sort((a, b) => a[0] - b[0]);
  FP.assertEqual(pts.length, 10); for (let i = 1; i < pts.length; i++) FP.assert(Math.abs(pts[i][1] - pts[i - 1][1]) <= 1);
});
FP.test('px: tramage 0 = tout A, 16 = tout B, 8 = moitié', () => {
  const count = (lv) => { const c = fakeCtx(); FP.px.dither(c, 0, 0, 8, 8, 'a', 'b', lv); return [...c.px.values()].filter(v => v === 'b').length; };
  FP.assertEqual(count(0), 0); FP.assertEqual(count(16), 64); FP.assertEqual(count(8), 32);
});
FP.test('palette: aucune couleur de danger dans le décor', () => {
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const near = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i])) < 60;
  for (const c of FP.palette.decor()) for (const d of FP.palette.danger) FP.assert(!near(c, d), c + ' trop proche de ' + d);
});
```

- [ ] **Étape 2 :** `node dev/run-checks.js` → les 7 nouveaux tests échouent (`FP.px` / `FP.palette` absents).
- [ ] **Étape 3 : implémenter `px.js` et `palette.js`.**
  - Couleurs tirées de la planche de référence, assombries et désaturées pour les strates. Pipette dans le navigateur sur `docs/art/reference-crepuscule.png`.
  - `danger` : `['#b4ff3a', '#d8ff58', '#7a3cff', '#c13cff']`.
- [ ] **Étape 4 : `view.js` crée `FP.view.art`.**
  - Le canvas est créé hors du DOM, avec `imageSmoothingEnabled = false`, et redimensionné dans `resize()` à `ceil(W / 2) × ceil(H / 2)`.
  - En-tête mis à jour.
- [ ] **Étape 5 : `frame.js`, nouveau pipeline.**
  - **Monde :** effacer l'écran avec `#020201` ; dessiner le monde dans `art.ctx` via `legacy(actx, camY, fn)` pour chaque module actuel, dans l'ordre actuel.
  - **Agrandissement :** sur l'écran, `save`, secousse, zoom (code de `applyZoom` inchangé, repère écran), `drawImage(art.canvas, 0, 0, art.w * 2, art.h * 2)` sans lissage, `restore`.
  - **Couche nette :** doigt, HUD, flydebug, perf et fondu, comme aujourd'hui.
  - Les tranches `?perf=1` restent mesurées autour des mêmes groupes. Garder le `try / finally` qui restaure les deux contextes.
- [ ] **Étape 6 :** `node dev/run-checks.js` → 189/189.
- [ ] **Étape 7 : navigateur** (`?seed=7&perf=1`). Vérifier :
  - le jeu est jouable, le monde un peu flou, le HUD net ;
  - le zoom de frôlement est centré sur la pointe ;
  - une secousse ne laisse pas de bord vide (fond sombre) ;
  - après redimensionnement en partie, la toile suit ;
  - `render` est sous 4 ms ;
  - envoyer la capture à l'utilisateur.
- [ ] **Étape 8 : commit** `feat(render): toile monde pixel, boîte à outils et palettes`.

### Task 2: Ciel, surface, strates

**Fichiers :**
- Créer : `src/render/sky.js`.
- Modifier : `src/render/soil.js`, `src/render/frame.js`, `index.html`.

**Interfaces :**
- Consomme : `FP.px`, `FP.palette`, `FP.view.art`.
- Produit :
  - `FP.sky.draw(actx, state)` : repère d'art, la caméra est appliquée par le module (`ay = toArt(worldY - camY)`) ;
  - `FP.soil.draw(actx, state)`, même repère, et `FP.soil.surfaceTop(world)` inchangé (utilisé ailleurs).
- `soil.js` perd le ciel et passe en mode converti : `frame.js` l'appelle sans `legacy`.

- [ ] **Étape 1 : `sky.js`.**
  - **Cache** par variante (`world.skyVariant`), à la largeur d'art :
    - 4 à 6 bandes de dégradé reliées par `dither` (niveaux 4, 8, 12) ;
    - un soleil voilé (`disc` plus anneaux tramés) ;
    - des silhouettes d'usines et de cheminées en aplats.
  - **Animation :** chaque frame, 3 à 5 nuages de smog (disques tramés) dérivent à 2 à 4 pixels d'art par seconde (`state.time`), en boucle ; les panaches des cheminées montent en boucle de 3 s.
  - Ne rien dessiner si le ciel est hors écran.
- [ ] **Étape 2 : `soil.js`.**
  - **Pelouse :** touffes en `line`, deux tons de `palette.lawn`, quelques fleurs sauvages de 1 à 2 pixels. Mise en cache.
  - **Strates :** selon la profondeur relative et `palette.strataBounds` ; transition `dither` sur 6 pixels d'art.
  - **Détails :** de 1 à 3 pixels, sans contour. Densité ≈ 1 par 24 × 24 pixels d'art, tirage déterministe par une graine dérivée de `world.height` et `world.surfaceY` (pas `state.rng`).
  - **Cache** par bandes, comme aujourd'hui, à la résolution d'art.
- [ ] **Étape 3 :** `node dev/run-checks.js` → toujours vert ; le test de palette protège les couleurs.
- [ ] **Étape 4 : navigateur.**
  - Ciel et surface en haut de niveau, terre profonde en bas ; `?perf=1` relevé.
  - Capture à côté de la planche de référence, envoyée à l'utilisateur.
- [ ] **Étape 5 : commit** `feat(render): ciel crépusculaire, pelouse et strates en pixels`.

### Task 3: Obstacles à l'échelle pixel

**Fichiers :**
- Modifier : `src/render/obstacles.js`, `src/render/frame.js`, `dev/tests/px.test.js`.

**Interfaces :**
- Consomme : `FP.px.downscale/posterize/outline`, `FP.sprites.get`.
- Produit : `FP.obstacles.draw(actx, world, camY, viewH)`, en repère d'art, converti.

- [ ] **Étape 1 : tests rouges.**

```js
const img = (w, h, fill) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4).fill(fill) });
FP.test('px: réduction d’une image vide → transparente, sans erreur', () => { const r = FP.px.downscale(img(8, 8, 0), 2, 2); FP.assertEqual(r.width, 2); FP.assert(r.data.every((v, i) => i % 4 !== 3 || v === 0)); });
FP.test('px: réduction d’une image opaque → opaque, couleur moyenne', () => { const r = FP.px.downscale(img(4, 4, 255), 2, 2); FP.assert(r.data.every(v => v === 255)); });
FP.test('px: contour autour d’un pixel opaque', () => {
  const s = img(1, 1, 255), o = FP.px.outline(s, '#000000');
  FP.assertEqual(o.width, 3); FP.assertEqual(o.data[(1 * 3 + 0) * 4 + 3], 255); FP.assertEqual(o.data[0 * 4 + 3], 0);   // voisin gauche contouré, coin vide
});
FP.test('px: postérisation sur 8 niveaux', () => { const s = { width: 1, height: 1, data: new Uint8ClampedArray([100, 200, 30, 255]) }; const r = FP.px.posterize(s, 8); FP.assert([...r.data.slice(0, 3)].every(v => [0, 36, 73, 109, 146, 182, 219, 255].includes(v))); });
```

- [ ] **Étape 2 :** rouges (`downscale`, `posterize`, `outline` absents).
- [ ] **Étape 2 bis : ajouter à `px.js`.**
  - `downscale` fait la moyenne des pixels source couverts, pondérée par l'alpha ; alpha final 0 ou 255 (seuil 128).
  - `posterize` arrondit chaque canal à `levels` niveaux, soit les 8 niveaux par canal de la Mega Drive.
  - `outline` ajoute `color` sur tout pixel transparent voisin (4-connexe) d'un pixel opaque ; l'image grandit d'un pixel de chaque côté.
- [ ] **Étape 3 : `obstacles.js`.**
  - **Cache** par `kind + flip`, à la première frame où le sprite est prêt : dessiner le PNG dans un canvas temporaire, `getImageData`, `downscale` à `toArt(o.w) × toArt(o.h)`, `posterize(8)`, `outline('#120c08')`, `putImageData` dans le cache.
  - **Dessin :** `actx.translate(toArt(x), toArt(y - camY))`, `rotate(o.a)`, `drawImage` sans lissage.
  - **Ancrage sombre** redessiné en pixels : disque tramé sous l'obstacle.
  - Supprimer le code de stencil devenu mort.
- [ ] **Étape 4 :** `node dev/run-checks.js` → vert.
- [ ] **Étape 5 : navigateur, lisibilité.**
  - Capture en jeu avec obstacles, nappes et limaces, à côté de la même graine en v4.0.1 (`main` avant fusion, ou une capture prise au début de la tâche) ; envoyée à l'utilisateur.
  - Obstacles coupés aux bords comme avant ; T-Rex reconnaissable.
- [ ] **Étape 6 : commit** `feat(render): obstacles ramenés à la grille pixel, avec contour`.

### Task 4: Tige, graine et héros

**Fichiers :**
- Créer : `src/render/hero.js`, `dev/tests/hero.test.js`.
- Modifier : `src/render/plant.js`, `src/render/frame.js`, `src/render/powerups.js` (membrane du bouclier en pixels), `index.html`, `dev/check.html`.

**Interfaces :**
- Consomme : `FP.px`, `FP.palette.stem / hero`, `FP.config.toxic.burnAt`.
- Produit :
  - `FP.hero.mood(state, memory) → memory`, fonction pure. `memory = { name, since, cause, sweat, dizzy }`, avec `name` parmi `'dead' | 'toxic' | 'graze' | 'alarm' | 'focus' | 'calm'`. Pour la première frame, `memory` vaut `null`.
    - `cause` vaut `'solid'` ou `'melt'` ; il est posé quand `state.events` contient `death` (`melt` pour `leak` ou `toxic`).
    - Règles : `dead` si `mode` vaut `dying` ou `over` et `cause` est connu ; `toxic` si `plant.toxicTimer > 0` (`dizzy` si `toxicTimer / burnAt > .6`) ; `graze` si `graze.active.size > 0` (`sweat` si le max de `query.grazes[].intensity` dépasse .7) ; `alarm` si `query.danger > .45` ; `focus` si `input.down` ; sinon `calm`.
    - Changement d'humeur seulement si `state.time - since >= .25`, sauf vers `dead`.
  - `FP.hero.draw(actx, state, ax, ay, dir)` : tête d'environ 11 × 11 pixels d'art centrée en (ax, ay), orientée selon `dir`. La mémoire d'humeur est gardée dans le module et remise à zéro quand `state` change (même schéma que `flydebug`).
  - `FP.hero.face(actx, ax, ay, name, opts)` : dessine un visage seul ; servira aux fleurs. `name` peut aussi valoir `'joy'` et les visages de fleurs de la Tâche 5.

- [ ] **Étape 1 : tests rouges** (`dev/tests/hero.test.js`).

```js
const heroRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
FP.test('hero: calme par défaut', () => FP.assertEqual(FP.hero.mood(heroRun(), null).name, 'calm'));
FP.test('hero: le frôlement l’emporte sur le doigt posé', () => { const s = heroRun(); s.input.down = true; s.graze.active.set({}, { time: .3 }); FP.assertEqual(FP.hero.mood(s, null).name, 'graze'); });
FP.test('hero: le toxique l’emporte sur le frôlement ; vertige près de la brûlure', () => { const s = heroRun(); s.graze.active.set({}, { time: .3 }); s.plant.toxicTimer = .7; const m = FP.hero.mood(s, null); FP.assertEqual(m.name, 'toxic'); FP.assert(m.dizzy); });
FP.test('hero: une humeur tient 0,25 s', () => {
  const s = heroRun(); s.time = 10; let m = FP.hero.mood(s, null);
  s.input.down = true; s.time = 10.1; m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'calm');
  s.time = 10.3; m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'focus');
});
FP.test('hero: la mort s’affiche tout de suite, même sur la dernière graine', () => {
  const s = heroRun(); s.time = 5; let m = FP.hero.mood(s, null);
  s.events.push({ type: 'death', cause: 'solid' }); s.mode = 'over'; s.time = 5.01;
  m = FP.hero.mood(s, m); FP.assertEqual(m.name, 'dead'); FP.assertEqual(m.cause, 'solid');
});
FP.test('hero: mort acide → visage qui fond', () => { const s = heroRun(); s.events.push({ type: 'death', cause: 'leak' }); s.mode = 'dying'; FP.assertEqual(FP.hero.mood(s, null).cause, 'melt'); });
```

- [ ] **Étape 2 :** rouges (`FP.hero` absent).
- [ ] **Étape 3 : `hero.js`.**
  - `mood` selon les règles ci-dessus.
  - Visages en `rect` / `disc` :
    - clignement : yeux fermés 0,12 s, toutes les `2 + 3·frac(sin(n))` secondes ;
    - `calm` : regard décalé de 1 pixel dans le sens de `dir` ;
    - `focus` : sourcils ;
    - `graze` : yeux plissés et dents, goutte bleue si `sweat` ;
    - `alarm` : yeux de 3 × 3 ;
    - `toxic` : tête teintée vers `#9bb84a`, langue, pupilles qui tournent si `dizzy` ;
    - `dead` : croix (`solid`) ou visage étiré vers le bas (`melt`) ;
    - `joy` : yeux en arcs, grand sourire.
  - Contour sombre d'un pixel autour de la tête.
- [ ] **Étape 4 : `plant.js` converti.**
  - **Tige :** `line` d'épaisseur 3 (contour) puis 1 (corps et reflet, décalés), le long de la trace en pixels d'art.
  - **Feuilles :** paires tous les 40 px de trace (pixels-sprites de 3 × 2).
  - **Anciennes tiges** assombries.
  - **Graine** aux yeux fermés.
  - **Héros** dessiné en `playing`, `dying` et `over` tant que `tip` existe.
  - **Guide du doigt** en pixels (`ring`).
  - `drawFinger` reste dans la couche nette.
  - Membrane du bouclier (`powerups.drawShield`) en `ring` tramé.
- [ ] **Étape 5 :** `node dev/run-checks.js` → vert.
- [ ] **Étape 6 : navigateur.** Capture de chaque humeur en forçant l'état (frôlement, nappe, mort sur obstacle, mort acide, doigt posé), en planche envoyée à l'utilisateur.
- [ ] **Étape 7 : commit** `feat(render): tige pixel et héros à visage`.

### Task 5: Fleurs à visage et variantes

**Fichiers :**
- Modifier : `src/render/flowers.js`, `dev/check.html`.
- Créer : `dev/tests/flowers.test.js`.

**Interfaces :**
- Consomme : `FP.hero.face`, `FP.px`, `FP.palette.flowers`.
- Produit : `FP.flowersRender.variant(flower) → { shape, petals, hue, stemK, leafK, face }`, fonction pure.
  - `shape` parmi `'round' | 'pointy' | 'cup' | 'double'` ;
  - `petals` de 5 à 8 ;
  - `hue` de −12 à 12 degrés ;
  - `stemK` et `leafK` de .85 à 1.15 ;
  - `face` parmi `'sleepy' | 'asleep' | 'smirk' | 'blush' | 'wink' | 'tongue'`, avec `tongue` tiré ≤ 1 fois sur 20.
  - Empreinte : un hash 32 bits de `flower.x`, `flower.tilt`, `flower.maxSize` et de l'indice de palette.
- Produit aussi `FP.flowersRender.draw(actx, state)`, en repère d'art, converti. Le cache est créé à la première utilisation.

- [ ] **Étape 1 : tests rouges.**

```js
const gardenOf = (n) => { const r = FP.createRng(9), pals = FP.config.garden.palettes; return Array.from({ length: n }, (_, i) => ({ x: 20 + i * 13, size: 1, maxSize: r.range(.9, 1.15), age: 5, palette: pals[i % pals.length], tilt: r.range(-.1, .1) })); };
FP.test('flowers: une fleur garde sa variante', () => { const f = gardenOf(1)[0]; FP.assertEqual(JSON.stringify(FP.flowersRender.variant(f)), JSON.stringify(FP.flowersRender.variant({ ...f }))); });
FP.test('flowers: au moins 20 variantes sur 30 fleurs', () => { FP.assert(new Set(gardenOf(30).map(f => JSON.stringify(FP.flowersRender.variant(f)))).size >= 20); });
FP.test('flowers: valeurs dans leurs bornes ; langue rare', () => {
  const vs = gardenOf(200).map(FP.flowersRender.variant);
  FP.assert(vs.every(v => v.petals >= 5 && v.petals <= 8 && Math.abs(v.hue) <= 12 && ['round', 'pointy', 'cup', 'double'].includes(v.shape)));
  FP.assert(vs.filter(v => v.face === 'tongue').length <= 200 / 20);
});
```

- [ ] **Étape 2 :** rouges.
- [ ] **Étape 3 : implémenter.**
  - **Pétales :** disques ou pixels-sprites selon `shape`, répartis en cercle autour du cœur ; teinte décalée de `hue` (conversion HSL interne).
  - **Fleur qui pousse :** à l'éclosion, visage `joy` tant que `state.flow.stage === 'show'` et que la fleur est la dernière née ; sinon le visage de `variant.face`.
  - **Fleurs bonus** à 80 % de taille.
  - **Cache** des fleurs finies, comme aujourd'hui (même clé : liste, nombre, largeur).
- [ ] **Étape 4 :** `node dev/run-checks.js` → vert.
- [ ] **Étape 5 : navigateur.**
  - Parterre forcé de 30 fleurs, capture envoyée à l'utilisateur.
  - `?perf=1` : tranche `plant` relevée avec 0 et 30 fleurs.
- [ ] **Étape 6 : commit** `feat(render): le héros devient fleur ; parterre de visages variés`.

### Task 6: Dangers, bonus, effets, particules

**Fichiers :** modifier `src/render/hazards.js`, `src/render/powerups.js`, `src/render/effects.js`, `src/render/particles.js`, `src/render/frame.js`.

**Interfaces :**
- Consomme : `FP.px`, `FP.palette.danger`.
- Produit :
  - `FP.hazardsRender.{drawBase, drawLeaks, drawOverlay, drawExposure}(actx, state)` ;
  - `FP.powerupsRender.drawBonuses(actx, state)` ;
  - `FP.effects.draw(actx, state)` et `FP.effects.drawLabels(ctx, state)` : les chiffres « +Ɇ », dans la couche nette, en repère écran (appliquer la même transformation zoom + caméra que le monde) ;
  - `FP.particles.draw(actx, state)`.

  Tous en repère d'art. Après cette tâche, plus aucun appel `legacy` dans `frame.js` ; on supprime `legacy`.

- [ ] **Étape 1 : convertir.**
  - **Nappes :** lobes en `disc` tramés de vert acide ; pulsation par alternance des niveaux de `dither` (8 ↔ 10, période 1,2 s). Pellicule (`drawOverlay`) en `dither` clair ; anneau d'exposition en `ring` d'arc tracé pixel par pixel.
  - **Limaces :** corps en `disc` avec contour et sillon en `line` ; clignotement par couleur claire.
  - **Bonus :** glyphes en pixels-sprites de 7 à 9 pixels avec contour.
  - **Effets :** anneaux en `ring`.
  - **Particules :** carrés de 1 à 2 pixels d'art aux couleurs actuelles.
- [ ] **Étape 2 :** `node dev/run-checks.js` → vert ; `rg "legacy\(|\.arc\(|\.ellipse\(" src/render` → aucun résultat hors `hud.js` et `plant.js` (`drawFinger`), qui sont dans la couche nette.
- [ ] **Étape 3 : navigateur.**
  - Partie complète, de la graine à l'écran de fin : flyover, spore, bouclier, nappe, limace, éclosion.
  - Capture envoyée à l'utilisateur ; `?perf=1` sous 4 ms ; aucune erreur en console.
- [ ] **Étape 4 : commit** `feat(render): dangers, bonus, effets et particules en pixels`.

### Task 7: Finitions et version

**Fichiers :** `docs/architecture.md`, `docs/design.md`, `README.md`, `CHANGELOG.md`, `index.html` (version affichée).

- [ ] **Étape 1 : mesures.**
  - `?perf=1` en début, milieu et fin de niveau, et parterre de 30 fleurs ; consigner dans `architecture.md`.
  - Si une valeur dépasse 4 ms : mettre en cache ce qui coûte le plus, puis remesurer.
- [ ] **Étape 2 : documentation.**
  - `architecture.md` : section « Rendu pixel » (toile monde, `FP.px`, `FP.palette`, couche nette, règles de lisibilité) et carte des fichiers.
  - `design.md` : direction artistique et héros.
  - README : statut v4.1.0.
  - CHANGELOG : entrée `v4.1.0 — Rendu pixel`.
  - Version affichée : `v4.1.0`.
- [ ] **Étape 3 :** `node dev/run-checks.js` → vert ; tous les fichiers sous 400 lignes.
- [ ] **Étape 4 : commit** `docs: v4.1.0 — rendu pixel Mega Drive`.

## Relecture finale — résultat

Corrigé dans `925d72a` :
- **Jeu ouvert par double-clic.** En `file://`, les navigateurs interdisent la relecture des pixels d'une image locale. Le jeu se figeait dès le premier obstacle à l'écran. Les obstacles ont maintenant un repli sans relecture, et une erreur dans le monde n'empêche plus l'affichage.
- **Humeur « bouclier »** ajoutée, comme prévu par la spec.
- **Haut des plus hautes fleurs** : il n'est plus coupé dans le cache du parterre.

Mineurs reportés :
- bande sombre de 6 px pendant la secousse sur l'écran de fin (zoom 1) ;
- miroir des sprites faux pour un pivot non centré (tous centrés aujourd'hui, un test du catalogue le garantit) ;
- détails du sol identiques entre deux niveaux de même variante de pelouse (la graine du niveau n'est pas utilisée) ;
- dernière rangée de pixels parfois périmée en bas d'écran (zoom 1 seulement) ;
- visage « joie » des fleurs lié au seul `flow.stage` ;
- boucles par pixel à chaque frame (limaces, poche des bonus, bouclier, tiges non masquées) : le rendu reste ≤ 1,7 ms ;
- documentation : « FP.palette nomme toutes les couleurs » est inexact ; la spec cite `FP.view.art.scale` ; l'en-tête de `plant.js` ne mentionne pas `FP.geom` ;
- données mortes : les couleurs de `config.garden.palettes` ne sont plus rendues, et `palette.stem.shade` est inutilisée ;
- peau du héros proche du vert des nappes, corps des limaces proche du reflet de la tige ;
- clignements entre 0,2 et 6,6 s (la spec dit 2 à 5 s) ; le test des variantes utilise des tailles hors jeu.
