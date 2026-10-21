# Refonte v4 — Étape 5 : flyover et power-ups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un frôlement qui contourne réellement un obstacle en montant (flyover qualifié) fait naître devant la pointe une récompense : pollen (+1 fleur à l'éclosion), goutte (bouclier organique à usage unique) ou spore (nettoyage de zone). Un seul power-up gameplay actif ; le pollen reste hors slot.

**Architecture:** `play/graze.js` mesure en plus ce que le flyover demande et, à la fin d'un frôlement d'obstacle payant, appelle `FP.powerups.onFlyover`. Nouveau système `play/powerups.js` (entre `scoring` et `flow`) : évaluation, choix, apparition prédictive, cycle de vie des bonus, ramassage, bouclier (qui intercepte les chocs avant `flow`), spore. Rendu dans `render/powerups.js` (bonus, filament de naissance, membrane) et `render/effects.js` (ramassage, rupture, explosion, impact).

**Tech Stack:** JavaScript natif sur `window.FP`, Canvas 2D.

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§7 flyover → pollen / goutte-bouclier / spore, exclusivité, spawn prédictif, récompense ratée, bris de bouclier sans changer la direction ; §11 étape 5).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes complets.
- La simulation écrit, le rendu lit ; tous les réglages dans `config.js` ; pas d'aléatoire de gameplay hors `state.rng`.
- Règles et constantes fidèles à la v3.43.16 (v3.42 à v3.42.4).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Dangers rognés par les bords** (demande du 2026-10-21) : une nappe toxique ou un trajet de limace peut sortir par le bord gauche ou droit, tant qu'on en voit assez pour l'anticiper. Règle : centre de la nappe à l'écran (au moins la moitié visible) ; centre du trajet de limace dans le cadre et au moins la moitié du trajet visible. Réglages `config.level.toxics.minVisible` et `config.level.leaks.minVisible` (.5). Limites haute/basse et chemin sûr inchangés.

- **Ordre de la boucle** : `… collision → graze → scoring → powerups → flow → camera`. `powerups` ramasse les bonus puis intercepte un choc (solide ou lixiviat) avec le bouclier ou la grâce avant que `flow` ne décide d'une mort — comme en v3, où le ramassage précédait la requête et le bouclier précédait `die()`.
- **Pas de minuterie de spore** : depuis la v3.42.4, la spore libère le slot dès l'explosion (`sporeEffectTimer` restait à 0). Seul le bouclier ferme le robinet ; `state.power.sporeTimer` est supprimé.
- **Les bonus vivent dans le monde** : `state.world.bonuses` (vidé par `level.generate`, comme `game.bonuses` en v3) au lieu de `state.power.bonuses`. Spec §6 amendée.
- **Remise à zéro par pousse** (comme `prepareStem` en v3) : `plant.prepare` remet `power.shield`, `power.shieldGrace` et `score.flowerBonus` à zéro.
- **Une récompense par obstacle et par niveau** : `solid.rewarded` est posé au premier flyover qualifié évalué (même si la récompense est bloquée par l'exclusivité), comme `_flyoverRewarded`.
- **Spore et frôlements en cours** : les objets effacés sont retirés de `state.graze.active` sans paiement (en v3, ils sortaient simplement de la boucle).
- **Éclosion** : `flowers += 1 + flowerBonus`, `level += 1 + flowerBonus` (v3 `bloom`). Les fleurs dessinées : étape 6.
- **Effets** : on porte ici les anneaux `pickup`, `shieldBreak`, `bomb` et aussi `hit` (anneau d'impact à la mort, présent en v3 depuis toujours, déclenché par l'événement `death`). Particules : étape 7.
- **Ligne d'effet du HUD** (relevé de l'étape 3) : affichée dans tous les modes de jeu (hors menu et fin), avec « croissance déviée · bouclier organique · pollen +N ».
- **Outil `?flydebug=1`** : étape 7 ; la décision du flyover est quand même exposée (`FP.powerups.assess`) pour les tests.

