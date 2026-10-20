# Architecture v4

Spec complète : `docs/superpowers/specs/2026-10-20-refonte-v4-design.md`.

## Principe

Scripts classiques (pas de modules ES) chargés dans un ordre fixe par `index.html`. Chaque fichier s'enregistre sur `window.FP`. Le jeu s'ouvre par double-clic, sans serveur ni build.

Chaque fichier `src/**` commence par un en-tête : rôle, ce qu'il **lit**, ce qu'il **écrit**, ce qu'il **expose**.

## Carte des fichiers

✅ existe · ⏳ à venir (étape)

```text
src/
├── core/
│   ├── fp.js         ✅ window.FP, maths, RNG seedée, paramètres d'URL, stockage sûr
│   ├── config.js     ✅ tous les réglages
│   ├── state.js      ✅ FP.state.createRun(seed) et FP.state.current
│   └── loop.js       ✅ FP.loop.step / start, ordre fixe d'une frame
├── world/
│   ├── catalog.js    ⏳ (1) familles + chargement des PNG authorés
│   ├── level.js      ⏳ (1) génération : chemin sûr, placement SAT, densité
│   ├── collision.js  ⏳ (2) distance polygone, broad phase, requête de pointe
│   └── hazards.js    ⏳ (3) zones toxiques + limaces de lixiviat
├── play/
│   ├── plant.js      ⏳ (2) croissance, pilotage, trace
│   ├── camera.js     ⏳ (2) caméra défilante (FP.camera)
│   ├── graze.js      ⏳ (4) frôlement + évaluation du flyover
│   ├── powerups.js   ⏳ (5) pollen, bouclier, spore, exclusivité
│   └── scoring.js    ⏳ (4) ÉcoCrédits™, combos, records
├── render/
│   ├── view.js       ✅ canvas, DPR, 9:16
│   ├── frame.js      ✅ FP.render.frame(state) — fond provisoire
│   └── …             ⏳ soil, obstacles, hazards, plant, flowers, effects, hud
├── audio/audio.js    ⏳ (7)
├── ui/
│   ├── menu.js       ✅ écran titre → nouveau run
│   └── input.js      ⏳ (2)
└── debug/            ⏳ (7) perf.js (?perf=1), flydebug.js (?flydebug=1)
```

## Les 4 règles

1. **400 lignes maximum par fichier.**
2. **La simulation écrit, le rendu lit.** `world/*` et `play/*` modifient l'état ; `render/*`, `audio/*` et le HUD ne font que le lire (exception : `state.fx`, réservé au rendu).
3. **Le gameplay émet des événements** (`state.events.push({type, …})`) ; rendu et audio y réagissent. Le gameplay n'appelle jamais une fonction de rendu ou d'audio.
4. **Tous les chiffres réglables vivent dans `config.js`.**

## L'état

L'état de la partie en cours est `FP.state.current`, créé par `FP.state.createRun(seed?)`. `FP.state` lui-même est l'espace de noms qui porte `createRun` et `current`.

```js
{
  mode: 'menu' | 'playing' | 'dying' | 'bloom',
  time, seed, level, rng,
  camera: { y, zoom, shake },
  plant:  { tip, dir, trail, stemAge, reserves },
  world:  { solids, toxics, leaks, surfaceY, height },
  graze:  { active /* Map */, combo, comboTimer },
  power:  { shield, shieldGrace, sporeTimer, bonuses },
  score:  { eco, flowers, flowerBonus },
  fx:     { particles, effects, message },
  events: []
}
```

Toute valeur aléatoire de gameplay passe par `state.rng` (seedé), jamais par `Math.random()`.

`world.surfaceY` est calculé par `createRun` à partir de `FP.view.H` et reste fixe pendant tout le run (comme en v3). `render/view.js` n'écrit jamais dans l'état.

## Une frame

`FP.loop.step(state, dt)` :

1. `dt` plafonné à `config.loop.maxDt` (dt invalide → `fallbackDt`) ; `state.time += dt` ;
2. en mode `playing`, `FP[nom].update(state, dt)` pour `input → plant → hazards → collision → graze → powerups → scoring → camera` (un système pas encore porté est sauté). **Tout système expose `update(state, dt)`** : par exemple la requête de pointe vit dans `FP.collision.update` ;
3. `FP.audio.consume(state.events)` ;
4. `FP.render.frame(state)` ;
5. `state.events` est vidé.

## Ordre de chargement

`index.html` charge : `assets/obstacles/manifest.js`, puis `src/core/fp.js`, `config.js`, `state.js`, `src/render/view.js`, `frame.js`, `src/core/loop.js`, `src/ui/menu.js`, et enfin `FP.loop.start()`.

Pour ajouter un fichier : une ligne `<script>` après ses dépendances (celles listées dans son en-tête « Lit »), avant `ui/menu.js`. Un fichier de simulation (`core/`, `world/`, `play/`) s'ajoute aussi à `dev/check.html`, avant `harness.js`, avec son fichier de tests dans `dev/tests/`. Les fichiers `render/` et `ui/` ne sont pas chargés par `check.html` (ils ont besoin du DOM).

## Vérification

- `dev/check.html` : assertions sur la simulation, sans rendu. `node dev/run-checks.js` exécute la même liste en ligne de commande.
- Gamefeel : `archive/v3.43.16/index.html?seed=N` côte à côte avec la v4, même taille de fenêtre.
