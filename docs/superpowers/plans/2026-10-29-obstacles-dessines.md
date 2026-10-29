# Obstacles dessinés par le code — plan d'implémentation (v4.14.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une version test (`?obstacles=dessin`) où les 14 obstacles sont dessinés pixel par pixel par le code, dans le style
de la pousse, avec des collisions calculées depuis les dessins.

**Architecture:** les dessins sont des données pures dans `assets/obstacles/dessin/` (un kit commun + un fichier par
famille) ; `world/silhouette.js` tire un polygone de la silhouette ; `world/catalog.js` fabrique des fiches au format des
fiches PNG ; `render/obstacles.js` peint la grille au lieu de réduire le PNG. Sans le paramètre, rien ne change.

**Tech Stack:** JavaScript sans dépendance, canvas 2D, banc maison (`dev/harness.js`, `node dev/run-checks.js`).

**Spec:** `docs/superpowers/specs/2026-10-29-obstacles-dessines-design.md`

## Global Constraints

- Lire `AGENTS.md` et `docs/architecture.md` avant toute modification.
- `index.html` : seulement des lignes `<script>` (et le `<title>` de version à la dernière tâche).
- Réglage → `src/core/config.js` uniquement ; visuel → `render/*` ou les dessins `assets/obstacles/dessin/*`.
- Couches : `world/*` ne lit jamais `render/*` ; les dessins (`assets/`) ne lisent ni `world/*` ni `render/*` ni le DOM.
- Fichier > 400 lignes interdit ; pas de code mort ; commentaires et noms en français, à la densité du code voisin.
- Doit marcher depuis `file://` : le chemin dessiné n'utilise jamais `getImageData`.
- Sans `?obstacles=dessin`, comportement strictement identique à la v4.13.1.
- Interdits dans les dessins : couleurs de `FP.palette.danger` et `FP.palette.boss.weak`.
- Tous les fichiers en CRLF (le dépôt l'est presque entièrement) ; nouveaux fichiers de test : une ligne `<script>` dans
  `dev/check.html`.
- Banc : `node dev/run-checks.js </dev/null > <fichier> 2>&1`, lire la dernière ligne (`N/N OK`) ; compter 2 à 5 min.
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Le rétrécissement casse une silhouette en morceaux** (os du T-Rex, hélices du drone, guidon de la trottinette) : la
   collision ne garderait qu'un morceau. Attendu : la silhouette rétrécie de chaque famille reste d'un seul tenant (test de
   la tâche 6, qui force à épaissir le dessin ou à déclarer `inset: 0` pour la famille).
2. **Taille par obstacle (`scale`) et miroir** : image et collision doivent suivre ensemble (T-Rex réduit sur écran étroit,
   obstacles retournés). Test de la tâche 4 : solide dessiné à `scale: .5` et `flip: -1`.
3. **`file://`** : aucune relecture de pixels dans le chemin dessiné (tâche 5 ; revue).
4. **Simplification qui coupe un creux** (bras de l'extincteur, guidon) : débord limité à 3 % (test générique de la tâche 6).
5. **Variante qui change le contour** (coulure plus longue en variante 2) : la collision ne correspondrait plus à l'image.
   Test générique de la tâche 6 : silhouettes identiques sur les 4 variantes.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/core/fp.js` | `FP.params.obstacles` |
| `src/core/config.js` | `obstacles: { drawnInset: 1 }` ; version |
| `assets/obstacles/dessin/kit.js` (nouveau) | `FP.drawn` : registre des familles, grille, matières, outils de dessin, rendu en grille |
| `assets/obstacles/dessin/<famille>.js` (14, nouveaux) | une famille chacun : `FP.drawn.define(kind, { w, h, paint })` |
| `src/world/silhouette.js` (nouveau) | `FP.silhouette` : masque, rétrécissement, composantes, contour, simplification, polygone |
| `src/world/catalog.js` | `drawnAssets`, `select(mode)` ; choix au chargement selon le paramètre |
| `src/render/obstacles.js` | image d'une fiche dessinée depuis sa grille ; variante par obstacle |
| `src/render/sprites.js` | n'essaie pas de charger une fiche sans `runtime.src` |
| `dev/obstacles.html` (nouveau) | galerie de développement |
| `dev/tests/drawnkit.test.js`, `silhouette.test.js`, `drawn.test.js` (nouveaux) ; `fp`, `catalog`, `obstacles`, `level` tests | banc |

Ordre de chargement (`index.html`, `dev/check.html`) : `manifest.js`, puis `assets/obstacles/dessin/kit.js` et les 14
dessins, puis `src/core/fp.js`… ; `src/world/silhouette.js` juste avant `src/world/catalog.js`.

---

### Task 1 : paramètre et réglage

**Files:** Modify `src/core/fp.js` (`parseParams`), `src/core/config.js` ; Test `dev/tests/fp.test.js`.

**Interfaces — Produces:** `FP.params.obstacles` (`'dessin'` | `null`) ; `FP.config.obstacles.drawnInset` (1).

- [ ] **Step 1 : tests** — `fp: ?obstacles=dessin ouvre la version dessinée` :
  `FP.assertEqual(FP.parseParams('?obstacles=dessin').obstacles, 'dessin')` ; `parseParams('').obstacles === null` ;
  `parseParams('?obstacles=png').obstacles === null` ; `parseParams('?sansboss=1&obstacles=dessin')` donne les deux.
  `config: marge de collision des obstacles dessinés` : `FP.config.obstacles.drawnInset === 1`.
- [ ] **Step 2 : lancer le banc** — Expected : ces tests en échec, le reste vert.
- [ ] **Step 3 : implémenter** — `obstacles: q.get('obstacles') === 'dessin' ? 'dessin' : null` (commentaire « v4.14.0 :
  version test des obstacles dessinés ») ; `obstacles: { drawnInset: 1 }` dans config avec un commentaire (pixels d'art
  retirés à la silhouette avant le calcul de la collision).
- [ ] **Step 4 : banc vert.**
- [ ] **Step 5 : commit** `feat(params): ?obstacles=dessin et marge de collision (v4.14.0)`.

### Task 2 : le kit de dessin

**Files:** Create `assets/obstacles/dessin/kit.js`, `dev/tests/drawnkit.test.js` ; Modify `index.html`, `dev/check.html`.

**Interfaces — Produces** (`FP.drawn`, aucun DOM) :
- `define(kind, { w, h, inset?, paint })` : enregistre une famille ; `w`, `h` = taille intérieure en pixels d'art (sans
  contour) ; `paint(g, v)` peint, `v` = variante 0..3. `families` : objet `kind → définition`.
- `grid(w, h)` → `{ w, h, set(x, y, c, ink), get(x, y), ink(x, y) }` (coordonnées arrondies, hors cadre ignoré ; `c` couleur
  `#rrggbb`, `ink` = couleur de contour de la matière).
- `renderDef(def, v)` → grille de `(w + 2) × (h + 2)` d'une définition (enregistrée ou non) ; `render(kind, v)` =
  `renderDef(families[kind], v)`. La grille rendue : `paint` décalé d'un pixel, puis contour teinté — tout pixel vide
  4-voisin d'un pixel peint prend l'`ink` d'un de ses voisins peints (premier trouvé dans l'ordre gauche, droite, haut, bas).
- `material(dark, shade, body, light, ink)` → `{ 0: dark, 1: shade, 2: body, 3: light, ink }` (tableau à 4 teintes + `ink`) ;
  `M` : matières communes (`goo` vert acide comme le prototype, `metal`, `mud`, `rust`).
- `paint(g, x, y, m, k)` : raccourci `g.set(x, y, m[k], m.ink)`.
- `tone(m, n)` → teinte d'un volume arrondi selon `n` ∈ [-1, 1] (lumière en haut à gauche ; règle du prototype
  `.superpowers/proto/obstacles.html` : -.82 / -.5 / -.2 / .55 / .82).
