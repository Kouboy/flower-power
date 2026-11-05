# Refonte des boss — plan d'implémentation (v5.1.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** remplacer le moteur de boss de la v4.12 par des boss composés à la main (une forme par boss), qu'on détruit en percutant trois cibles (graine rendue) puis en transperçant la tête, avec des menaces qu'on esquive en se décalant.

**Architecture:** les plans de boss sont des données (`assets/boss/plans.js`, coordonnées en proportion) placées dans le monde par un module pur (`world/boss-plan.js`) ; `world/boss.js` en fait des solides ; `play/boss.js` tient l'état du combat, `play/boss-threats.js` les menaces ; `play/flow.js` gère les trois nouvelles issues de collision ; le rendu provisoire (formes simples) vit dans `render/boss.js` et `render/boss-fx.js`.

**Tech Stack:** JavaScript sans module ni build (scripts classiques sur `window.FP`), banc maison `FP.test` / `FP.assert` / `FP.assertEqual` (`dev/check.html`, `node dev/run-checks.js`).

**Spec:** `docs/superpowers/specs/2026-10-31-boss-refonte-design.md`

## Global Constraints

- Lire `AGENTS.md` et `docs/architecture.md` avant toute modification ; chaque fichier `src/**` garde son en-tête Lit / Écrit / Expose à jour.
- Réglage → `config.js` uniquement ; visuel → `render/*` uniquement, jamais `play/*`.
- Un fichier > 400 lignes est découpé avant d'y ajouter quoi que ce soit.
- Pas de code mort : ce qui est remplacé est supprimé (points faibles, couloir en zigzag, trappe, `trapSlide`, flèche, colonnes, défenses sur horloge).
- `index.html` et `dev/check.html` : on n'y touche que pour les lignes `<script>`.
- Un pixel d'art = 2 px de monde (`FP.px.SCALE`) ; tout dessin du monde passe par `FP.px`, en pixels entiers.
- Le niveau de boss garde sa graine propre (seed ^ saison ^ milieu, jamais `state.rng`) : identique d'une tentative à l'autre.
- Durées de la spec : avertissement 1,2 s ; coup 0,8 s ; repos 1,5 s ; −10 % par cible détruite ; avertissement jamais < 1 s ; visée 1 s, figée 0,3 s avant le tir ; ≥ 3 s entre deux tirs ; tirs visés seulement aux milieux 1, 2, 3 (pas à la Bétonneuse).
- Largeur minimale d'un canal : `config.boss.channelMin` = 60 px de monde à 360 px de large.
- Fichiers de tests : remplacer `dev/tests/boss.test.js`, `bosspath.test.js`, `bossrender.test.js` ; chaque nouveau test va dans `dev/check.html` (une ligne `<script>`).
- Commits en français, préfixe `feat(boss):` / `test(boss):` / `docs:`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Écran étroit (300 à 360 px de large)** : canaux et salles se resserrent avec la largeur ; un plan juste à 440 px peut fermer un canal à 300. → Tâche 1 teste `channelMin` et les trajets à 300, 360 et 440 px.
- **Pointe qui touche une cible et une paroi dans la même frame** : la requête renvoie le premier solide trouvé ; une mort ordinaire au lieu d'un assaut volerait la graine. → Tâche 3 : la cible prime sur la paroi.
- **Dernière graine qui meurt en percutant une cible** : l'assaut ne coûte pas de graine, il ne doit pas ouvrir la dernière chance. → Tâche 3.
- **Changement de salle pendant un avertissement** : la défense doit se taire (ou finir sans frapper hors de sa salle), jamais frapper une pointe partie ailleurs sans avertissement. → Tâche 5.
- **Mort pendant l'arrêt sur image / tir déjà parti quand la pointe meurt** : les projectiles et menaces se vident à la mort et à la régénération du niveau. → Tâches 5 et 6.

---

### Task 1: Plans de boss en données et placement dans le monde

**Files:**
- Create: `assets/boss/plans.js`, `src/world/boss-plan.js`, `dev/tests/bossplan.test.js`
- Modify: `index.html`, `dev/check.html` (lignes `<script>` : `assets/boss/plans.js` après `assets/obstacles/manifest.js` ; `src/world/boss-plan.js` avant `src/world/boss.js`)

