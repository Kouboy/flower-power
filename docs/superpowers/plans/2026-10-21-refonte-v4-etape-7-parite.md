# Refonte v4 — Étape 7 : son, particules, secousse, clavier, outils — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atteindre la parité avec la v3.43.16 : son procédural (effets + drone du frôlement + grattement de la pousse), particules (terre, éclats, pétales…), secousse d'écran visible, Espace/Entrée, profileur `?perf=1` et outil de réglage `?flydebug=1`. Ensuite, la v4 peut remplacer la v3 sur `main`.

**Architecture:** `audio/audio.js` consomme les événements de la frame (et lit l'état pour le drone et le grattement) : la boucle lui passe `(events, state, dt)`. `render/particles.js` naît des mêmes événements et vit dans `state.fx.particles` (temps mesuré par `state.time`). La secousse est appliquée dans `frame.js`. `debug/perf.js` mesure update/render ; `debug/flydebug.js` affiche les décisions de flyover émises par `powerups` (événement `flyover`).

**Tech Stack:** JavaScript natif, Canvas 2D, Web Audio API (aucun fichier son).

**Spec:** `docs/superpowers/specs/2026-10-20-refonte-v4-design.md` (§7 : audio procédural, `?perf=1`, `?flydebug=1` ; §11 étape 7 : parité → fusion dans `main`).

## Global Constraints

- `file://`, pas de modules ni de build ; ≤ 400 lignes par fichier ; en-têtes complets.
- La simulation écrit, le rendu et l'audio lisent ; aléatoire purement sensoriel (son, particules, secousse) via `Math.random`.
- Tous les réglages de gameplay dans `config.js` ; sons, particules et outils gardent leurs constantes de présentation dans leur propre fichier, comme le reste de `render/`.
- Sons, particules et secousse fidèles à la v3.43.16 (`sfx`, `tone`, `noise`, drone, `sfxGrowthScrape`, `flashParticles`, `emitGrowthDebris`, `drawParticles`, `particleBudget`, `draw`, `drawPerfHUD`, messages `flyDebugText`).
- Sans Web Audio (Node, navigateur qui refuse), le jeu reste silencieux et ne plante jamais.
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Décisions de ce plan

- **Correspondance événements → sons** (noms v3) : `runStart` → `start` ; `stemStart` → `growStart` ; `bloom` → `bloom` ; `eco` → `eco` (intensité `clamp(amount/650, .45, 1.8)`, ou `/2600` borné `.6..2.2` pour un gain de spore) ; `grazeStart` → `grazeStart` ; `pickup` → `water` / `bud` ; `shieldBreak` → `shieldBreak` ; `bomb` → `bomb` ; `death` → `hit` (solide) ou `acid` (lixiviat, toxique) ; `toxicEnter` → `contaminate` ; `bonusSpawn` et l'entrée en `ready` → `ready`. Deux nouveaux événements : `runStart` (menu) et `ready` (flow).
- **Déverrouillage audio** au premier appui ou à la première touche (règle des navigateurs), comme `ensureAudio` au démarrage en v3.
- **Particules = rendu** : elles naissent des événements, avancent avec l'écart de `state.time` entre deux frames, et respectent le budget v3 (84 en haut de l'écran ou pendant l'éclosion, 128 sinon). Les gerbes v3 sont reproduites (ex. mort par lixiviat : 28 + 38 particules acides).
- **Clavier** : Espace/Entrée démarre une partie depuis le menu ou la fin, et relance la pousse en `ready` (v3 ligne 1302) ; une touche « appuie » sans « maintenir » (`FP.input.press()`).
- **Outil flyover** : `powerups` émet `{ type: 'flyover', outcome: 'spawn'|'blocked'|'noSpot'|'notQualified', kind, risk, time, effective, progress }` et `bonusMissed` porte l'état du slot ; `debug/flydebug.js` les affiche 1,5–2,6 s comme en v3.

## Review Focus

1. **Pas de Web Audio** (Node, politique du navigateur, contexte suspendu) : aucune exception, le jeu tourne → test Task 1.
2. **Avalanche d'événements** (spore qui nettoie, combo ×8) : anti-rafale par type de son (25 ms, 100 ms pour `grazeStart`, 240 ms pour `contaminate`) → test Task 1.
3. **Drone du frôlement** : s'arrête dès que le frôlement cesse, à la mort, à l'éclosion ou au menu (pas de son qui reste coincé) → test Task 1.
4. **Budget de particules** : jamais plus de 128 (84 près de la surface), même avec une spore + un combo + une mort sur la même frame → vérification navigateur Task 2.
5. **Profileur désactivé par défaut** : sans `?perf=1`, aucune mesure ni affichage → test Task 4.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/audio/audio.js` | contexte, `tone`, `noise`, anti-rafale, sons par événement, drone, grattement |
| `src/core/loop.js` | `FP.audio.consume(state.events, state, dt)` ; mesures `?perf=1` |
| `src/ui/menu.js` | événement `runStart` ; Espace/Entrée |
| `src/ui/input.js` | `FP.input.press()` |
| `src/play/flow.js` | événement `ready` |
| `src/play/powerups.js` | événements `flyover`, `bonusMissed` enrichi |
| `src/render/particles.js` | gerbes, débris de croissance, physique, dessin |
| `src/render/frame.js` | secousse ; particules ; overlay debug |
| `src/debug/perf.js` | `?perf=1` |
| `src/debug/flydebug.js` | `?flydebug=1` |

---

### Task 1: Son procédural

**Files:** Create `src/audio/audio.js`, `dev/tests/audio.test.js` ; Modify `src/core/loop.js`, `dev/tests/loop.test.js`, `src/ui/menu.js`, `src/play/flow.js`, `src/play/powerups.js`, `index.html`, `dev/check.html`

**Interfaces:**
- `FP.audio.consume(events, state, dt)` : pour chaque événement, `sfx(kind, intensity)` selon la table des décisions ; puis drone du frôlement (intensité = max des `query.grazes` des objets suivis dans `graze.active`, durée = plus long `time` ; coupé hors `playing` ou si aucun frôlement) et grattement de la pousse en `playing` (cadence `lerp(.095, .052, k)·(1,42 près de la surface)·rand(.72, 1.28)`, `k = speed/190`).
- `FP.audio.sfx(kind, intensity)`, `FP.audio.unlock()`, `FP.audio._backend` (point d'injection pour les tests : objet `{ now(), tone(...), noise(...), drone(on, freq, filt, q, gain) }` ; en production, le backend Web Audio ; sans Web Audio, un backend muet).
- Anti-rafale : `sfxAllowed(kind, gap)` avec les écarts v3.
- Port fidèle des recettes de `sfx` (start, growStart, bloom, eco, grazeStart, water, shieldBreak, bud, bomb, hit, acid, contaminate, ready), de `tone`, `noise` (bruit stable généré une fois), `startGrazeDrone`/`updateGrazeDrone`/`stopGrazeDrone`, `sfxGrowthScrape`. Gain général .78.
- `loop.js` : `if (FP.audio) FP.audio.consume(state.events, state, dt)`.
- Événements ajoutés : `runStart` (menu, au démarrage d'un run), `ready` (flow, fin du fondu entrant).

- [ ] **Step 1: Tests (rouges)**

```js
// audio.test.js — backend espion : on vérifie quels sons partent, pas le signal.
const spy = () => { const calls = []; let t = 0; return { calls, advance(d) { t += d; }, now: () => t, tone: (...a) => calls.push(['tone', ...a]), noise: (...a) => calls.push(['noise', ...a]), drone: (...a) => calls.push(['drone', ...a]) }; };
const withBackend = (fn) => { const saved = FP.audio._backend; const b = spy(); FP.audio._backend = b; try { fn(b); } finally { FP.audio._backend = saved; } };
const auRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'menu'; return s; };
FP.test('audio: chaque événement joue son son', () => withBackend(b => {
  FP.audio.consume([{ type: 'bloom' }], auRun(), 1 / 60);
  FP.assert(b.calls.filter(c => c[0] === 'tone').length >= 5, 'bloom = 5 tons');
}));
FP.test('audio: mort par obstacle ≠ mort acide', () => withBackend(b => {
  FP.audio.consume([{ type: 'death', cause: 'solid' }], auRun(), 0); const solid = b.calls.length; b.calls.length = 0; b.advance(1);
  FP.audio.consume([{ type: 'death', cause: 'leak' }], auRun(), 0);
  FP.assertEqual(solid, 2); FP.assertEqual(b.calls.length, 3);
}));
FP.test('audio: anti-rafale par type', () => withBackend(b => {
  const ev = Array.from({ length: 8 }, () => ({ type: 'eco', amount: 500 }));
  FP.audio.consume(ev, auRun(), 0);
  FP.assertEqual(b.calls.length, 3);   // un seul « eco » (2 tons + 1 bruit)
}));
FP.test('audio: drone coupé hors frôlement', () => withBackend(b => {
  const s = auRun(); s.mode = 'bloom';
  FP.audio.consume([], s, 1 / 60);
  FP.assert(b.calls.some(c => c[0] === 'drone' && c[1] === false));
}));
FP.test('audio: sans Web Audio, aucun plantage', () => {
  const saved = FP.audio._backend; FP.audio._backend = null;
  try { FP.audio.consume([{ type: 'bloom' }, { type: 'eco', amount: 1 }], auRun(), 1 / 60); FP.audio.unlock(); }
  finally { FP.audio._backend = saved; }
});
FP.test('flow: entrée en ready → événement ready', () => {
  const s = flowRun(); bloomNow(s); advance(s, 3);
  FP.assertEqual(s.mode, 'ready');
});
```

(Le dernier test vérifie le mode ; l'événement `ready` est contrôlé par une assertion sur `s.events` capturés pendant `advance` — à écrire avec un tampon : remplacer `advance` par une boucle qui accumule `s.events` avant de les vider.)

`loop.test.js` : `consume` reçoit `(events, state, dt)`.

- [ ] **Step 2–4:** rouge → implémenter (`index.html` : `src/audio/audio.js` après `render/frame.js` ; `check.html` : aussi, `audio.js` doit se charger sans `window.AudioContext`) → vert.
- [ ] **Step 5: Navigateur** : démarrage, plop de la pousse, grattement continu, drone qui monte en frôlant, « tic » des ÉcoCrédits™, sons de ramassage, bouclier, spore, éclosion, morts ; aucun son coincé après une mort.
- [ ] **Step 6: Commit** `feat(audio): son procédural de la v3`

---

### Task 2: Particules et secousse

**Files:** Create `src/render/particles.js` ; Modify `src/render/frame.js`, `index.html`

**Interfaces:**
- `FP.particles.draw(ctx, state)` (repère monde) :
  - pas de temps `dt = clamp(state.time − dernierTemps, 0, .05)` ; physique v3 : `life −= dt`, `x += vx·dt`, `y += vy·dt`, `vy += 70·dt`.
  - gerbes (port de `flashParticles` : `vx ±85`, `vy −125..45`, `life .35..98`, `r 1.2..3.8`) déclenchées par : `eco` (10 + min(22, combo·3) ; spore : 16 + min(36, ⌊amount/700⌋)), `bomb` 96, `shieldBreak` 46 « shield », `pickup` 34 « water » / 36 « bud », `death` 38 (« impact » ou « acid », + 28 pour le lixiviat, + 30 pour la brûlure), `toxicEnter` 8 « acid », `bloom` min(92, 58 + 12·bonus) « petal » sur la ligne de surface.
  - débris de croissance (port d'`emitGrowthDebris`) en `playing` : cadence et nombre selon `speed/190`, moins près de la surface, « soil » ou « chip ».
  - budget (port de `particleBudget`) : 84 si `bloom` ou pointe à moins de 160 px du haut de l'écran, sinon 128.
  - dessin (port de `drawParticles`) : pétale, carré éco, terre, éclat, membrane, ronds colorés.
- `frame.js` : secousse avant le zoom — `translate(rand(−3, 3)·shake·7, rand(−3, 3)·shake·7)` (v3 `draw`) ; particules dessinées en dernier dans le monde (après les effets, comme en v3).

- [ ] **Step 1: Implémenter.** `index.html` : `render/particles.js` avant `frame.js`.
- [ ] **Step 2:** tests verts ; `wc -l` < 400.
- [ ] **Step 3: Navigateur** : terre qui gicle derrière la pointe, pétales à l'éclosion, gerbe verte des ÉcoCrédits™, éclats de membrane, onde de spore pleine de particules ; secousse visible à la mort et aux gains ; `FP.state.current.fx.particles.length` ≤ 128 en provoquant spore + mort sur la même frame (Review Focus 4).
- [ ] **Step 4: Commit** `feat(render): particules et secousse d'écran`

