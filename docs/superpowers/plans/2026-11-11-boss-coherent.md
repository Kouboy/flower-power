# Boss cohérent (v5.7.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** faire de chaque boss une seule machine lisible. Les points faibles deviennent des pompes reliées au cœur par des tuyaux où
circule un flux. Les défenses deviennent de vraies machines, les tourelles se voient, et la machine surgit de la terre. La géométrie, les
collisions, les durées et la difficulté ne changent pas.

**Architecture :**
- les trajets des tuyaux sont des données des plans (`assets/boss/plans.js`), posées dans le monde par `FP.bossPlan.toWorld` ;
- trois nouveaux fichiers de rendu dessinés par le code : `render/boss-pipes.js`, `render/boss-machines.js`, `render/boss-earth.js` ;
- `render/boss.js` perd les hachures et l'ancien dessin des tourelles ;
- le premier plan flou de la v5.6.0 (`render/boss-depth.js`) est retiré.

**Tech Stack :**
- JS vanilla sous `window.FP`, sans build ;
- Canvas 2D en pixels d'art (`FP.px`) ;
- banc maison (`FP.test`, `node dev/run-checks.js`) ;
- `FP.decorTube` pour le style des tuyaux ;
- PixelLab (MCP) pour une seule image de pompe.

**Spec :** `docs/superpowers/specs/2026-11-11-boss-coherent-design.md`

## Global Constraints

- **AGENTS.md :**
  - réglages seulement dans `src/core/config.js` (sous `config.boss`) ;
  - couleurs dans `FP.palette.boss` (`src/render/palette.js`) ;
  - dessin seulement dans `src/render/*` ;
  - fichiers sous 400 lignes ;
  - pas de code mort ;
  - en-têtes Lit / Écrit / Expose ;
  - `index.html` et `dev/check.html` ne reçoivent que des lignes `<script>` (et la version du titre) ;
  - une entrée CHANGELOG par version ;
  - banc complet vert et vérification en jeu.
- Copies de travail en CRLF, git stocke en LF : garder la fin de ligne de chaque fichier.
- Géométrie, collisions, durées et difficulté inchangées. Les pièces existantes de `plans.js` ne bougent pas : on n'**ajoute** que `pipes`.
- Ordre du dessin (spec) :
  1. terre du milieu ;
  2. anciennes tiges ;
  3. nappes ;
  4. terre qui ronge et poche ;
  5. tuyaux ;
  6. boss ;
  7. machines ;
  8. tourelles ;
  9. pièces, pousse, effets ;
  10. liseré, visée et tirs.
- **Aucune génération PixelLab sans le feu vert explicite de l'utilisateur** (tâche 7).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sur la branche `boss-coherent`.

## Review Focus

1. **Tuyau tracé au facteur 1 mais qui entre dans un couloir au facteur max** (k ≈ 2,17 étire seulement la hauteur) : le test de
   dégagement passe les deux facteurs (tâche 2).
2. **Fuite d'une pompe cassée dans un milieu suivant ou après une mort** (`bossFight.destroyed` gardé entre tentatives) : le tuyau doit
   être rompu dès la génération, sans attendre l'événement (tâche 3).
3. **Machine de défense pendant le coup** : son dessin doit couvrir toute la moitié visée, sinon le joueur meurt dans une zone qui
   paraissait libre (tâche 4).
4. **Tourelle d'un boss transpercé** : elle tombe avec les parois et ne doit plus pivoter ni être dessinée (comportement actuel, à garder)
   (tâche 5).
5. **Écran étroit (280 px)** : la terre et les tuyaux à l'échelle ne doivent pas déborder dans le couloir, ni lever d'erreur (tâches 2
   et 6).

---

### Task 1: Retirer le premier plan flou

**Files:**
- Delete:
  - `src/render/boss-depth.js`
  - `dev/tests/bossdepth.test.js`
  - `assets/boss/art/friche/avant-chaine.png`
  - `assets/boss/art/friche/avant-grillage.png`
- Modify:
  - `src/render/frame.js` (ligne `drawFore`)
  - `src/render/boss-skin.js` (rôle `fore`, `fore()`, `_set` 'fore')
  - `src/core/config.js` (`boss.skin` et son commentaire)
  - `assets/boss/art.js` (clé `fore` et commentaire)
  - `dev/tools/import-boss.js` (FILES sans `fore`)
  - `dev/tests/bossskin.test.js` (test art.js : plus de `fore`)
  - `index.html`, `dev/check.html` (scripts)
  - `docs/architecture.md`

