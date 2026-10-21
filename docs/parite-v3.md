# Parité v4.0.0 ↔ v3.43.16

Liste de contrôle : chaque fonctionnalité de la v3.43.16 (`archive/v3.43.16/index.html`), le fichier v4 qui la porte et la fonction v3 d'origine. Les réglages de gameplay vivent tous dans `src/core/config.js` ; les recettes de son et de particules restent dans `audio/audio.js` et `render/particles.js`.

## Porté

| Fonctionnalité | v4 | v3 |
|---|---|---|
| Boucle, dt plafonné à .033 s | `core/loop.js` | `loop` |
| Graine, croissance, pilotage, trace, anciennes tiges | `play/plant.js`, `render/plant.js` | `prepareStem`, `launchPreparedStem`, `update`, `drawPlant`, `drawTrail` |
| Caméra défilante, cadrage ×1,18, zoom de frôlement, secousse | `play/camera.js`, `render/frame.js` | `updateCamera`, `draw` |
| Pointeur (souris / doigt), Espace / Entrée | `ui/input.js`, `ui/menu.js` | `setPointer`, écouteur `keydown` |
| 11 familles PNG + T-Rex signature, JSON authorés | `world/catalog.js`, `render/sprites.js`, `render/obstacles.js` | catalogue authoré, `drawPixelSolidSprite`, `drawObstacleSoilAnchor*` |
| Génération : chemin sûr, SAT, densité, T-Rex réservé, débordement contrôlé par les bords | `world/level.js` | `generateSoil`, `generateSafePath`, `makeSolidCandidate`, `tooCloseTo*` |
| Nappes toxiques : exposition, corruption, brûlure | `world/hazards.js`, `play/flow.js`, `render/hazards.js` | `toxicIntensityAt`, exposition dans `update`, `drawToxicZone*` |
| Limaces de lixiviat : trajets, contact, clignotement | `world/hazards.js`, `world/collision.js`, `render/hazards.js` | limaces dans `update`, `drawHazards` |
| Requête de pointe unique (solide, toxique, limace, frôlements, danger) | `world/collision.js` | `tipHazardQuery` |
| Frôlement, ÉcoCrédits™, combo ×8, annulation au contact | `play/graze.js`, `play/scoring.js`, `render/effects.js` | `updateEcoGrazes`, `finishGraze`, `addEcoCredits` |
| Records persistants (`flower_power_v4_best`) | `play/scoring.js`, `core/fp.js` (`FP.storage`) | records dans `addEcoCredits*` et `die` |
| Flyover : évaluation, choix pollen / goutte / spore, apparition prédictive, exclusivité | `play/powerups.js` | `assessFlyover`, `spawnFlyoverBonus`, `findFlyoverBonusSpawn` |
| Bouclier organique, spore (nettoyage, 2 000 Ɇ par obstacle), récompense ratée | `play/powerups.js`, `render/powerups.js` | `collectBonus`, `detonateBomb`, `shatterOrganicShield` |
| Morts (obstacle, limace, brûlure), écran de fin et sa cause | `play/flow.js`, `render/hud.js` | `die` |
| Éclosion, fleurs illustrées, parterre en cache, fondus entre niveaux | `play/flow.js`, `render/flowers.js`, `render/frame.js` | `bloom`, `drawIllustratedFlower`, `drawFade` |
| HUD : panneaux, messages, ligne d'effet, « touche pour pousser » | `render/hud.js` | `drawHUD` |
| Sol, ciel, pelouse en cache offscreen | `render/soil.js` | `drawSoil` |
| Effets : chiffres +Ɇ, anneaux, ramassage, rupture, onde de spore, impact | `render/effects.js` | `drawEffects` |
| Particules : gerbes, terre et éclats de la pointe, plafond 84 / 128 | `render/particles.js` | `flashParticles`, `emitGrowthDebris`, `drawParticles` |
| Son procédural : effets, drone de frôlement, grattement de la pousse | `audio/audio.js` | `sfx`, `tone`, `noise`, `*GrazeDrone`, `sfxGrowthScrape` |
| `?perf=1` : FPS, update, render, tranches de dessin | `debug/perf.js` | `drawPerfHUD` |
| `?flydebug=1` : bandeau des décisions de flyover | `debug/flydebug.js` | `flyDebugText` |
| `?seed=N` : niveau reproductible (aussi ajouté à l'archive) | `core/fp.js` | — |
| `?freecam=1` : inspection d'un niveau | `debug/freecam.js` | — (nouveau) |

## Retiré volontairement

Voir la spec, §7 « Retiré ou archivé » : dessin vectoriel des obstacles, les 13 familles sans PNG (elles reviendront avec leurs PNG), collisions procédurales, portes béton / tuyau, bonus `amber`, `?talisman=1`, timers `invincible` / `speed`, bascule d'échelle A/B, anciennes clés de record v3.19 à v3.29.

## Différences connues

- Une même graine ne donne pas le même niveau dans les deux versions : la v3 tirait aussi les éléments retirés.
- Le bandeau `?flydebug=1` nomme les récompenses avec les noms v4 (`POLLEN`, `SPORE`) là où la v3 écrivait `BUD`, `BOMB`.
- Les défauts mineurs relevés pendant les relectures de la refonte sont listés dans les plans d'étapes (`docs/superpowers/plans/`) ; ils seront traités après la parité.