## Review Focus

1. **Exclusivité** : bouclier actif → aucune goutte ni spore n'apparaît (rien en file d'attente), mais le pollen oui → tests Task 2.
2. **Choc juste après le bris** : pendant la grâce (.48 s), un second choc (même collider) ne tue pas ; la pointe recule de 26 px sur sa trajectoire, la direction et l'intention de pilotage sont conservées → tests Task 3.
3. **Bonus en formation** (.48 s) : impossible à ramasser ; un bonus raté (155 px derrière la pointe, ou 9,5 s) disparaît sans rien activer → tests Task 2.
4. **Spore pendant un frôlement** : les objets effacés ne paient rien ; les ÉcoCrédits™ de la spore (2 000 par solide) ne touchent pas au combo → tests Task 2.
5. **Zone toxique sous bouclier** : la brûlure toxique ignore le bouclier → test Task 3.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/play/graze.js` | + mesures flyover (`startRelY`, `intensityTime`, `effectiveTime`) ; appelle `FP.powerups.onFlyover` |
| `src/play/powerups.js` | évaluation, choix, apparition, cycle de vie, ramassage, bouclier, spore |
| `src/play/scoring.js` | + `awardFlat` (gain sans combo) |
| `src/play/flow.js` | éclosion avec pollen ; `FP.flow.say` exposé |
| `src/play/plant.js` | remise à zéro par pousse |
| `src/world/level.js` | vide `world.bonuses` |
| `src/render/powerups.js` | bonus (poche, glyphes source / spore / pollen, balancement), filament de naissance, membrane du bouclier |
| `src/render/effects.js` | + `pickup`, `shieldBreak`, `bomb`, `hit` |
| `src/render/hud.js` | ligne d'effet complète |

---

### Task 0: Nappes et limaces rognées par les bords

**Files:** Modify `src/world/level.js`, `src/core/config.js`, `dev/tests/level.test.js`

**Interfaces:**
- Toxiques : accepté seulement si la fraction visible de l'ellipse en x, approchée par `(min(W, x + rx) − max(0, x − rx)) / (2·rx)`, est ≥ `toxics.minVisible` (.5).
- Limaces : la condition « tous les points du trajet dans `[24, W−24]` » devient : centre `x` dans `[marginX, W − marginX]` et part des 9 points du trajet dans `[0, W]` ≥ `leaks.minVisible` (.5) ; la contrainte verticale (`[surfaceY + 48, height − 116]` pour tous les points) est inchangée.

- [ ] **Step 1: Tests (rouges)** — dans `level.test.js`, remplacer `limaces dans le cadre` par :

```js
FP.test('level: nappes et limaces assez visibles pour être anticipées', () => {
  for (const seed of [1, 2, 3, 1234, 99999]) {
    const w = gen(seed).world;
    for (const o of w.toxics) FP.assert((Math.min(w.width, o.x + o.rx) - Math.max(0, o.x - o.rx)) / (2 * o.rx) >= .5, 'toxique ' + seed);
    for (const l of w.leaks) {
      let inside = 0;
      for (let i = 0; i <= 8; i++) {
        const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k, y = l.y + Math.sin(l.angle) * l.len * k;
        if (x >= 0 && x <= w.width) inside++;
        FP.assert(y > w.surfaceY + 48 && y < w.height - 116, 'limace y ' + seed);
      }
      FP.assert(inside / 9 >= .5 && l.x >= 24 && l.x <= w.width - 24, 'limace ' + seed);
    }
  }
});
FP.test('level: des trajets de limaces peuvent dépasser du cadre', () => {
  let out = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const w = gen(seed, 440, 783, 8).world;
    for (const l of w.leaks) for (let i = 0; i <= 8; i++) {
      const k = -.5 + i / 8, x = l.x + Math.cos(l.angle) * l.len * k;
      if (x < 24 || x > w.width - 24) out++;
    }
  }
  FP.assert(out > 0, 'aucun trajet ne dépasse');
});
```

- [ ] **Step 2: rouge** · **Step 3: implémenter** · **Step 4: vert** ; mesurer le nombre moyen de limaces et de nappes (avant / après) et le noter au ledger.
- [ ] **Step 5: Commit** `feat(world): nappes et limaces rognées par les bords tant qu'on peut les anticiper`

