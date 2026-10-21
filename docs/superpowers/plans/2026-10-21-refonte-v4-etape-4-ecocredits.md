# Refonte v4 — Étape 4 : frôlement, ÉcoCrédits™ et records — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ramener le cœur satirique du score : frôler un obstacle ou une limace sans la toucher accumule un frôlement qui, à sa fin, paie des ÉcoCrédits™ (avec combo), affichés en chiffre qui claque ; records de fleurs et d'ÉcoCrédits™ sauvegardés ; HUD complet de la v3.

**Architecture:** `world/collision.js` liste chaque frôlement en cours (`query.grazes`). Nouveau système `play/graze.js` : suit un frôlement par objet dans `state.graze.active` (Map objet → frôlement), paie à la sortie, annule sur contact. Nouveau `play/scoring.js` : combo, gains, records persistants. Rendu : `render/effects.js` (chiffres +Ɇ, nés des événements `eco`), anneaux de frôlement, HUD complet, écran de fin avec records.

**Tech Stack:** JavaScript natif sur `window.FP`, Canvas 2D, `localStorage` via `FP.storage`.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§7 : ÉcoCrédits™, combos, records, clé `flower_power_v4_best` ; §11 étape 4).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes rôle / lit / écrit / expose complets.
- La simulation écrit, le rendu lit (exception documentée : `state.fx`, réservé au rendu) ; tous les réglages dans `config.js`.
- Constantes et formules de gain fidèles à la v3.43.16.
- Une seule clé de stockage : `flower_power_v4_best` (JSON `{ flowers, eco }`).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Pas d'étiquette satirique tirée au sort** : en v3, `ecoLabel` consommait un tirage mais le chiffre s'affichait seul (« pas d'étiquette, juste un chiffre qui claque »). Non porté.
- **Pas de `activeGrazeGlow`** : calculé en v3 mais jamais dessiné. Non porté.
- **Le frôlement ne garde que ce dont l'étape 4 a besoin** (`time, score, peak, lastX, lastY, kind, mul`) ; les mesures de flyover (`relY`, `path`, `effectiveTime`…) arrivent à l'étape 5 avec leur usage.
- **Flyover → power-up** : étape 5. Le drone sonore du frôlement : étape 7 (il pourra lire `state.graze.active`).
- **Records** : `FP.scoring.records` est chargé une fois au démarrage (comme `best`/`bestEco` en v3) et sauvegardé dès qu'il est battu. C'est un état persistant entre les runs, hors de `FP.state` : exception documentée dans l'architecture.
- **Effets visuels** : `render/effects.js` lit les événements `eco` de la frame et range ses chiffres flottants dans `state.fx.effects` (horodatés avec `state.time`) ; l'aléatoire purement visuel (dérive, rotation) utilise `Math.random`.

## Review Focus

1. **Contact pendant un frôlement** : aucun gain (annulation sans paiement), y compris pour les autres frôlements en cours → test `graze: contact annule tout sans payer` en Task 1.
2. **Frôlement trop court** (< 0,22 s) ou trop faible (< 55 de score, ou gain < 75) : rien n'est payé → tests en Task 1.
3. **Combo** : +1 par gain si le précédent date de moins de 2 s, plafond ×8, retombe à 0 après 2 s sans gain → tests en Task 2.
4. **Stockage indisponible ou corrompu** : records à 0, jeu jouable, aucune exception → tests en Task 2.
5. **Éclosion ou mort pendant un frôlement** : pas de gain fantôme au run suivant ; `state.graze.active` est vidé hors `playing` → test en Task 1.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/world/collision.js` | + `query.grazes = [{ obj, kind:'solid'|'leak', intensity, x, y }]` |
| `src/play/graze.js` | `FP.graze.update(state, dt)` : suivi, paiement, annulation |
| `src/play/scoring.js` | `FP.scoring.award(state, x, y, base, kind)`, `update(state, dt)` (combo), records |
| `src/core/fp.js` | + `FP.storage.readJSON`, `writeJSON` |
| `src/render/effects.js` | chiffres +Ɇ flottants, anneaux de frôlement |
| `src/render/hud.js` | HUD complet v3, écran de fin avec records |

---

### Task 1: Suivi du frôlement

**Files:** Create `src/play/graze.js`, `dev/tests/graze.test.js` ; Modify `src/world/collision.js`, `dev/tests/collision.test.js`, `src/core/config.js`, `dev/check.html`, `index.html`

**Interfaces:**
- `queryPoint` ajoute `grazes` : un élément par solide dans sa bande (`intensity > .02`, `x, y` = point de la pointe, `kind 'solid'`) et par limace dans sa couronne (`x, y` = centre courant de la limace, `kind 'leak'`).
- `FP.graze.update(state, dt)` — port de `updateEcoGrazes`, `beginOrUpdateGraze`, `finishGraze`, `cancelEcoGrazes` :
  - hors `playing`, ou si `query.solid` ou `query.leak > 0` → tous les frôlements sont annulés sans paiement (`active.clear()`).
  - pour chaque élément de `query.grazes` : crée ou met à jour `active.get(obj)` = `{ time, score, peak, lastX, lastY, kind, mul }` avec `mul = 1.18` pour `trex_signature` et `nuclear`, `1.12` pour une limace, sinon `1` ; `time += dt` ; `peak = max` ; `lastX/lastY` lissés à .35 ; après `minTime = .22` : `score += dt·(130 + intensity^2.15·1980 + peak^2.4·95)·mul` ; une limace frôlée reçoit `hitFlash = max(hitFlash, .08 + .18·intensity)` ; événement `grazeStart` à la création.
  - un objet suivi absent de `query.grazes` cette frame → fin : si `time ≥ .22` et `score ≥ 55`, `amount = round((score + min(900, (time − .22)·120) + peak^2.2·360)/25)·25` ; si `amount ≥ 75` → `FP.scoring.award(state, lastX, lastY, amount, kind)` ; supprimé de `active`.
  - `config.graze = { minTime: .22, minScore: 55, minAward: 75, smooth: .35, base: 130, hotExp: 2.15, hotGain: 1980, closeExp: 2.4, closeGain: 95, holdPerSec: 120, holdMax: 900, peakExp: 2.2, peakGain: 360, premium: { trex_signature: 1.18, nuclear: 1.18 }, leakMul: 1.12, leakFlashBase: .08, leakFlashGain: .18 }`.
- Consomme `FP.scoring.award` (Task 2) : en Task 1, un `FP.scoring` minimal suffit pour les tests (stub dans le test, restauré en `finally`).

- [ ] **Step 1: Tests (rouges)**

```js
// graze.test.js
const grazeRun = () => { const s = FP.state.createRun(2, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.world.solids = []; s.world.toxics = []; s.world.leaks = []; return s; };
const withAwards = (fn) => { const saved = FP.scoring; const got = []; FP.scoring = { award: (s, x, y, a, k) => got.push({ a, k }), update() {} }; try { fn(got); } finally { FP.scoring = saved; } };
const fakeGraze = (s, obj, intensity, kind = 'solid') => { s.query = { solid: null, leak: 0, toxic: 0, danger: intensity, grazes: [{ obj, kind, intensity, x: 100, y: 100 }] }; };
FP.test('graze: frôlement soutenu puis sortie → paiement', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 60; i++) { fakeGraze(s, o, .8); FP.graze.update(s, 1 / 60); }
  s.query = { solid: null, leak: 0, toxic: 0, danger: 0, grazes: [] }; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 1); FP.assert(got[0].a >= 75 && got[0].a % 25 === 0, String(got[0].a));
  FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: trop court → rien', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 10; i++) { fakeGraze(s, o, 1); FP.graze.update(s, 1 / 60); }   // 0,17 s
  s.query = { solid: null, leak: 0, toxic: 0, danger: 0, grazes: [] }; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0);
}));
FP.test('graze: trop faible → rien', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 16; i++) { fakeGraze(s, o, .05); FP.graze.update(s, 1 / 60); }
  s.query = { solid: null, leak: 0, toxic: 0, danger: 0, grazes: [] }; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0);
}));
FP.test('graze: contact annule tout sans payer', () => withAwards(got => {
  const s = grazeRun(), a = { kind: 'server' }, b = { kind: 'tire' };
  for (let i = 0; i < 60; i++) { s.query = { solid: null, leak: 0, toxic: 0, danger: 1, grazes: [{ obj: a, kind: 'solid', intensity: .8, x: 0, y: 0 }, { obj: b, kind: 'solid', intensity: .8, x: 0, y: 0 }] }; FP.graze.update(s, 1 / 60); }
  s.query = { solid: a, leak: 0, toxic: 0, danger: 0, grazes: [] }; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0); FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: hors partie, rien ne survit', () => withAwards(got => {
  const s = grazeRun(), o = { kind: 'server' };
  for (let i = 0; i < 60; i++) { fakeGraze(s, o, .8); FP.graze.update(s, 1 / 60); }
  s.mode = 'bloom'; FP.graze.update(s, 1 / 60);
  FP.assertEqual(got.length, 0); FP.assertEqual(s.graze.active.size, 0);
}));
FP.test('graze: limace frôlée → multiplicateur et flash', () => withAwards(got => {
  const s = grazeRun(), l = { hitFlash: 0 };
  for (let i = 0; i < 60; i++) { fakeGraze(s, l, .8, 'leak'); FP.graze.update(s, 1 / 60); }
  FP.assert(l.hitFlash > .2); FP.assertEqual(s.graze.active.get(l).mul, 1.12);
}));
```

```js
// collision.test.js (ajout)
FP.test('collision: liste des frôlements', () => {
  const o = solidAt(200, 300);
  const l = { x: 400, y: 300, len: 0, angle: 0, r: 12, cx: 400, cy: 300, cr: 12 };
  const q = FP.collision.queryPoint({ solids: [o], toxics: [], leaks: [l] }, 238, 300);
  FP.assertEqual(q.grazes.length, 1); FP.assertEqual(q.grazes[0].obj, o); FP.assertEqual(q.grazes[0].kind, 'solid');
});
```

- [ ] **Step 2–4:** rouge → implémenter (`index.html`/`check.html` : `src/play/graze.js` après `flow.js`) → vert.
- [ ] **Step 5: Commit** `feat(play): frôlement des obstacles et des limaces`

---

### Task 2: ÉcoCrédits™, combo et records

**Files:** Create `src/play/scoring.js`, `dev/tests/scoring.test.js` ; Modify `src/core/fp.js`, `dev/tests/fp.test.js`, `src/core/config.js`, `src/core/state.js`, `dev/check.html`, `index.html`

**Interfaces:**
- `FP.storage.readJSON(key, fallback, backend?)` (fallback si absent, illisible ou non-objet), `FP.storage.writeJSON(key, value, backend?) → boolean`.
- `state.score = { eco, flowers, flowerBonus, combo, comboTimer }` (combo/comboTimer déplacés depuis `state.graze`, qui ne garde que `active`).
- `FP.scoring.award(state, x, y, base, kind)` — port d'`addEcoCredits` : `combo = comboTimer > 0 ? min(8, combo + 1) : 1`, `comboTimer = 2`, `amount = max(25, round(base·(1 + (combo−1)·.22)/25)·25)`, `score.eco += amount`, événement `{ type:'eco', x, y, amount, combo, kind }`, `camera.shake = max(shake, .035 + min(.06, combo·.006))`.
- `FP.scoring.update(state, dt)` : `comboTimer` décroît, à 0 → `combo = 0` ; si `score.flowers` ou `score.eco` dépasse `records`, met `records` à jour et sauvegarde.
- `FP.scoring.records = { flowers, eco }` chargé au démarrage depuis `flower_power_v4_best` ; `FP.scoring.load(backend?)`, `FP.scoring.save(backend?)`.
- `config.scoring = { comboWindow: 2, comboMax: 8, comboGain: .22, step: 25, minAmount: 25, shakeBase: .035, shakePerCombo: .006, shakeMax: .06 }`, `config.storageKey` déjà présent.

- [ ] **Step 1: Tests (rouges)**

```js
// scoring.test.js
const scRun = () => FP.state.createRun(1, { W: 440, H: 783 });
FP.test('scoring: premier gain arrondi à 25', () => {
  const s = scRun(); FP.scoring.award(s, 0, 0, 312, 'solid');
  FP.assertEqual(s.score.eco, 300); FP.assertEqual(s.score.combo, 1);
  FP.assert(s.events.some(e => e.type === 'eco' && e.amount === 300));
});
FP.test('scoring: combo +22 % par gain enchaîné, plafond ×8', () => {
  const s = scRun();
  for (let i = 0; i < 10; i++) FP.scoring.award(s, 0, 0, 1000, 'solid');
  FP.assertEqual(s.score.combo, 8);
  const last = s.events.filter(e => e.type === 'eco').pop();
  FP.assertEqual(last.amount, Math.round(1000 * (1 + 7 * .22) / 25) * 25);
});
FP.test('scoring: le combo retombe après 2 s', () => {
  const s = scRun(); FP.scoring.award(s, 0, 0, 500, 'solid');
  FP.scoring.update(s, 2.01); FP.assertEqual(s.score.combo, 0);
  FP.scoring.award(s, 0, 0, 500, 'solid'); FP.assertEqual(s.score.combo, 1);
});
FP.test('scoring: records sauvegardés et relus', () => {
  const mem = { data: {}, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } };
  FP.scoring.records = { flowers: 2, eco: 1000 };
  FP.scoring.save(mem);
  FP.assertEqual(JSON.stringify(FP.scoring.load(mem)), JSON.stringify({ flowers: 2, eco: 1000 }));
});
FP.test('scoring: stockage corrompu → records à 0', () => {
  const bad = { getItem() { return '{oops'; }, setItem() { throw new Error('x'); } };
  FP.assertEqual(JSON.stringify(FP.scoring.load(bad)), JSON.stringify({ flowers: 0, eco: 0 }));
});
FP.test('scoring: un record battu est mis à jour', () => {
  const s = scRun(); FP.scoring.records = { flowers: 0, eco: 0 };
  s.score.eco = 4200; s.score.flowers = 3; FP.scoring.update(s, 0);
  FP.assertEqual(FP.scoring.records.eco, 4200); FP.assertEqual(FP.scoring.records.flowers, 3);
});
```

`fp.test.js` : `readJSON` (valeur valide, JSON cassé → fallback, backend qui lève → fallback) et `writeJSON` (backend qui lève → `false`).

- [ ] **Step 2–4:** rouge → implémenter (`scoring.js` après `graze.js`) → vert. Le test de Task 1 n'a plus besoin du stub (le garder : il isole le frôlement).
- [ ] **Step 5: Commit** `feat(play): ÉcoCrédits™, combo et records`

---

### Task 3: Rendu — chiffres, anneaux, HUD, écran de fin

**Files:** Create `src/render/effects.js` ; Modify `src/render/hud.js`, `src/render/frame.js`, `index.html`

**Interfaces:**
- `FP.effects.draw(ctx, state)` (repère monde) :
  - pour chaque événement `eco` de la frame, ajoute à `state.fx.effects` `{ type:'eco', x, y, amount, combo, t0: time, life: 1.22, vx: rand(−22,22), vy: rand(−27,−13), angle: rand(−.34,.34), spin: rand(−.32,.32) }` ; retire les effets expirés ; dessine chaque chiffre « +1 234Ɇ » — port fidèle de la branche `eco` de `drawEffects` (montée, pop, fondu, contour, mention `x{combo}`, anneau qui s'élargit).
  - anneaux de frôlement — port de `drawGrazeFeedback` : pour chaque frôlement de `state.graze.active`, anneau autour de la pointe et anneau pointillé au point frôlé (variante limace : sans pointillés, teinte plus jaune).
- `frame.js` : `effects.draw` après la pellicule toxique et l'anneau d'exposition (ordre v3 : …, plante, toxiques, frôlement, effets).
- `hud.js` : panneau gauche `fleurs N` / `Ɇ 12 345` (vert `#cfff78`, format `fr-FR`) / `pollen +N` ; panneau droit `graines` / `élan` / `combo xN` (vert si > 1) sinon `frôlement : Ɇ` ; écran de fin : fleurs, raison absente (déjà dite en message), tiges tentées, ÉcoCrédits™, meilleur score fleurs, meilleurs ÉcoCrédits™, « TOUCHE POUR RECOMMENCER ».

- [ ] **Step 1: Implémenter.** `index.html` : `src/render/effects.js` avant `frame.js`.
- [ ] **Step 2:** tests verts ; `wc -l` < 400.
- [ ] **Step 3: Navigateur** : frôler un obstacle → anneaux, puis à la sortie « +XXXɆ » qui claque, compteur Ɇ du HUD qui monte ; enchaîner deux frôlements → « combo x2 » ; frôler une limace → anneau jaune et limace qui clignote ; toucher pendant un frôlement → rien ; fin de partie → records affichés ; recharger la page → records conservés. 0 erreur console. Comparer avec l'archive.
- [ ] **Step 4: Commit** `feat(render): chiffres ÉcoCrédits™, anneaux de frôlement, HUD complet et records`

---

### Task 4: Docs de l'étape

**Files:** `docs/architecture.md` (graze, scoring, effects ; `state.graze.active`, `state.score.combo`, exception `FP.scoring.records`), `README.md` (« étape 4/7 »), `CHANGELOG.md` (`v4.0.0-etape4 — ÉcoCrédits™`).

- [ ] **Step 1: Mettre à jour.** · **Step 2: Vérification finale.** · **Step 3: Commit** `docs: étape 4 — ÉcoCrédits™`