- [ ] **Step 1 :** dans `bossskin.test.js`, le test `art.js` exige l'**absence** de `fore` dans chaque entrée. Run :
  `node <focus.js> "." "^bossSkin"`. Expected : FAIL (friche a `fore`).
- [ ] **Step 2 :** tout retirer selon la liste. `grep -rn "bossDepth\|'fore'\|foreAlpha\|skin:" src dev assets` → rien.
- [ ] **Step 3 :** `node <focus.js> "." "^(bossSkin|bossRender|bossfx)"`. Expected : PASS.
- [ ] **Step 4 :** commit `refactor: retrait du premier plan flou des boss`.

### Task 2: Les trajets des tuyaux dans les plans

**Files:**
- Modify:
  - `assets/boss/plans.js` (`pipes` dans les 4 plans, en-tête)
  - `src/world/boss-plan.js` (`toWorld` → `pipes`)
  - `src/world/boss.js` (`bossLevel.pipes`)
- Test : `dev/tests/bossplan.test.js`

**Interfaces :**
- Plan : `pipes: [{ from: '<id de cible>' | null, to: 'head' | null, pts: [[x, y], …] }]`.
  - Exactement un tuyau `from: <cible>, to: 'head'` par cible ;
  - au moins un tuyau de liaison (`from: null, to: null`) par plan.
- `FP.bossPlan.toWorld(plan, world).pipes` → `[{ from, to, pts: [[x, y] monde] }]`, avec le même `px` que les pièces.
- `bossLevel.pipes` → `[{ from, to, target (indice i de la cible ou -1), pts }]` ; `pts` en pixels du monde.
- Contraintes de tracé :
  - partir du bord de la pièce cible, finir sur le bord de la tête (à moins de 6 px de son polygone) ;
  - passer par les murs et le plafond (le plafond est fermé d'un bord à l'autre) ;
  - ne jamais traverser un couloir.

- [ ] **Step 1 : tests qui échouent** (`bossplan.test.js`, avec `PLAN_MILIEUX`, `PLAN_WIDTHS`, `pathSamples`) :
  - `bossPlan: chaque cible a un tuyau jusqu'à la tête, et au moins une liaison` :
    - pour chaque milieu, l'ensemble des `from` des tuyaux vers 'head' égale les id des cibles ;
    - le dernier point de chaque tuyau est à ≤ 6 px du polygone de la tête (`FP.geom.sdPoly`) ;
    - le premier point est à ≤ 6 px du polygone de sa cible ;
    - au moins un tuyau a `from === null`.
  - `bossPlan: aucun tuyau dans un couloir, aux deux facteurs d'étirement` (Review Focus 1 et 5) :
    - pour chaque milieu, chaque largeur et un monde à `growK` 1 puis maximal ;
    - chaque point échantillonné tous les 2 px le long des tuyaux ;
    - distance aux trajets de référence (`placed.paths`, segments) ≥ `placed.channelMin / 2`.
- [ ] **Step 2 :** `node <focus.js> "." "^bossPlan"`. Expected : FAIL (`pipes` absent).
- [ ] **Step 3 : écrire les tuyaux des 4 plans.**
  - Lire les polygones de chaque plan.
  - Router chaque tuyau dans la masse des murs et du plafond.
  - Vérifier au banc et ajuster jusqu'au vert.
  - Puis `toWorld` et `world/boss.js`.
- [ ] **Step 4 :** `node <focus.js> "." "^(bossPlan|boss:|bossfight)"`. Expected : PASS (`bossfight` inchangé : les tuyaux ne sont pas
  solides).
- [ ] **Step 5 :** commit `feat: trajets des tuyaux dans les plans des boss`.

### Task 3: Tuyaux, flux, pompes, cœur (boss-pipes)

**Files:**
- Create : `src/render/boss-pipes.js`, `dev/tests/bosspipes.test.js`
- Modify :
  - `src/render/boss.js` (pompe animée à la place du cœur qui pulse ; tête qui tremble, tuyaux morts, étincelles)
  - `src/render/frame.js`
  - `src/core/config.js` (`boss.pipes`)
  - `src/render/palette.js` (`boss.pipe`, `boss.flow`)
  - `index.html`, `dev/check.html`

