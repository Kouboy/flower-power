# Habillage des boss (v5.6.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** habiller les boss (matière des parois, pièces en images, arrière-plan lointain et premier plan flou en parallaxe) avec un chemin
de secours sans images, et livrer la Bétonneuse complète.

**Architecture:** deux nouveaux fichiers de rendu : `render/boss-skin.js` (matière et images des pièces, peintes dans le calque déjà mis en
cache par `render/boss.js`) et `render/boss-depth.js` (arrière-plan et premier plan, flou préparé une fois). `render/boss.js` sépare corps et
menaces pour que les menaces passent au-dessus du premier plan. Images PixelLab importées par un outil de dev vers `assets/boss/art/`,
décrites par `assets/boss/art.js`.

**Tech Stack:** JS vanilla sous `window.FP`, sans build ; Canvas 2D ; banc maison (`FP.test`, `node dev/run-checks.js`) ; PixelLab (MCP) +
`pixelart_workbench` (gratuit) pour les images ; outils Node dans `dev/tools/`.

**Spec:** `docs/superpowers/specs/2026-11-11-habillage-boss-design.md`

## Global Constraints

- AGENTS.md : réglages seulement dans `src/core/config.js` ; dessin seulement dans `src/render/*` ; fichiers sous 400 lignes ; pas de code
  mort ; `index.html` et `dev/check.html` ne reçoivent que des lignes `<script>` (et la version du titre) ; une entrée CHANGELOG par version ;
  banc complet vert et vérification en jeu avant de valider.
- Chaque fichier commence par l'en-tête maison (Lit / Écrit / Expose) ; commentaires en français.
- Copies de travail en CRLF, git stocke en LF : garder la fin de ligne de chaque fichier modifié.
- **Aucune génération PixelLab sans le feu vert explicite de l'utilisateur, série par série** (tâche 4).
- Géométrie et collisions des boss inchangées : `assets/boss/plans.js` n'est pas modifié.
- Menaces (hachures, visée, projectiles) toujours dessinées après le premier plan.
- Flou jamais recalculé pendant la partie.
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; branche `habillage-boss`.

## Review Focus

1. **Image chargée en cours de combat** (PNG lent sur téléphone) : le calque mis en cache sans image doit être refait quand l'image arrive,
   sinon le boss reste provisoire toute la partie. → test « le calque est refait quand une image devient prête » (tâche 2).
2. **Niveau étiré au facteur max (k ≈ 2,17)** : la matière ancrée au monde et l'arrière-plan doivent couvrir toute la zone du boss, sans bande
   vide en haut ni en bas. → test de couverture de l'arrière-plan (tâche 3).
3. **Boss d'un milieu sans images** (Raffinerie, Incinérateur, Réacteur en v5.6.0) : rendu identique à aujourd'hui, ni arrière-plan ni premier
   plan. → test de secours par milieu (tâches 2 et 3).
4. **Navigateur sans `ctx.filter`** (vieux Safari) : pas d'exception, l'élément est seulement plus transparent. → test avec une toile cachée
   dont `filter` n'existe pas (tâche 3).
5. **Paroi effondrée ou plaque tombée** (`off`) : elle ne doit pas réapparaître habillée. → test sur le calque après `off` (tâche 2).

---

### Task 1: Séparer le corps du boss et ses menaces

**Files:**
- Modify: `src/render/boss.js` (fonction `draw`, `threats`, export)
- Modify: `src/render/frame.js` (ordre de `drawWorld`)
- Test: `dev/tests/bossfx.test.js`

**Interfaces:**
- Produces: `FP.bossRender.draw(g, state)` dessine parois, cibles, tête, plaques et **tourelles** (socle et lentille) ;
  `FP.bossRender.drawThreats(g, state)` dessine hachures de défense, ligne de visée et projectiles. Les deux ne font rien hors niveau de boss.
  Le tremblement d'une salle avertie (bandes) reste calculé dans chacune par `shaking(state, bl)`.
- Ordre dans `frame.js` (fixé ici, complété par la tâche 3) : `bossRender.draw` à sa place actuelle ; `bossRender.drawThreats` en dernier
  dans `drawWorld`, après `FP.drillFx.drawOver`.