**Interfaces:**
- Produces: `window.FLOWER_POWER_BOSS_PLANS = { friche, industrie, decharge, nucleaire }`, chaque plan :
  `{ form: 'muraille' | 'colosse' | 'forteresse' | 'reacteur', pieces: [{ id, role: 'wall' | 'target' | 'head' | 'plate' | 'turret', poly: [[x, y], …], plate? }], rooms: [{ id, rect: [x0, y0, x1, y1], defense: 'beton' | 'vapeur' | 'flamme' | 'radiation', turrets: [ids] }], paths: { [targetId | 'head']: [[x, y], …] }, toxics: [[x, y], …] }` — x de 0 à 1 sur la largeur, y de 0 à 1 sur la zone du boss (0 = haut).
- Produces: `FP.bossPlan.zone(world) → { top, bottom }` (de `surfaceY + config.boss.top` à `height - config.boss.bottom`) ; `FP.bossPlan.toWorld(plan, world) → { pieces: [{ id, role, plate, poly (monde) }], rooms: [{ id, rect (monde), defense, turrets }], paths: { id: [{x, y}] }, toxics: [{x, y}] }` (pur) ; `FP.bossPlan.clearance(placed, x, y) → number` (distance aux murs, têtes et plaques, pur).

- [ ] **Step 1: Write the failing tests** (`dev/tests/bossplan.test.js`) — pour chaque milieu et chaque largeur W de `[300, 360, 440]`, sur un monde `FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) })` :
  - `bossPlan: quatre plans, un par milieu, avec la forme de la spec` — `form` vaut `muraille`, `colosse`, `forteresse`, `reacteur` pour `friche`, `industrie`, `decharge`, `nucleaire` ;
  - `bossPlan: 3 cibles, 1 tête, 3 plaques, chaque cible reliée à sa plaque` (et chaque plaque à une seule cible) ;
  - `bossPlan: toutes les pièces dans le cadre` (0 ≤ x ≤ W ; zone.top ≤ y ≤ zone.bottom) ;
  - `bossPlan: chaque trajet reste à distance sûre et atteint sa cible` — chaque point de `paths[id]` échantillonné tous les 4 px a `clearance ≥ channelMin / 2` sauf les 12 derniers px avant la cible ; le premier point est la graine (`x = W / 2`, `y = height - config.plant.seedOffset`) ; le dernier touche la pièce visée ;
  - `bossPlan: au-dessus de la tête, rien jusqu'à la surface` (colonne de la largeur de la tête, de son haut à `surfaceY`, sans mur) ;
  - `bossPlan: salles et tourelles hors des canaux` — chaque salle a une largeur ≥ `2 × channelMin` et contient toutes ses tourelles ; aucun trajet n'a de point de clearance < `channelMin` dans une salle (les salles sont larges) ;
  - `bossPlan: pas de tourelle à la Bétonneuse, au moins une ailleurs`.
- [ ] **Step 2:** `node dev/run-checks.js` — les nouveaux tests échouent (`FP.bossPlan` absent).
- [ ] **Step 3:** ajouter à `config.boss` (en gardant l'ancien bloc pour l'instant) : `channelMin: 60` (px de monde à 360 px ; mis à l'échelle × W / 360 dans les tests et `toWorld`), `top`, `bottom` repris de l'ancien bloc. Écrire `src/world/boss-plan.js` (`toWorld` : multiplication par W et par la hauteur de zone ; `clearance` : minimum de `FP.geom.sdPoly(x, y, poly)` sur les pièces `wall`, `head` et `plate` — `FP.collision` est chargé plus tard).
- [ ] **Step 4:** composer les quatre plans dans `assets/boss/plans.js` d'après le tableau « Les quatre plans » de la spec (muraille à trois meurtrières large / sinueuse / étroite ; colosse au tuyau principal avec chambres et trois embranchements ; forteresse avec grille d'aération puis grande salle à trois brûleurs pendus et gueule au plafond ; réacteur avec circuit en lacets puis salle du cœur à trois barres) ; ajuster jusqu'à ce que les tests passent aux trois largeurs.
- [ ] **Step 5:** `node dev/run-checks.js` — tout vert.
- [ ] **Step 6:** commit `feat(boss): plans des quatre boss en données (v5.1.0)`.

### Task 2: Bascule du moteur — niveau de boss construit depuis le plan

