# Flower Power — Refonte v4 : design

Date : 2026-10-20
Statut : validé en conversation, en attente de relecture écrite

## 1. Contexte et problème

La v3.43.16 tient dans un seul `index.html` de 4 148 lignes (220 Ko, ~230 fonctions, 60+ variables globales dans une seule fermeture). Chaque version est produite par une IA qui régénère le fichier entier, puis téléversée. Conséquences observées :

- chaque passe perd ou invente des détails, et empile une couche au lieu de remplacer la précédente ;
- trois chemins de dessin d'obstacles coexistent (PNG authorés, `drawAsset*` vectoriels, `drawSlice*`/`drawObstacleCharacter`) et deux systèmes de collision (polygone authoré et formes procédurales), reliés par des `if(hasAuthoredAsset(o))` ;
- simulation et rendu partagent les mêmes globales : une passe visuelle peut casser le gameplay (cf. v3.42.3) ;
- la documentation a décroché (README v3.42.1, roadmap v3.42.1/v3.43, code v3.43.16.1) ;
- l'extraction progressive prévue par la roadmap n'a jamais eu lieu.

## 2. Objectifs

1. Une itération ne touche qu'un ou deux fichiers de 400 lignes maximum, jamais le jeu entier.
2. Une passe visuelle ne peut pas modifier le gameplay, et inversement.
3. Un seul chemin de dessin et de collision pour les obstacles.
4. Le gamefeel de la v3.43.16 est conservé ; l'ancien jeu sert de référence.

Cible : navigateur desktop récent sous Windows, ouverture de `index.html` par double-clic (`file://`). Le mobile viendra plus tard.

### Hors périmètre

- Changer le game design.
- Moteur, framework, outil de build, npm.
- Support mobile dédié.
- Nouveaux assets.

## 3. Approche retenue

- **Découpage : scripts classiques + espace de noms `window.FP`.** `index.html` charge les fichiers `src/**` dans un ordre fixe via `<script src>`. Compatible `file://`. Migration future vers les modules ES mécanique.
- **Migration : reconstruction guidée.** Nouveau squelette propre, puis portage d'un système à la fois en recopiant depuis l'ancien `index.html` (archivé), sans recopier le code mort ou dupliqué.

Alternatives écartées : modules ES natifs (exigent un serveur local), outil de build (YAGNI), extraction progressive (déjà échouée, conserve les couches mortes), réécriture de zéro (perd les réglages de gamefeel).

## 4. Arborescence

```text
flower-power/
├── index.html            canvas + menu + liste ordonnée des <script>
├── style.css
├── AGENTS.md             contrat d'itération (§8)
├── assets/obstacles/     inchangé (PNG + JSON + manifest.js)
├── src/
│   ├── core/
│   │   ├── fp.js         crée window.FP ; maths ; RNG seedée
│   │   ├── config.js     tous les réglages : tables de spawn, seuils flyover, palettes, vitesses
│   │   ├── state.js      createRun() : l'unique objet d'état
│   │   └── loop.js       boucle principale, ordre fixe des updates puis du rendu
│   ├── world/
│   │   ├── catalog.js    familles + chargement des assets authorés
│   │   ├── level.js      génération : chemin sûr, placement SAT, densité
│   │   ├── collision.js  distance polygone, broad phase, requête de pointe
│   │   └── hazards.js    zones toxiques + limaces de lixiviat (simulation)
│   ├── play/
│   │   ├── plant.js      croissance, pilotage, trace
│   │   ├── graze.js      frôlement + évaluation du flyover
│   │   ├── powerups.js   spawn, bouclier, spore, pollen, exclusivité
│   │   └── scoring.js    ÉcoCrédits™, combos, records
│   ├── render/           soil, obstacles, hazards, plant, flowers, effects, hud
│   ├── audio/audio.js
│   ├── ui/               input.js, menu.js
│   └── debug/            perf.js (?perf=1), flydebug.js (?flydebug=1)
├── dev/check.html        assertions de simulation sans rendu
├── archive/
│   ├── v3.43.16/         ancien index.html complet (référence gamefeel)
│   └── docs/             anciennes docs
├── docs/                 design.md, architecture.md
├── README.md
└── CHANGELOG.md
```

