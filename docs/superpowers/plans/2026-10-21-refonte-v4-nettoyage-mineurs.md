# Nettoyage des défauts mineurs (v4.0.1) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**But :** traiter les défauts mineurs relevés par les relectures des étapes 0 à 7. Chacun est soit corrigé, soit mesuré, soit écarté avec sa raison écrite ; aucun ne reste « à voir ».

**Architecture :** inchangée (spec `docs/superpowers/specs/2026-10-20-refonte-v4-design.md`, `docs/architecture.md`). Chaque correction est TDD (rouge → vert) quand elle touche la simulation. Pour le rendu, la preuve est une vérification dans le navigateur.

**Tech :** JS classique sur `window.FP`, Canvas 2D, Web Audio ; banc `node dev/run-checks.js` (165 tests au départ).

**Référence gamefeel :** `archive/v3.43.16/index.html`.

## Contraintes globales

- 400 lignes maximum par fichier ; en-tête rôle / Lit / Écrit / Expose à jour dans chaque fichier touché.
- La simulation écrit, le rendu lit (exception : `state.fx` et les caches privés).
- Tous les réglages de gameplay dans `config.js`. Les constantes purement visuelles du rendu et de l'audio peuvent rester dans leur fichier, nommées.
- Aléatoire de gameplay : `state.rng`. Aléatoire sensoriel : `Math.random`.
- Aucun changement de ressenti non voulu : à chaque tâche, une partie jouée côte à côte avec la v3.

## Points de vigilance

1. **Une erreur dans un système en cours de partie :** le jeu doit continuer à tourner (frame suivante) et l'erreur doit être visible en console une seule fois par message, pas 60 fois par seconde → test Tâche 1.
2. **Une spore ramassée sur la même frame qu'un choc avec l'obstacle qu'elle détruit :** la pousse survit (v3) → test Tâche 2.
3. **Un frôlement qui se termine sur la frame de l'éclosion :** aucun paiement (v3 : `bloom()` sort avant `updateEcoGrazes`) → test Tâche 2.
4. **Fenêtre plus petite que 300 × 520 :** l'image reste en 9:16, réduite, jamais écrasée → vérification navigateur Tâche 1.
5. **`?seed=` au-delà de 2³² − 1 :** graine refusée (niveau aléatoire), pas de graine tronquée en silence → test Tâche 1.

---

### Tâche 1 : Robustesse du noyau

**Fichiers :** `src/core/loop.js`, `src/core/fp.js`, `src/core/state.js`, `src/render/view.js`, `src/ui/input.js`, `src/render/sprites.js`, `dev/tests/{loop,fp,state,input,catalog}.test.js`, `README.md`.

**Décisions :**
- `loop.start` : `requestAnimationFrame(tick)` **avant** `step`. `step` est enveloppé dans un `try/catch` qui fait `console.error` une fois par message distinct (`FP.loop._errors`, un `Set`), puis vide `state.events` pour ne pas rejouer l'événement fautif.
- `FP.storage.readNumber` n'est utilisé nulle part : on le supprime avec ses deux tests. Cela règle aussi « '' lu comme 0 ».
- `parseParams` : graine acceptée seulement si `/^\d+$/` et ≤ 4294967295, sinon `null`. README : « entier de 0 à 4 294 967 295 ».
- `createRun` : `query.grazes: []` dès la création.
- `view.resize` : si la taille affichée est sous `minW × minH`, on agrandit **les deux** dimensions du même facteur `k = max(minW / w, minH / h)` au lieu de les borner séparément.
- `input` : `FP.input._reset()` remet le tampon à `{ x: 0, y: 0, down: false, active: false, pressed: false }`. Le harnais l'appelle avant chaque test.
- `sprites` : on supprime le repli `source.file` (sensible à la casse : `nuclearWaste.png` contre `nuclearwaste.png`) ; seul `runtime.src` sert.

- [ ] **Étape 1 : tests rouges**