**Interfaces :**
- `config.boss.pipes = { width: 6, flowSpeed: 60, pulseGap: 26, leakRate: 18, pumpHz: 1.6, headShake: 1 }` :
  - `width` : épaisseur en pixels d'art ;
  - `flowSpeed` : vitesse des pulsations en px/s ;
  - `pulseGap` : écart entre pulsations en px ;
  - `leakRate` : gouttes par seconde ;
  - `pumpHz` : battement du piston ;
  - `headShake` : amplitude du tremblement du cœur en pixels d'art.
  Un commentaire par clé.
- `FP.palette.boss.pipe = { body, light, dark, joint, rust }` (pour `FP.decorTube.draw`) et `FP.palette.boss.flow = [clair, sombre]` (vert
  toxique, distinct de `weak`).
- `FP.bossPipes.pulses(pipe, t, alive)` → `[{ x, y }]` en pixels du monde, vide si `!alive` (pur).
- `FP.bossPipes.draw(g, state)` dessine, dans l'ordre :
  - tuyaux (tracé des points en tronçons et coudes, couleurs `pipe`) ;
  - pulsations ;
  - rupture et fuite à la sortie de chaque cible détruite (`bossLevel.targets[i].solid.off`), y compris dès la génération.
  Rien hors niveau de boss.
- Pompe (dans `boss.js`) :
  - avec image : piston (rectangle qui monte et descend à `pumpHz`) et voyant qui pulse par-dessus l'image ;
  - sans image : bloc incandescent actuel avec le même piston.
- Tête :
  - blindée : décalage de ±`headShake` au rythme des pulsations qui arrivent ;
  - à nu : étincelles en plus de la lueur actuelle.

- [ ] **Step 1 : tests qui échouent** (`bosspipes.test.js`, avec `bossRun`, `recCtx`, `skinCtx`) :
  - `bossPipes: des pulsations circulent vers la tête, et avancent avec le temps` :
    - `pulses(p, 0, true)` n'est pas vide ;
    - à `t + .1`, chaque pulsation a avancé de `flowSpeed × .1` le long du tuyau (±1).
  - `bossPipes: une pompe cassée arrête son flux et fuit, même dès la génération` (Review Focus 2) :
    - `bossRun` avec `bossFight.destroyed[0] = true` avant `generate` ;
    - `draw` : aucune pulsation sur le tuyau de la cible 0, et des gouttes de fuite (couleur `flow`) près de sa sortie.
  - `bossPipes: chaque boss se dessine sans erreur, avec ou sans images` : 4 milieux, `rects.length > 0`.
  - `bossRender: la pompe bat` : deux temps séparés d'un demi-battement donnent des rectangles différents sur la cible.
- [ ] **Step 2 :** `node <focus.js> "." "^(bossPipes|bossRender: la pompe)"`. Expected : FAIL.
- [ ] **Step 3 :** écrire `boss-pipes.js`, l'appeler dans `frame.js` avant `FP.bossRender.draw`, et modifier pompe et tête dans `boss.js`.
- [ ] **Step 4 :** `node <focus.js> "." "^(bossPipes|bossRender|bossSkin|bossfx|bossdeath)"`. Expected : PASS ; `wc -l` < 400.
- [ ] **Step 5 :** commit `feat: pompes reliées au cœur par des tuyaux à flux`.

### Task 4: Machines de défense et liseré (boss-machines)

**Files:**
- Create : `src/render/boss-machines.js`, `dev/tests/bossmachines.test.js`
- Modify :
  - `src/render/boss.js` (retirer `hatches`/`danger` et la palette `hatch` ; `drawThreats` dessine le liseré)
  - `src/render/frame.js`
  - `src/core/config.js` (`boss.machines`)
  - `src/render/palette.js` (`boss.machines`)
  - `dev/tests/bossfx.test.js` (le test des hachures devient celui du liseré)

**Interfaces :**
- `FP.bossMachines.layout(room, half, defense)` → `{ kind, mount: 'ceiling' | 'wall', x0, y0, x1, y1 }` (pur). C'est la boîte monde de
  la moitié visée et l'emplacement de la machine :
  - plafond de la moitié pour `beton` et `radiation` ;
  - paroi extérieure de la moitié pour `vapeur` et `flamme`.
- `FP.bossMachines.draw(g, state)` : pour chaque salle visible, la machine de chaque moitié au repos ; puis l'état de la moitié visée
  (`bossThreats.rooms[id]`) :
  - `warn` : préparation (béton : gouttes ; vapeur : bouffées ; flamme : veilleuses orange ; radiation : lueur et arcs) ;
  - `strike` : effet qui remplit toute la boîte de la moitié.