Chaque fichier `src/**` commence par un en-tête : rôle, ce qu'il lit dans l'état, ce qu'il y écrit, ce qu'il expose sur `FP`.

## 5. Règles d'architecture

1. **400 lignes maximum par fichier.** Au-delà, découpage dans une étape dédiée avant toute nouvelle fonctionnalité.
2. **La simulation écrit, le rendu lit.** `world/*` et `play/*` modifient `FP.state` ; `render/*`, `audio/*` et le HUD ne font que le lire (exception : `state.fx`, réservé au rendu).
3. **Le gameplay émet des événements.** Il pousse `{type, ...}` dans `state.events` (ex. `shieldBreak`, `graze`, `death`, `bonusSpawn`, `bonusCollect`, `bloom`) ; rendu et audio y réagissent. Le gameplay n'appelle jamais une fonction de rendu ou d'audio.
4. **Tous les chiffres réglables vivent dans `config.js`.**

## 6. État et frame

```js
FP.state = {
  mode: 'menu' | 'playing' | 'dying' | 'bloom',
  time, seed, level,
  camera: { y, zoom, shake },
  plant:  { tip, dir, trail, stemAge, reserves },
  world:  { solids, toxics, leaks, surfaceY, height },
  graze:  { active /* Map */, combo, comboTimer },
  power:  { shield, shieldGrace, sporeTimer, bonuses },
  score:  { eco, flowers, flowerBonus },
  fx:     { particles, effects, message },
  events: []
};
```

`createRun(seed, viewH)` construit l'état complet, `world.surfaceY` compris ; aucune autre variable mutable globale.

Ordre d'une frame (`loop.js`) : `input` → `plant` → `hazards` → `collision` (une seule requête de pointe consolidée) → `graze` → `powerups` → `scoring` → `camera`, chacun via `update(state, dt)` → `audio.consume(events)` → `render.*` → `events = []`. (Amendé après la revue de l'étape 0 : ajout de `hazards` et `camera`.)

Chaque module gère ses propres timers.

## 7. Périmètre de la v4.0

### Porté depuis la v3.43.16

- Pousse : pilotage, croissance, trace, caméra défilante.
- 12 familles PNG authorées : server, nuclear, tire, sarcophagus, drone, solar, battery, cone, trashbag, extinguisher, microwave + T-Rex signature (une apparition maximum par partie). Le JSON authoré reste la source de vérité (worldWidth, pivot, mirrorSafe, polygone, grazeRadius, flyoverEligible).
- Placement : empreinte visuelle SAT avec marge, aucun chevauchement entre solides, densité cible (abandon après N essais), chemin sûr garanti, réservation du T-Rex signature avant la population standard.
- Zones toxiques diffuses (ignorent le bouclier) et limaces de lixiviat.
- Frôlement → flyover qualifié (progression ascendante réelle) → pollen (hors slot) / goutte-bouclier / spore ; un seul power-up gameplay actif ; spawn prédictif devant la pointe, rejeté dans un danger ; récompense ratée qui disparaît derrière la pointe ; bris de bouclier sans modifier la direction de pilotage.
- ÉcoCrédits™, combos, records (une seule nouvelle clé localStorage `flower_power_v4_best`).
- Sol en cache offscreen, fleurs cuites, palettes ciel/pelouse de la v3.43.
- Audio procédural, `?perf=1`, `?flydebug=1`, nouveau `?seed=N`.
- Cadrage B (+18 %, pousse -12 %, densité -8 %) fixé.

### Retiré ou archivé