```js
FP.test('loop: une erreur de système ne fige pas la partie', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing';
  const saved = FP.camera.update; let calls = 0;
  FP.camera.update = () => { calls++; throw new Error('boom'); };
  try { FP.loop.step(s, 1 / 60); FP.loop.step(s, 1 / 60); } finally { FP.camera.update = saved; }
  FP.assertEqual(calls, 2); FP.assertEqual(s.events.length, 0);
});
FP.test('fp: graine hors 32 bits refusée', () => {
  FP.assertEqual(FP.parseParams('?seed=4294967295').seed, 4294967295);
  FP.assertEqual(FP.parseParams('?seed=4294967296').seed, null);
});
FP.test('state: la requête initiale a sa liste de frôlements', () => FP.assert(Array.isArray(FP.state.createRun(1, { W: 440, H: 783 }).query.grazes)));
FP.test('input: _reset vide le tampon', () => { FP.input._inject({ down: true }); FP.input._reset(); const s = FP.state.createRun(1, { W: 440, H: 783 }); FP.input.update(s); FP.assert(!s.input.down && !s.input.pressed && !s.input.active); });
FP.test('catalog: chaque asset a son runtime.src', () => { for (const a of Object.values(FP.catalog.assets)) FP.assert(a.runtime && a.runtime.src, a.id); });
```

`step` attrape l'erreur au niveau de `step` lui-même ; l'appelant (le test, ou `tick`) ne la voit pas.

- [ ] **Étape 2 : implémenter.** Lancer `node dev/run-checks.js` : tout vert.
- [ ] **Étape 3 : navigateur.**
  - Une fenêtre de 280 × 480 garde le 9:16.
  - Une erreur forcée en console (`FP.flow.update = () => { throw 1 }`) laisse le rendu tourner.
- [ ] **Étape 4 : commit** `fix(core): boucle résistante aux erreurs, graine bornée, 9:16 sous la taille minimale`.

### Tâche 2 : Règles de jeu alignées sur la v3

**Fichiers :** `src/play/powerups.js`, `src/play/graze.js`, `src/world/collision.js`, `dev/tests/{powerups,graze,collision}.test.js`.

**Décisions :**
- **Flyover sans place libre (`noSpot`) :** il ne marque plus l'obstacle comme récompensé. La v3 ne posait `_flyoverRewarded` que sur `blocked` ou après une apparition (v3 l. 1735-1757).
- **Spore qui sauve sur la même frame (v3 : ramassage avant la requête de pointe, l. 2207-2211) :** si `powerups.update` fait détoner une spore, il recalcule `state.query` via `FP.collision.update(state)` avant le contrôle du bouclier.
- **Éclosion :** `graze.update` ne paie rien si `plant.tip.y <= world.surfaceY` sur cette frame ; c'est `flow` qui annule ensuite.
- **`?flydebug=1` :** la décision `notQualified` est émise avant le test `rewarded / flyoverEligible`, comme la v3 (l. 1775-1780).
- **Lixiviat :** au contact, toutes les limaces touchées clignotent, pas seulement la première. `collision` pose `hitFlash` sur chacune.
- **Zone libre d'apparition :** on reprend les marges de `bonusSpawnClear` de la v3, valeurs copiées dans `config.flyover.spawn`.

- [ ] **Étape 1 : tests rouges**

```js
FP.test('powerups: pas de place → l’obstacle peut encore récompenser', () => {
  const s = puRun(); const o = qualifyingFlyover(s); s.world.bonuses = Array.from({ length: 40 }, (_, i) => ({ type: 'pollen', x: 20 + i * 10, y: 700, r: 13, phase: 0, forming: 0, formMax: .48, age: 0 }));
  FP.powerups.onFlyover(s, o, record());
  FP.assert(s.events.some(e => e.type === 'flyover' && e.outcome === 'noSpot')); FP.assert(!o.rewarded);
});
FP.test('powerups: une spore ramassée sauve du choc de la même frame', () => { /* spore sur la pointe, obstacle sous la pointe, query.solid posé : après update, query.solid === null et mode 'playing' */ });
FP.test('graze: rien n’est payé sur la frame de l’éclosion', () => { /* frôlement actif de 1 s, pointe à surfaceY - 1, plus de frôlement dans query : aucun événement eco */ });
FP.test('powerups: un obstacle déjà récompensé annonce encore « pas flyover »', () => { /* o.rewarded = true, record({ time: .5, effectiveTime: .1 }) : événement flyover notQualified */ });
FP.test('collision: toutes les limaces touchées clignotent', () => { /* deux limaces sur la pointe : hitFlash > 0 sur les deux */ });
```