---

### Task 3: Clavier

**Files:** Modify `src/ui/input.js`, `src/ui/menu.js`, `dev/tests/input.test.js`

**Interfaces:**
- `FP.input.press()` : front montant sans appui maintenu (`pressed = true`, `down` inchangé).
- `menu.js` : `keydown` Espace/Entrée → démarre un run en `menu`/`over`, sinon `FP.input.press()` (relance en `ready`) ; `preventDefault` pour ne pas faire défiler la page.

- [ ] **Step 1: Test (rouge)**

```js
FP.test('input: une touche appuie sans maintenir', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 });
  FP.input._inject({ down: false }); FP.input.update(s);
  FP.input.press(); FP.input.update(s);
  FP.assert(s.input.pressed && !s.input.down);
});
```

- [ ] **Step 2–4:** rouge → implémenter → vert ; navigateur : Espace au menu, Entrée en `ready`, Espace sur l'écran de fin.
- [ ] **Step 5: Commit** `feat(ui): Espace et Entrée pour démarrer et relancer`

---

### Task 4: Outils `?perf=1` et `?flydebug=1`

**Files:** Create `src/debug/perf.js`, `src/debug/flydebug.js`, `dev/tests/debug.test.js` ; Modify `src/core/loop.js`, `src/render/frame.js`, `src/play/powerups.js`, `src/play/graze.js`, `dev/tests/powerups.test.js`, `index.html`, `dev/check.html`

