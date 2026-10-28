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
│   ├── coins.js      ✅ circuits de pièces (v4.5.0) : un chapelet facile et un appât par hauteur d'écran, tirage propre
│   ├── boss.js       ✅ niveau de boss (v4.12.0, FP.bossLevel) : 4 tronçons alternés, points faibles, montures de défense, trappe, couloir sûr, graine propre à (graine, saison, milieu)
│   ├── collision.js  ✅ requête de pointe : solide, intensité toxique, contact lixiviat, frôlements en cours, danger
│   └── hazards.js    ✅ limaces en mouvement (cx, cy, cr, hitFlash), intensité des nappes
├── play/
│   ├── plant.js      ✅ croissance, pilotage, trace (prepare / launch / update)
│   ├── flow.js       ✅ morts (solide, lixiviat, brûlure toxique), exposition, éclosion, transitions (plus de messages texte : l'interface se déduit de l'état)
│   ├── boss.js       ✅ le boss (v4.12.0, FP.boss) : cycle des défenses (repos, avertissement, coup), perçage des points faibles, ouverture de la trappe, `state.bossFight`
│   ├── camera.js     ✅ défilement, cadrage ×1,18 (zoomFrame, toScreen, toWorld), zoom de frôlement
│   ├── graze.js      ✅ frôlement : suivi par objet, paiement à la sortie, annulation au contact, mesures du flyover
│   ├── coins.js      ✅ ramassage des pièces (FP.coinPlay) : pièce au combo en cours, bonus du chapelet complet
│   ├── shop.js       ✅ boutique de fin de pousse (FP.shop) : tirage de 3 articles (un à −50 %), coches, commande, effets
│   ├── powerups.js   ✅ flyover → pollen / goutte / spore, exclusivité, ramassage, bouclier organique
│   └── scoring.js    ✅ ÉcoCrédits™, combo, records persistants
├── render/
│   ├── palette.js    ✅ palettes nommées (ciel, strates, pelouse, tige, graine, héros, fleurs) ; couleurs réservées au danger
│   ├── px.js         ✅ boîte à outils pixel : rect, line, disc, ring, dither, downscale, posterize, outline
│   ├── view.js       ✅ canvas, DPR, 9:16 ; toile monde à mi-résolution (FP.view.art)
│   ├── sprites.js    ✅ chargement des PNG, FP.sprites.get(clé)
│   ├── decor-tube.js  ✅ conduites usées (coudes, cassures, rouille, galeries effondrées) pour les décors enterrés (FP.decorTube)
│   ├── decor-friche.js, decor-industrie.js, decor-decharge.js, decor-nucleaire.js ✅ décor de chaque milieu (v4.11.0) : astre et météo, horizon, accessoires de surface, décor enterré, petites animations (FP.decor[id], contrat commun)
│   ├── boss.js       ✅ le boss provisoire (v4.12.0, FP.bossRender) : tronçons, panneau, points faibles, défenses, trappe, flèche, dessinés en blocs par le code (images : docs/art/prompts-boss.md)
│   ├── sky.js        ✅ ciel : bandes tramées de la nuance du niveau, puis le ciel et l'horizon du décor du milieu (deux caches)
│   ├── soil.js       ✅ pelouse et trois strates tramées (humus, argile, pierre), détails clairsemés, accessoires et décor enterré du milieu, en cache ; petites animations du décor à l'écran
│   ├── obstacles.js  ✅ sprites ramenés sur la grille (8 niveaux par canal, contour), ancrage tramé
│   ├── coins.js      ✅ jetons ÉcoCrédits™ rouillés qui tournent (FP.coinsRender), éclats au ramassage
│   ├── hazards.js    ✅ nappes tramées (base + pellicule), limaces et sillons, anneau d'exposition
│   ├── powerups.js   ✅ récompenses (naissance, glyphes pixel), membrane du bouclier
│   ├── faces.js      ✅ briques de visage communes : gros yeux, grandes bouches, une forme par humeur (FP.faces)
│   ├── cast.js       ✅ casting des pousses : registre (FP.cast) et personnages 1 à 8
│   ├── cast2.js      ✅ personnages 9 à 16
│   ├── hero.js       ✅ le héros : tête-bourgeon du personnage de la pousse, humeurs (FP.hero.mood), tête composée (FP.hero.paint)
│   ├── plant.js      ✅ tige pixel qui fouit (tunnel, mottes, racines, mycélium ; FP.plantRender.buried), graine, héros, guide, doigt (dessiné dans la toile d'interface)
│   ├── frame.js      ✅ FP.render.frame(state) : toile monde, agrandissement (secousse, zoom), toile d'interface, outils, fondu
│   ├── effects.js    ✅ anneaux en pixels (frôlement, ramassage, rupture, spore, impact, éclosion) ; chiffres +Ɇ en police pixel
│   ├── flowers.js    ✅ la pousse devenue fleur, avec le visage fleur de son personnage ; variantes par fleur (FP.flowersRender.variant), cache des fleurs finies
│   └── particles.js  ✅ gerbes nées des événements, terre et éclats de la pointe, carrés de 1 à 2 pixels, plafond 84 / 128
├── audio/
│   ├── synth.js      ✅ moteur FM façon Mega Drive (voix 2 opérateurs, batterie, écho, bus musique / effets / général) — seul à créer des nœuds Web Audio
│   ├── score.js      ✅ constructeurs de partition partagés (FP.score : song, melody, doubles croches, fonte)
│   ├── songs.js      ✅ partitions : thème du titre (A), friche (4 variantes de B, une par pousse, et son boss), reggae de la boutique, jingles
│   ├── songs-industrie.js ✅ zone industrielle : « funk à la chaîne », 3 variantes et le boss (v4.10.0)
│   ├── songs-decharge.js  ✅ décharge : « cumbia de la benne », 3 variantes et le boss
│   ├── songs-nucleaire.js ✅ site nucléaire : « disco radieux, EDM malade », 3 variantes et le boss
│   ├── sequencer.js  ✅ séquenceur (FP.sequencer.notesBetween, pur) planifié sur l'horloge audio ; tempo changé en début de mesure
│   ├── music.js      ✅ direction musicale (morceau par mode, couches, tempo, veille, baisses ; purs et testés)
│   ├── sfx.js        ✅ effets FM, sons d'interface, jingles, bourdonnement du frôlement, ronron de la pousse
│   └── audio.js      ✅ chef d'orchestre : déblocage, événements → effets et musique, réglage tout / effets seuls / muet, pause onglet caché
├── ui/
│   ├── font.js       ✅ police bitmap 5×7 (FP.font : has, measure, wrap, draw), glyphes rendus en cache
│   ├── hud.js        ✅ HUD des coins du bas (FP.hud.items, pur) : graines, ÉcoCrédits™, pollen et combo actifs, « TOUCHER POUR POUSSER »
│   ├── shout.js      ✅ cri de mort (FP.shout.textFor), aide de première pousse (FP.shout.helpFor)
│   ├── cheer.js      ✅ cri du chapelet complet (« KARMA ! », « GREEN ! », « 0 DÉCHET ! ») et son montant
│   ├── order.js      ✅ bon de commande en papier recyclé (FP.orderForm) : mise en page, zones de toucher, dessin
│   ├── logo.js       ✅ logo groovy radioactif (FP.logo.layout, pur) : lettres tramées, anneaux, coulures, trèfle
│   ├── title.js      ✅ écran titre
│   ├── certificate.js ✅ certificat de fin (FP.certificate.lines, canRestart, purs)
│   ├── ui.js         ✅ FP.ui.draw : efface la toile d'interface et dessine l'écran du mode
│   ├── menu.js       ✅ démarrage depuis le titre ou la fin (après le tampon) ; Espace / Entrée ; redimensionnement
│   └── input.js      ✅ pointeur et touche → state.input (x monde, screenX, y, down, pressed)
└── debug/
    ├── freecam.js    ✅ ?freecam=1 : molette / flèches / glisser
    ├── perf.js       ✅ ?perf=1 : FPS, update, render, tranches de dessin
    └── flydebug.js   ✅ ?flydebug=1 : bandeau des décisions de flyover
```

## Les 4 règles

1. **400 lignes maximum par fichier.**
2. **La simulation écrit, le rendu lit.** `world/*` et `play/*` modifient l'état ; `render/*`, `ui/*` et `audio/*` ne font que le lire (exception : `state.fx`, réservé au rendu et à l'interface — `state.fx.ui` pour `ui/*`). `ui/menu.js` écrit aussi `state.camera.y` (titre, tout en haut) et `state.score.recordBefore` (records d'avant la partie, pour le certificat).
3. **Le gameplay émet des événements** (`state.events.push({type, …})`) ; rendu et audio y réagissent. Le gameplay n'appelle jamais une fonction de rendu ou d'audio.
4. **Tous les chiffres réglables vivent dans `config.js`.**

## L'état

L'état de la partie en cours est `FP.state.current`, créé par `FP.state.createRun(seed?)`. `FP.state` lui-même est l'espace de noms qui porte `createRun` et `current`.

```js
{
  mode: 'splash' | 'menu' | 'ready' | 'playing' | 'dying' | 'bloom' | 'shop' | 'won' | 'over',
  time, seed, level, rng, signature,
  run:    { milieu, step, saison, bosses, boss, card, won },   // milieux (v4.9.0), écrit par play/flow.js seul
  input:  { x, screenX, y, down, active, pressed },
  camera: { y, manual, near, zoom, shake },
  plant:  { seed, tip, dir, guide, trail, oldTrails, stemAge, stemCount, reserves, corruption, toxicTimer, recentToxic, scrapeTimer, cast, castRng, character },
  world:  { width, height, viewH, surfaceY, milieu, boss, bossLevel, skyVariant, lawnVariant, safePath, safeRadius, solids, toxics, leaks, bonuses, coins, chains },
  query:  { solid, danger, near, toxic, leak, leakHit, grazes },
  flow:   { timer, stage, fade, overReason, blossom, next, won },
  bossFight: { pierced, phase },   // v4.12.0 : un booléen par point faible, gardé après une mort ; phase du cycle des défenses (en cycles) ; remis à zéro par FP.boss.reset (seul play/boss.js l'écrit)
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
2. dans tous les modes sauf `splash` et `menu`, `FP[nom].update(state, dt)` pour `input → plant → hazards → boss → collision → graze → coinPlay → scoring → powerups → shop → flow → camera` (un système pas encore porté est sauté ; chacun décide selon `state.mode`). **Tout système expose `update(state, dt)`** : par exemple la requête de pointe vit dans `FP.collision.update` ;
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
  - **Casting (v4.4.0).** Chaque pousse reçoit un des 16 personnages de `FP.config.cast.ids`, tirés sans remise (`state.plant.cast`, mélangée par `state.plant.castRng`, tiré de la graine de la partie : `state.rng` n'est jamais touché). Un personnage déclare ses couches (`back`, `eyes`, `mouth`, `front`, `flower`) dans `render/cast*.js` ; le reste vient de `render/faces.js`. Sa bouche spéciale ne sort qu'au calme et en concentration : le danger reprend toujours la main. Tout tient dans ±12 pixels autour du centre de la tête.
  - Les fleurs d'une éclosion copient le personnage de la pousse (`flower.character`) et portent son visage fleur ; forme, pétales et teinte restent tirés d'une empreinte de leurs données.
- **Mesures (v4.1.0, fenêtre de 440 × 783)** : rendu de 0,6 à 0,9 ms en partie, au plus 1,7 ms pendant les effets (spore, bouclier, éclosion). Avec 30 fleurs, la tranche « plante » prend 0,7 ms.

## Interface pixel (v4.2.0)

Spec : `docs/superpowers/specs/2026-10-22-interface-pixel-design.md` ; maquettes : `docs/art/maquette-*.png`.

- **Toile d'interface.** `FP.view.ui` a la taille de la toile monde (1 pixel d'art = 2 px CSS) mais est transparente. `FP.ui.draw` l'efface et y dessine l'écran du mode (`menu` : titre ; `playing`/`dying`/`bloom`/`ready` : doigt, HUD, cri, aide ; `over` : certificat). `render/frame.js` l'agrandit ensuite sans lissage, **sans** secousse ni zoom (tranche « ui » de `?perf=1`).
- **Police.** `FP.font` : glyphes 5×7 en capitales, contour encre et ombre ; chaque glyphe est rendu une fois par couleur et échelle, puis recopié (`drawImage`). Aucun `getImageData` dans `ui/*` : le jeu marche en file://.
- **Simulation.** Elle n'affiche plus de texte : l'interface se déduit de l'état et des événements (`death` pour le cri, `state.flow.overReason` pour le certificat).

## Ordre de chargement

`index.html` charge : `assets/obstacles/manifest.js`, `src/core/fp.js`, `geom.js`, `config.js`, `state.js`, `src/world/catalog.js`, `level.js`, `coins.js`, `boss.js`, `hazards.js`, `src/play/plant.js`, `src/world/collision.js`, `src/play/flow.js`, `graze.js`, `scoring.js`, `powerups.js`, `boss.js` (play), `src/play/camera.js`, `src/render/palette.js`, `decor-tube.js`, `decor-friche.js`, `decor-industrie.js`, `decor-decharge.js`, `decor-nucleaire.js`, `px.js`, `boss.js` (rendu), `view.js`, `sprites.js`, `soil.js`, `sky.js`, `obstacles.js`, `hazards.js`, `powerups.js`, `faces.js`, `cast.js`, `cast2.js`, `hero.js`, `plant.js`, `effects.js`, `flowers.js`, `particles.js`, `drillfx.js`, `mound.js`, `src/ui/font.js`, `hud.js`, `shout.js`, `cheer.js`, `cards.js`, `logo.js`, `title.js`, `certificate.js`, `ui.js`, `src/render/frame.js`, `src/audio/synth.js`, `score.js`, `songs.js`, `songs-industrie.js`, `songs-decharge.js`, `songs-nucleaire.js`, `sequencer.js`, `music.js`, `sfx.js`, `audio.js`, `src/debug/perf.js`, `flydebug.js`, `src/core/loop.js`, `src/ui/input.js`, `src/debug/freecam.js`, `src/ui/menu.js`, et enfin `FP.loop.start()`. `dev/check.html` charge aussi `manifest.js` (pour le catalogue).

`dev/check.html` charge aussi les fichiers `src/audio/*`, `src/debug/perf.js`, `flydebug.js` et `src/ui/input.js` (sans canvas ni paramètre d'URL : `FP.perf` et `FP.flydebug` valent `null`, le son reste muet, le pointeur n'est pas écouté).

## Milieux (v4.9.0)

- Une partie traverse les quatre milieux de `FP.config.milieux` (friche, zone industrielle, décharge, site nucléaire). Chacun dure `FP.config.run.steps` (3) pousses réussies — une éclosion compte pour une, pollen ou non ; une mort ne compte pas —, puis le bon de commande s'ouvre et le niveau suivant est celui du boss (`state.run.boss`). L'éclore bat le boss ; `play/flow.js` passe alors au milieu suivant avant de générer le niveau. Après le quatrième : écran de fin (mode `won`) la première fois, puis saison suivante (gains × `saison`).
- La boutique ne s'ouvre plus qu'avant un boss et à la dernière chance.
- `world/level.js` tire les obstacles dans les tables de bande restreintes aux familles du milieu (`FP.level.tableFor`) et écrit `world.milieu` ; le T-Rex ne vit qu'au site nucléaire.
- Les couleurs d'un milieu (ciel, strates, pelouse) sont dans `FP.palette.milieux[id]`, ses dessins dans `FP.decor[id]` (`render/decor-*.js`, v4.11.0, spec `docs/superpowers/specs/2026-10-28-decors-milieux-design.md`) : `sky.js` peint son astre et son horizon, `soil.js` ses accessoires et son décor enterré (placements tirés de la graine du niveau) ; `render/sky.js`, `soil.js`, `mound.js`, `plant.js` et `obstacles.js` lisent `world.milieu` (les caches du ciel, de la terre et des anciennes tiges l'ont dans leur clé).
- `ui/cards.js` dessine les cartons (`state.run.card` : `milieu`, `boss`, `victory`) et l'écran de fin ; le HUD montre le milieu et le multiplicateur de saison, le certificat les sites réhabilités, le titre le record de progression (`FP.scoring.records.reach`).

## Le boss (v4.12.0)

Spec `docs/superpowers/specs/2026-10-28-moteur-boss-design.md`. Le niveau de boss (`state.run.boss`) est généré par `FP.bossLevel.generate` (appelé par `FP.level.generate`) : 4 tronçons de 60 % de la largeur (`segWidth`), du bas vers le haut, accrochés tour à tour à gauche et à droite : ils dépassent le milieu, le couloir sûr zigzague d'un flanc à l'autre (la verticale du centre ne frôle pas les points faibles), et l'intervalle entre deux tronçons est assez haut pour que la traversée en diagonale reste sous `level.safePath.maxSlope` ; un point faible par tronçon, au milieu de sa face côté couloir ; une défense (piston, jet ou bras, selon le milieu : `config.boss.pairs`) à `mountK` du haut de la même face ; une trappe sous la pelouse, fermée tant que les 4 points ne sont pas percés. Tout est dans `world.bossLevel` ; les tronçons, défenses et la trappe sont aussi des solides (`kind: 'boss' | 'defense' | 'trap'`) pour la collision, ceux au repos portant `off`.
`FP.boss.update` (entre `hazards` et `collision`) anime les défenses : une phase continue (`state.bossFight.phase`, en cycles) avance de dt / période, la période raccourcissant de 20 % par point percé — un perçage accélère le cycle sans faire sauter une défense en coup ; `FP.boss.stageAt(i, phase)` en déduit l'étape (pur, lu aussi par le rendu). Il perce un point quand la pointe arrive à `weakHit`, ouvre la trappe au 4ᵉ (`events` : `bossPierce`, `bossTrap`). La trappe fermée tue toujours : ni le bouclier (membrane) ni sa grâce ne l'absorbent (`play/powerups.js`). Avant et pendant un boss (`state.run.boss`), la boutique ne tire ni Lobbying ni Bière anti-limaces, sans effet sur ce niveau. Les points percés vivent dans `state.bossFight.pierced` : ils survivent à une mort, `FP.boss.reset` les efface au milieu suivant. L'éclosion sous la pelouse bat le boss (`bossDown`, carton « BOSS VAINCU »).
Le rendu (`render/boss.js`) est provisoire : blocs dessinés par le code, aux couleurs de `FP.palette.boss`. Sa flèche vise le prochain point non percé au-dessus de la pointe quand l'écran zoomé ne le montre pas ; son ancre est en pixels d'écran, par le cadrage de `FP.camera.zoomFrame` / `toScreen` / `toWorld` — le même que `render/frame.js` applique. Un perçage fait jaillir étincelles (`render/particles.js`) et jetons (`render/coins.js`), en plus du gain flottant. Les vraies images sont décrites dans `docs/art/prompts-boss.md`, non générées.

## Dangers diffus

- Nappes toxiques (`world.toxics`) : pas de choc. La requête de pointe renvoie leur intensité cumulée ; `flow` augmente `plant.toxicTimer` (×.72/s), pose `plant.corruption` (croissance déviée lue par `plant`), et brûle la pointe au-delà de .82 ; hors nappe, le compteur redescend ×3,6/s.
- Limaces (`world.leaks`) : `hazards.update` calcule leur position courante (`cx, cy, cr`) ; un contact tue (cause `leak`) et pose `hitFlash` ; la couronne de frôlement alimente `query.danger` (zoom).
- Ordre de dessin (v3) : sol, nappes, limaces, obstacles, plante, pellicule toxique, anneau d'exposition, puis HUD.

## Frôlement et score

- `collision` liste les frôlements de la frame (`query.grazes`) ; `graze` tient un frôlement par objet dans `state.graze.active` (Map). Rien n'est payé avant .22 s ; à la sortie, `FP.scoring.award` paie (arrondi à 25) ; un contact ou la fin de la partie annule tout sans payer.
- `scoring` gère le combo (`state.score.combo/comboTimer`, fenêtre 2 s, ×8 max) et les records.
- **Pièces (v4.5.0).** `world/coins.js` pose les chapelets à la fin de `FP.level.generate` avec son propre générateur (graine ^ salt ^ niveau) : `state.rng` n'est pas touché, les niveaux restent ceux d'avant. `coinPlay` (après `graze`, avant `scoring`) ramasse à 14 px : une pièce paie 25 Ɇ au multiplicateur du combo en cours et en relance le délai sans le faire monter (`FP.scoring.awardCoin`, gain discret sans nombre flottant) ; le chapelet complet paie 150 (facile) ou 400 (appât) par `FP.scoring.award` (+1 cran) et émet `chainDone` ; une pièce laissée à plus de 40 px sous la pointe rate son chapelet.
- **Boutique (v4.6.0).** Entre deux pousses, le mode `shop` affiche un bon de commande (`state.shop`) : 3 articles tirés (tirage propre : graine ^ salt ^ passage) dont un à −50 %, achetés au score (qui baisse, jamais sous 0 ; le record ne baisse pas). Déroulé : mort → nouveau niveau + `prepare` → `shop` → lancement ; éclosion → fondu → `shop` → `ready` ; dernière mort → `shop` de dernière chance (Graine Bio™ garantie) → lancement si une graine est achetée, sinon `over`. Les effets vivent dans `state.boosts`, effacés à la fin de chaque pousse (`die`, `bloom`) : `FP.plant.launch` applique membrane (bouclier) et spore (`FP.powerups.detonate`), les systèmes lisent leur drapeau (aimant et premium : pièces ; compost : vitesse ; bière : limaces ; filtre : brûlure des nappes) ; Lobbying regénère le niveau (`FP.level.generate(state, { lobbying: true })`).
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

- Son (v4.3.0, spec `docs/superpowers/specs/2026-10-22-sound-design-design.md`) : tout est synthétisé en FM, sans fichier. `audio/audio.js` traduit les événements de la frame en effets (`audio/sfx.js`, anti-rafale par type) et confie la musique à `audio/music.js`, qui pilote le séquenceur (minuteur de 25 ms) : thème A au titre ; en jeu, le morceau du milieu du niveau généré (`world.milieu`), une variante par pousse, et le thème du boss sur un niveau de boss (`world.boss`) — il change sous le noir du fondu, en relais de fin de mesure entre deux variantes d'un même milieu (v4.10.0, spec `docs/superpowers/specs/2026-10-27-musique-milieux-design.md`) ; couches de mêmes rôles dans tous les morceaux (percussions au frôlement, couche toxique dans une nappe, mélodie près de la surface, toujours ouverte au boss), tempo propre au morceau +4 BPM par pousse réussie dans le milieu, veille entre deux niveaux, A doux après le tampon du certificat. Les sons d'interface (réveil, lettres du cri, certificat, icône) sont appelés directement par `ui/*` via `FP.audio.sfx(nom)`. La pousse qui creuse émet un battement `growthTick { k, near }` (`play/plant.js`) : l'audio en fait le ronron, les particules la terre et les éclats. Réglage du son sur l'écran titre (icône), mémorisé sous `flower_power_v4_sound`. Le son ne démarre qu'après un premier geste (règle des navigateurs) ; sans Web Audio, le jeu reste muet. `FP.audio._backend` est remplaçable par un espion dans les tests.
- `render/particles.js` crée ses gerbes à partir des événements (comme les effets) et vit dans `state.fx.particles`. Plafond : 84 pendant l'éclosion ou quand la pointe est près du haut de l'écran, 128 sinon.
- `render/mound.js` dessine l'émergence : la pelouse gonfle au-dessus de la pointe (`FP.mound.swell`, pur et testé), se fend à l'événement `bloom`, puis laisse un petit tas au pied de la fleur (`state.fx.mound.heaps`, pour tout le run). `play/flow.js` émet `blossom` `flow.hatchDelay` (.24 s) après `bloom` : l'anneau doré et les pétales partent alors, et la fleur ne pousse qu'à partir de là.
- `?flydebug=1` affiche la décision de chaque flyover : `powerups` émet `{ type: 'flyover', outcome: 'spawn' | 'blocked' | 'noSpot' | 'notQualified', kind, risk, time, effective, progress }`, et `bonusMissed` porte `gate`.

## Modes

`splash` (écran d'accueil figé « PRESS TO START », au lancement seulement : le premier appui débloque le son, passe en plein écran sur écran tactile et réveille le titre) → `menu` (écran titre) → `playing` (pousse en vol) → `dying` (0,85 s, puis nouveau niveau et nouvelle pousse) ou `bloom` → `ready` (graine posée, attend un **nouvel** appui ou Espace / Entrée) → `playing`… ; `over` quand il n'y a plus de graines (le certificat ; un appui relance un run neuf une fois le tampon tombé).

`bloom` enchaîne trois temps (`flow.stage`) : `show` (1,55 s, les fleurs éclosent), `fadeOut` (.46 s, voile noir), nouveau niveau sous le noir, `fadeIn` (.48 s), puis `ready` (événement `ready`).

Pour ajouter un fichier : une ligne `<script>` après ses dépendances (celles listées dans son en-tête « Lit »), avant `ui/menu.js`. Un fichier de simulation (`core/`, `world/`, `play/`) s'ajoute aussi à `dev/check.html`, avant `harness.js`, avec son fichier de tests dans `dev/tests/`. Les fichiers `render/` et `ui/menu.js` ne sont pas chargés par `check.html` (ils ont besoin du DOM), sauf `palette.js`, `decor-*.js`, `px.js`, `faces.js`, `cast.js`, `cast2.js`, `hero.js`, `flowers.js`, `soil.js`, `plant.js`, `drillfx.js`, `mound.js`, `obstacles.js` et les `ui/*` purs (`font`, `hud`, `shout`, `logo`, `title`, `certificate`), qui ne touchent pas au DOM au chargement et sont testés.

## Vérification

- `dev/check.html` : assertions sur la simulation, sans rendu. `node dev/run-checks.js` exécute la même liste en ligne de commande.
- Gamefeel : `archive/v3.43.16/index.html?seed=N` côte à côte avec la v4, même taille de fenêtre.
- `node dev/tools/import-sprite.js <image.png> <kind> <id> <largeur>` : importe un déchet généré sur fond cyan uni (détourage, recadrage, contour de collision calculé et vérifié, `<id>.png`, `<id>.json`, entrée du manifeste). Il reste à l'ajouter aux tables d'apparition et aux messages de mort (`config.js`).
- `node dev/bench-level.js` : temps de génération d'un niveau (v4.0.1 : médiane 20 ms à 300 px de large, 3 ms à 440 px).
- Parterre (`?perf=1`, tranche `plant`) : 30 fleurs finies coûtent 0,01 ms de plus que 0 (cache) ; seules les fleurs en train de pousser sont redessinées.
- Mise à jour, son et rendu sont gardés séparément (`core/loop.js`) : une erreur est signalée une fois en console et n'arrête pas les autres ; `frame.js` restaure toujours le contexte du canvas.