---

### Task 1: Évaluer un flyover

**Files:** Create `src/play/powerups.js` (partie évaluation), `dev/tests/powerups.test.js` ; Modify `src/play/graze.js`, `dev/tests/graze.test.js`, `src/core/config.js`, `dev/check.html`, `index.html`

**Interfaces:**
- Le frôlement mesure en plus (port de `beginOrUpdateGraze`) : `startRelY = tip.y − obj.y` à sa création, `intensityTime += intensity·dt`, `effectiveTime += dt·(.45 + .55·intensity)`.
- À la fin d'un frôlement de **solide** qui a franchi les seuils de paiement (`time ≥ .22` et `score ≥ 55`), après le paiement éventuel : `FP.powerups.onFlyover(state, obj, record)`.
- `FP.powerups.assess(state, obj, r) → { qualified, risk, progress, effectiveTime, rawTime }` — port fidèle de `assessFlyover` : `h = max(36, obj.h)`, `exitRelY = tip.y − obj.y`, `minAdvance = clamp(h·.27, 17, 42)`, `advance = startRelY − exitRelY`, départ « dessous ou à côté » si `startRelY > −clamp(h·.10, 6, 16)`, sortie « au-dessus » si `exitRelY < −clamp(h·.08, 6, 14)`, `progress = clamp(advance / max(28, h·.62), 0, 1)`, `avg = intensityTime/time`, `duration = clamp((effectiveTime − .20)/.95, 0, 1)`, `proximity = clamp(avg·.62 + peak·.38, 0, 1)`, `risk = clamp(duration·.47 + proximity·.36 + progress·.17, 0, 1)`, `qualified = time ≥ .27 && peak ≥ .20 && dessous && dessus && advance ≥ minAdvance && progress ≥ .42`.
- `FP.powerups.rewardType(a)` : `effectiveTime ≥ .82 && risk ≥ .66 → 'spore'` ; `effectiveTime ≥ .52 && risk ≥ .48 → 'water'` ; sinon `'pollen'`.
- `config.flyover = { minTime: .27, minPeak: .20, minProgress: .42, … toutes les constantes ci-dessus …, minRisk: .40, minEffective: .30, spore: { time: .82, risk: .66 }, water: { time: .52, risk: .48 } }`.

- [ ] **Step 1: Tests (rouges)**

```js
// powerups.test.js
const puRun = () => { const s = FP.state.createRun(4, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.world.solids = []; s.world.toxics = []; s.world.leaks = []; return s; };
const server = (x, y) => FP.catalog.makeSolid({ kind: 'server', x, y, a: 0, flip: 1 });
const record = (o) => Object.assign({ time: .9, score: 600, peak: .7, kind: 'solid', mul: 1, startRelY: 40, intensityTime: .5, effectiveTime: .75, lastX: 0, lastY: 0 }, o);
FP.test('powerups: contournement montant → flyover qualifié', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 900 - 50 };
  const a = FP.powerups.assess(s, o, record());
  FP.assert(a.qualified, JSON.stringify(a)); FP.assert(a.risk > .4);
});
FP.test('powerups: rester à côté sans monter → pas de flyover', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 900 + 30 };
  FP.assert(!FP.powerups.assess(s, o, record()).qualified);
});
FP.test('powerups: trop bref → pas de flyover', () => {
  const s = puRun(), o = server(200, 900); s.plant.tip = { x: 250, y: 850 };
  FP.assert(!FP.powerups.assess(s, o, record({ time: .25 })).qualified);
});
FP.test('powerups: nature de la récompense selon durée et risque', () => {
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .9, risk: .7 }), 'spore');
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .6, risk: .5 }), 'water');
  FP.assertEqual(FP.powerups.rewardType({ effectiveTime: .6, risk: .45 }), 'pollen');
});
```

