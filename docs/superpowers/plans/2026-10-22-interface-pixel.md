# Interface pixel « hippie contaminé » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer toute l'interface v3 (HTML du titre, HUD en police système, messages, fin de partie) par une interface en pixels d'art : police bitmap, logo « Flower Power » groovy qui dégouline, HUD minimal dans les coins du bas, cri de mort, certificat ÉcoCrédits™.

**Architecture:** Une toile `FP.view.ui` à demi-résolution (1 pixel d'art = `FP.px.SCALE` = 2 px CSS) est dessinée par `FP.ui.draw` puis agrandie sans lissage par `render/frame.js`, sans secousse ni zoom. Les modules `src/ui/*.js` (police, logo, titre, HUD, cri, certificat) n'écrivent que `state.fx.ui`. La simulation perd son système de messages (`FP.flow.say`).

**Tech Stack:** JavaScript vanilla (scripts classiques IIFE sur `window.FP`), Canvas 2D, aucun build ; tests `node dev/run-checks.js` (= `dev/check.html`).

**Spec:** `docs/superpowers/specs/2026-10-22-interface-pixel-design.md` (maquettes : `docs/art/maquette-titre.png`, `maquette-hud.png`, `maquette-certificat.png`).

## Global Constraints

- Le jeu marche en double-clic (file://) : aucune relecture de pixels (`getImageData`) dans `src/ui/*`, aucun fichier externe (police, image).
- Pixels d'art : `FP.px.SCALE` = 2 ; écran le plus étroit `FP.config.view.minW` = 300 px, soit 150 pixels d'art.
- Police : glyphes 5×7, majuscules seulement (texte mis en capitales avec `toLocaleUpperCase('fr-FR')`), contour 1 px encre `#1a0a12` + ombre 1 px bas-droite, aucune transparence partielle.
- Palette d'interface : crème `#fff6c8`, vert ÉcoCrédits™ `#cfff78`, or `#ffd166`, rose `#ff5fa0`, saumon `#ffb08a`, encre `#1a0a12`.
- Interface < 0,5 ms par frame (`?perf=1`, tranche « ui »).
- Fichiers `src/ui/*` : en-tête Lit / Écrit / Expose comme le reste du dépôt ; ils ne touchent pas au DOM au chargement (testables sous Node) ; ils n'écrivent que `state.fx.ui` (exception : `ui/menu.js`, § 5 de la spec).
- `AGENTS.md` : pas de code mort (ce qui est remplacé est supprimé) ; fichier > 400 lignes interdit ; commits ciblés ; `node dev/run-checks.js` vert avant chaque commit.
- Commits : auteur nicokbo@gmail.com, message terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Espace insécable fin** : `toLocaleString('fr-FR')` écrit « 12 450 » avec U+202F ; la police doit l'afficher comme une espace étroite (test en Task 1).
- **Très gros score** : « Ɇ9 999 999 » en ×2 ne doit pas chevaucher les graines sur un écran de 300 px (test en Task 2).
- **Écran le plus étroit (150 pixels d'art)** : cris, lignes du certificat, logo et ligne de pied y tiennent, en passant à la ligne si besoin (tests en Tasks 3, 4, 5).
- **Relance au clavier** : Espace/Entrée pendant l'animation du certificat est ignoré comme un appui (Task 5, garde dans les deux chemins de `ui/menu.js`).
- **Redimensionnement** pendant le titre ou le certificat : la toile `ui` suit (`render/view.js`), rien n'est coupé (vérification navigateur en Task 7).

---

### Task 1: Couche d'interface et police bitmap

**Files:**
- Create: `src/ui/font.js`, `src/ui/ui.js`, `dev/tests/font.test.js`
- Modify: `src/render/view.js` (toile `ui`), `src/render/frame.js` (dessin et agrandissement de `ui`), `src/debug/perf.js` (tranche `ui`), `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - `FP.font.has(ch: string) -> boolean`
  - `FP.font.measure(text: string, opts?: {scale?: 1|2}) -> number` — largeur en pixels d'art **sans** contour : somme des chasses + 1 px entre glyphes, × scale.
  - `FP.font.wrap(text: string, maxWidth: number, opts?: {scale?}) -> string[]` — retour à la ligne glouton sur les espaces ; un mot plus large que `maxWidth` reste seul sur sa ligne.
  - `FP.font.draw(g: CanvasRenderingContext2D, text: string, x: number, y: number, opts?: {color?: string, scale?: 1|2, align?: 'left'|'center'|'right', outline?: boolean}) -> number` — dessine (x, y = coin haut-gauche du glyphe après alignement), renvoie la largeur ; défauts `color '#fff6c8'`, `scale 1`, `align 'left'`, `outline true`.
  - `FP.font.HEIGHT = 7`, `FP.font.INK = '#1a0a12'`, `FP.font.COLORS = { cream, eco, gold, pink, danger }` (valeurs des Global Constraints).
  - `FP.view.ui = { canvas, ctx, w, h }` (toile avec transparence, `w = art.w`, `h = art.h`).
  - `FP.ui.draw(g, state)` — efface puis dessine l'interface ; dans cette tâche, appelle seulement l'ancien comportement (voir Step 6).
  - `FP.perf.stats.ui` (ms, moyenne glissante).

- [ ] **Step 1: Write the failing tests** — `dev/tests/font.test.js`

```js
FP.test('font: les textes de mort et de l’interface n’ont que des glyphes connus', () => {
  const t = FP.config.text, all = [...Object.values(t.death), t.deathDefault, t.deathLeak, t.deathToxic,
    t.ready, ...Object.values(t.shout), ...Object.values(t.help), t.again, ...t.footer, ...Object.values(t.certificate),
    '0123456789Ɇ×+-%', (1234567).toLocaleString('fr-FR')];
  for (const s of all) for (const ch of s.toLocaleUpperCase('fr-FR')) FP.assert(FP.font.has(ch), 'glyphe manquant : ' + JSON.stringify(ch) + ' dans ' + s);
});
FP.test('font: largeur = chasses + 1 px entre glyphes, ×2 double', () => {
  FP.assertEqual(FP.font.measure('A'), 5);
  FP.assertEqual(FP.font.measure('AA'), 11);
  FP.assertEqual(FP.font.measure('AA', { scale: 2 }), 22);
  FP.assert(FP.font.measure('I') < 5, 'I plus étroit');
  FP.assertEqual(FP.font.measure('a'), FP.font.measure('A'), 'minuscules affichées en capitales');
});
FP.test('font: espaces insécables (U+00A0, U+202F) étroites, glyphe inconnu → ?', () => {
  FP.assert(FP.font.has(' ') && FP.font.has(' '));
  FP.assert(FP.font.measure('1 2') < FP.font.measure('1 2') + 1);
  FP.assertEqual(FP.font.measure('§'), FP.font.measure('?'));
});
FP.test('font: retour à la ligne glouton sur les espaces', () => {
  const lines = FP.font.wrap('RUPTURE : TROTTINETTE FOSSILE', 80);
  FP.assert(lines.length >= 2);
  for (const l of lines) FP.assert(FP.font.measure(l) <= 80 || !l.includes(' '), l);
  FP.assertEqual(lines.join(' '), 'RUPTURE : TROTTINETTE FOSSILE');
});
```

Add to `src/core/config.js` `text` (needed by the test; exact copy):
```js
ready: 'TOUCHER POUR POUSSER',
shout: { leak: 'LIXIVIAT !', toxic: 'BRÛLÉE !' },
help: { hold: 'MAINTIENS POUR POUSSER', guide: 'GUIDE LA POINTE' },
again: 'TOUCHER POUR REPOUSSER',
footer: ['© 2026 ÉCOSOFT™', 'UNE FILIALE DE PÉTROFLORE'],
certificate: { title: 'CERTIFICAT', subtitle: 'D’ÉCO-RESPONSABILITÉ', flowers: 'FLEURS PLANTÉES', eco: 'ÉCOCRÉDITS™',
  stems: 'TIGES SACRIFIÉES', record: 'RECORD', beaten: 'BATTU', cause: 'CAUSE DU DÉCÈS :', stamp: 'VALIDÉ*', note: '* SOUS RÉSERVE' },
```
(`ready` remplace l'ancienne valeur `'TOUCHE POUR POUSSER'`.)

Load order in `dev/check.html`: `../src/ui/font.js` after `../src/render/mound.js`; `tests/font.test.js` after `tests/mound.test.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js`
Expected: FAIL — chargement de `../src/ui/font.js` introuvable, tests `font:` en échec.

- [ ] **Step 3: Implement `src/ui/font.js`**

Glyph table: `const GLYPHS = { 'A': ['.###.', '#...#', ...7 rangées], ... }` — chaque glyphe = 7 chaînes de même longueur (1 à 5) en `#`/`.`, dessinées à la main pour A-Z, À Â Ç É È Ê Ë Î Ï Ô Ù Û Ü, 0-9, `Ɇ ™ × % ! ? : ' ’ , . * + - / ( ) ©`, espace (largeur 3), U+00A0 et U+202F (largeur 2). Accents : la lettre de base est réduite à 5 rangées sous 2 rangées d'accent (même hauteur totale 7). `has(ch)` teste `GLYPHS[ch.toLocaleUpperCase('fr-FR')]`. Atlas : un canvas hors écran par clé `couleur|scale|outline`, créé paresseusement au premier `draw` (jamais au chargement, pour Node), contenant chaque glyphe dessiné à `fillRect` (contour = les 8 voisins en encre, ombre = décalage (1,1) en encre, puis la couleur) ; `draw` fait un `drawImage` par caractère depuis l'atlas.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js`
Expected: tous OK (234/234).

- [ ] **Step 5: Couche `ui`**

- `render/view.js` : créer `FP.view.ui` (canvas hors DOM, contexte `{ alpha: true }`), dimensionné comme `art` dans `resize()`, `imageSmoothingEnabled = false`. Mettre à jour l'en-tête (`Écrit`, `Expose`).
- `src/ui/ui.js` : `FP.ui = { draw }` ; `draw(g, state)` fait `g.clearRect(0, 0, FP.view.ui.w, FP.view.ui.h)` puis, pour cette tâche seulement, rien d'autre (les écrans arrivent aux tâches suivantes).
- `render/frame.js`, couche 3 : après `drawFinger` et avant `FP.hud.draw`, appeler `FP.ui.draw(FP.view.ui.ctx, state)` puis `ctx.drawImage(ui.canvas, 0, 0, ui.w * FP.px.SCALE, ui.h * FP.px.SCALE)` avec `imageSmoothingEnabled = false` ; mesurer la tranche avec `perf.mark('ui', t)`.
- `debug/perf.js` : `stats.ui = 0`, ligne d'affichage `' ui      '` sous `plant` (hauteur du cadre +12).
- `index.html` : `<script src="src/ui/font.js"></script>` et `<script src="src/ui/ui.js"></script>` juste avant `src/render/frame.js`.

- [ ] **Step 6: Verify in browser**

Lancer le serveur local (`node <scratchpad>/serve.js .` depuis la racine) et ouvrir `http://127.0.0.1:8765/index.html?perf=1` : le jeu se comporte comme avant, le cadre perf affiche une ligne `ui` (< 0,1 ms), aucune erreur console. Dessiner temporairement `FP.font.draw(g, 'ÉCOCRÉDITS™ Ɇ12 450', 4, 4)` dans `FP.ui.draw` pour vérifier le rendu par une capture, puis le retirer.

- [ ] **Step 7: Commit**

```bash
git add src/ui/font.js src/ui/ui.js dev/tests/font.test.js src/render/view.js src/render/frame.js src/debug/perf.js src/core/config.js index.html dev/check.html
git commit -m "feat(ui): couche d'interface en pixels d'art et police bitmap"
```

---

### Task 2: HUD dans les coins du bas

**Files:**
- Create: `src/ui/hud.js`, `dev/tests/hud.test.js`
- Delete: `src/render/hud.js`
- Modify: `src/ui/ui.js`, `src/render/frame.js` (retirer `FP.hud.draw(ctx, state)`), `src/core/config.js` (`plant.seeds: 3`), `src/core/state.js` (`reserves: FP.config.plant.seeds`), `index.html`, `dev/check.html`

**Interfaces:**
- Consumes: `FP.font.draw/measure/COLORS` (Task 1).
- Produces:
  - `FP.hud.items(state) -> { seeds: number, seedsMax: number, eco: number, pollen: number|null, combo: number|null, ready: boolean }` — `pollen` = `score.flowerBonus` si > 0 sinon `null` ; `combo` = `score.combo` si > 1 sinon `null` ; `ready` = `state.mode === 'ready'` ; `seedsMax` = `FP.config.plant.seeds`.
  - `FP.hud.draw(g, state)` — dessin dans la toile `ui` ; anime via `state.fx.ui.hud = { shownEco, lostAt: [] }`.
  - `FP.hud.MARGIN = 4` (pixels d'art depuis les bords).

- [ ] **Step 1: Write the failing tests** — `dev/tests/hud.test.js`

```js
const hudRun = () => { const s = FP.state.createRun(2, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('hud: pollen et combo n’apparaissent que lorsqu’ils sont actifs', () => {
  const s = hudRun();
  let it = FP.hud.items(s);
  FP.assertEqual(it.pollen, null); FP.assertEqual(it.combo, null);
  s.score.flowerBonus = 2; s.score.combo = 1;
  it = FP.hud.items(s); FP.assertEqual(it.pollen, 2); FP.assertEqual(it.combo, null);
  s.score.combo = 3; FP.assertEqual(FP.hud.items(s).combo, 3);
});
FP.test('hud: graines = réserves, sur le total de départ', () => {
  const s = hudRun(); s.plant.reserves = 2;
  const it = FP.hud.items(s);
  FP.assertEqual(it.seeds, 2); FP.assertEqual(it.seedsMax, 3);
});
FP.test('hud: un score énorme ×2 ne chevauche pas les graines sur l’écran le plus étroit', () => {
  const artW = FP.config.view.minW / FP.px.SCALE, seedsW = FP.config.plant.seeds * 8;
  const scoreW = FP.font.measure('Ɇ' + (9999999).toLocaleString('fr-FR'), { scale: 2 }) + 2;
  FP.assert(FP.hud.MARGIN + seedsW + 4 + scoreW + FP.hud.MARGIN <= artW, String(scoreW));
});
FP.test('hud: plus de nombre de fleurs ni d’élan', () => {
  const it = FP.hud.items(hudRun());
  FP.assert(!('flowers' in it) && !('elan' in it));
});
```

`dev/check.html` : `../src/ui/hud.js` après `../src/ui/font.js` ; `tests/hud.test.js` après `tests/font.test.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.hud` indéfini).

- [ ] **Step 3: Implement `src/ui/hud.js` and wire it**

Disposition (pixels d'art, toile `ui`), d'après `docs/art/maquette-hud.png` :
- graines en bas à gauche : icône 6×7 (ovale brun `FP.palette.seed.body`/`shade`/`light`, contour encre, pousse verte `#7fb04a` au-dessus), pas de 8 px, `y = h - MARGIN - 7` ; graines perdues dessinées vides (`#3a2a1e`). Quand `reserves` baisse, l'icône concernée se fend (trait encre vertical) puis s'éteint en 0,4 s (`lostAt`).
- score en bas à droite : `'Ɇ' + shownEco.toLocaleString('fr-FR')`, ×2, vert, aligné à droite ; `shownEco` rattrape `eco` en ~0,5 s (approche exponentielle, saut final quand l'écart < 1).
- pollen (si non nul) : fleur 6×6 rose + `'+' + n` rose ×1, au-dessus des graines ; apparition par un bond de 2 px sur 0,15 s.
- combo (si non nul) : `'COMBO ×' + n`, or ×1, au-dessus du score ; rebond de 1 px quand `n` change.
- `ready` : `FP.config.text.ready` crème ×1, centré, à `h - 34`, clignotant (visible quand `Math.floor(state.time * 2) % 2 === 0`).
- `FP.ui.draw` appelle `FP.hud.draw` dans les modes `playing`, `dying`, `bloom`, `ready`.
- Supprimer `src/render/hud.js`, sa ligne dans `index.html`, l'appel dans `frame.js` ; ajouter `<script src="src/ui/hud.js"></script>` avant `src/ui/ui.js`. Retirer `text.elanStep` de `config.js`. Ajouter `plant.seeds: 3` (commentaire : graines de départ) et l'utiliser dans `state.js`.
- Pendant cette tâche, le mode `over` n'a plus de panneau : c'est attendu, le certificat arrive en Task 5 (le jeu reste relançable par un appui).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 5: Verify in browser**

Capture en jeu (412×732) avec `score.flowerBonus = 2`, `score.combo = 3`, `reserves = 2` forcés : disposition conforme à `docs/art/maquette-hud.png`, chiffres nets, rien d'autre à l'écran ; puis perte d'une graine : l'icône se fend et s'éteint.

- [ ] **Step 6: Commit**

```bash
git add -A src/ui/hud.js src/render/hud.js dev/tests/hud.test.js src/ui/ui.js src/render/frame.js src/core/config.js src/core/state.js index.html dev/check.html
git commit -m "feat(ui): HUD pixel minimal dans les coins du bas"
```

---

### Task 3: Cri de mort, aide de première pousse, fin des messages texte

**Files:**
- Create: `src/ui/shout.js`, `dev/tests/shout.test.js`
- Modify: `src/play/flow.js`, `src/play/powerups.js`, `src/core/state.js`, `src/core/config.js`, `src/ui/ui.js`, `dev/tests/font.test.js`, `index.html`, `dev/check.html`

**Interfaces:**
- Consumes: `FP.font.draw/measure/wrap` (Task 1), `FP.hud.MARGIN` (Task 2).
- Produces:
  - `FP.shout.textFor(event: {type:'death', cause:'solid'|'leak'|'toxic', kind?: string}) -> string`
  - `FP.shout.helpFor(state) -> string|null`
  - `FP.shout.draw(g, state)` — lit les événements `death` de la frame, anime via `state.fx.ui.shout = { text, t0 }`.

- [ ] **Step 1: Write the failing tests** — `dev/tests/shout.test.js`

```js
FP.test('shout: cri court tiré de la cause, en capitales, avec « ! »', () => {
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'server' }), 'RACK SERVEUR !');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'scooter' }), 'TROTTINETTE FOSSILE !');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'solid', kind: 'inconnu' }), 'DÉCHET !');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'leak' }), 'LIXIVIAT !');
  FP.assertEqual(FP.shout.textFor({ type: 'death', cause: 'toxic' }), 'BRÛLÉE !');
});
FP.test('shout: chaque cri tient en 2 lignes ×2 sur l’écran le plus étroit', () => {
  const maxW = FP.config.view.minW / FP.px.SCALE - 8;
  const events = [...Object.keys(FP.config.text.death).map(kind => ({ type: 'death', cause: 'solid', kind })), { type: 'death', cause: 'leak' }, { type: 'death', cause: 'toxic' }];
  for (const e of events) {
    const lines = FP.font.wrap(FP.shout.textFor(e), maxW, { scale: 2 });
    FP.assert(lines.length <= 2, FP.shout.textFor(e));
    for (const l of lines) FP.assert(FP.font.measure(l, { scale: 2 }) <= maxW, l);
  }
});
FP.test('shout: aide seulement à la toute première pousse', () => {
  const s = FP.state.createRun(4, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s);
  s.input.down = false; FP.assertEqual(FP.shout.helpFor(s), FP.config.text.help.hold);
  s.input.down = true; FP.assertEqual(FP.shout.helpFor(s), FP.config.text.help.guide);
  s.plant.trail.length = 90; FP.assertEqual(FP.shout.helpFor(s), null);
  s.plant.trail.length = 10; s.plant.stemCount = 2; FP.assertEqual(FP.shout.helpFor(s), null);
});
FP.test('flow: plus de messages texte dans la simulation', () => {
  FP.assertEqual(FP.flow.say, undefined);
  const s = FP.state.createRun(4, { W: 440, H: 783 });
  FP.assert(!('message' in s.flow) && !('messageTimer' in s.flow));
});
```

Replace the first test of `dev/tests/font.test.js` by a recursive check over **all** of `FP.config.text` (every string value, nested objects and arrays included) plus `'0123456789Ɇ×+-%'` and `(1234567).toLocaleString('fr-FR')`.

`dev/check.html` : `../src/ui/shout.js` après `../src/ui/hud.js` ; `tests/shout.test.js` après `tests/hud.test.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.shout` indéfini, `FP.flow.say` défini, glyphes `{`, `}`, `·` manquants dans les anciens textes).

- [ ] **Step 3: Implement `src/ui/shout.js`**

- `textFor` : `solid` → la partie après `' : '` de `config.text.death[kind]` (sinon de `deathDefault`), en capitales, + `' !'` ; `leak`/`toxic` → `config.text.shout`.
- `helpFor` : `null` sauf si `mode === 'playing'`, `stemCount === 1`, `score.flowers === 0` et `trail.length < 90` ; alors `help.guide` si `input.down`, sinon `help.hold`.
- `draw` : sur un événement `death`, `fx.ui.shout = { text, t0: state.time }`. Rendu ×2 saumon, centré, à `h / 3`, lignes de `FP.font.wrap(text, w - 8, { scale: 2 })` ; chaque lettre tombe de 12 px avec un rebond (lettre i décalée de 0,03 s, 0,25 s de chute) ; visible 1,2 s, puis 0,3 s de disparition tramée (une ligne sur deux de pixels masquée par `clearRect` en damier, ou affichage une frame sur deux). Aide : crème ×1, centrée, à `h - 30`, au-dessus du HUD.
- `FP.ui.draw` appelle `FP.shout.draw` dans les modes `playing`, `dying`, `bloom`, `ready`, après le HUD. `index.html` : `src/ui/shout.js` avant `src/ui/ui.js`.

- [ ] **Step 4: Retirer les messages de la simulation**

- `play/flow.js` : supprimer `say`, son export (`FP.flow = { update, simplifyTrail }`), et tous ses appels (mort, `ready`, zone toxique — garder `recentToxic`/`messageCooldown` qui espacent l'événement `toxicEnter` —, `stemStart`, relances). Mettre à jour l'en-tête.
- `play/powerups.js` : supprimer les appels `FP.flow.say` (flyover, spore, ramassages, bouclier rompu) et les variables qui ne servent plus qu'à eux ; mettre à jour l'en-tête.
- `core/state.js` : retirer `message`, `messageTimer` de `flow` et `message` de `fx`.
- `core/config.js` : retirer `text.stem`, `seedsLeft`, `toxicEnter`, `corrupted`, `flyover`, `pickup`, `shieldBroken`, `shield`, `spore` ; `flow.stemMessageTime`, `deathMessageTime`, `readyMessageTime` ; `toxic.messageTime` ; `powerups.messageTime` ; `shield.messageTime`.
- Vérifier : `grep -rn "say(\|messageTimer\|flow.message\|messageTime" src dev` ne renvoie plus que `toxic.messageCooldown`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 6: Verify in browser**

Mort forcée contre un rack serveur : « RACK SERVEUR ! » tombe lettre par lettre au tiers de l'écran puis s'efface ; une graine se fend dans le HUD ; aucun autre texte. Première pousse : l'aide s'affiche puis disparaît après ~90 points de trace.

- [ ] **Step 7: Commit**

```bash
git add -A src/ui/shout.js dev/tests/shout.test.js dev/tests/font.test.js src/play/flow.js src/play/powerups.js src/core/state.js src/core/config.js src/ui/ui.js index.html dev/check.html
git commit -m "feat(ui): cri de mort et aide de première pousse ; fin des messages texte"
```

---

### Task 4: Logo et écran titre

**Files:**
- Create: `src/ui/logo.js`, `src/ui/title.js`, `dev/tests/logo.test.js`
- Modify: `src/ui/menu.js`, `src/ui/ui.js`, `index.html` (retirer le bloc `#menu`), `style.css` (retirer `.overlay`, `.panel`, `h1`, `p`, `.hint`, `.small`, `.legend`, `.pill`, la media query qui les vise et `@keyframes pulse`), `dev/check.html`

**Interfaces:**
- Consumes: `FP.font` (Task 1), `FP.palette.slug` (couleurs des coulures).
- Produces:
  - `FP.logo.layout() -> { width: number, height: number, letters: Array<{ch: string, x: number, y: number, w: number, h: number}>, trefoil: {cx: number, cy: number, r: number}, drips: Array<{x: number, y: number}> }` — en pixels d'art, origine au coin haut-gauche du logo ; `letters` = boîtes des **remplissages** (sans contours) des 10 lettres « Flower » puis « P », « w », « e », « r ».
  - `FP.logo.draw(g, x: number, y: number, t: number)` — coin haut-gauche ; base mise en cache au premier appel.
  - `FP.title.draw(g, state)`.

- [ ] **Step 1: Write the failing tests** — `dev/tests/logo.test.js`

```js
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
FP.test('logo: aucune lettre ne chevauche une autre', () => {
  const L = FP.logo.layout().letters;
  FP.assertEqual(L.map(l => l.ch).join(''), 'FlowerPwer');
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) FP.assert(!overlap(L[i], L[j]), L[i].ch + '/' + L[j].ch);
});
FP.test('logo: le trèfle radioactif a sa place entre P et w', () => {
  const { letters, trefoil: o } = FP.logo.layout(), P = letters[6], w = letters[7];
  const box = { x: o.cx - o.r, y: o.cy - o.r, w: 2 * o.r, h: 2 * o.r };
  FP.assert(!overlap(box, P) && !overlap(box, w));
  FP.assert(box.x >= P.x + P.w && box.x + box.w <= w.x);
});
FP.test('logo: tient dans 90 % de l’écran le plus étroit', () => {
  FP.assert(FP.logo.layout().width <= .9 * FP.config.view.minW / FP.px.SCALE);
});
FP.test('logo: les coulures de FLOWER ne touchent pas POWER', () => {
  const { letters, drips } = FP.logo.layout(), top = Math.min(...letters.slice(6).map(l => l.y));
  const flowerBottom = Math.max(...letters.slice(0, 6).map(l => l.y + l.h));
  for (const d of drips.filter(d => d.y < top)) FP.assert(d.y + 8 < top, 'coulure trop longue à x=' + d.x);
  FP.assert(flowerBottom < top);
});
```

`dev/check.html` : `../src/ui/logo.js` et `../src/ui/title.js` après `../src/ui/shout.js` ; `tests/logo.test.js` après `tests/shout.test.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.logo` indéfini).

- [ ] **Step 3: Implement `src/ui/logo.js`**

- Matrices dessinées à la main (`#`/`.`), style « Shrikhand » de `docs/art/maquette-titre.png` : F, l, o, w, e, r (FLOWER, hauteur des capitales 18 px, minuscules 13 px) et P, w, e, r (POWER, capitales 20 px, minuscules 15 px). Les deux mots sont centrés, chacun légèrement penché par lettres (décalage vertical ±1 px alterné, inscrit dans la matrice — pas de rotation à l'exécution).
- Contours : anneaux par dilatation en disque des remplissages, rayons 1 (orange `#ffa94d`), 2 (rose `#ff5fa0`), 3 (encre `#3a1430`), dessinés du plus large au plus fin ; remplissage par rangées de `#fff7ad` (haut) à `#ffd166` (bas). Espacement : 2 px entre boîtes de remplissage ; interligne pour que POWER commence 12 px sous le bas de FLOWER.
- Trèfle : disque `r` = demi-hauteur des minuscules de POWER, jaune `#ffd166`, cerclé orange puis rose puis encre (comme les lettres), trois pales encre (secteurs de ±0,5 rad à −90°, 30°, 150°) et moyeu ; rotation lente (`t * .4` rad) redessinée à chaque frame. Place réservée = diamètre + 2 × 3 (anneaux) + 3.
- Coulures (`drips`) : 5 sous FLOWER, 6 sous POWER, aux colonnes choisies dans les matrices ; filet `FP.palette.slug.body` avec bord `slug.shade`, goutte au bout qui gonfle (0,8 s), tombe de 6 px et disparaît, période 1,6 à 2,4 s décalée par coulure ; reflet `slug.clear`.
- Rebond : chaque lettre monte d'1 px pendant une demi-période de 1,2 s, déphasée de 0,15 s par lettre ; la base (lettres + anneaux, sans rebond) est mise en cache dans un canvas hors écran au premier `draw`, et les lettres sont recopiées depuis ce cache avec leur décalage.

- [ ] **Step 4: Implement `src/ui/title.js` and the menu**

- `title.draw` : logo centré horizontalement, haut du logo à `round(h * .3)` ; `FP.config.text.ready` crème ×1 centré à `h - 46`, visible quand `Math.floor(state.time * 1.8) % 2 === 0` ; `text.footer[0]` puis `[1]` en `#c9a87a` ×1 centrés à `h - 20` et `h - 11`.
- `FP.ui.draw` : mode `menu` → `FP.title.draw`.
- `ui/menu.js` : supprimer `document.getElementById('menu')` et tout affichage HTML ; à la création du run de titre (chargement et redimensionnement au menu), poser `state.camera.y = 0` (le titre montre le ciel et la pelouse). En-tête mis à jour (`Lit` sans `#menu`).
- `index.html` : supprimer le bloc `<div class="overlay" id="menu">…</div>` ; scripts `src/ui/logo.js`, `src/ui/title.js` avant `src/ui/ui.js`. `style.css` : retirer les règles listées dans **Files**.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 6: Verify in browser**

Captures à 412×732 et 300×533 : logo lisible et conforme à `docs/art/maquette-titre.png` (lettres détachées, « O » radioactif qui tourne, gouttes qui tombent), consigne qui clignote, ligne de pied sur deux lignes ; un appui démarre la partie. Perf : `ui` < 0,5 ms au titre.

- [ ] **Step 7: Commit**

```bash
git add -A src/ui/logo.js src/ui/title.js dev/tests/logo.test.js src/ui/menu.js src/ui/ui.js index.html style.css dev/check.html
git commit -m "feat(ui): logo « Flower Power » groovy radioactif et écran titre"
```

---

### Task 5: Certificat de fin

**Files:**
- Create: `src/ui/certificate.js`, `dev/tests/certificate.test.js`
- Modify: `src/ui/menu.js` (record d'avant-partie, garde de relance), `src/ui/ui.js`, `index.html`, `dev/check.html`

**Interfaces:**
- Consumes: `FP.font` (Task 1), `FP.config.text.certificate`, `FP.config.text.again` (Task 1), `state.flow.overReason`, `state.score.recordBefore` (posé ici par `ui/menu.js`).
- Produces:
  - `FP.certificate.lines(state) -> { title: string, subtitle: string, rows: Array<{label: string, value: string, beaten?: boolean}>, cause: string, note: string, stamp: string }`
  - `FP.certificate.canRestart(state) -> boolean` — vrai seulement si `state.fx.ui.overAt` est posé et `state.time - overAt >= FP.certificate.READY_AT`.
  - `FP.certificate.READY_AT = 1.9` (s : voile .3 + feuille .35 + lignes .15 × 6 + tampon .35).
  - `FP.certificate.MARGIN = 10` (feuille ↔ bord de l'écran) et `FP.certificate.PADDING = 4` (texte ↔ bord de la feuille), en pixels d'art.
  - `FP.certificate.draw(g, state)` — pose `state.fx.ui.overAt` au premier dessin du mode `over`.

- [ ] **Step 1: Write the failing tests** — `dev/tests/certificate.test.js`

```js
const overRun = () => { const s = FP.state.createRun(6, { W: 440, H: 783 }); s.mode = 'over';
  s.score.flowers = 7; s.score.eco = 12450; s.plant.stemCount = 3; s.flow.overReason = 'rupture : rack serveur'; return s; };
FP.test('certificat: valeurs et record battu', () => {
  const s = overRun(); s.score.recordBefore = { flowers: 5, eco: 20000 };
  const c = FP.certificate.lines(s), t = FP.config.text.certificate;
  FP.assertEqual(c.rows[0].label, t.flowers); FP.assertEqual(c.rows[0].value, '7');
  FP.assertEqual(c.rows[1].value, 'Ɇ' + (12450).toLocaleString('fr-FR'));
  FP.assertEqual(c.rows[2].label, t.stems); FP.assertEqual(c.rows[2].value, '3');
  FP.assertEqual(c.rows[3].value, t.beaten); FP.assert(c.rows[3].beaten);
  FP.assertEqual(c.cause, 'RUPTURE : RACK SERVEUR');
});
FP.test('certificat: record non battu → record à battre sur deux lignes', () => {
  const s = overRun(); s.score.recordBefore = { flowers: 9, eco: 99000 };
  const r = FP.certificate.lines(s).rows;
  FP.assert(!r[3].beaten);
  FP.assertEqual(r[3].value, '9 FLEURS'); FP.assertEqual(r[4].label, ''); FP.assertEqual(r[4].value, 'Ɇ' + (99000).toLocaleString('fr-FR'));
});
FP.test('certificat: sans record d’avant-partie, tout score > 0 bat le record', () => {
  FP.assert(FP.certificate.lines(overRun()).rows[3].beaten);
});
FP.test('certificat: chaque ligne tient sur la feuille de l’écran le plus étroit', () => {
  const s = overRun(); s.score.eco = 999999; s.plant.stemCount = 99; s.score.recordBefore = { flowers: 99, eco: 999999 };
  const paper = FP.config.view.minW / FP.px.SCALE - 2 * FP.certificate.MARGIN - 2 * FP.certificate.PADDING;
  for (const r of FP.certificate.lines(s).rows) FP.assert(FP.font.measure(r.label) + 6 + FP.font.measure(r.value) <= paper, r.label + ' ' + r.value);
});
FP.test('certificat: relance refusée avant le tampon, acceptée après', () => {
  const s = overRun(); s.fx.ui = {};
  FP.assert(!FP.certificate.canRestart(s));
  s.fx.ui.overAt = s.time - .5; FP.assert(!FP.certificate.canRestart(s));
  s.fx.ui.overAt = s.time - FP.certificate.READY_AT; FP.assert(FP.certificate.canRestart(s));
});
```

`dev/check.html` : `../src/ui/certificate.js` après `../src/ui/title.js` ; `tests/certificate.test.js` après `tests/logo.test.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.certificate` indéfini).

- [ ] **Step 3: Implement `src/ui/certificate.js`**

- `lines` : rows dans l'ordre fleurs, ÉcoCrédits™, tiges, record (+ ligne 5 `{label: '', value: 'Ɇ…'}` si non battu) ; `beaten` = `flowers > rb.flowers || eco > rb.eco` avec `rb = recordBefore || { flowers: 0, eco: 0 }` ; valeurs numériques en `toLocaleString('fr-FR')` ; `cause` = `overReason` en capitales.
- `draw`, d'après `docs/art/maquette-certificat.png` : voile tramé encre (damier qui se remplit en 0,3 s) ; feuille centrée (marges `MARGIN`, texte à `PADDING` du bord, hauteur selon contenu), papier `#efe6c8`, bandeau `#d8ccaa`, liserés `#7ed636`, qui monte du bas en 0,35 s ; titre ×2 et sous-titre ×1 en `#2a3a1c` ; lignes libellé `#5a4a3a` à gauche / valeur `#2a3a1c` à droite (`BATTU` en `#c0392b`), révélées une à une toutes les 0,15 s ; cause sur une ou deux lignes (`FP.font.wrap`) ; tampon : rectangle rouge `#c0392b` de 2 px, incliné −0,25 rad, texte `stamp`, qui s'abat de ×2 à ×1 en 0,12 s avec une secousse de 2 px de la feuille ; `note` en petit ; police sans contour sur le papier (`outline: false`). Après `READY_AT` : `FP.config.text.again` crème ×1 clignotant sous la feuille.
- `FP.ui.draw` : mode `over` → `FP.certificate.draw` (pas de HUD).
- `ui/menu.js` : à `startRun`, `state.score.recordBefore = { ...FP.scoring.records }` ; dans les deux chemins (appui et Espace/Entrée), en mode `over`, ne relancer que si `FP.certificate.canRestart(state)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 5: Verify in browser**

Fin de partie forcée (3 morts) : voile, feuille, lignes, tampon dans l'ordre ; un appui et Espace pendant l'animation ne relancent pas ; « TOUCHER POUR REPOUSSER » apparaît ensuite et relance. Captures avant/après tampon, à 412 et 300 px de large.

- [ ] **Step 6: Commit**

```bash
git add src/ui/certificate.js dev/tests/certificate.test.js src/ui/menu.js src/ui/ui.js index.html dev/check.html
git commit -m "feat(ui): certificat d'éco-responsabilité en fin de partie"
```

---

### Task 6: « +Ɇ » et doigt en pixels

**Files:**
- Modify: `src/render/effects.js` (`drawEco`, `drawLabels`), `src/render/plant.js` (`drawFinger`), `src/render/frame.js`, `src/ui/ui.js`

**Interfaces:**
- Consumes: `FP.font.draw` (Task 1), `FP.view.ui` (Task 1).
- Produces: `FP.plantRender.drawFinger(g, state)` dessine désormais dans la toile `ui` (pixels d'art) ; `FP.effects.drawLabels(ctx, state)` garde sa signature.

- [ ] **Step 1: Implement**

- `effects.js` `drawEco` : dans le repère monde existant, `ctx.scale(FP.px.SCALE, FP.px.SCALE)` puis `FP.font.draw(ctx, '+' + montant + 'Ɇ', x / SCALE, y / SCALE, { scale, color: '#cfff78', align: 'center' })` avec coordonnées arrondies, `scale` = 3 pendant le pop (k < .16) puis 2 ; multiplicateur de combo (`×n`) en or ×1 dessous ; plus de rotation ni d'`globalAlpha` : dans les 40 % finaux de la vie, visible une frame sur deux (`Math.floor(t * 30) % 2 === 0`). Retirer `FONT` s'il ne sert plus.
- `plant.js` `drawFinger(g, state)` : coordonnées `toArt(i.screenX)`, `toArt(i.y)` ; anneau de rayon 11 (±1 px pulsé) en pixels, couleur `#fff0ad`, plein si `input.down`, sinon un pixel sur trois (motif fixe) ; même condition d'affichage qu'aujourd'hui.
- `frame.js` : retirer l'appel `drawFinger(ctx, state)` ; `FP.ui.draw` l'appelle en mode `playing`, avant le HUD.

- [ ] **Step 2: Run tests**

Run: `node dev/run-checks.js` — Expected: tous OK (aucun test ne dépend de ces dessins).

- [ ] **Step 3: Verify in browser**

Frôlement forcé : les « +Ɇ » s'affichent en police pixel, nets, avec le zoom de la caméra, et clignotent en disparaissant ; le doigt est un anneau pixel sous le pointeur.

- [ ] **Step 4: Commit**

```bash
git add src/render/effects.js src/render/plant.js src/render/frame.js src/ui/ui.js
git commit -m "feat(ui): gains « +Ɇ » et doigt en pixels d'art"
```

---

### Task 7: Version 4.2.0, documentation, vérification complète

**Files:**
- Modify: `src/core/config.js` (`version: '4.2.0'`), `index.html` (`<title>Flower Power v4.2.0</title>`), `CHANGELOG.md`, `docs/architecture.md`

- [ ] **Step 1: Documentation**

- `CHANGELOG.md` : entrée `## v4.2.0 — Interface pixel « hippie contaminé »` résumant titre, HUD, cri, certificat, police, fin des messages texte, et le nombre de tests.
- `docs/architecture.md` : liste de chargement de `index.html` (ui/* ajoutés, `render/hud.js` retiré), section sur la couche `FP.view.ui` et `state.fx.ui`, exceptions d'écriture de `ui/menu.js` (`camera.y` au titre, `score.recordBefore`), fichiers `ui/*` chargés par `check.html`.

- [ ] **Step 2: Vérifications automatiques**

Run: `node dev/run-checks.js` — Expected: tous OK.
Run: `grep -rn "getImageData" src/ui` — Expected: aucune ligne.
Run: `grep -rn "flow.say\|messageTimer\|render/hud" src index.html dev` — Expected: aucune ligne.

- [ ] **Step 3: Vérification en jeu**

Partie complète au serveur local (`?perf=1`) : titre → pousses → éclosion → morts → certificat → relance. `ui` < 0,5 ms en jeu. Redimensionner la fenêtre au titre puis pendant le certificat : rien n'est coupé, le texte reste net. Captures envoyées à l'utilisateur (titre, HUD avec pollen et combo, cri de mort, certificat). Double-clic sur `index.html` (file://) : demander à l'utilisateur de vérifier.

- [ ] **Step 4: Commit et push**

```bash
git add src/core/config.js index.html CHANGELOG.md docs/architecture.md
git commit -m "docs: v4.2.0 — interface pixel « hippie contaminé »"
git push -u origin interface
```
