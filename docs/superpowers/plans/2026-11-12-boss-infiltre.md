# Boss infiltré (v5.8.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** donner au boss l'échelle d'une machine immense dans laquelle on s'infiltre. Concrètement :
- des structures de liaison opaques et sans collision ;
- des pompes et un cœur animés, dessinés par le code ;
- des coups sur fond transparent ;
- des tourelles visibles qui tirent en rafales.

**Architecture :**
- deux nouveaux fichiers de rendu : `render/boss-struts.js` (liaisons) et `render/boss-core.js` (pompes et cœur) ;
- `render/boss-machines.js` : les coups passent sur fond transparent, les tourelles grossissent ;
- `play/boss-threats.js` : tir en rafale ;
- `assets/boss/plans.js` : tourelles déplacées vers l'intérieur.

**Tech Stack :** JS vanilla sous `window.FP`, Canvas 2D en pixels d'art (`FP.px`, calques `FP.px.layer`), banc maison (`FP.test`,
`node dev/run-checks.js`).

**Spec :** `docs/superpowers/specs/2026-11-12-boss-infiltre-design.md`

## Global Constraints

- **AGENTS.md :** réglages dans `src/core/config.js` ; couleurs dans `FP.palette.boss` ; dessin dans `src/render/*` ; fichiers sous 400 lignes ;
  pas de code mort ; en-têtes Lit / Écrit / Expose ; `index.html` et `dev/check.html` : lignes `<script>` et titre seulement ; une entrée
  CHANGELOG ; banc complet vert et vérification en jeu.
- Géométrie et collisions des murs inchangées. Seules les positions des tourelles changent dans les plans.
- **Aucune génération PixelLab.**
- **Robot :** le robot de `bossfight.test.js` doit gagner chaque combat. S'il perd après les rafales, **s'arrêter et demander à
  l'utilisateur** avant de régler.
- Fins de ligne : garder celle de chaque fichier (CRLF dans la copie de travail).
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sur la branche `boss-infiltre`.

## Review Focus

1. **Rafale en cours quand la défense frappe, ou quand le boss meurt :** les tirs restants doivent s'annuler avec la visée
   (`quiet`, `clearShots`). → Test à la tâche 1.
2. **Tourelle déplacée vers l'intérieur :** elle doit rester hors des couloirs (dégagement des trajets ≥ channelMin / 2, test de plan
   existant) et dans sa salle. → Tâche 1.
3. **Coup transparent sur écran étroit (280 px) ou niveau étiré :** l'effet doit toujours couvrir au moins 35 % de chaque rangée. → Tâche 2.
4. **Structure qui recouvre une pompe ou une tourelle à un autre facteur d'étirement :** le placement doit être testé aux deux facteurs. →
   Tâche 4.
5. **Mur effondré à la mort du boss :** ses structures et ses engrenages disparaissent ; rien ne flotte (leçon de la v5.7.0). → Tâche 4.

---

### Task 1: Tourelles visibles et en rafales

**Files:**
- Modify :
  - `assets/boss/plans.js` : polygones des 10 tourelles ;
  - `src/play/boss-threats.js` : rafale ;
  - `src/core/config.js` : `boss.shot` et `boss.turret` ;
  - `src/render/boss-machines.js` : taille 24 et bras de fixation.
- Tests : `dev/tests/bossplan.test.js`, `dev/tests/bossthreats.test.js`, `dev/tests/bossmachines.test.js`

**Interfaces :**
- `config.boss.shot = { track: .7, lock: .3, r: 5, burst: 3, burstGap: .12, spread: 8 }` (`spread` en degrés, de part et d'autre de l'axe).
- `config.boss.turret.size = 24`, `barrel = 14`.
- **Rafale.** Quand la visée finit, la tourelle tire 3 tirs vers `lockedAt`, aux angles −spread, 0 et +spread, à `burstGap` s d'intervalle.
  - État : `state.bossThreats.burst = { turret, left, t, to }`, remis à `null` par `quiet` et `clearShots`.
  - `cooldown = gap` est posé après le dernier tir.
  - Un événement `bossShot` est émis à chaque tir.
- **Plans.** Le centre de chaque tourelle est entre 0,10 et 0,90 de la largeur. Le bras de fixation (dessin seulement) relie le socle au mur
  le plus proche dans l'axe horizontal.

- [ ] **Step 1 : tests qui échouent.**
  - `bossPlan: tourelles à au moins 10 % de chaque bord`.
  - `shots: une visée finit en rafale de 3 tirs espacés de burstGap, en éventail de ± spread` : angles à ±1°, puis `cooldown === gap` après
    le 3e tir.
  - `shots: la rafale s'annule avec la visée (coup de la défense, tête transpercée)` (Review Focus 1).
  - `bossMachines: la tourelle mesure au moins 22 pixels d'art`, qui remplace le test des 14 px.
  - Mettre à jour les tests d'un seul tir de `bossthreats.test.js` (premier tir de la rafale).