- [ ] **Étape 2 : implémenter.** `node dev/run-checks.js` : tout vert.
- [ ] **Étape 3 : simulation.** Lancer 100 parties simulées comme à l'étape 5. Les proportions de flyover (pollen / goutte / spore) restent du même ordre (23 / 27 / 7 sur 62), à ± 30 % près.
- [ ] **Étape 4 : commit** `fix(play): flyover, spore et éclosion comme en v3`.

### Tâche 3 : Rendu et son alignés sur la v3

**Fichiers :** `src/render/frame.js`, `src/render/effects.js`, `src/audio/audio.js`, `src/render/flowers.js`, `docs/parite-v3.md`.

**Décisions :**
- **Anneau d'exposition :** il est dessiné **avant** la pellicule toxique, comme dans `drawPlant` puis `drawToxicOverlays` de la v3.
- **Bonus manqué :** l'événement `bonusMissed` crée un effet `pickup` en fondu seul (`r 11`, `.26 s`).
- **Drone :** coupure rapide (`.018`, arrêt à `+.08 s`) quand la frame contient `death`, `shieldBreak`, `bloom` ou `runStart` ; coupure lente sinon.
- **Parterre :** les marges de masquage du parterre reprennent celles de `drawFlowerCache` de la v3.
- **Noms du bandeau flydebug :** on garde les noms v4 (`POLLEN` / `SPORE`) et on le note dans `parite-v3.md` (« Différences connues »).

- [ ] **Étape 1 : test rouge (audio)** : `audio: le drone coupe vite sur un choc`. Avec un backend espion qui enregistre l'argument `fast` de `drone(false, fast)` : `consume([{ type: 'death', cause: 'solid' }], …)` → `fast === true`.
- [ ] **Étape 2 : implémenter**, puis vérifier dans le navigateur :
  - l'anneau d'exposition est sous la pellicule ;
  - un bonus manqué laisse un bref anneau ;
  - le drone se tait net à l'impact (à l'oreille, par l'utilisateur).
- [ ] **Étape 3 : commit** `fix(render): ordre de l'exposition, bonus manqué, coupure du drone comme en v3`.

### Tâche 4 : Réglages de gameplay dans `config.js`

**Fichiers :** `src/core/config.js`, `src/world/level.js`, `src/world/collision.js`, `src/ui/input.js`, `src/render/frame.js`, `src/play/camera.js`, `src/render/hud.js`, `src/play/powerups.js`.

À déplacer (le nom de clé est imposé) :

| Valeur | Fichier aujourd'hui | Clé |
|---|---|---|
| 4 variantes de ciel / pelouse, miroir .5 | level.js | `level.skyVariants`, `level.lawnVariants`, `level.mirrorChance` |
| lobes, taches, `ANGLED`, `MORPHS` des nappes et limaces | level.js | `level.toxics.shape`, `level.leaks.shape` |
| point focal .22 / .78 (x), .20 / .78 (y) | input.js, frame.js | `camera.focalX`, `camera.focalY` (`{ min, max }`) |
| seuil de zoom 1.002 | input.js, frame.js | `camera.zoomEpsilon` |
| phase large + 10 | collision.js | `graze.broadPad` |
| plancher d'intensité .02 | collision.js | `graze.minIntensity` |
| pas d'élan 3 % par tige (HUD, v3 l. 4038 : `100 + (stemCount − 1) · 3`) | hud.js | `text.elanStep` (valeur 3 : c'est un affichage de la v3, pas un dérivé de la vitesse) |
| durées de messages et textes de la spore | powerups.js | `text.spore`, `powerups.messageTime` |