- Dessin vectoriel des obstacles (`drawAsset*` d'obstacles, `drawSlice*`, `drawObstacleCharacter`, `inkObject`, `rough*`, `dirtyObjectTexture`).
- Les 13 familles sans PNG (sign, scooter, phone, plastic, canister, concrete, pipe, arcade, fossil, mascot, rock, trex ordinaire) : elles reviendront avec leurs PNG.
- Collisions procédurales (rectangle, ellipse, capsule).
- `OBSTACLE_VARIANTS` et autocollants satiriques : copiés dans `archive/docs/` comme banque de gags.
- Portes béton/tuyau (`addGateBlock`).
- Bonus `amber`, `?talisman=1`, timers `invincible`/`speed`.
- Bascule d'échelle A/B.
- Anciennes clés de record v3.19 à v3.29.

Les glyphes de bonus (source, spore, pollen) restent dessinés en Canvas dans `render/`.

## 8. Contrat d'itération (contenu d'`AGENTS.md`)

1. Chaque demande nomme les fichiers modifiables (un ou deux). L'IA renvoie ces fichiers en entier, et rien d'autre.
2. `index.html` n'est modifié que pour ajouter une ligne `<script>`.
3. Réglage → `config.js` uniquement. Visuel → `render/*` uniquement, jamais `play/*`.
4. Un fichier > 400 lignes est découpé d'abord, dans une étape séparée.
5. Pas de code mort « au cas où » : ce qui est remplacé est supprimé.
6. Une demande = un commit = une entrée de CHANGELOG ; `dev/check.html` vert et une partie jouée avant de valider.

Recommandation : itérer avec Claude Code directement sur le dépôt git (modifications ciblées, diff visible) plutôt que par régénération et téléversement.

## 9. Vérification

- `dev/check.html` : charge `core/*`, `world/*` et `play/*` sans rendu, exécute des assertions et affiche vert/rouge. Couverture minimale :
  - génération avec `seed=1234` : aucun chevauchement de solides, chemin sûr dégagé ;
  - point à l'intérieur d'un polygone authoré → collision ; point hors de la bande de graze → aucune ;
  - flyover synthétique de durée « soutenue » → spawn d'une goutte ;
  - bouclier actif → aucune seconde goutte, mais pollen autorisé ;
  - bris de bouclier → direction de la pousse inchangée.
- Gamefeel : comparaison manuelle côte à côte avec `archive/v3.43.16/index.html`, à partir de l'étape 2. Elle porte sur le ressenti (densité, lisibilité, look) : une même graine ne donne pas la même disposition dans la v4 et dans l'archive, qui tirait aussi des éléments retirés. (Précisé à l'étape 1.)

## 10. Documentation et version

Docs vivantes : `README.md`, `docs/design.md`, `docs/architecture.md`, `CHANGELOG.md`. Anciennes docs déplacées dans `archive/docs/`. Version : v4.0.0.

## 11. Étapes

Travail sur la branche `refonte` ; `main` garde la v3.43.16 jusqu'à la parité.

| # | Étape | Résultat vérifiable |
|---|---|---|
| 0 | Squelette : archive, `index.html`, `style.css`, `fp`/`config`/`state`/`loop`, menu, `check.html`, `AGENTS.md`, `?seed=` sur l'archive | Le menu s'affiche, `check.html` est vert |
| 1 | Monde : catalogue + chargement des PNG, génération, rendu sol/ciel/obstacles | Niveau statique parcourable avec la caméra |
| 2 | Pousse : input, croissance, pilotage, trace, collision mortelle | Boucle jouable minimale |
| 3 | Zones toxiques + lixiviat | Dangers complets |
| 4 | Frôlement, ÉcoCrédits™, combos, HUD | Score fonctionnel |
| 5 | Flyover → pollen / bouclier / spore + exclusivité | Power-ups fonctionnels |
| 6 | Surface, éclosion, fleurs, réserves, niveaux, records | Partie complète |
| 7 | Audio, effets, `?perf=1`, `?flydebug=1` | Parité v3.43.16 → fusion dans `main` |