- [ ] **Step 2 :** focus `"^(bossPlan|shots|bossMachines)"`. Expected : FAIL.
- [ ] **Step 3 :** déplacer les tourelles, puis implémenter la rafale et le dessin. Les tests de plan existants (tourelle dans sa salle,
  trajets à ≥ channelMin / 2) doivent rester verts (Review Focus 2).
- [ ] **Step 4 :** focus, puis `"^bossfight"` (robot). Expected : PASS. Si le robot perd : arrêt, on demande à l'utilisateur.
- [ ] **Step 5 :** commit `feat: tourelles des boss visibles et en rafales`.

### Task 2: Coups sur fond transparent

**Files:** `src/render/boss-machines.js` (`strike`), `dev/tests/bossmachines.test.js`

**Interfaces :**
- `strike(g, b, a, t, H, Q)` ne dessine plus d'aplat. Les effets sont des traînées et des particules :
  - **vapeur :** jets horizontaux de longueur variable depuis la paroi, 1 à 2 px d'épaisseur, une rangée sur deux ;
  - **béton :** coulées verticales de 2 px, une colonne sur trois, avec des éclaboussures ;
  - **flammes :** langues verticales de largeur 2 à 3 qui ondulent ;
  - **radiation :** bandes pointillées et éclairs.
- Couverture : chaque rangée de la moitié dans l'écran contient de l'effet sur au moins 35 % de sa largeur.
- `config.boss.machines.cover = .35` sert au test.

- [ ] **Step 1 :** remplacer le test de couverture à 80 % par `bossMachines: en coup, l'effet couvre au moins cover de chaque rangée sans
  aplat`, avec trois conditions :
  - aucun rectangle plus large que la moitié de la largeur **et** plus haut que 2 px ;
  - couverture ≥ 0,35 par rangée ;
  - 4 biomes, les 2 moitiés, W = 280 et 440, niveau étiré (Review Focus 3).
  Expected : FAIL (aplat).
- [ ] **Step 2 :** réécrire `strike`. Focus `"^bossMachines"`. Expected : PASS.
- [ ] **Step 3 :** commit `feat: coups des machines sur fond transparent`.

### Task 3: Pompes et cœur dessinés par le code (boss-core)

**Files :**
- Create : `src/render/boss-core.js`, `dev/tests/bosscore.test.js`
- Modify :
  - `src/render/boss.js` : `targetBase`, `targetCore` et `head` délèguent ;
  - `assets/boss/art.js` : retrait de `target` et `head` ;
  - `assets/boss/art/friche/{cible,tete}.png` : supprimés ;
  - `src/render/boss-skin.js` : rôles `target` et `head` retirés ;
  - `dev/tools/import-boss.js` ;
  - `src/core/config.js` (`boss.core`), `src/render/palette.js` (`boss.core`) ;
  - `index.html`, `dev/check.html` ;
  - `dev/tests/bossskin.test.js` (rôles).

**Interfaces :**
- `FP.bossCore.pump(g, pts, t, M, broken)` dessine la pompe dans le polygone de la cible (pixels d'art de l'écran) :
  - châssis riveté (`M.dark` / `M.edge`) ;
  - cuve centrale (`palette.boss.core.tank` : vitre, liquide `weak`, bulles qui montent) ;
  - volant qui tourne à `core.wheelHz` ;
  - deux pistons en alternance à `pipes.pumpHz`.
  Cassée : cuve brisée (éclats sombres, flaque `weak[1]` au pied), volant fixe.
- `FP.bossCore.heart(g, pts, t, state)` dessine le cœur :
  - anneaux rivetés, pales qui tournent à `core.bladeHz × (1 − 0,25 × pompes cassées)` ;
  - noyau qui bat, avec un raté de battement dans la seconde qui suit chaque pompe cassée (nouvelle via `bossFight.destroyed`, mémoire
    locale du dessin) ;
  - à nu (`headOpen`) : pales arrêtées, noyau grand ouvert qui pulse fort.
- `config.boss.core = { wheelHz: .8, bladeHz: .5, beat: 1.4 }`.
- `render/boss.js` : l'épave d'une cible détruite et la tête transpercée restent celles d'aujourd'hui (`wreck`).