**Interfaces:**
- `FP.perf` (seulement si `FP.params.perf`) : moyennes glissantes (`lerp .10`, FPS `.08`) de `update`, `render`, et des tranches `soil`, `hazards`, `plant` mesurées dans `frame.js` ; `FP.perf.draw(ctx, state)` : panneau v3 « PERF v4 » + compteurs fleurs / particules / obstacles. Sans `?perf=1`, `FP.perf` vaut `null` et la boucle ne mesure rien.
- Événements de flyover (dans `onFlyover` et `graze.finish`) : `notQualified` (si `time ≥ .24`), `blocked`, `noSpot`, `spawn` ; `bonusMissed` porte `gate: power.shield ? 'FERMÉ' : 'LIBRE'`.
- `FP.flydebug` (seulement si `FP.params.flydebug`) : retient le dernier texte (formats v3) et l'affiche dans un bandeau monospace pendant 1,5 à 2,6 s.

- [ ] **Step 1: Tests (rouges)**

```js
FP.test('debug: profileur absent par défaut', () => FP.assertEqual(FP.perf, null));
FP.test('debug: flydebug absent par défaut', () => FP.assertEqual(FP.flydebug, null));
```

```js
// powerups.test.js
FP.test('powerups: le flyover annonce sa décision', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.power.shield = true;
  FP.powerups.onFlyover(s, o, record());
  FP.assert(s.events.some(e => e.type === 'flyover' && e.outcome === 'blocked' && e.kind === 'water'));
});
```