- [ ] **Step 1: tests qui échouent** (dans `bossfx.test.js`, avec `recCtx` et `bfxRun`)
  - `bossRender: draw ne dessine aucune menace` : salle en `warn`/`strike`, une visée et un tir dans `s.bossThreats` ; comparer les
    rectangles de `draw` avec ceux du même état sans menaces (`rooms: {}, shots: [], aim: null`) → égalité.
  - `bossRender: drawThreats dessine hachures, visée et tirs, rien sans menace` : avec menaces → `rects.length > 0` ; sans → `0`.
  - `frame: les menaces du boss passent après tout le reste du monde` : espionner `FP.bossRender.drawThreats` et `FP.drillFx.drawOver`
    pendant `drawWorld` (exposé pour le test si besoin par `FP.frame`) → `drawThreats` appelé en dernier.
- [ ] **Step 2:** `node <focus.js> "." "bossRender|frame"` → FAIL (`drawThreats` n'existe pas).
- [ ] **Step 3:** retirer de `threats` le dessin des tourelles (déplacé dans `draw`), renommer en `drawThreats(g, state)` avec sa propre
  garde `if (!bl) return;` ; mettre à jour l'en-tête ; brancher dans `frame.js`.
- [ ] **Step 4:** focus → PASS ; puis `node <focus.js> "." "boss"` → tout vert.
- [ ] **Step 5:** commit `refactor: menaces du boss dessinées à part, après le monde`.

### Task 2: Matière des parois et images des pièces (boss-skin)

**Files:**
- Create: `assets/boss/art.js`, `src/render/boss-skin.js`, `dev/tests/bossskin.test.js`
- Modify: `src/core/config.js` (`boss.skin`), `src/render/boss.js` (calque), `index.html`, `dev/check.html`

**Interfaces:**
- `assets/boss/art.js` : `window.FLOWER_POWER_BOSS_ART = { <milieuId>: { matter, target, head, plate, turret, back, fore: [a, b] } }`, chaque
  valeur un chemin depuis la racine (`'assets/boss/art/friche/matiere.png'`). Vide (`{}`) jusqu'à la tâche 4.
- `config.boss.skin = { back: .6, fore: [1.4, 1.8], blur: 1.5, foreAlpha: .7, foreAlphaNoBlur: .45, foreGap: [1, 1.5], foreShake: 2, backDim: .55 }`
  (vitesses relatives à la caméra, flou en pixels d'art, transparences, écart entre éléments du premier plan en hauteurs d'écran, secousse
  en plus en pixels d'art, assombrissement de l'arrière-plan). Commentaire d'une ligne par clé.
- `FP.bossSkin.image(milieuId, role)` → `HTMLImageElement` prêt ou `null` (rôles : `matter|target|head|plate|turret|back`) ;
  `FP.bossSkin.fore(milieuId)` → tableau d'images prêtes (vide si aucune) ; `FP.bossSkin.version()` → entier qui augmente à chaque image
  devenue prête (sert à la clé du calque).
- `FP.bossSkin.wall(g, pts, img, ox, oy)` : remplit le polygone `pts` (pixels d'art) avec `img` répétée, ancrée au monde (`ox, oy` = origine
  du monde en pixels d'art dans `g`), rangée par rangée comme `fillPoly` (règle pair-impair, `drawImage` de tranches de 1 px de haut).
- `FP.bossSkin.piece(g, pts, img)` : `img` étirée à la boîte de `pts`, découpée par `pts` (même parcours de rangées).
- Consumes: `FP.bossRender.fillPoly`, `artPoly` (task 1).

- [ ] **Step 1: tests qui échouent** (`bossskin.test.js` ; images factices `{ width: 8, height: 8, complete: true }` posées par un crochet
  de test `FP.bossSkin._set(milieuId, role, img)` et `FP.bossSkin._reset()` — seuls accès d'écriture, documentés dans l'en-tête comme
  réservés au banc ; chaque test finit par `_reset()`) :
  - `bossSkin: sans images, chaque boss se dessine comme avant` : pour chaque milieu, après `_reset()`, aucun `drawImage` et un nombre de
    rectangles > 0 (le dessin actuel, inchangé).
  - `bossSkin: la matière remplit chaque paroi rangée par rangée, ancrée au monde` : avec `matter` posé, `drawImage` appelé ; deux caméras
    différentes → mêmes coordonnées source pour une même rangée du monde.
  - `bossSkin: cible, tête, plaque, tourelle en image quand elle existe` : un `drawImage` dont la source est l'image du rôle.
  - `bossSkin: une pièce off (paroi effondrée, plaque tombée) n'est pas habillée` (Review Focus 5).
  - `bossSkin: le calque est refait quand une image devient prête` (Review Focus 1) : la clé du calque change avec `FP.bossSkin.version()`.
  - `bossSkin: art.js — chaque milieu décrit a les 7 rôles et deux éléments de premier plan` (vrai trivialement tant que la table est vide).
- [ ] **Step 2:** `node <focus.js> "." "bossSkin"` → FAIL.
- [ ] **Step 3:** écrire `boss-skin.js` (chargement des images de la table au chargement du script, comme `render/sprites.js` ; rien sous
  Node) ; dans `boss.js`, `wall`, `targetBase`, `plate`, `turret` et `head` (blindée) utilisent l'image si `FP.bossSkin.image` la donne,
  sinon le dessin actuel ; contour sombre (`M.edge`) et rivets gardés par-dessus la matière ; la cible intacte garde son cœur qui pulse
  (`targetCore`) par-dessus l'image ; `keyOf` inclut `FP.bossSkin.version()`. Ajouter les deux `<script>` (art.js avant render, boss-skin.js
  avant boss.js) dans `index.html` et `dev/check.html`, et le test dans `dev/check.html`.
- [ ] **Step 4:** focus `"bossSkin|boss"` → PASS ; `wc -l src/render/boss.js` < 400.
- [ ] **Step 5:** commit `feat: matière des parois et images des pièces du boss (secours sans images)`.

### Task 3: Arrière-plan et premier plan en parallaxe (boss-depth)

**Files:**
- Create: `src/render/boss-depth.js`, `dev/tests/bossdepth.test.js`
- Modify: `src/render/frame.js`, `index.html`, `dev/check.html`

**Interfaces:**
- `FP.bossDepth.parallax(y, camY, f)` → y à l'écran (pixels du monde) : `y - camY * f` (pur).
- `FP.bossDepth.place(seed, milieuId, top, bottom, viewH, n)` → `[{ i (indice de l'image, 0..n-1), y (monde), x (fraction de largeur 0..1), flip }]`,
  pur, tiré de `FP.createRng` sur l'empreinte `(seed ^ Math.imul(milieuIndex + 1, 0x85ebca6b) ^ 0xb055)` ; écarts tirés dans
  `config.boss.skin.foreGap` × `viewH`, de `top` à `bottom`.
- `FP.bossDepth.blurred(img)` → toile cachée (une par image, mise en cache dans une `Map`) floutée de `skin.blur` ; si le contexte n'a pas
  `filter` (`!('filter' in ctx)`), la toile reste nette et l'élément est dessiné à `skin.foreAlphaNoBlur` au lieu de `skin.foreAlpha`.
- `FP.bossDepth.drawBack(g, state)` : arrière-plan répété en largeur sur toute la zone du boss (`FP.bossPlan` : `surfaceY + boss.top` à
  `height - boss.bottom`), facteur `skin.back`, assombri de `skin.backDim`. Appelé dans `frame.js` juste avant `FP.bossRender.draw`.
- `FP.bossDepth.drawFore(g, state)` : éléments placés par `place`, facteur interpolé dans `skin.fore` selon l'indice, décalés en x de
  ±`skin.foreShake` (bascule à 30 Hz) pendant qu'une salle est en `warn` ou que `state.bossFight.collapse` est actif. Appelé après
  `FP.drillFx.drawOver` et avant `FP.bossRender.drawThreats`.
- Rien hors niveau de boss ; rien si le milieu n'a pas d'image `back` (resp. `fore`).

- [ ] **Step 1: tests qui échouent** (`bossdepth.test.js`, `bossRun`, `recCtx`, images factices via `FP.bossSkin._set`) :
  - `bossDepth: parallaxe` : `parallax(1000, 400, .6) === 760`, `parallax(1000, 400, 1.8) === 280`.
  - `bossDepth: placement identique d'une tentative à l'autre et au plus un élément à l'écran` : deux appels égaux (JSON) ; pour tout
    couple consécutif, écart ≥ `foreGap[0] * viewH` ; tous les `y` dans `[top, bottom]`.
  - `bossDepth: l'arrière-plan couvre toute la zone du boss, même au facteur max` (Review Focus 2) : niveau généré à `growK` max, caméra en
    haut puis en bas de la zone → la bande dessinée couvre la vue sur la partie dans la zone.
  - `bossDepth: sans images, ni arrière-plan ni premier plan` (Review Focus 3) : pour les 4 milieux, `rects` et `drawImage` vides.
  - `bossDepth: flou préparé une fois` : `blurred(img)` appelé 60 fois → une seule création de toile (compter via `FP.px.layer` espionné).
  - `bossDepth: sans ctx.filter, plus transparent et pas d'erreur` (Review Focus 4) : `FP.px.layer` espionné rend un contexte sans `filter` →
    `globalAlpha` utilisé = `foreAlphaNoBlur`.
  - `bossDepth: le premier plan tremble plus pendant un avertissement` : x dessiné décalé de `foreShake` en `warn`, de 0 au repos.
  - `frame: ordre arrière-plan → boss → … → premier plan → menaces` : espions sur les cinq appels.
- [ ] **Step 2:** `node <focus.js> "." "bossDepth|frame"` → FAIL.
- [ ] **Step 3:** écrire `boss-depth.js`, brancher dans `frame.js`, ajouter `<script>` et test dans `index.html` / `dev/check.html`.
- [ ] **Step 4:** focus → PASS.
- [ ] **Step 5:** commit `feat: arrière-plan et premier plan flou en parallaxe pour les boss`.

### Task 4: Les images de la Bétonneuse

**Files:**
- Create: `dev/tools/import-boss.js`, `assets/boss/art/friche/{matiere,cible,tete,plaque,tourelle,fond,avant-chaine,avant-grillage}.png`
- Modify: `assets/boss/art.js`
- Raw: `C:\Users\don_n\Documents\Flower Power\pixellab-boss\friche\` (hors dépôt, comme `pixellab-test/`)

**Interfaces:**
- `node dev/tools/import-boss.js <milieuId> <dossier brut>` : copie chaque PNG brut (nommé comme ci-dessus) vers
  `assets/boss/art/<milieuId>/`, recadré sur ses pixels opaques sauf `matiere` et `fond` (gardés entiers, ils se répètent), puis réécrit
  l'entrée `<milieuId>` de `assets/boss/art.js` (`fore: ['…/avant-chaine.png', '…/avant-grillage.png']`). Échoue avec un message si un des
  8 fichiers manque. Réutilise `dev/tools/png.js`.

- [ ] **Step 1: demander le feu vert à l'utilisateur** pour 8 générations (solde vérifié avec `get_balance`, prompts montrés).
  Ne rien générer sans un oui explicite.
- [ ] **Step 2: générer** avec `create_image_pixflux` (vue de côté, flat shading, low detail, contour noir, coulures vertes, comme les
  obstacles ; 1 pixel PixelLab = 1 pixel d'art) : matière 64×64 béton fissuré sombre, motif répétable ; cible 32×32 vanne à volant claire et
  lumineuse ; tête 64×48 toupie de bétonnière ; plaque 32×16 tôle de blindage ; tourelle 24×16 buse à béton ; fond 180×120 silos et grue en
  silhouette sombre, répétable en largeur ; avant 48×160 chaîne de grue qui pend ; avant 128×96 grillage de chantier déchiré.
- [ ] **Step 3: retoucher** à `pixelart_workbench` : raccords de la matière et du fond (bords gauche/droit, haut/bas), assombrir matière,
  fond et premier plan pour que la cible reste la seule chose claire.
- [ ] **Step 4:** `node dev/tools/import-boss.js friche "../pixellab-boss/friche"` → 8 PNG écrits, `art.js` à jour ; focus `"bossSkin"` →
  PASS (le test des 7 rôles porte désormais sur `friche`).
- [ ] **Step 5: vérifier en jeu** (`preview_start {name:"flower-power"}`, boss forcé par JS comme pour la v5.5.0) : capture de la Bétonneuse
  en haut, au milieu et pendant un tir ; premier plan qui défile plus vite ; tir visible par-dessus. Envoyer les captures à l'utilisateur.
- [ ] **Step 6:** commit `feat: images de la Bétonneuse`.

### Task 5: Version 5.6.0

**Files:**
- Modify: `src/core/config.js` (version), `index.html` (titre), `dev/tests/state.test.js`, `CHANGELOG.md`, `docs/architecture.md`

- [ ] **Step 1:** version `'5.6.0'` (config, titre, `state.test.js`) ; entrée CHANGELOG v5.6.0 (habillage, secours sans images, nombre de
  tests réel) ; `architecture.md` : lignes `boss-skin.js`, `boss-depth.js`, `assets/boss/art.js`, ordre du dessin.
- [ ] **Step 2:** `node dev/run-checks.js` en arrière-plan → `N/N OK`, dont `bossfight` (le robot bat chaque boss).
- [ ] **Step 3:** vérification en jeu avec `?perf=1` au facteur d'étirement max : temps d'image du boss comparable à la v5.5.0 (relever
  les tranches `hazards` avant/après).
- [ ] **Step 4:** commit `feat: habillage des boss, Bétonneuse (v5.6.0)` ; demander à l'utilisateur la fusion et la mise en ligne.
