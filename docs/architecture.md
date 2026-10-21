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
│   ├── geom.js       ✅ distance point-segment, local→monde, SAT, cône vers le haut, distance signée à un polygone
│   ├── config.js     ✅ tous les réglages
│   ├── state.js      ✅ FP.state.createRun(seed) et FP.state.current
│   └── loop.js       ✅ FP.loop.step / start, ordre fixe d'une frame
├── world/
│   ├── catalog.js    ✅ JSON authorés → solides (taille, collision, miroir, footprint)
│   ├── level.js      ✅ génération : chemin sûr, solides (SAT), T-Rex signature, nappes toxiques, limaces
│   ├── collision.js  ✅ requête de pointe : solide, intensité toxique, contact lixiviat, frôlements en cours, danger
│   └── hazards.js    ✅ limaces en mouvement (cx, cy, cr, hitFlash), intensité des nappes
├── play/
│   ├── plant.js      ✅ croissance, pilotage, trace (prepare / launch / update)
│   ├── flow.js       ✅ morts (solide, lixiviat, brûlure toxique), exposition, éclosion minimale, transitions, messages
│   ├── camera.js     ✅ défilement, cadrage ×1,18, zoom de frôlement
│   ├── graze.js      ✅ frôlement : suivi par objet, paiement à la sortie, annulation au contact (flyover : étape 5)
│   ├── powerups.js   ⏳ (5) pollen, bouclier, spore, exclusivité
│   └── scoring.js    ✅ ÉcoCrédits™, combo, records persistants
├── render/
│   ├── view.js       ✅ canvas, DPR, 9:16
│   ├── sprites.js    ✅ chargement des PNG, FP.sprites.get(clé)
│   ├── soil.js       ✅ ciel + pelouse + terre en cache offscreen
│   ├── obstacles.js  ✅ ancrage sombre en cache + sprite
│   ├── hazards.js    ✅ nappes (base + pellicule), limaces et sillons, anneau d'exposition
│   ├── plant.js      ✅ tige, anciennes traces, graine, bourgeon, guide, cercle du doigt
│   ├── hud.js        ✅ panneaux, messages, écrans ready / over
│   ├── frame.js      ✅ FP.render.frame(state) : zoom, caméra, sol, obstacles, plante, HUD
│   ├── effects.js    ✅ chiffres +Ɇ flottants, anneaux de frôlement
│   └── …             ⏳ flowers, particules
├── audio/audio.js    ⏳ (7)
├── ui/
│   ├── menu.js       ✅ écran titre / fin de partie → nouveau run ; redimensionnement
│   └── input.js      ✅ pointeur → state.input (x monde, screenX, y, down, pressed)
└── debug/
    ├── freecam.js    ✅ ?freecam=1 : molette / flèches / glisser
    └── …             ⏳ (7) perf.js (?perf=1), flydebug.js (?flydebug=1)
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

`createRun(seed, dims)` fixe pour tout le run `world.width`, `world.height` et `world.surfaceY` à partir de la taille de la vue : le niveau garde ses coordonnées. Si la fenêtre change en cours de partie, `ui/menu.js` appelle `FP.state.applyView` qui met à jour `world.viewH` et ramène la caméra dans ses bornes ; au menu, un run neuf est recréé. Le sol couvre toujours la largeur visible. `render/view.js` n'écrit jamais dans l'état. Seule exception tolérée côté rendu : `render/obstacles.js` met en cache le pochoir d'ancrage sur l'objet solide (`o._stencil`), jamais lu par la simulation.