- [ ] **Step 1 : tests qui échouent** (`bosscore.test.js`) :
  - `bossCore: la cuve est la zone la plus claire de la pompe` (luminance moyenne des rectangles de la cuve > celle du reste) ;
  - `bossCore: la pompe bouge (volant, pistons, bulles) entre deux images` ;
  - `bossCore: une pompe cassée a sa cuve brisée et son volant arrêté` ;
  - `bossCore: les pales du cœur tournent tant qu'une pompe vit, arrêtées à nu ; le noyau bat` ;
  - `bossSkin: art.js sans pompe ni tête` (rôles).
- [ ] **Step 2 :** focus. Expected : FAIL.
- [ ] **Step 3 :** implémenter, brancher et retirer les images. Focus `"^(bossCore|bossRender|bossSkin|bossfx|bossdeath|bossPipes)"`.
  Expected : PASS.
- [ ] **Step 4 :** commit `feat: pompes et cœur des boss animés, dessinés par le code`.

### Task 4: Structures de liaison (boss-struts)

**Files :**
- Create : `src/render/boss-struts.js`, `dev/tests/bossstruts.test.js`
- Modify : `src/render/frame.js` (après la pousse et les effets, avant `drawThreats`), `src/core/config.js` (`boss.struts`),
  `src/render/palette.js` (`boss.strut`), `index.html`, `dev/check.html`

**Interfaces :**
- `config.boss.struts = { gap: .5, maxPerScreen: 2, beam: 7, gear: [12, 22], gearHz: .15, gearBoost: .5, clear: 8 }` :
  - `gap` : écart vertical en hauteurs d'écran ;
  - `beam` : épaisseur des poutrelles en px d'art ;
  - `gear` : rayon min et max en px d'art ;
  - `gearHz` : tours par seconde, `+ gearBoost ×` le nombre de pompes cassées ;
  - `clear` : distance minimale aux pièces protégées, en px.
- `FP.bossStruts.place(bl, world, seed)` → `[{ kind: 'beam' | 'cable' | 'gear', wall (indice, ou [a, b] pour une traversée), x0, y0, x1,
  y1 | cx, cy, r }]`, pur, déterministe :
  - **traversées** (poutrelles, câbles) : deux bords de murs qui se font face horizontalement dans un couloir (hors des salles), à la même
    hauteur ±10 px, à moins d'un écran de large ;
  - **engrenages** : sur des bords de murs, centre à au plus 0,4 r dans le mur.
  Règles :
  - rejet si une pièce protégée (pompe, tête, plaque, tourelle) est à moins de `clear` ;
  - au plus `maxPerScreen` traversées par hauteur d'écran ;
  - pas de traversée dans une salle.
- `FP.bossStruts.draw(g, state)` :
  - poutrelles et câbles dans un calque mis en cache (refait quand un mur tombe) ;
  - engrenages en direct (rotation) ;
  - rien pour un mur `off`.

- [ ] **Step 1 : tests qui échouent** (`bossstruts.test.js`), pour les 4 biomes, W = 280 et 440, facteur 1 et maximal (Review Focus 4) :
  - `bossStruts: aucune structure ne recouvre une pompe, la tête, une plaque ni une tourelle` ;
  - `bossStruts: aucune traversée dans une salle, au plus maxPerScreen par écran` ;
  - `bossStruts: même placement d'une tentative à l'autre, aucun solide créé` ;
  - `bossStruts: un mur effondré emporte ses structures` (Review Focus 5) ;
  - `bossStruts: les engrenages tournent plus vite quand une pompe casse, et s'arrêtent à la mort du boss` ;
  - `bossStruts: chaque boss a au moins 3 traversées et 2 engrenages`.
- [ ] **Step 2 :** focus. Expected : FAIL.
- [ ] **Step 3 :** implémenter et brancher. Focus `"^(bossStruts|bossRender|bossPipes|bossMachines)"`. Expected : PASS.
- [ ] **Step 4 :** commit `feat: structures de liaison qui donnent l'échelle du boss`.

### Task 5: Version 5.8.0

**Files :** `src/core/config.js`, `index.html`, `dev/tests/state.test.js`, `CHANGELOG.md`, `docs/architecture.md`

- [ ] **Step 1 :** version `'5.8.0'`, CHANGELOG (nombre réel de tests), `architecture.md`. Pour l'architecture : les deux nouveaux fichiers,
  l'ordre du dessin, et la correction des passages périmés relevés à la dernière revue (« hachures des défenses », « tourelles » dans
  `boss.js`).
- [ ] **Step 2 :** `node dev/run-checks.js` en arrière-plan. Expected : `N/N OK`.
- [ ] **Step 3 :** en jeu au format téléphone : espion de l'ordre du dessin, puis captures des 4 boss (liaisons, pompe, cœur, coup, rafale)
  envoyées à l'utilisateur.
- [ ] **Step 4 :** commit `feat: boss infiltré (v5.8.0)`, relecture finale de la branche (sous-agent), corrections, puis demande de fusion.