- `blob(g, cx, cy, rx, ry, m, opts)` : ellipse pleine modelée (reflet en croissant en haut à gauche, ombre en bas à droite) ;
  `opts.wobble` (amplitude en pixels du bord ondulé), `opts.seed`.
- `roundRect(g, x, y, w, h, r, m, opts)` : rectangle aux coins arrondis de rayon `r` (≥ 2), modelé arrondi, `opts.bulge`
  (bombé des côtés, en pixels), `opts.wobble`, `opts.seed`.
- `drip(g, x, y, len, m)` : coulure de 2 pixels terminée par une goutte, collée à la forme (elle part d'un pixel peint).
- `hash(x, y, k)` → réel déterministe dans [0, 1[ (celui du prototype).

- [ ] **Step 1 : tests** (`drawnkit.test.js`, avec une famille de test `define('_test', …)` retirée du registre en fin de test) :
  - `drawn: grid ignore le hors-cadre et arrondit` ;
  - `drawn: render ajoute un contour teinté d'un pixel` — un carré 4 × 4 de matière `m` → grille 6 × 6, le pixel (0, 2) vide,
    (1, 2) = `m.ink`, (2, 2) peint ; aucun contour en diagonale seule ;
  - `drawn: tone éclaire à gauche et assombrit à droite` (`tone(m, -.3) === m[3]`, `tone(m, .9) === m[0]`) ;
  - `drawn: roundRect n'a pas d'angle droit` — les 4 pixels de coin d'un `roundRect` 20 × 12 r 3 sont vides ;
  - `drawn: blob est symétrique sans wobble` (même nombre de pixels peints à gauche et à droite du centre, ±2) ;
  - `drawn: hash est déterministe et dans [0, 1[`.
- [ ] **Step 2 : banc** — Expected : échecs `FP.drawn` indéfini.
- [ ] **Step 3 : implémenter** `kit.js` (en-tête Lit / Écrit / Expose comme les autres fichiers ; `window.FP = window.FP || {}`).
  Lignes `<script>` après `manifest.js` dans `index.html` et `dev/check.html`, plus `tests/drawnkit.test.js`.
- [ ] **Step 4 : banc vert.**
- [ ] **Step 5 : commit** `feat(dessin): kit de dessin des obstacles`.

### Task 3 : de la silhouette au polygone

**Files:** Create `src/world/silhouette.js`, `dev/tests/silhouette.test.js` ; Modify `index.html`, `dev/check.html`.

**Interfaces — Produces** (`FP.silhouette`, pur) :
- `mask(grid)` → `{ w, h, on: Uint8Array }` (pixels peints, contour compris).
- `erode(mask, n)` → masque rétréci de `n` pixels (4-voisinage, `n` passes).
- `components(mask)` → nombre de composantes 4-connexes.
- `polygon(mask, maxPoints = 48)` → `[[x, y], …]` dans le repère du masque (coins de pixels), bord extérieur de la plus
  grande composante, sens constant ; simplifié par Douglas-Peucker en anneau fermé, tolérance 1 pixel, relevée par pas de
  .25 tant que le nombre de points dépasse `maxPoints`.
- `coverage(mask, poly)` → `{ inside, outside }` : part des pixels du masque dont le centre est dans le polygone, et surface
  du polygone hors masque rapportée à la surface du masque (centres de pixels).

Algorithme du contour (non déterminé par les tests) : suivi de bord sur les arêtes de pixels (« marching squares » sur la
grille des coins), en partant du pixel le plus en haut à gauche de la composante ; les trous intérieurs ne sont jamais
suivis.

- [ ] **Step 1 : tests** sur des masques synthétiques :
  - `silhouette: disque → polygone qui le couvre` (disque r 10 : `inside >= .95`, `outside < .03`, `3 <= points <= 48`) ;
  - `silhouette: le trou d'un anneau est ignoré` (anneau r 12 / 6 : le centre du trou est dans le polygone) ;
  - `silhouette: un L garde son creux` (le pixel au creux du L est hors du polygone) ;
  - `silhouette: deux taches → la plus grande` et `components` vaut 2 ;
  - `silhouette: erode retire le bord` (carré 10 × 10, `erode(…, 1)` → 8 × 8 = 64 pixels) ;
  - `silhouette: jamais plus de 48 points` (masque en dents de scie de 60 dents) ;
  - `silhouette: le polygone ne se recoupe pas` (aucune paire d'arêtes non voisines ne se croise, sur les trois formes).
- [ ] **Step 2 : banc** — Expected : échecs `FP.silhouette` indéfini.
- [ ] **Step 3 : implémenter** ; lignes `<script>` avant `catalog.js` et `tests/silhouette.test.js`.
- [ ] **Step 4 : banc vert.**
- [ ] **Step 5 : commit** `feat(world): polygone de collision tiré d'une silhouette`.

### Task 4 : le catalogue dessiné

**Files:** Modify `src/world/catalog.js` ; Test `dev/tests/catalog.test.js`.

**Interfaces — Consumes:** `FP.drawn.families`, `FP.drawn.renderDef`, `FP.silhouette.*`, `FP.params.obstacles`,
`FP.config.obstacles.drawnInset`, `FP.px` n'est **pas** lu (couche) : l'échelle 2 vient de `FP.config` si elle y est, sinon
une constante locale `ART = 2` commentée (même valeur que `FP.px.SCALE`).
**Produces:**
- `FP.catalog.drawnAssets(families, png)` → fiches `kind → fiche` pour chaque famille dessinée qui a une fiche PNG du même
  nom : `drawn: true` ; `source = { width: W, height: H }` (grille contour compris) ; `render = { worldWidth: W * 2, pivot,
  mirrorSafe }` repris de la fiche PNG ; `collision = { type: 'polygon', points, grazeRadius, flyoverEligible }` —
  `points` = `polygon(erode(mask(renderDef(families[kind], 0)), inset))` ramenés au pivot (`x - pivot[0] * W`, `y - pivot[1] * H`),
  `inset` = `families[kind].inset ?? drawnInset` ; `spawn` et `runtime` repris de la fiche PNG **sans** `src` ni
  `metadata`.
- `FP.catalog.select(mode)` : remplit l'objet partagé `FP.catalog.assets` (vidé puis complété, même référence) avec les
  fiches PNG (`null`) ou dessinées (`'dessin'`). Appelé au chargement avec `FP.params.obstacles`. Les tests l'appellent puis
  rétablissent `select(null)`.

- [ ] **Step 1 : tests** (une famille factice `define('cone', …)` ne doit pas être nécessaire : utiliser un objet `families`
  fabriqué dans le test, passé à `drawnAssets` ; pour `makeSolid`, `Object.assign(FP.catalog.assets, drawnAssets(…))` puis `select(null)` en fin de
  test) :
  - `catalog: sans paramètre, les fiches PNG de la v4.13` (`select(null)` → mêmes clés et mêmes `worldWidth` que
    `filterAssets(window.FLOWER_POWER_AUTHORED_ASSETS)`) ;
  - `catalog: une fiche dessinée reprend les réglages de la fiche PNG` (pivot, mirrorSafe, grazeRadius, flyoverEligible,
    spawn ; `drawn === true` ; pas de `runtime.src`) ;
  - `catalog: worldWidth dessiné = largeur de la grille × 2, à 4 près de la fiche PNG` ;
  - `catalog: la collision dessinée est centrée sur le pivot` (carré plein 20 × 20 → points dans [-11, 11]) ;
  - `catalog: solide dessiné à l'échelle .5 et retourné` (`makeSolid({ kind, flip: -1, scale: .5 })` : `w` = moitié,
    collision en miroir de celle de `flip: 1`, toutes ses abscisses opposées) — Review Focus 2.
- [ ] **Step 2 : banc** — échecs attendus.
- [ ] **Step 3 : implémenter** ; `const assets = {}` puis `select(FP.params && FP.params.obstacles)` à la fin du module.
  Mettre à jour l'en-tête (Lit / Expose).
- [ ] **Step 4 : banc vert** (les tests existants de catalogue et de niveau restent verts).
- [ ] **Step 5 : commit** `feat(catalog): fiches des obstacles dessinés`.

### Task 5 : rendu, chargement et galerie

**Files:** Modify `src/render/obstacles.js`, `src/render/sprites.js` ; Create `dev/obstacles.html` ; Test
`dev/tests/obstacles.test.js`.

**Interfaces — Consumes:** fiche `drawn` (tâche 4), `FP.drawn.render(kind, v)`, `FP.obstacles.look(o)`.
**Produces:** `FP.obstacles.variantOf(o)` → `look(o).wear % 4` (pur) ; `FP.obstacles.gridCanvas(grid)` → canvas
`grid.w × grid.h` peint par `fillRect` (un pixel par case, aucune relecture).

- [ ] **Step 1 : tests** — `obstacles: la variante d'un obstacle est stable et dans 0..3` ; `obstacles: gridCanvas peint
  chaque case` (avec le `fakeCtx()` du banc, s'il en fournit un : compter les `fillRect` d'une grille 3 × 3 à 5 cases
  peintes → 5 ; sinon tester une fonction pure `cells(grid)` qui liste `[x, y, couleur]`).
- [ ] **Step 2 : banc** — échecs attendus.
- [ ] **Step 3 : implémenter.**
  - `spriteFor(o)` : si la fiche est `drawn`, l'entrée vient de `gridCanvas(FP.drawn.render(kind, variantOf(o)))`, miroir
    appliqué par copie retournée, clé de cache `kind|v|flip` ; sinon chemin PNG inchangé.
  - `lookFor` : pour une fiche dessinée, ni filtre de teinte/luminosité ni taches de rouille ; mise à l'échelle et bas
    enterré inchangés. Le décalage `ox/oy` tient compte de ce que la grille inclut déjà son contour.
  - `prewarm` : prépare aussi les variantes dessinées (une famille, un sens, une variante par appel).
  - `sprites.js` : sauter les fiches sans `runtime.src`.
  - `dev/obstacles.html` : charge comme `check.html` (sans les tests), affiche pour chaque famille de `FP.drawn.families`
    ses 4 variantes sur une bande de terre de chacun des 4 milieux (`FP.palette.milieux[m].strata`), case « collision »
    (polygone de `drawnAssets`), zoom 2 / 4 / 6. Repris du prototype `.superpowers/proto/obstacles.html`.
- [ ] **Step 4 : banc vert** ; ouvrir `http://localhost:8765/?obstacles=dessin` (serveur
  `node "$TEMP/claude/.../scratchpad/serve2.js" . 8765`) : sans dessin encore, le jeu tourne sans erreur (aucune famille
  dessinée → catalogue vide en mode dessin : vérifier que le niveau se génère sans obstacle et sans exception ; sinon
  corriger `level.js` pour tolérer un catalogue vide).
- [ ] **Step 5 : commit** `feat(render): obstacles dessinés à l'écran, galerie de développement`.

### Task 6 : les trois premiers dessins et les tests génériques

**Files:** Create `assets/obstacles/dessin/{pneu,cone,fut}.js`, `dev/tests/drawn.test.js` ; Modify `index.html`,
`dev/check.html`.

**Interfaces — Consumes:** kit (tâche 2), silhouette (tâche 3), catalogue (tâche 4).

- [ ] **Step 1 : tests génériques** (`drawn.test.js`), en boucle sur `Object.keys(FP.drawn.families)` (au moins une
  famille, sinon échec) ; pour chaque famille `k` :
  - `dessin <k> : taille de la fiche PNG` — `w === Math.round(worldWidthPNG / 2)` à 1 près ;
  - `dessin <k> : reste dans son cadre` — `paint` sur une grille instrumentée qui compte les `set` hors cadre → 0 ;
  - `dessin <k> : d'un seul tenant, même rétréci` — `components(mask(render(k, 0))) === 1` et
    `components(erode(mask, inset)) === 1` (Review Focus 1) ;
  - `dessin <k> : couleurs permises` — aucune couleur de `FP.palette.danger` ni `FP.palette.boss.weak` (comparaison en
    minuscules) ;
  - `dessin <k> : 4 variantes, une silhouette` — `mask(render(k, v))` identique pour v = 0..3, et au moins une variante
    différente de la 0 par ses couleurs (Review Focus 5) ;
  - `dessin <k> : déterministe` — deux `render(k, 2)` identiques case à case ;
  - `dessin <k> : collision fidèle` — sur la fiche de `drawnAssets` : `coverage(erode(mask), poly)` → `inside >= .95`,
    `outside < .03`, `points <= 48` (Review Focus 4) ;
  - `dessin <k> : contour teinté` — aucun pixel de contour n'est `#000000` ni le noir commun du prototype `#160e14`.
- [ ] **Step 2 : banc** — échec « au moins une famille ».
- [ ] **Step 3 : dessiner** `tire` (pneu v3 du prototype : gris ardoise délavé `['#1a1820', '#36323c', '#545060', '#80788a']`,
  pneu du haut affaissé et entaillé avec fils d'acier, sculptures rasées, craquelures, boue, coulure), `cone` (socle plat,
  penché, bouche qui coule), `nuclear` (fût jaune, cerclages, trèfle, couvercle qui déborde) — en reprenant le prototype,
  mais avec les règles de la spec : contours teintés (`ink` par matière), coins arrondis, bords qui ondulent, modelé rond,
  coulures collées (aucune goutte détachée). Les 4 variantes : taches d'usure, rouille et éraflures **à l'intérieur** de la
  silhouette (tirées par `hash(…, v)`).
- [ ] **Step 4 : banc vert** ; galerie `dev/obstacles.html` : capture des 3 familles × 4 variantes × 4 milieux, collision
  affichée ; comparer à la spec (rond, organique, contour teinté, usé, lisible à ×2).
- [ ] **Step 5 : commit** `feat(dessin): pneus, cône et fût dessinés`.

### Task 7 : serveur, micro-ondes, borne d'arcade, batterie

**Files:** Create `assets/obstacles/dessin/{serveur,microondes,arcade,batterie}.js` ; Modify `index.html`, `dev/check.html`.

- [ ] **Step 1 :** ajouter les 4 lignes `<script>` (les tests génériques couvrent les nouvelles familles dès qu'elles sont
  définies) ; dessiner d'abord une silhouette minimale par famille et lancer le banc : les tests génériques échouent
  (variantes identiques), ce qui prouve qu'ils voient la famille.
- [ ] **Step 2 : dessiner** selon le tableau de la spec, objets « carrés » rendus mous et cabossés : `server` (baie gris-bleu
  bombée et de travers, voyants, câbles arrachés collés au corps), `microwave` (caisse crème, vitre noire, porte de travers,
  coins rouillés), `arcade` (bleu roi et magenta franc, écran fendu, joystick tordu), `battery` (rouge et noir, bornes vertes
  de sulfate, flanc gonflé qui suinte).
- [ ] **Step 3 : banc vert** ; galerie : capture ; comparer à la spec.
- [ ] **Step 4 : commit** `feat(dessin): serveur, micro-ondes, borne d'arcade, batterie`.

### Task 8 : sarcophage, panneau solaire, drone, trottinette

**Files:** Create `assets/obstacles/dessin/{sarcophage,solaire,drone,trottinette}.js` ; Modify `index.html`, `dev/check.html`.

- [ ] **Step 1 :** comme la tâche 7, étape 1.
- [ ] **Step 2 : dessiner** `sarcophagus` (béton gris-beige fissuré, ferraille rouillée, symbole effacé), `solar` (cellules
  bleu nuit quadrillées, verre étoilé, cadre alu, pied plié), `drone` (coque blanche rayée, hélices tordues, patte cassée —
  hélices et pattes d'au moins 3 pixels d'épaisseur ou `inset: 0`), `scooter` (vert électrique, guidon plié, roue voilée —
  même règle d'épaisseur).
- [ ] **Step 3 : banc vert** ; galerie : capture ; comparer à la spec.
- [ ] **Step 4 : commit** `feat(dessin): sarcophage, panneau solaire, drone, trottinette`.

### Task 9 : sac poubelle, extincteur, squelette de T-Rex ; les 14 familles

**Files:** Create `assets/obstacles/dessin/{sac,extincteur,trex}.js` ; Modify `index.html`, `dev/check.html` ; Test
`dev/tests/drawn.test.js`, `dev/tests/level.test.js`.

- [ ] **Step 1 : tests** — `dessin: les 14 familles du jeu` (`select('dessin')` → mêmes clés que `select(null)`) ;
  `level (dessin): …` — rejouer, catalogue dessiné sélectionné puis rétabli, les tests existants « aucun chevauchement
  visuel », « chemin sûr dégagé », « le T-Rex signature trouve sa place sur écran étroit » (extraire leur corps en fonctions
  locales appelées deux fois plutôt que les copier).
- [ ] **Step 2 : banc** — échec « 14 familles ».
- [ ] **Step 3 : dessiner** `trashbag` (noir brillant, nœud jaune, déchirure d'où sortent canette et peau de banane, collées),
  `extinguisher` (rouge vif cabossé, manomètre, tuyau qui pend, collé au corps), `trex_signature` (os ivoire et beige, crâne
  de profil, quelques côtes ; 140 pixels d'art de large ; os d'au moins 3 pixels d'épaisseur pour rester d'un seul tenant
  une fois rétréci). `mirrorSafe: false` du T-Rex repris de sa fiche.
- [ ] **Step 4 : banc vert** ; galerie : capture des 14 familles.
- [ ] **Step 5 : commit** `feat(dessin): sac poubelle, extincteur, squelette de T-Rex`.

### Task 10 : version, documentation, partie jouée

**Files:** Modify `src/core/config.js` (version `'4.14.0'`), `index.html` (`<title>`), `dev/tests/state.test.js`
(version), `CHANGELOG.md`, `docs/architecture.md`.

- [ ] **Step 1 :** test de version → `'4.14.0'` ; banc rouge ; bump ; banc vert.
- [ ] **Step 2 : CHANGELOG** — entrée `## v4.14.0 — Obstacles dessinés (version test)` : paramètre, style, collisions tirées
  des dessins, galerie, nombre de tests.
- [ ] **Step 3 : architecture.md** — section « Obstacles dessinés (v4.14.0) » : dossier `assets/obstacles/dessin/`, kit,
  `FP.silhouette`, `catalog.select`, rendu, règle « un seul tenant », marge `drawnInset` ; tableau des fichiers.
- [ ] **Step 4 : navigateur** — `?obstacles=dessin&seed=…` : une partie jouée jusqu'au boss de la friche, puis un niveau de
  chaque milieu (`?sansboss=1&obstacles=dessin`, ou passage forcé par la console) ; 0 erreur console ; captures envoyées ;
  sans paramètre, une partie normale identique à la v4.13.1 (PNG à l'écran).
- [ ] **Step 5 : commit** `docs: obstacles dessinés (v4.14.0)`.
