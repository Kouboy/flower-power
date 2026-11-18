# Modules, première livraison — plan d'implémentation (v5.13.0)

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche
> par tâche. Les étapes sont des cases à cocher (`- [ ]`).

**But :** 10 modules à silhouette nommable, jouables dans le Lab, composés seulement de pièces existantes : murs, obstacles, limaces,
nappes, tourelles, impulsions et pièces. Chacun a une fiche.

**Architecture :**
- **Format :** celui des circuits du Lab (`assets/lab/circuits.js`) gagne `obstacles`, `slugs`, `toxics` et `turrets`.
- **Pose :** `world/lab.js` pose ces éléments, en miroir un passage réussi sur deux, et tient une horloge de module (partie de l'entrée de
  la pointe).
- **Comportement :** les limaces du Lab patrouillent sur cette horloge (`play/lab-hazards.js`). La tourelle hors boss vise puis tire en
  rafale sur cette horloge (`play/lab-turret.js`), avec le dessin et les sons des boss.

**Pile :** JavaScript vanilla sous `window.FP`. Banc maison chargé par `dev/check.html`.

**Spec :** `docs/superpowers/specs/2026-11-18-modules-premiere-livraison-design.md`.

## Contraintes globales

- **Seulement ce qui existe déjà,** sans mécanique nouvelle. La tourelle reproduit celle des boss (visée qui suit, se fige, rafale de 3 :
  `config.boss.shot` pour `lock`, `burst`, `burstGap`, `spread` et `r`), avec une visée d'au moins 1 s.
- **Jeu normal intact :**
  - sans `?lab`, l'empreinte de génération reste `2481539369,4256782594` (test existant « lab: jeu normal intact ») ;
  - les tests des boss passent, sauf le robot `bossFight:`, qu'on ne lance pas.
- **Bande sûre** (`FP.camera.safeX`) pour passages, menaces, pièces et tourelles. Les murs peuvent toucher les bords. Passages d'au moins
  `config.lab.channelMin` × W / 360.
- **AGENTS.md :**
  - réglages dans `src/core/config-lab.js` (`config.js` est plein) ;
  - dessin dans `src/render/*` ;
  - fichiers de moins de 400 lignes, pas de code mort ;
  - en-têtes Lit, Écrit et Expose ;
  - `index.html` et `dev/check.html` : seulement des lignes `<script>` ;
  - une entrée au CHANGELOG ;
  - version v5.13.0.
