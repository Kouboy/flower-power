# Boss juste, Shop et musique accordés — plan d'implémentation (v5.9.0)

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans, tâche
> par tâche. Les étapes sont des cases à cocher (`- [ ]`).

**But :** rendre le coup des défenses juste, rattacher l'entrée au boss, habiller les pompes d'un sprite, retirer la poche de terre,
verrouiller COMMANDER sans les moyens, et accorder le Shop au biome.

**Architecture :**
- Le jeu calcule la part déployée d'un coup (`FP.bossThreats.reach`), et le rendu dessine cette même part.
- La bouche d'aspiration est un nouveau fichier de rendu (`render/boss-intake.js`). Les plans marquent ses pièces (`intake: true`) et
  reçoivent deux tuyaux routés.
- Les pompes gagnent un rôle d'image `pump`, que le dessin par le code anime par-dessus.
- Le Shop gagne `canOrder`. La musique choisit une version transposée du reggae selon le biome.

**Pile :** JavaScript vanilla sous `window.FP`, sans build. Banc maison (`FP.test`, `FP.assert`, `FP.assertEqual`) chargé par
`dev/check.html`.

**Spec :** `docs/superpowers/specs/2026-11-12-boss-juste-design.md`.

## Contraintes globales

- **Version :** v5.9.0, avec une seule entrée au CHANGELOG. La version figure dans `config.version`, dans les titres de `index.html` et de
  `dev/check.html`, et dans `docs/architecture.md`.
- **AGENTS.md :**
  - réglages dans `src/core/config.js`, dessin dans `src/render/*`, couleurs dans `FP.palette.boss` ;
  - fichiers de moins de 400 lignes, pas de code mort ;
  - en-têtes Lit, Écrit et Expose à jour ;
  - `index.html` et `dev/check.html` ne reçoivent que des lignes `<script>` et la version.
- **Valeurs fixées par la spec :**
  - `boss.defense.deploy = .25` (s) ;
  - transpositions du Shop : friche 0, industrie +5, décharge +3, nucléaire 0 ;
  - couverture d'un coup : chaque rangée à au moins 35 % (`machines.cover`).
- **PixelLab :** au plus 8 générations, sur le bonus quotidien (16 restantes au 2026-11-12).
- **Juge :** le robot (`bossFight:`) bat chaque boss. S'il perd, on s'arrête et on en parle à l'utilisateur.
- **Fichiers de travail :** CRLF dans le dossier de travail, LF dans git. Garder les fins de ligne en éditant.
- **Commandes de test :**
  - banc ciblé : `node <scratchpad>/focus.js "." "<regex>"` ;
  - banc complet : `node dev/run-checks.js`, environ 10 min, en arrière-plan.

## Points d'attention de la revue

1. **Coup qui commence pendant que la pointe est déjà au bord de la machine.** Au premier instant du déploiement, la zone est vide. Il
   faut qu'elle soit `off` et qu'elle ne tue pas. Testé en tâche 1.
2. **Nouvelle tentative pendant un coup.** La zone d'une salle, regénérée au milieu d'un coup, ne doit pas garder un polygone partiel.
   `world/boss.js` la remet `off`, et `quiet()` aussi. Testé en tâche 1.
3. **Image de pompe pas encore chargée, ou en échec, en plein combat.** Le dessin par le code de la v5.8.0 reste en secours, sans erreur.
   Testé en tâche 6.
4. **Lobbying ou dernière chance qui régénère le niveau pendant le Shop.** La musique suit `state.world.milieu`, et ce biome ne change pas
   pendant le Shop. Testé en tâche 4.
5. **Article coché, puis score insuffisant pour le reste.** COMMANDER reste actif dès qu'un article est coché. Testé en tâche 3.

---

### Tâche 1 : coup juste (déploiement visible)

**Fichiers :**
- Modifier : `src/core/config.js` (`boss.defense`).
- Modifier : `src/play/boss-threats.js` (`aim`, `update`, nouvelles fonctions exposées).
- Modifier : `src/render/boss-machines.js` (`MOUNT` lu chez threats, `strike` bornée, vapeur pleine largeur).
- Tests : `dev/tests/bossthreats.test.js`, `dev/tests/bossmachines.test.js`.

**Interfaces :**
- Produit `FP.bossThreats.MOUNT = { beton: 'ceiling', radiation: 'ceiling', vapeur: 'wall', flamme: 'wall' }`. Il remplace la constante
  locale de `render/boss-machines.js`.
