# Visages mutants — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque pousse reçoit un des 16 personnages débiles (pioche sans remise), dessiné en gros yeux / grandes bouches avec les humeurs de danger par-dessus, et ses fleurs en sont les clones épanouis.

**Architecture:** `render/faces.js` porte les briques communes (yeux et bouches par humeur) ; `render/cast.js` + `render/cast2.js` déclarent les 16 personnages en couches (`back`, `eyes`, `mouth`, `front`, `flower`) ; `hero.js` compose tête + couches (`FP.hero.paint`) ; la pioche vit dans `play/plant.js` avec son propre générateur ; `flow.js` copie le personnage sur les fleurs.

**Tech Stack:** JavaScript vanilla (IIFE sur `window.FP`), Canvas 2D par `FP.px`, banc `node dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-22-visages-mutants-design.md` ; maquettes `docs/art/maquette-visages-1-7.html`, `docs/art/maquette-visages-8-16.html` (le dessin de chaque personnage s'en recopie).

## Global Constraints

- Jeu en double-clic (file://) : aucun fichier image ajouté, pas de `getImageData`.
- `index.html` : seulement l'ajout de balises `<script>` (et `dev/check.html` pareil).
- Fichiers < 400 lignes ; en-tête de module (Lit / Écrit / Expose) tenu à jour ; pas de code mort.
- Dessin uniquement par `FP.px` (pixels entiers) ; couleurs dans `render/palette.js` ; aucune teinte de `FP.palette.danger` (violet chimique) dans les personnages.
- Boîte de dessin : tout pixel d'une tête (personnage, humeur, clignement) et de tout visage fleur reste dans x ∈ [−12, 12], y ∈ [−12, 12] autour du centre.
- Rayons de collision et `state.rng` inchangés : aucun effet sur le gameplay.
- Version `4.4.0`, entrée CHANGELOG ; commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Mort puis écran de fin : la tête morte garde le personnage de la pousse (le personnage ne change qu'au `launch`) — test Task 1.
2. Nouvelle partie : la pioche repart de zéro avec la graine de la nouvelle partie — test Task 1.
3. Toxique : les paupières (clignement, concentration, hippie) prennent la peau verdâtre, pas la verte — test Task 2.
4. Gros visage sur la mèche et la membrane du bouclier : vérification visuelle en jeu (Task 6, étape navigateur).
5. Fleur de petite taille (`maxSize` < .95) : même visage, tient dans le cache — test existant `extent ≤ CACHE_TOP` sur 400 fleurs (Task 5).

---

### Task 1: La pioche des personnages

**Files:**
- Modify: `src/core/config.js` (bloc `cast`), `src/core/state.js` (champs de `plant`), `src/play/plant.js` (`launch`), `src/play/flow.js` (`plantFlowers`)
- Test: `dev/tests/plant.test.js`, `dev/tests/flow.test.js`

**Interfaces:**
- Produces: `FP.config.cast = { ids: ['hippie','lapin','cyclope','binoclard','langue','antennes','punk','pendouille','depareille','unedent','patate','gourou','champi','coquille','gobemouche','groucho'], salt: 0x9e3779b9 }` ; `state.plant.cast: string[]` (file restante), `state.plant.castRng` (`FP.createRng((seed ^ salt) >>> 0)`), `state.plant.character: string|null` ; chaque fleur `{ ..., character }`.

- [ ] **Step 1: Tests qui échouent** (dans `plant.test.js`, partie créée par `FP.state.createRun(seed, { W: 440, H: 783 })` + `FP.level.startRun`)
  - `plant: 16 pousses, 16 personnages distincts` — 16 × (`prepare` + `launch`) ; `new Set(chars).size === 16` et chaque id ∈ `FP.config.cast.ids`.
  - `plant: la 17e pousse remélange la pioche` — après 16 lancements `p.cast.length === 0` ; au 17e, `p.character` ∈ ids et `p.cast.length === 15`.
  - `plant: même graine, même ordre ; autre graine, autre ordre` — ordres des 16 égaux pour la graine 3 deux fois, différents entre graines 3 et 4.
  - `plant: la pioche ne consomme pas state.rng` — on enveloppe `s.rng.next` d'un compteur : le 1er `launch` (avec mélange) et le 2e (sans) consomment le même nombre de tirages.
  - `plant: le personnage ne change qu’au lancement` — après `launch`, `prepare` puis mode `over` : `p.character` inchangé.
  - Dans `flow.test.js` : `flow: toutes les fleurs d’une éclosion portent le personnage de la pousse` — `score.flowerBonus = 2`, éclosion (comme les tests de fleurs existants) → 3 fleurs, toutes `character === s.plant.character`.
- [ ] **Step 2:** `node dev/run-checks.js` → ces 6 tests ✘ (`cast` undefined).
- [ ] **Step 3: Implémenter.** `createRun` : `cast: [], castRng: FP.createRng((s ^ FP.config.cast.salt) >>> 0), character: null`. `launch` : si `p.cast` vide → copie de `ids` mélangée (Fisher-Yates avec `p.castRng.next()`) ; `p.character = p.cast.shift()`. `plantFlowers` : `character: state.plant.character`. En-têtes Lit/Écrit à jour.
- [ ] **Step 4:** `node dev/run-checks.js` → tout ✔ (294 + 6).
- [ ] **Step 5: Commit** `feat: pioche des personnages par pousse, fleurs clones`.

### Task 2: Briques de visage communes (`faces.js`)

**Files:**
- Create: `src/render/faces.js`
- Modify: `src/render/palette.js` (`FP.palette.cast` : couleurs des personnages), `index.html` et `dev/check.html` (script avant `hero.js`)
- Test: `dev/tests/faces.test.js` (chargé après `px.test.js`, réutilise son `fakeCtx`)

**Interfaces:**
- Consumes: `FP.px`, `FP.palette.hero`.
- Produces: `FP.faces = { EY: -3, EX: [-3, 3], MOODS: ['calm','focus','graze','alarm','toxic','shield','dead'], ball(g,x,y,r=2), pupil(g,x,y,w=2,h=2), cross(g,x,y), lid(g,x,y,n,skin), eyes(g,ax,ay,mood,o), mouth(g,ax,ay,mood,o), sweat(g,ax,ay) }` ; `o = { gaze:{x,y}, blink, dizzy, t, cause:'solid'|'melt', skin }` (`skin` = peau à utiliser pour les paupières). Coordonnées relatives au centre de tête (ax, ay). `ball` = contour r+1 + blanc r. Dessin conforme au tableau des humeurs de la spec § 3 et à la planche v2 (calme : pupilles décalées d'1 px selon `gaze` ; alerte : `ball` r 3 centré EY−1, pupille 1 × 1 ; frôlement : chevrons de 2 px ; mort fonte : yeux tombants et bouche qui coule ; bouclier : paupières mi-closes + sourire en coin ; clignement : `lid` plein sur les deux yeux, sauf en alerte et mort).
- `FP.palette.cast` : `{ band, bandDot, red, glow, crest, crestLight, metal, drool, frame, glass, nose, noseLight, stache, tint, shroom, shroomDot, stalk, shell, shellLight, shellDark, fly, groucho }` aux valeurs des planches, sauf `tint` (verres du gourou) = `'#c87a2a'` (ambre, pas de violet).

- [ ] **Step 1: Tests qui échouent**
  - `faces: chaque humeur reste dans la boîte` — pour chaque humeur × `blink` ∈ {false,true} × (`dead` : cause solid et melt ; `toxic` : dizzy vrai/faux), `eyes` + `mouth` sur `fakeCtx` en (0,0) : toutes les clés ∈ [−12,12]².
  - `faces: alerte et mort se distinguent du calme` — ensembles de pixels (clé + couleur) différents.
  - `faces: la paupière prend la peau donnée` — `eyes(.., 'focus', { skin: '#123456' })` écrit au moins un pixel `#123456`.
  - `faces: aucune couleur de danger` — aucune valeur de `FP.palette.cast` dans `FP.palette.danger`.
- [ ] **Step 2:** `node dev/run-checks.js` → ✘ (`FP.faces` undefined).
- [ ] **Step 3: Implémenter `src/render/faces.js`** (IIFE, en-tête Lit/Écrit/Expose, la logique des planches portée sur `FP.px.rect`/`FP.px.disc`).
- [ ] **Step 4:** ✔ tout le banc.
- [ ] **Step 5: Commit** `feat: briques de visage gros yeux / grandes bouches`.

### Task 3: Tête composée et 8 premiers personnages

**Files:**
- Create: `src/render/cast.js` (registre + personnages 1 à 8 : hippie, lapin, cyclope, binoclard, langue, antennes, punk, pendouille)
- Modify: `src/render/hero.js` (tête 15 px, `paint`, `draw` ; suppression de `face`), `index.html`, `dev/check.html` (cast.js après faces.js, avant hero.js)
- Test: `dev/tests/hero.test.js`

**Interfaces:**
- Consumes: `FP.faces`, `FP.palette.cast`, `state.plant.character` (Task 1).
- Produces: `FP.cast = { define(def), get(id) }` ; `def = { id, tip?: boolean (défaut true), back?, eyes?, mouth?, front?, flower }`, couches `(g, ax, ay, mood, o)`, `flower(g, ax, ay, heart)` ; `mouth` du personnage appelée seulement si `mood` ∈ {calm, focus}, sinon `FP.faces.mouth`. `FP.hero.paint(g, ax, ay, id, mood, o)` : tête (disque contour r 7, peau r 6, verdâtre si `mood === 'toxic'`, pointe si `tip !== false`), `back`, yeux (`def.eyes` ou `FP.faces.eyes`), bouche, `front`, sueur si `o.sweat`. `FP.hero.draw(g, state, ax, ay, dir)` appelle `paint` avec `state.plant.character`. `FP.hero` exporte `{ mood, draw, paint }`.

- [ ] **Step 1: Tests qui échouent** (dans `hero.test.js`)
  - `hero: chaque personnage défini reste dans la boîte` — pour chaque id de `FP.config.cast.ids` tel que `FP.cast.get(id)` existe, chaque humeur de `FP.faces.MOODS` (mêmes déclinaisons que Task 2) × blink : `paint` sur `fakeCtx` en (0,0), pixels ∈ [−12,12]².
  - `hero: chez chaque personnage, alerte et mort se distinguent du calme`.
  - `hero: la bouche spéciale ne sort qu’au calme et en concentration` — on remplace temporairement `FP.cast.get('lapin').mouth` par un espion compteur : `paint` en calm et focus → 2 appels ; en graze, alarm, toxic, shield, dead → 0 appel de plus ; puis on restaure.
  - `hero: 8 premiers personnages définis` — `FP.cast.get(id)` existe pour les 8 ids et chacun a `flower`.
- [ ] **Step 2:** ✘ (`FP.cast` undefined).
- [ ] **Step 3: Implémenter** `cast.js` (dessins recopiés des planches ; champignon et crête retouchés pour tenir dans la boîte) et `hero.js`.
- [ ] **Step 4:** ✔ tout le banc (les tests d'humeur existants inchangés).
- [ ] **Step 5: Commit** `feat: tête composée et huit premiers personnages`.

### Task 4: Les 8 autres personnages

**Files:**
- Create: `src/render/cast2.js` (depareille, unedent, patate, gourou, champi, coquille, gobemouche, groucho) ; scripts après `cast.js` dans `index.html` et `dev/check.html`
- Test: `dev/tests/hero.test.js`

**Interfaces:** Consumes `FP.cast.define`, `FP.faces`, `FP.palette.cast`.

- [ ] **Step 1: Test qui échoue** — `hero: le casting est complet` : les 16 ids de `FP.config.cast.ids` ont une définition avec `flower`, et aucune définition hors liste. (Les tests de boîte et de lisibilité de Task 3 couvrent alors les 16.)
- [ ] **Step 2:** ✘ (8 manquants).
- [ ] **Step 3: Implémenter** `cast2.js` d'après la planche 8-16 (Groucho : sourcils qui montent en alerte, se froncent en concentration).
- [ ] **Step 4:** ✔ tout le banc.
- [ ] **Step 5: Commit** `feat: huit personnages de plus (casting complet)`.

### Task 5: Fleurs clones

**Files:**
- Modify: `src/render/flowers.js` (cœur r 6 + contour r 7, visage `FP.cast.get(f.character).flower(g, tx, ty, pal.heart)` ; suppression de `FACES`, du champ `face` de `variant`, du visage `joy` ; `extent` : `len + max(dist + pr + (pointy ? 3 : 1), 12)`)
- Test: `dev/tests/flowers.test.js`

**Interfaces:** Consumes `FP.cast.get(id).flower` (Tasks 3-4), `flower.character` (Task 1).

- [ ] **Step 1: Tests**
  - Remplacer `valeurs dans leurs bornes ; langue rare` par `valeurs dans leurs bornes ; plus de visage dans la variante` (`!('face' in v)`).
  - `flowers: chaque visage fleur reste dans la boîte` — pour les 16 ids, `flower(fakeCtx, 0, 0, '#e8b860')` ∈ [−12,12]².
  - `gardenOf` et la boucle du test de cache reçoivent `character: FP.config.cast.ids[i % 16]`.
- [ ] **Step 2:** ✘ (`face` encore présent).
- [ ] **Step 3: Implémenter.**
- [ ] **Step 4:** ✔ tout le banc, dont `extent ≤ CACHE_TOP` sur 400 fleurs.
- [ ] **Step 5: Commit** `feat: les fleurs portent le visage de leur pousse`.

### Task 6: Nettoyage, version, vérification en jeu

**Files:**
- Modify: `src/render/palette.js` (retirer de `FP.palette.hero` les couleurs devenues inutilisées, ex. `blush`, après `grep`), `src/core/config.js` (`version: '4.4.0'`), `CHANGELOG.md`, `docs/architecture.md` (faces, cast, pioche)

- [ ] **Step 1:** `grep -rn "hero.face\|'joy'\|'sleepy'\|blush" src dev` → plus aucune référence morte ; retirer les entrées de palette orphelines.
- [ ] **Step 2:** CHANGELOG `## v4.4.0 — Visages mutants` (16 personnages, pioche sans remise, fleurs clones, gros yeux ; banc : N tests) ; architecture à jour.
- [ ] **Step 3:** `node dev/run-checks.js` → tout ✔ ; fichiers < 400 lignes (`wc -l src/render/*.js`).
- [ ] **Step 4: Navigateur** (serveur statique 127.0.0.1:8765, `?seed=3`) : jouer 3 pousses ; capture tête calme, frôlement, mort, et parterre ; vérifier mèche et membrane du bouclier sous la tête ; `?perf=1` sans hausse notable.
- [ ] **Step 5: Commit** `chore: v4.4.0 visages mutants`.