Restent dans leur fichier, nommées en tête : le masquage des obstacles (44 / + 90) et le pas de 60 de la caméra libre (debug).

- [ ] **Étape 1 : déplacer.** `node dev/run-checks.js` doit rester vert sans aucune modification de test : c'est la preuve que rien n'a bougé.
- [ ] **Étape 2 : déterminisme.** `?seed=7` doit donner le même niveau avant et après. Comparer `JSON.stringify` des solides, nappes et limaces dans un test temporaire, retiré avant le commit.
- [ ] **Étape 3 : commit** `refactor(config): réglages de gameplay restants dans config.js`.

### Tâche 5 : Tests manquants

**Fichiers :** `dev/tests/{graze,powerups,flow,scoring}.test.js`, `dev/tests/e2e.test.js` (nouveau, chargé en dernier dans `check.html`).

- [ ] **Étape 1 : écrire.**
  - `e2e: frôler puis sortir paie` : `collision.update`, puis `graze.update` sur 40 frames le long d'un obstacle, puis une frame hors bande → un `eco` d'un montant multiple de 25.
  - `e2e: un flyover complet fait naître une récompense` : pointe qui monte le long d'un obstacle éligible pendant ~1 s → `bonusSpawn`.
  - `graze: score ≥ 55 mais paiement < 75 → rien` : régler `time` et `score` de l'enregistrement pour que le paiement arrondi vaille 50.
  - `flow: redimensionner pendant le fondu` : `applyView` pendant `fadeOut`, le fondu continue et `ready` arrive.
  - `powerups: décision noSpot` est couvert par la Tâche 2.
- [ ] **Étape 2 :** `node dev/run-checks.js` : tout vert. Ces tests décrivent un comportement existant, donc ils doivent passer sans modifier `src/`. S'ils échouent, c'est un bug : on le corrige dans cette tâche avec son propre commit.
- [ ] **Étape 3 : commit** `test: parcours complets frôlement → score et flyover`.

### Tâche 6 : Mesures et documentation

**Fichiers :** `dev/bench-level.js` (nouveau, Node), `docs/architecture.md`, `docs/parite-v3.md`, `src/world/level.js` (si besoin), `src/play/powerups.js` (en-tête), `AGENTS.md`, `CHANGELOG.md`, `README.md`.

- [ ] **Étape 1 : génération.** Écrire `dev/bench-level.js` sur le modèle de `run-checks.js` : il chronomètre 50 générations à `W = 300` et à `W = 440`. Seuil : médiane < 120 ms à 300. Au-delà, on réduit les essais de placement (réglage dans `config.level.solids`), puis on remesure. Le résultat va dans `architecture.md`.
- [ ] **Étape 2 : parterre.** Avec `?perf=1`, relever la tranche `plant` avec 0 puis 30 fleurs (forcer `state.garden.flowers`) et noter le résultat. Si l'écart dépasse 0,5 ms, on le traite.
- [ ] **Étape 3 : pivot du chemin sûr.** `level.js` suppose un pivot centré. On ajoute une assertion dans `catalog.test.js` : `pivot === [.5, .5]` pour tous les assets. Si un futur asset la casse, il faudra alors généraliser.
- [ ] **Étape 4 : documentation.**
  - En-tête de `powerups.js` : ajouter `camera.shake` et le tirage `rng` de la phase.
  - CHANGELOG : **convention à confirmer avec l'utilisateur** (voir ci-dessous).
  - Entrée `v4.0.1 — nettoyage`.
- [ ] **Étape 5 : commit** `docs: mesures et nettoyage v4.0.1`.

## Question ouverte pour l'utilisateur

`AGENTS.md` dit « une entrée CHANGELOG par commit », mais depuis l'étape 0 on écrit une entrée par étape ou version. Il faut choisir : aligner `AGENTS.md` sur la pratique (une entrée par version, recommandé), ou revenir à une entrée par commit.

## Écartés

- Le plafond de particules et les quantités des gerbes ne sont pas testés unitairement : c'est du rendu, vérifié dans le navigateur à l'étape 7.