- Produit `FP.bossThreats.reach(room, half, p) → { x0, y0, x1, y1 }`, pur, en pixels du monde. C'est la part déployée de la moitié `half`
  à `p` (de 0 à 1) :
  - sur un plafond, de `y0` vers le bas, sur une hauteur `p × (y1 − y0)` ;
  - sur une paroi, depuis la paroi extérieure (gauche si `half < 0`, droite sinon) vers le milieu de la salle, sur une largeur
    `p × largeur`.
- Produit `FP.bossThreats.deployed(e) → 0..1`, qui vaut `min(1, e.t / boss.defense.deploy)` pendant `strike`, et 0 sinon.

- [ ] **Étape 1 : tests qui échouent.** Dans `bossthreats.test.js` :
  - `threats: le coup se déploie depuis sa machine` :
    - pour chaque type, à `p = 0`, `.5` et `1`, `reach` reste dans la moitié ;
    - à `p = 1`, `reach` égale la moitié ;
    - à `p = .5`, l'aire vaut la moitié de l'aire de la moitié de salle ;
    - le bord collé à la machine est fixe (`y0` pour un plafond, le bord extérieur pour une paroi).
  - `threats: la zone mortelle suit le front` :
    - on force une salle en `strike` ;
    - à `e.t = 0`, `zone.off === true` ;
    - à `e.t = deploy / 2`, un point de la moitié loin de la machine donne `FP.collision.distanceTo(zone, x, y) > 0`, et un point près de la
      machine donne `<= 0` ;
    - à `e.t >= deploy`, le polygone couvre toute la moitié.
  - `threats: une nouvelle génération ou le calme remet la zone off` : `quiet` et `FP.bossLevel.generate` pendant un coup laissent
    `zone.off === true`.

  Dans `bossmachines.test.js` :
  - `machines: l'effet dessiné reste dans la part déployée`. À `p = .5`, aucun pixel d'effet hors de `reach` (en art). Chaque rangée de
    `reach` porte de l'effet sur au moins 35 % de sa largeur.
  - `machines: la vapeur atteint le bout de la moitié`. Une fois déployée, chaque rangée a un pixel de vapeur dans la colonne la plus
    éloignée de la paroi.