Un niveau est généré par `FP.level.startRun(state)` (tirage du T-Rex signature puis `generate`) ; `generate` lit uniquement `state.rng`, donc `?seed=N` donne un niveau reproductible dans la v4 (pas le même que dans l'archive v3, qui tirait aussi des éléments retirés).

## Une frame

`FP.loop.step(state, dt)` :

1. `dt` plafonné à `config.loop.maxDt` (dt invalide → `fallbackDt`) ; `state.time += dt` ;
2. dans tous les modes sauf `menu`, `FP[nom].update(state, dt)` pour `input → plant → hazards → collision → graze → powerups → scoring → flow → camera` (un système pas encore porté est sauté ; chacun décide selon `state.mode`). **Tout système expose `update(state, dt)`** : par exemple la requête de pointe vit dans `FP.collision.update` ;
3. `FP.audio.consume(state.events)` ;
4. `FP.render.frame(state)` ;
5. `state.events` est vidé.

## Ordre de chargement

`index.html` charge : `assets/obstacles/manifest.js`, `src/core/fp.js`, `geom.js`, `config.js`, `state.js`, `src/world/catalog.js`, `level.js`, `hazards.js`, `src/play/plant.js`, `src/world/collision.js`, `src/play/flow.js`, `graze.js`, `scoring.js`, `src/play/camera.js`, `src/render/view.js`, `sprites.js`, `soil.js`, `obstacles.js`, `hazards.js`, `plant.js`, `hud.js`, `effects.js`, `frame.js`, `src/core/loop.js`, `src/ui/input.js`, `src/debug/freecam.js`, `src/ui/menu.js`, et enfin `FP.loop.start()`. `dev/check.html` charge aussi `manifest.js` (pour le catalogue).

`dev/check.html` charge aussi `src/ui/input.js` (ses écouteurs ne s'installent que si `FP.view` existe).

## Dangers diffus

- Nappes toxiques (`world.toxics`) : pas de choc. La requête de pointe renvoie leur intensité cumulée ; `flow` augmente `plant.toxicTimer` (×.72/s), pose `plant.corruption` (croissance déviée lue par `plant`), et brûle la pointe au-delà de .82 ; hors nappe, le compteur redescend ×3,6/s.
- Limaces (`world.leaks`) : `hazards.update` calcule leur position courante (`cx, cy, cr`) ; un contact tue (cause `leak`) et pose `hitFlash` ; la couronne de frôlement alimente `query.danger` (zoom).
- Ordre de dessin (v3) : sol, nappes, limaces, obstacles, plante, pellicule toxique, anneau d'exposition, puis HUD.

## Frôlement et score

- `collision` liste les frôlements de la frame (`query.grazes`) ; `graze` tient un frôlement par objet dans `state.graze.active` (Map). Rien n'est payé avant .22 s ; à la sortie, `FP.scoring.award` paie (arrondi à 25) ; un contact ou la fin de la partie annule tout sans payer.
- `scoring` gère le combo (`state.score.combo/comboTimer`, fenêtre 2 s, ×8 max) et les records.
- Exception documentée : `FP.scoring.records` (meilleurs fleurs et ÉcoCrédits™) vit hors de `FP.state`, car il persiste entre les runs ; chargé au démarrage, sauvegardé dès qu'il est battu, dans la clé `flower_power_v4_best`.
- `render/effects.js` transforme les événements `eco` en chiffres flottants rangés dans `state.fx.effects` (réservé au rendu).

## Modes

`menu` (écran titre) → `playing` (pousse en vol) → `dying` (0,85 s, puis nouveau niveau et nouvelle pousse) ou `bloom` (1,55 s, puis niveau suivant) → `ready` (graine posée, attend un **nouvel** appui) → `playing`… ; `over` quand il n'y a plus de graines (un appui relance un run neuf).

Pour ajouter un fichier : une ligne `<script>` après ses dépendances (celles listées dans son en-tête « Lit »), avant `ui/menu.js`. Un fichier de simulation (`core/`, `world/`, `play/`) s'ajoute aussi à `dev/check.html`, avant `harness.js`, avec son fichier de tests dans `dev/tests/`. Les fichiers `render/` et `ui/` ne sont pas chargés par `check.html` (ils ont besoin du DOM).

## Vérification

- `dev/check.html` : assertions sur la simulation, sans rendu. `node dev/run-checks.js` exécute la même liste en ligne de commande.
- Gamefeel : `archive/v3.43.16/index.html?seed=N` côte à côte avec la v4, même taille de fenêtre.