```js
// graze.test.js (ajout)
FP.test('graze: mesures du flyover', () => withAwards(() => {
  const s = grazeRun(), o = { kind: 'server', y: s.plant.tip.y - 20 };
  for (let i = 0; i < 30; i++) { fakeGraze(s, o, .5); FP.graze.update(s, 1 / 60); }
  const r = s.graze.active.get(o);
  FP.assertEqual(r.startRelY, 20);
  FP.assert(Math.abs(r.intensityTime - .25) < 1e-9);
  FP.assert(Math.abs(r.effectiveTime - .5 * (.45 + .55 * .5)) < 1e-9);
}));
```

- [ ] **Step 2–4:** rouge → implémenter (`src/play/powerups.js` après `scoring.js` ; `onFlyover` peut rester vide jusqu'à la Task 2) → vert.
- [ ] **Step 5: Commit** `feat(play): évaluation du flyover`

---

### Task 2: Récompenses — apparition, cycle de vie, ramassage, spore

**Files:** Modify `src/play/powerups.js`, `src/play/scoring.js`, `src/play/flow.js`, `src/play/plant.js`, `src/world/level.js`, `src/core/state.js`, `src/core/config.js`, `src/core/loop.js`, `dev/tests/powerups.test.js`, `dev/tests/loop.test.js`, `dev/tests/flow.test.js`, `dev/tests/scoring.test.js`

**Interfaces:**
- `state.world.bonuses = []` (vidé par `generate`) ; bonus `{ type: 'pollen'|'water'|'spore', x, y, r, phase, forming, formMax: .48, age, originX, originY }` (`r` = 13 / 15 / 16, `phase = rng.range(0, TAU)`).
- `FP.powerups.onFlyover(state, obj, r)` — port de `spawnFlyoverBonus` : rien si `obj.rewarded` ou `!obj.flyoverEligible` ; `a = assess` ; rien si non qualifié, `risk < .40` ou `effectiveTime < .30` ; `type = rewardType(a)` ; `obj.rewarded = true` ; si le type est gameplay (`water`/`spore`) et `power.shield` → rien (pas de file) ; sinon position = `findSpawn` (port de `findFlyoverBonusSpawn` + `bonusSpawnClear`, 8 essais devant la pointe, décalés côté extérieur, projection minimale, hors solides (distance au polygone < r + 13), hors toxiques (> .10), hors trajets de limaces (r + 22), à 58 px des autres bonus, devant la pointe d'au moins 30 px (16 près de la surface), dans `[30 + r, W − 30 − r] × [surfaceY + 42, height − 52]`) ; si trouvée : bonus ajouté, événement `bonusSpawn`, message « FLYOVER : POLLEN LIBÉRÉ » / « FLYOVER : GOUTTE LIBÉRÉE » / « FLYOVER RISQUÉ : SPORE LIBÉRÉE » (.95 s).
- `FP.powerups.update(state, dt)` : `shieldGrace` décroît ; chaque bonus vieillit, `forming` décroît ; ramassé si `mode === 'playing'`, `forming ≤ 0` et distance à la pointe `< r + 9` ; retiré s'il est ramassé, raté (`forming ≤ 0 && tip.y < y − 155`) ou trop vieux (`age > 9.5`), événement `bonusMissed` pour un raté.
- Ramassage (port de `collectBonus`) : `water` → `power.shield = true`, message « GOUTTE D’EAU : BOUCLIER ORGANIQUE » 1,15 s, événement `pickup` ; `pollen` → `score.flowerBonus += 1`, « POLLEN RARE : +1 FLEUR » 1,05 s, `pickup` ; `spore` → explosion rayon 92 : retire les solides à `≤ 92 + broadR·.55`, les toxiques à `≤ 92 + max(rx, ry)·.38`, les limaces dont un point du trajet est à `< 92 + r`, les retire aussi de `graze.active` sans payer, paie `FP.scoring.awardFlat(state, x, y, n·2000)` si `n` solides, message « SPORE : N DÉPÔT(S) NETTOYÉ(S) · +X Ɇ » 1,35 s, secousse `.22 + .035·n`, événement `bomb`.
- `FP.scoring.awardFlat(state, x, y, amount)` : `max(25, arrondi 25)`, sans toucher au combo, événement `eco` (`combo: 1`, `flat: true`), secousse `.07 + min(.08, amount/18000)`.
- `FP.flow.say(state, text, time)` exposé. Éclosion : `flowers += 1 + flowerBonus`, `level += 1 + flowerBonus`.
- `FP.plant.prepare` remet à zéro `power.shield`, `power.shieldGrace`, `score.flowerBonus`.
- `loop.js` : `UPDATE_ORDER = ['input','plant','hazards','collision','graze','scoring','powerups','flow','camera']`.

- [ ] **Step 1: Tests (rouges)**

```js
const qualifyingFlyover = (s) => { const o = server(200, 900); s.world.solids = [o]; s.plant.tip = { x: 250, y: 850 }; s.plant.dir = { x: 0, y: -1 }; return o; };
FP.test('powerups: flyover qualifié → récompense devant la pointe', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 1);
  const b = s.world.bonuses[0]; FP.assert(b.y < s.plant.tip.y - 30, String(b.y)); FP.assertEqual(b.type, 'water');
  FP.assert(FP.collision.queryPoint({ solids: s.world.solids, toxics: [], leaks: [] }, b.x, b.y).solid === null);
});
FP.test('powerups: un obstacle ne récompense qu’une fois', () => {
  const s = puRun(); const o = qualifyingFlyover(s);
  FP.powerups.onFlyover(s, o, record()); FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 1);
});
FP.test('powerups: bouclier actif → pas de goutte, pas de file', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record());
  FP.assertEqual(s.world.bonuses.length, 0); FP.assert(o.rewarded);
});
FP.test('powerups: bouclier actif → le pollen apparaît quand même', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record({ effectiveTime: .45, intensityTime: .3 }));
  FP.assertEqual(s.world.bonuses.length, 1); FP.assertEqual(s.world.bonuses[0].type, 'pollen');
});
const bonusAtTip = (s, type) => { const b = { type, x: s.plant.tip.x, y: s.plant.tip.y, r: 15, phase: 0, forming: 0, formMax: .48, age: 0, originX: 0, originY: 0 }; s.world.bonuses.push(b); return b; };
FP.test('powerups: goutte → bouclier', () => {
  const s = puRun(); bonusAtTip(s, 'water'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.power.shield, true); FP.assertEqual(s.world.bonuses.length, 0);
});
FP.test('powerups: pollen → +1 fleur à l’éclosion', () => {
  const s = puRun(); bonusAtTip(s, 'pollen'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.score.flowerBonus, 1);
  s.plant.tip.y = s.world.surfaceY - 1; FP.collision.update(s); FP.flow.update(s, 0);
  FP.assertEqual(s.score.flowers, 2); FP.assertEqual(s.level, 2);
});
FP.test('powerups: en formation, impossible à ramasser', () => {
  const s = puRun(); const b = bonusAtTip(s, 'water'); b.forming = .3;
  FP.powerups.update(s, 1 / 60); FP.assertEqual(s.power.shield, false);
});
FP.test('powerups: récompense ratée → disparaît sans effet', () => {
  const s = puRun(); const b = bonusAtTip(s, 'water'); b.y = s.plant.tip.y + 160;
  FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.world.bonuses.length, 0); FP.assertEqual(s.power.shield, false);
});
FP.test('powerups: spore → nettoie, paie 2 000 par solide, sans combo, sans payer les frôlements effacés', () => {
  const s = puRun(); const t = s.plant.tip;
  const a = server(t.x + 60, t.y - 20), b = server(t.x - 60, t.y + 20);
  s.world.solids = [a, b]; s.graze.active.set(a, { time: 1, score: 900, peak: .8, kind: 'solid', mul: 1, lastX: 0, lastY: 0, startRelY: 0, intensityTime: .5, effectiveTime: .8 });
  bonusAtTip(s, 'spore'); FP.powerups.update(s, 1 / 60);
  FP.assertEqual(s.world.solids.length, 0); FP.assertEqual(s.score.eco, 4000); FP.assertEqual(s.score.combo, 0);
  FP.assertEqual(s.graze.active.size, 0);
});
FP.test('powerups: une nouvelle pousse repart sans bouclier ni pollen', () => {
  const s = puRun(); s.power.shield = true; s.score.flowerBonus = 2;
  FP.plant.prepare(s);
  FP.assertEqual(s.power.shield, false); FP.assertEqual(s.score.flowerBonus, 0);
});
```

`loop.test.js` : nouvel ordre attendu. `scoring.test.js` : `awardFlat` arrondit, ne touche pas au combo, émet `eco` avec `flat: true`.

- [ ] **Step 2–4:** rouge → implémenter → vert. Si `powerups.js` approche 400 lignes, extraire `src/play/spawn.js` (recherche de position).
- [ ] **Step 5: Commit** `feat(play): récompenses de flyover — pollen, goutte, spore`

---

### Task 3: Bouclier organique

**Files:** Modify `src/play/powerups.js`, `src/core/config.js`, `dev/tests/powerups.test.js`, `dev/tests/flow.test.js`

**Interfaces:**
- Dans `FP.powerups.update`, en `playing`, après le ramassage : si `query.solid` ou `query.leak > 0` :
  - si `shieldGrace > 0` → le choc est ignoré (`query.solid = null`, `query.leak = 0`, `query.leakHit = null`) ;
  - sinon si `power.shield` → bris (port de `shatterOrganicShield`) : `shield = false`, `shieldGrace = .48`, `graze.active.clear()`, la pointe recule de 26 px le long de `dir` (bornée à `[14, W−14] × [surfaceY + 2, height − 22]`), `dir` inchangé, si `input.down` → `guide.x = input.x` et `guide.y = tip.y − lookAhead(input.y)`, événement `shieldBreak` (`kind: 'impact'|'acid'`), secousse .16, message « BOUCLIER ORGANIQUE : MEMBRANE ROMPUE » .92 s ; le choc est ignoré comme ci-dessus.
- Les zones toxiques ne sont pas concernées (exposition continue, pas un choc).
- `config.shield = { grace: .48, back: 26, shake: .16, messageTime: .92 }`.

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('powerups: le bouclier absorbe un choc sans changer la direction', () => {
  const s = puRun(); s.power.shield = true; const dy = -Math.sqrt(1 - .09); s.plant.dir = { x: .3, y: dy };
  const t0 = { ...s.plant.tip }; s.world.solids = [server(t0.x, t0.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.power.shield, false);
  FP.assertEqual(s.plant.dir.x, .3); FP.assertEqual(s.plant.dir.y, dy);
  FP.assert(Math.abs(Math.hypot(s.plant.tip.x - t0.x, s.plant.tip.y - t0.y) - 26) < 1e-6);
  FP.assert(s.events.some(e => e.type === 'shieldBreak'));
});
FP.test('powerups: pendant la grâce, un second choc ne tue pas', () => {
  const s = puRun(); s.power.shield = true; s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing');
});
FP.test('powerups: après la grâce, un choc tue', () => {
  const s = puRun(); s.power.shieldGrace = .01; s.world.solids = [server(s.plant.tip.x, s.plant.tip.y)];
  FP.powerups.update(s, .02); FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying');
});
FP.test('powerups: le bouclier protège aussi du lixiviat', () => {
  const s = puRun(); s.power.shield = true; const t = s.plant.tip;
  s.world.leaks = [{ x: t.x, y: t.y, len: 0, angle: 0, r: 12, cx: t.x, cy: t.y, cr: 12, hitFlash: 0 }];
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'playing');
  FP.assert(s.events.some(e => e.type === 'shieldBreak' && e.kind === 'acid'));
});
FP.test('powerups: le bouclier ne protège pas d’une zone toxique', () => {
  const s = puRun(); s.power.shield = true; const t = s.plant.tip;
  s.world.toxics = [{ x: t.x, y: t.y, rx: 60, ry: 60, a: 0 }]; s.plant.toxicTimer = .82;
  FP.collision.update(s); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.power.shield, true);
});
```

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Commit** `feat(play): bouclier organique`

---

### Task 4: Rendu

**Files:** Create `src/render/powerups.js` ; Modify `src/render/effects.js`, `src/render/hud.js`, `src/render/frame.js`, `index.html`

**Interfaces:**
- `FP.powerupsRender.drawBonuses(ctx, state)` — port de `drawBonuses`, `drawBonusManifestation`, `drawBonusGlyph`, `drawAssetSource`, `drawAssetSpore`, `drawAssetPollen` (poche lumineuse, balancement, filament qui « extrait » la récompense de l'obstacle pendant la formation).
- `FP.powerupsRender.drawShield(ctx, state)` — port de `drawOrganicShield` (membrane irrégulière, nervures), en `playing` si `power.shield`.
- `effects.js` : effets nés des événements `pickup` (anneau couleur du bonus), `shieldBreak` (anneau qui s'ouvre + 12 éclats), `bomb` (onde verte rayon 92, rayons, pointillé), `death` → `hit` (anneau rouge ou acide) ; les chiffres `eco` avec `flat: true` vivent 1,28 s (vx ±24, vy −31..−16).
- `hud.js` : ligne d'effet « croissance déviée · bouclier organique · pollen +N » dans tous les modes sauf menu et fin.
- `frame.js` (ordre v3) : sol, nappes, limaces, obstacles, **bonus**, plante (+ membrane juste avant le bourgeon), pellicule toxique, anneau d'exposition, effets.

- [ ] **Step 1: Implémenter.** `index.html` : `render/powerups.js` avant `render/plant.js`.
- [ ] **Step 2:** tests verts ; `wc -l` < 400.
- [ ] **Step 3: Navigateur** : un flyover autour d'un obstacle → filament puis récompense devant la pointe, message ; goutte ramassée → membrane ; choc → membrane rompue, la pousse continue dans la même direction ; pollen → « pollen +1 », éclosion qui compte 2 fleurs ; spore → onde, obstacles effacés, « SPORE : … NETTOYÉS · +2 000 Ɇ » ; récompense ratée → disparaît. 0 erreur console.
- [ ] **Step 4: Commit** `feat(render): récompenses, membrane et effets de ramassage, rupture, explosion`

---

### Task 5: Docs de l'étape

**Files:** `docs/architecture.md` (powerups, ordre de boucle, `world.bonuses`, remise à zéro par pousse), spec §6 (`power`, `world.bonuses`, ordre ; amendé étape 5), `README.md` (« étape 5/7 »), `CHANGELOG.md` (`v4.0.0-etape5 — Flyover et power-ups`).

- [ ] **Step 1: Mettre à jour.** · **Step 2: Vérification finale.** · **Step 3: Commit** `docs: étape 5 — flyover et power-ups`