- [ ] **Step 2–4:** rouge → implémenter → vert.
- [ ] **Step 5: Navigateur** : `?perf=1` → panneau FPS / ms ; `?flydebug=1` → bandeau à chaque flyover (« WATER · 0.92s (0.71 utile) · 66% », « pas flyover · … », « WATER bloqué · power-up actif · … »).
- [ ] **Step 6: Commit** `feat(debug): profileur ?perf=1 et réglage du flyover ?flydebug=1`

---

### Task 5: Parité et docs

**Files:** `docs/architecture.md` (audio, particules, debug ; section « Modes » à jour avec les fondus — relevé de l'étape 6), spec §6 (forme de l'état complète : `garden`, `flow.stage/fade/overReason` — relevé de l'étape 6) et §11 (étape 7 faite), `README.md` (statut « v4.0.0 — parité v3 »), `CHANGELOG.md` (`v4.0.0 — Refonte`), `docs/parite-v3.md` (liste de contrôle : chaque fonctionnalité de la v3.43.16 et où elle vit en v4, avec ce qui a été retiré volontairement).

- [ ] **Step 1: Mettre à jour.**
- [ ] **Step 2: Vérification finale** : tests verts ; tous les fichiers < 400 lignes ; partie complète jouée de la graine à l'écran de fin ; comparaison côte à côte avec l'archive.
- [ ] **Step 3: Commit** `docs: v4.0.0 — parité avec la v3.43.16`

## Relecture finale — reporté après la parité

Corrigé dans `6adb5d1` : bandeau `?flydebug=1` qui pouvait revenir dans la partie suivante ; grattement et débris désynchronisés (battement unique `growthTick`, remis à zéro à chaque tige) ; ordre vieillissement / création des particules ; tranche « plant » de `?perf=1` ; en-têtes et docs.

Mineurs reportés :
- le drone du frôlement s'éteint toujours lentement (.055 / .22 s) ; la v3 coupait vite (.018 / .08 s) sur un choc, une éclosion ou un nouveau run ;
- `?flydebug=1` n'affiche pas « pas flyover » pour un obstacle déjà récompensé ou non éligible (la v3 le faisait) ;
- le bandeau nomme les récompenses `POLLEN` / `SPORE` (la v3 : `BUD` / `BOMB`) ;
- pas de test positif pour les décisions `notQualified` et `noSpot`, ni pour le plafond et les quantités de particules.