- [ ] **Étape 2 : lancer** `focus.js "." "threats:|machines:"`. Résultat attendu : ÉCHEC (`reach` n'est pas défini).
- [ ] **Étape 3 : implémenter.**
  - Ajouter `deploy: .25` dans `boss.defense`.
  - `aim(r, half, p)` construit le polygone de la zone depuis `reach`. La zone est `off` quand la largeur ou la hauteur de `reach` fait
    moins de 1 px.
  - Pendant `strike`, `update` rappelle `aim(r, e.half, deployed(e))` à chaque image, après `e.t += dt`.
  - Dans `render/boss-machines.js`, `draw` passe à `strike` la boîte d'art de `reach(r, half, deployed(e))`, au lieu de la moitié entière.
  - Vapeur : chaque jet couvre toute la largeur de la boîte, depuis la paroi. Garder le scintillement des teintes, supprimer la longueur
    variable.
  - Mettre à jour les en-têtes des deux fichiers.
- [ ] **Étape 4 : lancer** `focus.js "." "threats:|machines:|bossFight:"`. Résultat attendu : tout est vert, et le robot gagne chaque combat.
- [ ] **Étape 5 : commit** `fix: le coup des défenses se déploie, et ne tue que là où il est arrivé`.

### Tâche 2 : sans poche de terre

**Fichiers :**
- Modifier : `src/render/boss-earth.js` (supprimer le bloc « Poche de terre », en-tête sans poche ni `surfaceY`).
- Modifier : `src/core/config.js` (retirer `boss.earth.pocket` et son commentaire).
- Tests : `dev/tests/bossearth.test.js` (lignes 35 et 54 : les tests de poche).

- [ ] **Étape 1 : test qui échoue.** Remplacer les deux tests de poche par `earth: pas de poche au-dessus de la tête`. Pour chaque boss :
  - dessin de la terre seule ;
  - sur la colonne du centre de la tête, entre le sommet de la tête et `surfaceY`, aucun pixel aux couleurs de terre, sauf à moins de
    `fringe` px d'un bord extérieur ;
  - `FP.config.boss.earth.pocket === undefined`.
- [ ] **Étape 2 : lancer** `focus.js "." "earth:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter** la suppression.
- [ ] **Étape 4 : lancer** `focus.js "." "earth:|bossdeath|bossFight:"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `revert: plus de poche de terre sous la tête du boss`.

### Tâche 3 : Shop sans les moyens

**Fichiers :**
- Modifier : `src/play/shop.js` (ajouter `canOrder` ; `order` ne fait rien si c'est faux).
- Modifier : `src/ui/order.js` (bouton COMMANDER grisé).
- Tests : `dev/tests/shop.test.js`, `dev/tests/order.test.js`.

**Interfaces :**
- Produit `FP.shop.canOrder(state) → boolean`, vrai si au moins un article est cochable (`canCheck`). Un article déjà coché compte comme
  cochable.

- [ ] **Étape 1 : tests qui échouent.**
  - `shop: sans les moyens, COMMANDER ne fait rien` :
    - avec `score.eco = 0`, `canOrder` est faux ;
    - `FP.shop.order(s)` laisse `phase === 'idle'` et n'ajoute pas d'événement ;
    - `FP.shop.decline(s)` passe à `'declined'`.
  - `shop: dernière chance sans les moyens de la graine` : avec le prix de la graine plus grand que le score, `canOrder` est faux et le
    libellé du refus reste ABANDONNER (`config.text.shop.giveUp`).
  - `shop: un article payable suffit` : un article payable et rien de coché, `canOrder` est vrai et `order` vaut un refus. Une fois un
    article coché et le reste trop cher, `canOrder` reste vrai.
  - `order: COMMANDER grisé sans les moyens` : on dessine le bon sur une toile de test. Les pixels du bouton COMMANDER n'ont ni `C.green`
    ni `C.cream`. Ils sont aux couleurs `C.off` et papier.
- [ ] **Étape 2 : lancer** `focus.js "." "shop:|order:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.**
  - `canOrder` : `state.shop.items.some((_, i) => canCheck(state, i))`.
  - En tête de `order`, après la garde de phase : `if (!canOrder(state)) return;`.
  - Dans `ui/order.js`, si `!FP.shop.canOrder(state)` : cadre `C.off`, fond `C.paper`, texte `C.off`.
  - `ui/menu.js` n'a pas besoin de changer : le toucher et la touche Entrée passent par `FP.shop.order`.
- [ ] **Étape 4 : lancer** `focus.js "." "shop:|order:|input"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `fix: sans les moyens, seul le refus reste au bon de commande`.

### Tâche 4 : Shop accordé au biome

**Fichiers :**
- Modifier : `src/audio/songs.js` (`shop(shift)` ; une version par biome).
- Modifier : `src/audio/music.js` (`songFor` en mode shop).
- Tests : `dev/tests/songs.test.js`, `dev/tests/music.test.js` (lignes 74, 98 et 104 : `'shop'` devient le nom du biome).

**Interfaces :**
- Produit, dans `songs.js`, une constante `SHOP_SHIFT = { friche: 0, industrie: 5, decharge: 3, nucleaire: 0 }`. C'est une donnée de
  composition, comme les `PCS` des autres morceaux.
- Produit `FP.songs['shop-' + milieuId]` : `shop(shift)` dont tous les `midi` et toutes les `pcs` sont décalés de `shift`, les `pcs` pris
  modulo 12. `FP.songs.shop` disparaît, et il ne reste aucune référence à son nom.
- `FP.music.songFor(state)` en mode `shop` → `{ song: 'shop-' + state.world.milieu, gain: 1 }`.

- [ ] **Étape 1 : tests qui échouent.**
  - `songs: le Shop dans la tonique de chaque biome` : pour chaque biome, la première basse de `shop-<id>` a pour classe de hauteur la
    tonique du biome (mi 4, la 9, sol 7, mi 4). Ses `pcs` égalent celles de `shop-friche` décalées de `SHOP_SHIFT[id]`. Toutes ses notes
    sont dans ses `pcs`, par le contrôle des gammes déjà présent : ajouter les nouvelles clés à sa liste.
  - `music: le Shop suit le biome du niveau` : en mode shop, avec `world.milieu = 'industrie'`, on obtient `shop-industrie`. Après
    `FP.level.generate` en lobbying, toujours dans le même biome, on obtient le même morceau.
  - Mettre à jour les tests existants qui attendent `'shop'`.
- [ ] **Étape 2 : lancer** `focus.js "." "songs:|music:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.** Le tempo (72) est inchangé. Mettre à jour l'en-tête de `songs.js` (la liste Expose) et de `music.js`.
- [ ] **Étape 4 : lancer** `focus.js "." "songs:|music:|sequencer|audio"`. Résultat attendu : tout est vert.
- [ ] **Étape 5 : commit** `feat: le reggae du Shop prend la tonique du biome`.

### Tâche 5 : bouche d'aspiration

**Fichiers :**
- Modifier : `assets/boss/plans.js` (`intake: true` sur les deux murs de l'entrée de chaque plan) :
  - friche : les deux murs entre lesquels passe la graine, parmi `mur-1` et `mur-2`, à vérifier par le test ;
  - industrie : `pied-g` et `pied-d` ;
  - décharge : `socle-g` et `socle-d` ;
  - nucléaire : `socle-g` et `socle-d`.
- Modifier : `dev/tools/route-pipes.js`. Pour chaque pièce `intake`, ajouter un tuyau `{ from: <id>, to: 'head' }`, puis relancer
  `node dev/tools/route-pipes.js`.
- Modifier : `src/render/boss-pipes.js`, seulement si un `from` qui n'est pas une cible y casse. Un tel tuyau ne fuit jamais, comme une
  liaison.
- Créer : `src/render/boss-intake.js`.
- Modifier : `src/render/frame.js` (appel après `FP.bossEarth.draw`, avant `FP.bossPipes.draw`), `index.html` et `dev/check.html` (une
  ligne `<script>` chacun, après `boss-earth.js`).
- Modifier : `src/core/config.js` (`boss.intake: { teeth: 4, plateGap: 8 }`), `src/render/palette.js` (`boss.intake: { tooth, grille }`).
- Tests : `dev/tests/bossplan.test.js`, nouveau `dev/tests/bossintake.test.js` (ligne `<script>` dans `dev/check.html`).

**Interfaces :**
- Produit `FP.bossIntake.lips(bl) → [{ wall: i, x0, y0, x1, y1, nx, ny }]`, pur, en pixels du monde. Ce sont les bords des murs `intake`
  qui donnent sur la gorge, avec leur normale vers la gorge.
- Produit `FP.bossIntake.draw(g, state)`, qui dessine :
  - des tôles rivetées tous les `plateGap` px d'art sur chaque mur `intake` ;
  - `teeth` dents par lèvre ;
  - une grille au pied de la gorge.

  Rien n'est dessiné si le mur est `off` ou si la tête est `off`.
- Utilise `bl.plan.pieces[k].intake`. `world/boss.js` recopie le drapeau sur le mur : `walls[i].intake = true`.

- [ ] **Étape 1 : tests qui échouent.**
  - `bossplan: deux pièces d'entrée par plan, de part et d'autre du départ` : exactement 2 pièces `intake`, de rôle `wall`. Le premier
    point du trajet de référence vers la tête (`toWorld`) a une abscisse comprise entre leurs deux boîtes.
  - `bossplan: deux tuyaux partent de l'entrée` : il y a un tuyau `from` pour chaque pièce `intake`, et il finit sur `'head'`.
  - `intake: les lèvres regardent la gorge` : pour chaque boss, 2 lèvres ou plus, chacune avec une normale qui pointe vers le départ.
  - `intake: tôles, dents et grille sans toucher la géométrie` : on dessine un niveau de boss caméra en bas. Il y a des pixels
    `palette.boss.intake.tooth` sur chaque lèvre. Les solides du niveau (JSON de `walls`) sont identiques avant et après le dessin.
  - `intake: rien quand le mur tombe` : avec les murs `intake` `off`, aucun pixel `tooth`.
- [ ] **Étape 2 : lancer** `focus.js "." "bossplan|intake:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter.** Marquer les plans, router les tuyaux, écrire `boss-intake.js` (moins de 150 lignes, lèvres en cache par
  `bl`), et l'appeler dans `frame.js`.
- [ ] **Étape 4 : lancer** `focus.js "." "bossplan|intake:|pipes|bossFight:"`. Résultat attendu : tout est vert. Puis faire une capture en
  jeu du bas du niveau de la Zone industrielle, au format téléphone.
- [ ] **Étape 5 : commit** `feat: l'entrée du boss devient sa bouche d'aspiration`.

### Tâche 6 : pompes en sprite

**Fichiers :**
- Générer avec PixelLab (`create_image_pixflux`, fond transparent, au plus 8 générations en tout), en restant dans la palette du biome
  (`FP.palette.boss.milieux[id]`) :
  - friche et industrie : une pompe industrielle vue de face, 32×32, avec châssis riveté, cuve vitrée vide au centre et volant à gauche ;
  - décharge et nucléaire : une tête de pompe 16×16 (volant et vannes), vue de face.
- Retoucher les sprites (fond transparent, palette du biome, cuve vide) et les envoyer à l'utilisateur avec `SendUserFile`.
- Modifier : `dev/tools/import-boss.js`.
  - `FILES` reçoit `pump: 'pompe'`.
  - Les fichiers sont tous facultatifs, mais il en faut au moins un. L'entrée du biome dans `art.js` est fusionnée avec l'existante, sans
    être remplacée.
  - Le rectangle de la cuve s'écrit en option (`--tank x0,y0,x1,y1`, en fractions de l'image) dans `pumpTank`. Il n'existe que pour les
    pompes larges.
- Modifier : `assets/boss/art.js`, `src/render/boss-skin.js` (ajouter `'pump'` à `ROLES` ; ajouter `FP.bossSkin.tank(milieuId)`, qui
  renvoie le tableau de fractions ou `null`).
- Modifier : `src/render/boss-core.js`, `src/render/boss.js` (l'appel passe le biome).
- Tests : `dev/tests/bosscore.test.js`, `dev/tests/bossskin.test.js`.

**Interfaces :**
- `FP.bossCore.pump(g, pts, t, M, broken, id)`. `id` est le biome.
  - Si `broken`, ou s'il n'y a pas d'image (`FP.bossSkin.image(id, 'pump')` vaut `null`), on garde le dessin de la v5.8.0, inchangé.
  - Pompe large avec image : `FP.bossSkin.piece(g, pts, img)`, puis le liquide et les bulles dans le rectangle `tank`, ramené à la boîte où
    `piece` a posé l'image, puis les rayons du volant qui tournent sur le volant du sprite.
  - Pompe haute avec image (`h > w × 1,2`) : la tête en haut de la barre, mise à la largeur de la barre ; dessous, le tube vitré et le
    liquide du dessin actuel, sans pistons.

- [ ] **Étape 1 : tests qui échouent.**
  - `bossskin: rôle pump et sa cuve` : `_set('friche', 'pump', img)` rend l'image. `tank('friche')` lit `art.js`, et `tank('inconnu')`
    vaut `null`.
  - `core: pompe en sprite` :
    - avec une fausse image (`_set`), le dessin d'une pompe large appelle `piece`, par un espion ;
    - le pixel le plus clair de la boîte est dans le rectangle `tank` ;
    - deux instants différents donnent deux images différentes ;
    - une pompe haute pose la tête en haut et le tube lumineux dessous.
  - `core: sans image, la pompe de secours` : après `_reset()`, le dessin est identique à celui de la v5.8.0, par comparaison pixel à
    pixel. Une pompe cassée, avec image, reste l'épave du code.
- [ ] **Étape 2 : lancer** `focus.js "." "bossskin|core:"`. Résultat attendu : ÉCHEC.
- [ ] **Étape 3 : implémenter le code.** Puis générer, retoucher et importer (`node dev/tools/import-boss.js <id> <dossier> [--tank …]`
  pour chaque biome). Compter les générations dépensées et les noter dans le registre.
- [ ] **Étape 4 : lancer** `focus.js "." "bossskin|core:|bossFight:"`. Résultat attendu : tout est vert. Puis faire une capture en jeu d'une
  pompe de chaque biome, au format téléphone.
- [ ] **Étape 5 : commit** `feat: pompes des boss en sprite PixelLab, animées par le code`.

### Tâche 7 : version, docs et vérification

**Fichiers :**
- `src/core/config.js` (`version: '5.9.0'`), titres de `index.html` et de `dev/check.html`.
- `CHANGELOG.md` : une entrée v5.9.0, avec le nombre de tests.
- `docs/architecture.md` : ordre du dessin avec la bouche, coup déployé, Shop accordé, sans poche.

- [ ] **Étape 1 :** monter la version et écrire la doc.
- [ ] **Étape 2 :** lancer `node dev/run-checks.js` en arrière-plan, sortie dans `scratchpad/suite.txt`. Résultat attendu : tous les tests
  passent.
- [ ] **Étape 3 :** vérifier en jeu, au format téléphone :
  - un coup de vapeur à mi-déploiement, sur une image figée ;
  - la bouche de chaque biome ;
  - les pompes ;
  - la victoire sans poche ;
  - le bon sans les moyens ;
  - la console sans erreur.

  Envoyer les captures à l'utilisateur.
- [ ] **Étape 4 :** revue finale de la branche par un sous-agent opus. Pour chaque problème important, un test qui échoue puis le
  correctif ; les points mineurs sont reportés.
- [ ] **Étape 5 : commit** `chore: v5.9.0`. Ensuite, demander à l'utilisateur avant tout merge ou push.