- **Banc :**
  - complet sans robot : `node <scratchpad>/focus.js "." "^(?!bossFight)"` ;
  - ciblé : `focus.js "." "<regex>"` ;
  - **aucune simulation de pilotage** (mémoire de l'utilisateur). L'utilisateur juge en jeu.
- **Fichiers de travail :** CRLF dans le dossier de travail, LF dans git ; garder les fins de ligne.

## Points d'attention de la revue

1. **Mort dans un module en miroir :** la relance garde le même sens ; seul un passage réussi inverse le sens. Test en tâche 1.
2. **Tir de tourelle qui part alors que la pointe est déjà sortie du module :** plus de tir dès la sortie ; les tirs en vol disparaissent.
   Test en tâche 2.
3. **Une limace ou une tourelle qui sort de la bande sûre une fois le module retourné :** test « tout dans la bande sûre » sur les deux
   sens, en tâche 3.
4. **Un module traversé sans entrer dans sa zone** (par un bord) : impossible, les murs touchent les bords. Test de traversée et des murs
   jusqu'aux bords, en tâche 3.
5. **`?lab=11`, `?lab=0`, `?lab=abc` :** module 1. Test du paramètre, en tâche 3.

---

### Tâche 1 : nouveaux éléments, miroir et horloge de module

**Fichiers :**
- Modifier : `src/world/lab.js` (pose, miroir, horloge), `src/world/hazards.js` (une ligne : sauter les limaces `lab`), `src/play/flow.js`
  (le compteur de passages réussis par module, à l'éclosion), `src/core/state.js` (`run.labPasses`).
- Créer : `src/play/lab-hazards.js` (horloge du module et patrouille des limaces), et son entrée dans `UPDATE_ORDER` de `src/core/loop.js`,
  après `hazards`.
- Tests : `dev/tests/lab.test.js`, `dev/tests/loop.test.js`.

**Interfaces :**
- **Format d'un module :** `{ …, obstacles: [{ kind, x, y, a?, flip?, scale? }], slugs: [{ x0, y0, x1, y1, r?, period, phase? }],
  toxics: [{ x, y, rx?, ry? }], turrets: [{ x, y, side: -1 | 1, period, offset }] }`.
  - Les positions sont en proportions, comme les murs.
  - `side` est le côté du mur où s'accroche la console.
  - `period` et `offset` sont en secondes ; `phase` va de 0 à 1.
- **`FP.labLevel.place(circuit, world, mirror)`** retourne x en `1 − x`, les angles des obstacles (`a` en `−a`, `flip` inversé), les trajets
  de limaces, le `side` des tourelles, et l'ordre des voies d'impulsion.
- **`FP.labLevel.generate(state)`** pose aussi :
  - les obstacles, par `FP.catalog.makeSolid` (des solides ordinaires, dessinés par `obstacles.js`) ;
  - les nappes, par `FP.level.makeToxic` avec un hasard fixé par l'identifiant du module, dans `world.toxics` ;
  - les limaces, dans `world.leaks`, avec `lab: { period, phase }` ;
  - `world.labLevel.turrets = [{ id, x, y, side, period, offset }]` ;
  - `world.labLevel.mirror` (booléen).
- **`state.run.labPasses = { [moduleId]: nombre de passages réussis }`.** `mirror = labPasses[id] % 2 === 1`. L'éclosion incrémente le
  compteur du module en cours avant de passer au suivant ; une mort n'y touche pas.
- **`FP.labHazards.update(state, dt)`** tient `state.labClock = { level, t, on }` : `on` passe à vrai quand la pointe entre dans
  `[top, bottom]`, et `t` compte alors les secondes depuis l'entrée. La patrouille place chaque limace `lab` en aller-retour :
  `k = triangle((t / period + phase) mod 1) − 0,5` sur son trajet. Avant l'entrée, `t = 0`. Les limaces n'accélèrent pas et ne réagissent
  pas à la bière.
- **`FP.hazards.update`** saute les limaces `l.lab`.

- [ ] **Étape 1 : tests qui échouent.** On ajoute à `lab.test.js` un module d'essai `LAB_FIXTURE`, posé directement par
  `FP.labLevel.place` et par un `generate` qui accepte un module explicite (`FP.labLevel.generate(state, circuit)`, 2e argument facultatif).
  - `lab: obstacles, nappes et limaces posés` : les kinds sont attendus dans `world.solids`, il y a autant de nappes et de limaces que dans
    le module, les limaces ont `lab.period`, et deux générations donnent le même JSON.
  - `lab: miroir` : `place(c, w, true)` donne pour chaque mur et chaque pièce `x' = W − x`, et des tourelles avec `side` opposé.
  - `lab: un passage réussi inverse le sens, une mort non` :
    - `labPasses` commence à 0, donc sens normal ;
    - une éclosion donne 1, donc le module suivant… mais revenir au même module donne le miroir ;
    - une mort laisse le compteur inchangé.
  - `lab: horloge et patrouille` :
    - avant l'entrée de la pointe, une limace reste à sa phase de départ ;
    - après l'entrée, à `t = period / 2`, elle a parcouru tout son trajet ;
    - deux entrées dans le même module donnent la même position au même `t`.
  - `lab: les limaces du jeu normal ne changent pas` : sans Lab, `FP.hazards.update` déplace les limaces comme avant (même `cx` après 30
    pas qu'une copie calculée avec la formule existante).
  - Mettre à jour `loop.test.js` (ordre : `…, 'hazards', 'labHazards', 'bossThreats', …`).
- [ ] **Étape 2 : lancer** `focus.js "." "lab:|loop:|hazards"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: obstacles, limaces, nappes et miroir dans les modules du Lab`.

### Tâche 2 : la tourelle hors des boss

**Fichiers :**
- Créer : `src/play/lab-turret.js`, avec son entrée dans `UPDATE_ORDER` après `labPulse`.
- Modifier :
  - `src/render/lab.js` : tourelle, ligne de visée et tirs. Reprendre l'allure des boss : socle et console vers le mur `side`, canon qui
    pivote, lentille, ligne de visée, tirs ; couleurs `FP.palette.boss.{aim, shot, milieux.friche}`. Extraire un module si le fichier
    dépasse 400 lignes.
  - `src/core/config-lab.js` : `turret: { aim: 1.2, speed: 400 }`.
  - `src/audio/audio.js` : rien si les événements reprennent `bossAim`, `bossLock` et `bossShot`.
- Tests : `dev/tests/lab.test.js`.

**Interfaces :**
- **`FP.labTurret.update(state, dt)`** tient `state.labTurret = { level, aims: { [id]: { t, lockedAt } }, shots: [{ x, y, vx, vy, solid }] }`.
- **Cycle de chaque tourelle,** sur `state.labClock.t` :
  - il démarre à `offset`, puis se répète tous les `period` ;
  - visée pendant `lab.turret.aim` (au moins 1 s) ;
  - la ligne se fige `config.boss.shot.lock` s avant la fin ;
  - puis une rafale de `burst` tirs, espacés de `burstGap`, l'axe puis ± `spread` degrés, à `lab.turret.speed` px/s.
- **Tirs :** des solides `kind: 'shot'` dans `world.solids`, retirés hors du monde, dans un mur `lab` ou un obstacle, à la sortie de la
  pointe hors du module, à la mort et à la génération.
- **Événements :** `bossAim`, `bossLock` et `bossShot` `{ turret: id }`, qui donnent les sons des boss.

- [ ] **Étape 1 : tests qui échouent** (`LAB_FIXTURE` avec une tourelle) :
  - `lab: la tourelle vise au moins 1 s avant de tirer` : entre `bossAim` et le premier `bossShot`, au moins 1 s ;
  - `lab: rafale de 3, en éventail` : 3 tirs espacés de `burstGap`, à `spread` degrés ;
  - `lab: un tir s'arrête dans un mur` ;
  - `lab: la même mesure à chaque entrée` : les temps des `bossAim` depuis l'entrée sont identiques entre deux entrées ;
  - `lab: rien hors du module ni après une mort` : la pointe sortie ou morte, aucun tir ni visée ne reste, et `world.solids` ne garde
    aucun `shot` ;
  - `labRender: tourelle et ligne de visée dessinées` ;
  - `lab: un tir tue` : cause `solid`, kind `shot`.
- [ ] **Étape 2 : lancer** `focus.js "." "lab:|labRender"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
- [ ] **Étape 4 : lancer** `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: tourelle des modules du Lab`.

### Tâche 3 : les 10 modules et leurs fiches

**Fichiers :**
- Modifier : `assets/lab/circuits.js`. Remplacer les 6 circuits par les 10 modules de la spec, dans l'ordre et sous ces identifiants :
  1. `gueule` ;
  2. `escalier` ;
  3. `peigne` ;
  4. `sablier` ;
  5. `carrefour` ;
  6. `dents-de-scie` ;
  7. `tetris` ;
  8. `tour-de-guet` ;
  9. `herse` ;
  10. `grand-huit`.

  Les noms affichés sont en capitales (« LA GUEULE », …).
- Modifier aussi : `src/core/fp.js` (`?lab=` de 1 à 10, regex `^([1-9]|10)$`).
- Créer : `docs/lab/modules.md`, une fiche par module (nom, silhouette, idée, dilemme, ce qui rapporte, comment on échoue).
- Tests : `dev/tests/lab.test.js`. Réécrire les tests propres aux anciens circuits (fourche, cheminée, combiné, sols attendus, slalom-argile),
  et garder les tests génériques.

**Interfaces :**
- **Chaque module a au moins deux trajets de référence** (`path` et `alt[0]`), les deux options de son dilemme.
- **Contenu de chaque module, d'après la spec :**
  1. **gueule :** deux mâchoires dentelées ; des pièces dans la gorge ; des limaces dans les joues.
  2. **escalier :** des marches décalées ; une tourelle en bas.
  3. **peigne :** 4 fentes ; 4 limaces aux périodes différentes ; des pièces dans la fente la plus étroite.
  4. **sablier :** une impulsion dans le goulot ; des pièces dans les poches.
  5. **carrefour :** des limaces horizontales sur le bras horizontal ; des pièces sur ce bras.
  6. **dents-de-scie :** des parois dentées décalées ; des nappes dans les creux.
  7. **tetris :** des blocs ; au moins 2 itinéraires ; une tourelle en bas.
  8. **tour-de-guet :** 2 tourelles décalées d'une demi-période ; des piliers ; des pièces au centre.
  9. **herse :** une rangée de piliers ; une nappe entre certains ; des limaces derrière.
  10. **grand-huit :** deux boucles en S ; une impulsion sur la voie intérieure.
- **Obstacles :** seulement ceux de la Friche (`config.milieux[0].kinds`).

- [ ] **Étape 1 : tests qui échouent :**
  - `lab: 10 modules, dans l'ordre de la spec` : les identifiants, et une hauteur de 0,5 à 1,5 ;
  - `lab: chaque module se traverse, dans les deux sens` : `path` et `alt[0]` à au moins `channelMin / 2` des murs **et des obstacles
    fixes**, à 280, 360 et 440 px, en normal et en miroir ;
  - `lab: tout dans la bande sûre` : passages, pièces, limaces (trajet et corps), nappes (centre), tourelles et voies, dans les deux sens ;
  - `lab: les murs ferment les bords` : à mi-hauteur du module, les points à x = 2 px et x = W − 2 px sont dans un mur ;
  - `lab: chaque module tient sa promesse` : la liste des éléments attendus par module (interfaces ci-dessus) ;
  - `lab: paramètre` : de 1 à 10, et les valeurs invalides donnent 1 ;
  - `lab: les fiches existent` : `docs/lab/modules.md` n'est pas lisible sous Node. On vérifie plutôt que chaque module a un `name` non
    vide et un champ `idea` (une ligne, reprise en commentaire de la fiche).
- [ ] **Étape 2 : lancer** `focus.js "." "lab:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : dessiner les 10 modules.** Ajuster leur géométrie avec un outil de mesure des marges (scratchpad, comme
  `lab-clear.js`), puis écrire les fiches.
- [ ] **Étape 4 :**
  - lancer `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert ;
  - faire une capture de chaque module au format téléphone (Playwright, dans `Flower Power/.playwright-mcp/`) ;
  - envoyer les captures à l'utilisateur.
- [ ] **Étape 5 : commit** `feat: les 10 modules de la première livraison`.

### Tâche 4 : version, doc et vérification

- [ ] **Étape 1 :**
  - v5.13.0 (`config.js`, titre de `index.html`, `state.test.js`) ;
  - entrée au CHANGELOG, avec les liens `?lab=1` à `?lab=10` ;
  - `docs/architecture.md` (nouveaux fichiers, ordre de mise à jour).
- [ ] **Étape 2 :** lancer `focus.js "." "^(?!bossFight)"`. Résultat attendu : tout est vert. Vérifier aussi que la console du navigateur
  n'affiche aucune erreur sur chaque module.
- [ ] **Étape 3 :** revue finale de la branche par un sous-agent opus. Pour chaque problème important, un test qui échoue puis le
  correctif.
- [ ] **Étape 4 : commit** `chore: v5.13.0 (modules, première livraison)`. Ensuite, demander à l'utilisateur avant tout merge ou push.
