# Architecture v4

Spec complète : `docs/superpowers/specs/2026-10-20-refonte-v4-design.md`.

## Principe

Scripts classiques (pas de modules ES) chargés dans un ordre fixe par `index.html`. Chaque fichier s'enregistre sur `window.FP`. Le jeu s'ouvre par double-clic, sans serveur ni build.

Chaque fichier `src/**` commence par un en-tête : rôle, ce qu'il **lit**, ce qu'il **écrit**, ce qu'il **expose**.

## Carte des fichiers

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
│   ├── graze.js      ✅ frôlement : suivi par objet, paiement à la sortie, annulation au contact, mesures du flyover
│   ├── powerups.js   ✅ flyover → pollen / goutte / spore, exclusivité, ramassage, bouclier organique
│   └── scoring.js    ✅ ÉcoCrédits™, combo, records persistants
├── render/
│   ├── palette.js    ✅ palettes nommées (ciel, strates, pelouse, tige, graine, héros, fleurs) ; couleurs réservées au danger
│   ├── px.js         ✅ boîte à outils pixel : rect, line, disc, ring, dither, downscale, posterize, outline
│   ├── view.js       ✅ canvas, DPR, 9:16 ; toile monde à mi-résolution (FP.view.art)
│   ├── sprites.js    ✅ chargement des PNG, FP.sprites.get(clé)
│   ├── sky.js        ✅ ciel de crépuscule pollué : bandes tramées, soleil voilé, usines, smog qui dérive
│   ├── soil.js       ✅ pelouse et trois strates tramées (humus, argile, pierre), détails clairsemés, en cache
│   ├── obstacles.js  ✅ sprites ramenés sur la grille (8 niveaux par canal, contour), ancrage tramé
│   ├── hazards.js    ✅ nappes tramées (base + pellicule), limaces et sillons, anneau d'exposition
│   ├── powerups.js   ✅ récompenses (naissance, glyphes pixel), membrane du bouclier
│   ├── hero.js       ✅ le héros : tête-bourgeon à visage, humeurs (FP.hero.mood), visages réutilisés par les fleurs
│   ├── plant.js      ✅ tige pixel qui fouit (tunnel, mottes, racines, mycélium ; FP.plantRender.buried), graine, héros, guide, doigt
│   ├── hud.js        ✅ panneaux, messages, écrans ready / over
│   ├── frame.js      ✅ FP.render.frame(state) : toile monde, agrandissement (secousse, zoom), couche nette, fondu
│   ├── effects.js    ✅ anneaux en pixels (frôlement, ramassage, rupture, spore, impact, éclosion) ; chiffres +Ɇ nets
│   ├── flowers.js    ✅ le héros devenu fleur, variantes par fleur (FP.flowersRender.variant), cache des fleurs finies
│   └── particles.js  ✅ gerbes nées des événements, terre et éclats de la pointe, carrés de 1 à 2 pixels, plafond 84 / 128
├── audio/audio.js    ✅ son procédural (Web Audio) : effets, drone de frôlement, grattement de la pousse
├── ui/
│   ├── menu.js       ✅ écran titre / fin de partie → nouveau run ; Espace / Entrée ; redimensionnement
│   └── input.js      ✅ pointeur et touche → state.input (x monde, screenX, y, down, pressed)
└── debug/
    ├── freecam.js    ✅ ?freecam=1 : molette / flèches / glisser
    ├── perf.js       ✅ ?perf=1 : FPS, update, render, tranches de dessin
    └── flydebug.js   ✅ ?flydebug=1 : bandeau des décisions de flyover
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
  mode: 'menu' | 'ready' | 'playing' | 'dying' | 'bloom' | 'over',
  time, seed, level, rng, signature,
  input:  { x, screenX, y, down, active, pressed },
  camera: { y, manual, near, zoom, shake },
  plant:  { seed, tip, dir, guide, trail, oldTrails, stemAge, stemCount, reserves, corruption, toxicTimer, recentToxic, scrapeTimer },
  world:  { width, height, viewH, surfaceY, skyVariant, lawnVariant, safePath, safeRadius, solids, toxics, leaks, bonuses },
  query:  { solid, danger, near, toxic, leak, leakHit, grazes },
  flow:   { timer, message, messageTimer, stage, fade, overReason },
  garden: { flowers },
  graze:  { active /* Map objet → frôlement */ },
  power:  { shield, shieldGrace },
  score:  { eco, flowers, flowerBonus, combo, comboTimer },
  fx:     { particles, effects },
  events: []
}
```

Toute valeur aléatoire de gameplay passe par `state.rng` (seedé), jamais par `Math.random()`.

`createRun(seed, dims)` fixe pour tout le run `world.width`, `world.height` et `world.surfaceY` à partir de la taille de la vue : le niveau garde ses coordonnées. Si la fenêtre change en cours de partie, `ui/menu.js` appelle `FP.state.applyView` qui met à jour `world.viewH` et ramène la caméra dans ses bornes ; au menu, un run neuf est recréé. Le sol couvre toujours la largeur visible. `render/view.js` n'écrit jamais dans l'état. Seules exceptions tolérées côté rendu : `render/obstacles.js` met en cache l'ancrage pixel sur l'objet solide (`o._anchor`) et `render/hazards.js` les images d'une nappe (`o._px`), jamais lus par la simulation.

Un niveau est généré par `FP.level.startRun(state)` (tirage du T-Rex signature puis `generate`) ; `generate` lit uniquement `state.rng`, donc `?seed=N` donne un niveau reproductible dans la v4 (pas le même que dans l'archive v3, qui tirait aussi des éléments retirés).

## Une frame

`FP.loop.step(state, dt)` :

1. `dt` plafonné à `config.loop.maxDt` (dt invalide → `fallbackDt`) ; `state.time += dt` ;
2. dans tous les modes sauf `menu`, `FP[nom].update(state, dt)` pour `input → plant → hazards → collision → graze → scoring → powerups → flow → camera` (un système pas encore porté est sauté ; chacun décide selon `state.mode`). **Tout système expose `update(state, dt)`** : par exemple la requête de pointe vit dans `FP.collision.update` ;
3. `FP.audio.consume(state.events, state, dt)` ;
4. `FP.render.frame(state)` ;
5. `state.events` est vidé.

Avec `?perf=1`, la boucle et `frame.js` mesurent update, render et les tranches sol / dangers / plante (`FP.perf`, `null` sinon).

## Rendu pixel (v4.1.0)

Spec : `docs/superpowers/specs/2026-10-21-rendu-pixel-design.md` ; référence d'ambiance : `docs/art/reference-crepuscule.png`.

- **Deux couches.**
  - Le monde est dessiné dans une toile à mi-résolution, `FP.view.art` : 1 pixel d'art = 2 pixels CSS, environ 220 pixels de large. Elle est ensuite agrandie sans lissage vers l'écran, avec la secousse et le zoom de caméra (les pixels font alors environ 2 à 2,4 px CSS).
  - La couche nette (doigt, HUD, chiffres « +Ɇ », outils de réglage, fondu) est dessinée ensuite, à pleine résolution.
- **Dessin.**
  - Tout dessin du monde passe par `FP.px`, en pixels entiers, sans tracé lissé. Les modules du monde reçoivent le contexte de la toile et appliquent eux-mêmes la caméra (`toArt(y) - toArt(camera.y)`).
  - Pas de transparence : un effet qui s'estompe perd des pixels selon un motif de Bayer.
- **Palettes.**
  - `FP.palette` nomme toutes les couleurs.
  - Le violet chimique des dangers (`FP.palette.toxic`, `FP.palette.slug`, liste `FP.palette.danger`) leur est réservé : des tests vérifient qu'aucune couleur de décor ni aucun vert de la pousse ne s'en approche.
- **Lisibilité.** Terre sombre à contraste bas, sans contour ; contours sombres réservés aux obstacles, à la tige, au héros, aux bonus et aux limaces.
- **Héros.**
  - Son humeur se déduit de l'état existant, sans rien ajouter à la simulation (`FP.hero.mood`). Par priorité : mort, toxique, frôlement, alerte, concentration, calme ; une humeur tient au moins 0,25 s.
  - Les fleurs reprennent son visage, avec une variante tirée d'une empreinte de leurs données.
- **Mesures (v4.1.0, fenêtre de 440 × 783)** : rendu de 0,6 à 0,9 ms en partie, au plus 1,7 ms pendant les effets (spore, bouclier, éclosion). Avec 30 fleurs, la tranche « plante » prend 0,7 ms.

## Ordre de chargement

`index.html` charge : `assets/obstacles/manifest.js`, `src/core/fp.js`, `geom.js`, `config.js`, `state.js`, `src/world/catalog.js`, `level.js`, `hazards.js`, `src/play/plant.js`, `src/world/collision.js`, `src/play/flow.js`, `graze.js`, `scoring.js`, `powerups.js`, `src/play/camera.js`, `src/render/palette.js`, `px.js`, `view.js`, `sprites.js`, `soil.js`, `sky.js`, `obstacles.js`, `hazards.js`, `powerups.js`, `hero.js`, `plant.js`, `hud.js`, `effects.js`, `flowers.js`, `particles.js`, `drillfx.js`, `mound.js`, `frame.js`, `src/audio/audio.js`, `src/debug/perf.js`, `flydebug.js`, `src/core/loop.js`, `src/ui/input.js`, `src/debug/freecam.js`, `src/ui/menu.js`, et enfin `FP.loop.start()`. `dev/check.html` charge aussi `manifest.js` (pour le catalogue).

`dev/check.html` charge aussi `src/audio/audio.js`, `src/debug/perf.js`, `flydebug.js` et `src/ui/input.js` (sans canvas ni paramètre d'URL : `FP.perf` et `FP.flydebug` valent `null`, le son reste muet, le pointeur n'est pas écouté).

## Dangers diffus

- Nappes toxiques (`world.toxics`) : pas de choc. La requête de pointe renvoie leur intensité cumulée ; `flow` augmente `plant.toxicTimer` (×.72/s), pose `plant.corruption` (croissance déviée lue par `plant`), et brûle la pointe au-delà de .82 ; hors nappe, le compteur redescend ×3,6/s.
- Limaces (`world.leaks`) : `hazards.update` calcule leur position courante (`cx, cy, cr`) ; un contact tue (cause `leak`) et pose `hitFlash` ; la couronne de frôlement alimente `query.danger` (zoom).
- Ordre de dessin (v3) : sol, nappes, limaces, obstacles, plante, pellicule toxique, anneau d'exposition, puis HUD.

## Frôlement et score

- `collision` liste les frôlements de la frame (`query.grazes`) ; `graze` tient un frôlement par objet dans `state.graze.active` (Map). Rien n'est payé avant .22 s ; à la sortie, `FP.scoring.award` paie (arrondi à 25) ; un contact ou la fin de la partie annule tout sans payer.
- `scoring` gère le combo (`state.score.combo/comboTimer`, fenêtre 2 s, ×8 max) et les records.
- Exception documentée : `FP.scoring.records` (meilleurs fleurs et ÉcoCrédits™) vit hors de `FP.state`, car il persiste entre les runs ; chargé au démarrage, sauvegardé dès qu'il est battu, dans la clé `flower_power_v4_best`.
- `render/effects.js` transforme les événements `eco` en chiffres flottants rangés dans `state.fx.effects` (réservé au rendu).

## Flyover et power-ups

- À la fin d'un frôlement d'obstacle payant, `graze` appelle `FP.powerups.onFlyover` : évaluation (montée réelle autour puis au-dessus, risque), choix (pollen / goutte / spore selon durée et risque), apparition devant la pointe. Un obstacle ne récompense qu'une fois (`solid.rewarded`).
- Un seul power-up gameplay : tant que `power.shield` tient, ni goutte ni spore n'apparaît (pas de file) ; le pollen reste possible. La spore est instantanée et n'occupe jamais le slot.
- `powerups.update` (après `scoring`, avant `flow`) fait vieillir et ramasser les récompenses (`world.bonuses`, vidées à chaque niveau), puis intercepte un choc solide ou lixiviat : grâce en cours → ignoré ; bouclier → bris (recul de 26 px, direction conservée, .48 s de grâce). Les nappes toxiques ne sont pas concernées.
- Chaque pousse repart sans bouclier ni pollen (`plant.prepare`). L'éclosion compte `1 + flowerBonus` fleurs.

## Éclosion et parterre

- À la surface, `flow` fait éclore `1 + flowerBonus` fleurs en éventail autour de la pointe (`state.garden.flowers`, tirages via `state.rng`) ; elles poussent dans tous les modes et restent tout le run (un nouveau run repart d'un parterre vide).
- `render/flowers.js` dessine les fleurs qui poussent et met en cache celles qui ont fini (âge > 1,05 s et taille ≥ 94 %) : le coût de dessin ne grandit pas avec le parterre.
- Transition (mode `bloom`) : `flow.stage` passe de `show` (1,55 s) à `fadeOut` (.46 s, `flow.fade` 0 → 1), le niveau est régénéré sous le noir, puis `fadeIn` (.48 s, 1 → 0) et `ready`. `frame.js` peint le voile par-dessus tout.
- À la fin de partie, `flow.overReason` garde la cause de la dernière mort pour l'écran de fin.

## Son, particules et outils

- `audio/audio.js` traduit les événements de la frame en sons (recettes de la v3, anti-rafale par type) et tient le drone du frôlement (proximité = timbre, durée = puissance). La pousse qui creuse émet un battement `growthTick { k, near }` (`play/plant.js`, cadence de la v3) : l'audio en fait le grattement, les particules la terre et les éclats, ensemble comme en v3. Le son ne démarre qu'après un premier geste (règle des navigateurs) ; sans Web Audio, le jeu reste muet. `FP.audio._backend` est remplaçable par un espion dans les tests.
- `render/particles.js` crée ses gerbes à partir des événements (comme les effets) et vit dans `state.fx.particles`. Plafond : 84 pendant l'éclosion ou quand la pointe est près du haut de l'écran, 128 sinon.
- `render/mound.js` dessine l'émergence : la pelouse gonfle au-dessus de la pointe (`FP.mound.swell`, pur et testé), se fend à l'événement `bloom`, puis laisse un petit tas au pied de la fleur (`state.fx.mound.heaps`, pour tout le run). `play/flow.js` émet `blossom` `flow.hatchDelay` (.24 s) après `bloom` : l'anneau doré et les pétales partent alors, et la fleur ne pousse qu'à partir de là.
- `?flydebug=1` affiche la décision de chaque flyover : `powerups` émet `{ type: 'flyover', outcome: 'spawn' | 'blocked' | 'noSpot' | 'notQualified', kind, risk, time, effective, progress }`, et `bonusMissed` porte `gate`.

## Modes

`menu` (écran titre) → `playing` (pousse en vol) → `dying` (0,85 s, puis nouveau niveau et nouvelle pousse) ou `bloom` → `ready` (graine posée, attend un **nouvel** appui ou Espace / Entrée) → `playing`… ; `over` quand il n'y a plus de graines (un appui relance un run neuf).

`bloom` enchaîne trois temps (`flow.stage`) : `show` (1,55 s, les fleurs éclosent), `fadeOut` (.46 s, voile noir), nouveau niveau sous le noir, `fadeIn` (.48 s), puis `ready` (événement `ready`).

Pour ajouter un fichier : une ligne `<script>` après ses dépendances (celles listées dans son en-tête « Lit »), avant `ui/menu.js`. Un fichier de simulation (`core/`, `world/`, `play/`) s'ajoute aussi à `dev/check.html`, avant `harness.js`, avec son fichier de tests dans `dev/tests/`. Les fichiers `render/` et `ui/menu.js` ne sont pas chargés par `check.html` (ils ont besoin du DOM), sauf `palette.js`, `px.js`, `hero.js` et `flowers.js`, qui ne touchent pas au DOM au chargement et sont testés.

## Vérification

- `dev/check.html` : assertions sur la simulation, sans rendu. `node dev/run-checks.js` exécute la même liste en ligne de commande.
- Gamefeel : `archive/v3.43.16/index.html?seed=N` côte à côte avec la v4, même taille de fenêtre.
- `node dev/tools/import-sprite.js <image.png> <kind> <id> <largeur>` : importe un déchet généré sur fond cyan uni (détourage, recadrage, contour de collision calculé et vérifié, `<id>.png`, `<id>.json`, entrée du manifeste). Il reste à l'ajouter aux tables d'apparition et aux messages de mort (`config.js`).
- `node dev/bench-level.js` : temps de génération d'un niveau (v4.0.1 : médiane 20 ms à 300 px de large, 3 ms à 440 px).
- Parterre (`?perf=1`, tranche `plant`) : 30 fleurs finies coûtent 0,01 ms de plus que 0 (cache) ; seules les fleurs en train de pousser sont redessinées.
- Mise à jour, son et rendu sont gardés séparément (`core/loop.js`) : une erreur est signalée une fois en console et n'arrête pas les autres ; `frame.js` restaure toujours le contexte du canvas.