**Files:**
- Modify: `src/world/boss.js` (réécrit), `src/play/boss.js` (réécrit, réduit à l'état du combat), `src/core/config.js` (`boss` réécrit), `src/core/state.js` (`bossFight`), `src/ui/hud.js` (icônes), `src/audio/music.js` (tempo), `src/play/powerups.js` (référence à la trappe), `src/render/boss.js` (réécrit : pièces en formes simples), `src/render/frame.js` (commentaire), `src/audio/audio.js`, `src/render/particles.js`, `src/render/coins.js` (événements `bossPierce` / `bossTrap` retirés)
- Delete: `dev/tests/boss.test.js`, `dev/tests/bosspath.test.js`, `dev/tests/bossrender.test.js`
- Create: `dev/tests/boss.test.js` (nouveau contenu)

**Interfaces:**
- Consumes: `FP.bossPlan.toWorld`, `FLOWER_POWER_BOSS_PLANS` (tâche 1).
- Produces: `state.bossFight = { destroyed: [false, false, false], headOpen: false }` (créé par `state.js`, écrit ensuite par `play/boss.js` seulement) ; `FP.boss.reset(state)` ; `FP.boss.update(state, dt)` (vide pour l'instant, rempli aux tâches 3 à 6).
- Produces: `state.world.bossLevel = { plan, walls: [solid], targets: [{ id, i, plate, solid }], head: { solid }, plates: [{ id, target, solid }], rooms: [{ id, x0, y0, x1, y1, defense, turrets }], turrets: [{ id, x, y, room }] }` ; solides `{ kind: 'boss' | 'target' | 'head' | 'plate', boss: true, x, y, a: 0, flip: 1, collision, broadR, flyoverEligible: false, grazeRadius: 0, off }` (même forme que l'ancien `makeSolid`) ; `world.safePath` = `paths.head` converti (caméra, jetons) ; une cible détruite ou une plaque tombée a `off = true` dès la génération.
- Produces: `config.boss = { channelMin: 60, top, bottom, toxics, targetBonus: 200, bonus: 1500, tempoPerTarget: 6, assaultShake: .3, freeze: .35, defense: { warn: 1.2, strike: .8, rest: 1.5, speedup: .1, warnMin: 1 }, shot: { track: 1, lock: .3, speed: 420, gap: 3, r: 5 }, shooters: ['industrie', 'decharge', 'nucleaire'] }` ; textes `config.milieux[].boss.order` : `DÉTRUIS SES 3 VANNES, PUIS SA TOUPIE` (friche), `DÉTRUIS SES 3 CUVES, PUIS SA TORCHÈRE` (industrie), `DÉTRUIS SES 3 BRÛLEURS, PUIS SA GUEULE` (décharge), `DÉTRUIS SES 3 BARRES, PUIS SON CŒUR` (nucléaire) ; `config.text.death` : `target` et `plate` n'existent pas (une cible n'est jamais une mort), `head: 'la tête est blindée'`, `boss: 'écrasée par le boss'`, `defense: 'emportée par la défense'`, `shot: 'touchée par un tir'` ; `trap` retiré.
- Produces: `FP.hud.items(state).boss = { targets: [bool ×3], head: 'armored' | 'open' | null } | null`.

- [ ] **Step 1: Write the failing tests** (`dev/tests/boss.test.js`, helper `bossRun(W, milieu, seed = 7)` comme l'ancien fichier) :
  - `bossLevel: construit depuis le plan du milieu` — 3 cibles, 1 tête, 3 plaques, `world.safePath` non vide, aucun obstacle ordinaire ni limace ;
  - `bossLevel: identique d'une tentative à l'autre` (deux `generate` → mêmes polygones) ;
  - `bossLevel: une cible détruite reste détruite à la régénération` — `bossFight.destroyed[1] = true` puis `generate` → `targets[1].solid.off` et sa plaque `off` ;
  - `boss: reset remet tout à zéro` ;
  - `hud: icônes de cibles et de tête` (`items(state).boss` vaut `{ targets: [false, false, false], head: 'armored' }` puis `{ …, head: 'open' }` quand les trois sont détruites) ;
  - `music: le thème du boss s'emballe de tempoPerTarget par cible détruite`.
- [ ] **Step 2:** `node dev/run-checks.js` — échecs attendus.
- [ ] **Step 3:** réécrire `world/boss.js` (plan → solides ; nappes aux emplacements `plan.toxics` via `FP.level.makeToxic` ; `FP.coins.place(state)` comme avant), `state.js`, `config.boss`, `play/boss.js` (`reset`, `update` vide), HUD (trois icônes de cibles + une icône de tête, à la place des quatre points), musique (`tempoPerTarget × destroyed`), `powerups.js` (la ligne sur la trappe disparaît ; la spore ne touche toujours pas les solides `boss`), `render/boss.js` (dessine murs, cibles, tête, plaques en formes simples aux couleurs de `FP.palette.boss` ; plus de panneau, de flèche ni de trappe). Retirer les événements `bossPierce` / `bossTrap` et leurs sons, particules et jetons.
- [ ] **Step 4:** `node dev/run-checks.js` — tout vert ; ouvrir le jeu (`?seed=7`), forcer un boss de chaque milieu (`state.run.boss = true; FP.level.generate(s)`) : les quatre plans s'affichent, sans erreur console.
- [ ] **Step 5:** commit `feat(boss): niveau de boss construit depuis son plan, ancien moteur retiré`.

### Task 3: Assaut d'une cible — explosion, plaque, graine rendue

**Files:**
- Modify: `src/world/collision.js`, `src/play/flow.js`, `src/play/boss.js`, `src/ui/certificate.js`, `src/core/state.js` (`plant.assaults`)
- Test: `dev/tests/boss.test.js`

**Interfaces:**
- Consumes: `bossLevel.targets`, `state.bossFight` (tâche 2).
- Produces: `state.query.target` (la cible intacte touchée, ou null) — prioritaire sur `state.query.solid` ; `FP.boss.destroy(state, i)` (marque `destroyed[i]`, met `off` la cible et sa plaque, `headOpen` quand les trois sont détruites, bonus `targetBonus`, secousse `assaultShake`, événements `bossTarget { i, x, y }` puis `bossSeed { x, y }`) ; dans `flow` : `assault(state, target)` — mode `dying` comme `die`, **sans** `reserves -= 1`, `p.assaults += 1`, cause `assault` ; le certificat affiche `stemCount - assaults` tiges sacrifiées.

- [ ] **Step 1: Write the failing tests**:
  - `boss: percuter une cible la détruit et fait tomber sa plaque` (pointe posée sur la cible 0, `FP.collision.update` puis `FP.flow.update`) ;
  - `boss: l'assaut laisse la réserve de graines inchangée` ;
  - `boss: la cible prime sur une paroi touchée dans la même frame` ;
  - `boss: assaut avec la dernière graine — pas de dernière chance, la pousse suivante est prête` (`reserves = 1`, assaut, avancer jusqu'à `ready`) ;
  - `boss: une tige d'assaut ne compte pas parmi les tiges sacrifiées` ;
  - `boss: après trois assauts, la tête s'ouvre` (`headOpen`, plaques toutes `off`) ;
  - `boss: une cible déjà détruite ne déclenche plus rien`.
- [ ] **Step 2:** lancer — échecs.
- [ ] **Step 3:** implémenter (`collision.querySolids` : un solide `target` non `off` va dans `q.target` ; `flow.update` en mode `playing` : `q.target` avant `q.solid`).
- [ ] **Step 4:** lancer — vert.
- [ ] **Step 5:** commit `feat(boss): assaut des cibles, graine rendue`.

### Task 4: La tête — blindée tant qu'il reste une plaque, transpercée à nu

**Files:**
- Modify: `src/world/collision.js`, `src/play/flow.js`, `src/play/boss.js`
- Test: `dev/tests/boss.test.js`

**Interfaces:**
- Consumes: `state.bossFight.headOpen`, `FP.boss.destroy` (tâche 3).
- Produces: `state.query.head` (la tête à nu touchée) ; `FP.boss.pierceHead(state)` (met la tête `off`, événement `bossHead { x, y }`, secousse) ; `state.flow.freeze` (secondes d'arrêt sur image, `config.boss.freeze` = 0,35 s) : pendant le gel, `FP.plant.update` et les menaces ne bougent pas ; ensuite la pousse continue et éclot à la surface par le `bloom` existant (victoire : carton, `config.boss.bonus` × saison, milieu suivant).

- [ ] **Step 1: Write the failing tests**:
  - `boss: la tête blindée tue (une graine perdue, cause solid, kind head)` ;
  - `boss: la tête à nu ne tue pas, elle s'ouvre et gèle l'image` (`flow.freeze > 0`, mode toujours `playing`, `reserves` inchangé) ;
  - `boss: après la tête, la pousse éclot, bonus et milieu suivant` (avancer la pointe jusqu'à la surface : `run.bosses` +1, milieu suivant au fondu) ;
  - `boss: rien ne bouge pendant le gel` (position de la pointe identique avant / après 0,2 s).
- [ ] **Step 2:** lancer — échecs.
- [ ] **Step 3:** implémenter (le gel se décompte dans `flow.update` ; `FP.loop` ne change pas d'ordre ; `plant.update` sort tôt si `state.flow.freeze > 0`).
- [ ] **Step 4:** lancer — vert.
- [ ] **Step 5:** commit `feat(boss): tête blindée, puis transpercée et éclosion`.

### Task 5: Défense signature par salle

**Files:**
- Create: `src/play/boss-threats.js` ; ligne `<script>` après `src/play/boss.js` dans `index.html` et `dev/check.html`
- Modify: `src/core/loop.js` (`'threats'` après `'boss'` dans `UPDATE_ORDER`)
- Test: `dev/tests/bossthreats.test.js`

**Interfaces:**
- Consumes: `bossLevel.rooms`, `state.bossFight.destroyed`, `state.flow.freeze`, `config.boss.defense`.
- Produces: `FP.bossThreats.update(state, dt)` ; `FP.bossThreats.timing(destroyedCount) → { warn, strike, rest }` (pur : chaque durée × 0,9^n, `warn` jamais sous `warnMin`) ; `FP.bossThreats.roomAt(bossLevel, x, y) → room | null` (pur) ; `state.bossThreats = { rooms: { [id]: { stage: 'idle' | 'warn' | 'strike' | 'rest', t, half: -1 | 1 } }, shots: [] }` (écrit par ce module seulement ; vidé par `world/boss.js` à chaque génération) ; solide de défense par salle `{ kind: 'defense', boss: true, off, … }` couvrant la moitié `half` de la salle pendant `strike` ; événements `bossWarn { room, half }`, `bossStrike { room, half }`.
- Règles : une salle s'éveille quand la pointe y entre (`idle → warn`, moitié = celle de la pointe à cet instant) ; `warn → strike → rest → warn` (nouvelle moitié = celle de la pointe au début de chaque `warn`) ; la pointe hors de la salle : la salle repasse `idle` à la fin de l'étape en cours, sans frapper si elle était en `warn` ; rien ne progresse pendant `freeze` ni hors du mode `playing`.

- [ ] **Step 1: Write the failing tests**:
  - `threats: timing — 1,2 / 0,8 / 1,5 s, −10 % par cible, avertissement ≥ 1 s` (`timing(0)`, `timing(3).warn === 1`) ;
  - `threats: la salle s'éveille quand la pointe entre et vise sa moitié` ;
  - `threats: la zone ne couvre jamais plus de la moitié de la salle` (largeur du polygone ≤ moitié + 1 px) ;
  - `threats: pas de coup sans avertissement complet` (simulation 20 s en déplaçant la pointe : chaque `bossStrike` est précédé d'un `bossWarn` de la même salle au moins `warn` plus tôt) ;
  - `threats: la pointe sort pendant l'avertissement → aucun coup` ;
  - `threats: aucune menace dans un canal` (pointe le long d'un trajet hors salles : aucune salle éveillée) ;
  - `threats: tout se vide à la régénération du niveau`.
- [ ] **Step 2:** lancer — échecs.
- [ ] **Step 3:** implémenter.
- [ ] **Step 4:** lancer — vert.
- [ ] **Step 5:** commit `feat(boss): défenses signature déclenchées par salle`.

### Task 6: Tirs visés (boss 2 à 4)

**Files:**
- Modify: `src/play/boss-threats.js`
- Test: `dev/tests/bossthreats.test.js`

**Interfaces:**
- Consumes: `bossLevel.turrets`, `config.boss.shot`, `config.boss.shooters`, l'état des salles (tâche 5).
- Produces: dans `state.bossThreats` : `aim = { turret, t, lockedAt: null | { x, y } } | null`, `cooldown` (s), `shots: [{ x, y, vx, vy }]` ; solides `kind: 'shot'` (disque de rayon `shot.r`) ; événements `bossAim { turret }`, `bossLock { turret }`, `bossShot { turret }`.
- Règles : seulement si le milieu est dans `shooters` et la pointe dans une salle qui contient une tourelle ; la tourelle suit la pointe `track` s, la ligne se fige `lock` s avant la fin (cible = position de la pointe au figement), puis le projectile part à `speed` px/s le long de la ligne figée ; `cooldown ≥ gap` entre deux tirs ; jamais de visée pendant que la défense de la salle est en `strike` ; les projectiles sortis du cadre sont retirés ; tout se vide à la mort et à la génération.

- [ ] **Step 1: Write the failing tests**:
  - `shots: pas de tir à la Bétonneuse` ;
  - `shots: la ligne se fige 0,3 s avant le tir, le projectile suit la ligne figée` (déplacer la pointe après le figement : la direction ne change plus) ;
  - `shots: au moins 3 s entre deux tirs` ;
  - `shots: pas de visée pendant un coup de la défense` ;
  - `shots: pas de visée sur une pointe hors des salles` ;
  - `shots: les projectiles disparaissent à la mort`.
- [ ] **Step 2:** lancer — échecs.
- [ ] **Step 3:** implémenter.
- [ ] **Step 4:** lancer — vert.
- [ ] **Step 5:** commit `feat(boss): tirs visés à partir du boss 2`.

### Task 7: Rendu, effets, cartons et sons

**Files:**
- Modify: `src/render/boss.js` (hachures d'avertissement, zone en coup, lignes de visée, projectiles, plaques qui pendent / tombées, tête qui s'allume à nu), `src/ui/cards.js` (ordre d'assaut), `src/audio/sfx.js`, `src/audio/audio.js`, `src/render/particles.js`
- Create: `src/render/boss-fx.js` (ligne `<script>` après `src/render/boss.js`), `dev/tests/bossfx.test.js`

**Interfaces:**
- Consumes: événements `bossTarget`, `bossSeed`, `bossHead`, `bossWarn`, `bossStrike`, `bossAim`, `bossLock`, `bossShot` (tâches 3 à 6), `state.bossThreats`.
- Produces: `FP.bossFx.update(state, dt)` et `FP.bossFx.draw(g, state)` (repère d'art) ; `FP.bossFx.seedFlight(t) → { x, y, scale }` (pur : la graine part de l'épave, grossit, puis file vers le compteur de graines du HUD en ≤ 1 s) ; texte « +1 GRAINE » en police pixel, gros, au-dessus de l'épave pendant le vol ; `render/boss.js` : hachures orange dont le clignotement accélère sur `warn`, ligne de visée qui change de couleur au figement ; sons : `bossTarget` (explosion), `bossSeed` (graine rendue), `bossWarn` (son qui monte), `bossLock` (clic), `bossShot` (tir), `bossHead` (grosse explosion).

- [ ] **Step 1: Write the failing tests** : `bossfx: la graine finit sur le compteur du HUD en 1 s au plus` ; `bossfx: « +1 GRAINE » visible pendant tout le vol` ; `bossRender: dessine sans erreur chaque étape (idle, warn, strike, visée, figée, tir)` (fausse surface de dessin comme dans les anciens tests de rendu) ; `cards: l'ordre d'assaut du boss du milieu`.
- [ ] **Step 2:** lancer — échecs.
- [ ] **Step 3:** implémenter (aucun fichier ne dépasse 400 lignes).
- [ ] **Step 4:** lancer — vert ; jouer un combat contre chaque boss dans le navigateur (`?seed=7`, puis enchaîner ou forcer `state.run.boss`), vérifier à l'œil : graine rendue lisible, avertissement lisible, tir esquivable, tête qui explose, éclosion.
- [ ] **Step 5:** commit `feat(boss): rendu provisoire, graine rendue, menaces lisibles`.

### Task 8: Outil de réglage, documentation, version

**Files:**
- Create: `dev/boss.html` (les quatre plans à 360 et 440 px : murs, cibles, tête, plaques, salles, zones de défense, tourelles, trajets ; même chargement de scripts que `dev/check.html`, sans le banc)
- Modify: `docs/architecture.md` (carte des fichiers : `world/boss-plan.js`, `play/boss-threats.js`, `render/boss-fx.js`, `assets/boss/plans.js` ; section « Moteur de boss » réécrite d'après la spec), `CHANGELOG.md` (v5.1.0), `src/core/config.js` (`version: '5.1.0'`), `dev/tests/state.test.js`, `index.html` (titre)

- [ ] **Step 1:** écrire `dev/boss.html`, l'ouvrir dans le navigateur : les quatre plans s'affichent aux deux largeurs, sans erreur.
- [ ] **Step 2:** documentation et version.
- [ ] **Step 3:** `node dev/run-checks.js` — tout vert ; un combat joué jusqu'à la victoire contre chaque boss.
- [ ] **Step 4:** commit `docs: refonte des boss (v5.1.0)` ; ne pas fusionner ni pousser sans l'accord de l'utilisateur.