- `config.boss.machines = { border: 1, borderHz: 6, drops: 5, puffs: 4, arcs: 3 }`.
- `drawThreats` : le liseré (rectangle de `border` px clignotant à `borderHz` au bord de la moitié visée) pendant `warn`, puis visée et
  tirs. Plus de hachures.

- [ ] **Step 1 : tests qui échouent :**
  - `bossMachines: emplacement selon la défense` : `layout` d'une salle factice pour les 4 défenses et les 2 moitiés, avec mount et boîte
    attendus (moitié gauche = `[x0, mid]`).
  - `bossMachines: en coup, l'effet couvre toute la moitié visée` (Review Focus 3) :
    - pour chaque salle de chaque boss en `strike` ;
    - chaque rangée d'art de la boîte (dans l'écran) contient des pixels dessinés à au moins 80 % de la largeur de la moitié.
  - `bossMachines: repos, avertissement et coup se dessinent sans erreur, pour chaque salle de chaque boss`.
  - `bossRender: liseré pendant l'avertissement, plus de hachures` : en `warn`, `drawThreats` dessine des rectangles de largeur ou
    hauteur `border` le long de la boîte ; aucun rectangle de couleur `hatch` (la clé n'existe plus).
- [ ] **Step 2 :** focus `"^(bossMachines|bossRender)"`. Expected : FAIL.
- [ ] **Step 3 :** écrire `boss-machines.js`, l'appeler dans `frame.js` après `bossRender.draw`, et modifier `boss.js`.
- [ ] **Step 4 :** focus `"^(bossMachines|bossRender|bossfx|bossthreats|shots)"`. Expected : PASS.
- [ ] **Step 5 :** commit `feat: défenses des boss en vraies machines, liseré d'avertissement`.

### Task 5: Tourelles visibles et menaçantes

**Files:**
- Modify :
  - `src/render/boss-machines.js` (tourelles)
  - `src/render/boss.js` (retirer `turret`/`turrets` ; la visée part de la bouche du canon)
  - `src/core/config.js` (`boss.turret`)
  - `src/audio/sfx.js` (gain de `bossShot`)
  - `dev/tests/bossmachines.test.js`, `dev/tests/audio.test.js`

**Interfaces :**
- `config.boss.turret = { size: 16, barrel: 10, recoil: 3, recoilTime: .15, flashTime: .08 }` (pixels d'art, secondes).
- `FP.bossMachines.turretPose(state, q)` → `{ x, y, angle, muzzle: { x, y }, lens: 0..1, recoil }` (pur ; x, y, muzzle en pixels du
  monde).
  - angle :
    - au repos, vers l'intérieur de la salle (opposé au mur le plus proche) ;
    - en visée, vers `state.plant.tip` ;
    - une fois figée, vers `lockedAt`.
  - `lens` monte de 0 à 1 pendant la visée.
  - `recoil` est > 0 pendant `recoilTime` après le dernier tir de cette tourelle (événement `bossShot { turret }` à l'instant `state.time`
    noté dans `state.fx.boss` — ou état équivalent sous `state.fx`).
- La ligne de visée de `drawThreats` part de `turretPose(...).muzzle`.
- Une tourelle d'un boss transpercé n'est ni dessinée ni orientée (Review Focus 4).
- `bossShot` plus fort : gain du bruit et du pluck × 1,6.

- [ ] **Step 1 : tests qui échouent :**
  - `bossMachines: la tourelle mesure au moins 14 pixels d'art`.
  - `bossMachines: le canon vise la pousse, puis le point figé` : angle à ±.05 rad de `atan2(tip − pos)`, puis de `lockedAt`.
  - `bossMachines: recul et éclair après un tir, puis repos`.
  - `bossMachines: tourelles absentes quand la tête est transpercée`.
  - `audio: le tir de tourelle est plus fort qu'en v5.6` : crête du son `bossShot` ≥ 1,5 × l'ancienne (même mesure que les autres tests de
    volume d'`audio.test.js`).
- [ ] **Step 2 :** focus `"^(bossMachines|audio)"`. Expected : FAIL.
- [ ] **Step 3 :** implémenter.
- [ ] **Step 4 :** focus `"^(bossMachines|bossRender|bossdeath|audio|shots)"`. Expected : PASS.
- [ ] **Step 5 :** commit `feat: tourelles des boss visibles et menaçantes`.

### Task 6: La machine surgit de la terre (boss-earth)

**Files:**
- Create : `src/render/boss-earth.js`, `dev/tests/bossearth.test.js`
- Modify : `src/render/frame.js`, `src/core/config.js` (`boss.earth`), `index.html`, `dev/check.html`

**Interfaces :**
- `config.boss.earth = { fringe: 5, clods: .35, roots: 2, pocket: 34 }` :
  - `fringe` : épaisseur de terre sur un bord extérieur, en pixels d'art ;
  - `clods` : densité de mottes ;
  - `roots` : racines par paroi ;
  - `pocket` : demi-largeur de la poche au-dessus de la tête, en pixels du monde.
- `FP.bossEarth.edges(bl, world)` → `[{ x0, y0, x1, y1, side }]` (pur) : les bords de murs extérieurs, c'est-à-dire les arêtes dont le
  milieu, décalé de 4 px vers l'extérieur, est hors de tout solide et à plus de `channelMin / 2` des trajets de référence.
- `FP.bossEarth.draw(g, state)` :
  - terre qui ronge les bords extérieurs (couleurs de `FP.palette.milieux[id].strata`, mottes et racines tirées d'un hasard fixé par le
    niveau) ;
  - poche de terre autour et au-dessus de la tête jusqu'à `surfaceY`.
  Appelée dans `frame.js` après les nappes et avant `FP.bossPipes.draw`.

- [ ] **Step 1 : tests qui échouent :**
  - `bossEarth: les bords rongés ne donnent jamais sur un couloir` : chaque `edge`, échantillonné, est à ≥ `channelMin / 2` des trajets,
    pour les 4 milieux et les largeurs de `PLAN_WIDTHS` (Review Focus 5).
  - `bossEarth: dessiner la terre ne change aucun solide` : JSON des `world.solids` identique avant et après `draw`.
  - `bossEarth: poche de terre au-dessus de la tête` : des rectangles de couleur `strata` dans la boîte `[tête.x ± pocket] × [surfaceY,
    tête.y]` visible.
  - `bossEarth: même terre d'une tentative à l'autre` : deux `draw` du même niveau donnent les mêmes rectangles.
- [ ] **Step 2 :** focus `"^bossEarth"`. Expected : FAIL.
- [ ] **Step 3 :** implémenter et brancher.
- [ ] **Step 4 :** focus `"^(bossEarth|bossPipes|bossMachines|bossRender)"`. Expected : PASS.
- [ ] **Step 5 :** commit `feat: le boss surgit de la terre, poche d'éclosion`.

### Task 7: La pompe de la Bétonneuse et la version 5.7.0

**Files:**
- Raw : `C:\Users\don_n\Documents\Flower Power\pixellab-boss\friche\brut\pompe.png`
- Modify :
  - `assets/boss/art/friche/cible.png` (remplacée par la pompe)
  - `src/core/config.js` (version), `index.html`, `dev/tests/state.test.js`
  - `CHANGELOG.md`, `docs/architecture.md`

- [ ] **Step 1 : demander le feu vert** pour 1 génération (prompt montré, solde vérifié). Ne rien générer sans un oui.
- [ ] **Step 2 :** `create_image_pixflux` en 48×48 :
  - description : pompe industrielle sombre, piston vertical, voyant jaune vif, raccord de tuyau sur un côté ;
  - style : vue de côté, flat shading, low detail, contour noir, fond transparent.
  Puis la copier sous `pixellab-boss/friche/retouche/cible.png` et lancer `node dev/tools/import-boss.js friche
  "../pixellab-boss/friche/retouche"`.
- [ ] **Step 3 :** version `'5.7.0'` ; CHANGELOG v5.7.0 (nombre de tests réel) ; `architecture.md` (trois fichiers, ordre du dessin,
  `pipes`).
- [ ] **Step 4 :** `node dev/run-checks.js` en arrière-plan. Expected : `N/N OK`, dont `bossfight`.
- [ ] **Step 5 : en jeu**, format téléphone :
  - espion JS de l'ordre (terre, anciennes tiges, nappes, terre du boss, tuyaux, boss, machines, pousse, menaces) ;
  - captures de la Bétonneuse et d'un autre boss (repos, avertissement, coup, visée, pompe cassée).
  Les envoyer à l'utilisateur.
- [ ] **Step 6 :** commit `feat: boss cohérent (v5.7.0)` ; relecture finale de la branche ; demander la fusion.
