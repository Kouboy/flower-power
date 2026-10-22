# Rendu pixel « Mega Drive » — design (v4.1.0)

Statut : validé en séance de conception le 2026-10-21, à relire avant le plan.

## 1. Intention

Donner à Flower Power une identité visuelle homogène de jeu Mega Drive façon *Earthworm Jim* : pixel art à gros grain, contours sombres, aplats, tramages, humour cartoon. Les obstacles (PNG d'allure pixel 16 bits) donnent déjà le ton ; le reste du monde (ciel, surface, terre, tige, pousse, fleurs, dangers, effets) doit les rejoindre.

Critères de réussite :
- tout le monde visible partage une même grille de pixels ;
- les obstacles, nappes, limaces et la tige restent **plus lisibles qu'aujourd'hui** sur la terre ;
- la pointe devient un personnage dont l'expression raconte le danger ;
- le gameplay et son ressenti ne changent pas (aucun test de simulation modifié) ;
- rendu ≤ 4 ms par frame (mesure `?perf=1`).

Décisions de l'utilisateur :
- **Tout pixelisé** (option A). Tout ce qui est animé ou dynamique est dessiné en code ; les éléments fixes sont générés par le code dans le style pixel, d'après une planche de référence.
- **Grain 2.** Un pixel d'art vaut 2 pixels CSS, soit environ 220 pixels d'art de large, la densité d'une Mega Drive.
- **Ambiance :** un crépuscule pollué mais presque joli, onirique.
- **Le sous-sol est épuré** par rapport à la planche, pour la lisibilité.
- **Le héros a un visage** et des expressions (option B).
- **Le héros devient la fleur** à l'éclosion, avec des variantes par fleur pour éviter l'effet copier-coller.
- **Toile monde à mi-résolution** agrandie sans lissage (approche 1), et zoom de caméra conservé, appliqué à l'agrandissement.

## 2. Référence visuelle

`docs/art/reference-crepuscule.png` (252 × 452), générée avec SpriteCook (Nano Banana 2.1, 12 crédits), en prenant le rack serveur et le pneu comme références de style. Les identifiants sont dans `docs/art/spritecook-assets.json`.

C'est une **référence d'ambiance et de palette**, jamais un fond copié dans le jeu.

On en retient :
- **Ciel :** des bandes tramées violet → magenta → rose → orange, un soleil voilé bas, des nuages de smog roses, des cheminées et usines en silhouette.
- **Surface :** de l'herbe en touffes sombres sur une frange de terre.
- **Terre :** trois strates, l'humus brun-noir à racines, l'argile ocre-orangé à cailloux, la pierre bleu-gris profonde.
- **Rendu :** contours sombres épais, aplats, tramage ordonné.

## 3. Architecture du rendu

### Pipeline d'une frame (`render/frame.js`)

1. **Toile monde** à mi-résolution : `artW = ceil(W / 2)`, `artH = ceil(H / 2)` (W, H en pixels CSS). Tout le monde y est dessiné, dans l'ordre v3 actuel : ciel, terre et surface, nappes (base), limaces, obstacles, bonus, tige et héros, fleurs, anneau d'exposition, pellicule toxique, effets, particules.
2. **Agrandissement sans lissage** (`imageSmoothingEnabled = false`) vers le canvas écran. Le zoom de caméra (cadrage ×1,18, zoom de frôlement) et la secousse sont appliqués à cet agrandissement. Les pixels font donc environ 2 px CSS, un peu plus pendant les zooms ; cette irrégularité est acceptée.
3. **Couche nette** à pleine résolution, par-dessus : doigt, HUD, messages, chiffres « +Ɇ », bandeaux de debug, fondu.

### Fichiers

| Fichier | Rôle |
|---|---|
| `render/px.js` (nouveau) | Boîte à outils pixel, sans DOM. Conversion monde → pixel d'art (arrondie), puis primitives sur un contexte 2D : `rect`, `line` (Bresenham), `disc`, `ring`, `dither` (motif ordonné 4×4), `outline` (contour d'un masque). Toutes les primitives écrivent des pixels entiers via `fillRect`, jamais de chemins lissés. |
| `render/palette.js` (nouveau) | Palettes nommées (ciel ×4, strates, pelouse ×4, tige, héros, fleurs ×5) et liste `danger` (vert acide, violet), réservée aux dangers. |
| `render/sky.js` (nouveau) | Ciel : extrait de `soil.js` et redessiné. |
| `render/hero.js` (nouveau) | Visage du héros, choix d'humeur, expressions. |
| `render/view.js` | Crée et redimensionne la toile monde ; expose `FP.view.art = { canvas, ctx, w, h, scale }`. |
| `render/frame.js` | Le pipeline ci-dessus. |
| `render/soil.js` | Surface, pelouse, strates. |
| `render/plant.js` | Tige, anciennes tiges, graine. |
| `render/flowers.js` | Fleurs à visage, variantes, parterre. |
| `render/obstacles.js` | Sprites ramenés à l'échelle pixel, contour, ancrage. |
| `render/hazards.js`, `powerups.js`, `effects.js`, `particles.js` | Passage à la boîte à outils. |

Règles inchangées :
- le rendu lit l'état sans l'écrire (sauf `state.fx` et ses caches privés) ;
- 400 lignes au plus par fichier ;
- en-têtes rôle / Lit / Écrit / Expose ;
- les constantes purement visuelles vivent dans `render/`, les réglages de gameplay dans `config.js`.

### Migration progressive

La toile monde arrive en premier. Un module pas encore converti dessine avec ses chemins actuels sous une transformation d'échelle ½. Son rendu est alors un peu flou mais juste. Chaque étape convertit ensuite un groupe de modules, et le jeu reste jouable entre deux étapes.

## 4. Décor

### Lisibilité, règles impératives

1. **Terre basse en contraste.** Couleurs de la planche, assombries et désaturées. Au plus 4 teintes proches par strate.
2. **Pas de contour noir dans le décor.** Les contours sont réservés aux obstacles, à la tige, au héros, aux bonus et aux limaces.
3. **Grandes formes d'abord.** On voit les strates et leurs transitions tramées. Les détails (cailloux, racines, os) sont petits, clairsemés, presque de la couleur de leur strate. Aucun déchet en fond.
4. **Vert acide et violet interdits dans le décor** (palette `danger`) : un test le vérifie.
5. **Ciel et surface peuvent être riches**, car aucun obstacle n'y est à lire.

### Ciel (`sky.js`)

- **Peint une fois par variante** (4 nuances de crépuscule : rose, orange, violet, voilé) puis mis en cache.
- **Animation en code :** les nuages dérivent lentement et la fumée des cheminées monte. Le ciel n'est dessiné que s'il est à l'écran.

### Surface et pelouse (`soil.js`)

- Une bande d'herbe en touffes, d'un vert « sain » distinct du vert acide, avec quelques fleurs sauvages minuscules, sur une frange de terre.
- 4 variantes de densité ou de teinte.
- Statique et mise en cache.

### Terre (`soil.js`)

- **Trois strates selon la profondeur relative :** humus près de la surface, argile au milieu, pierre en profondeur. Les seuils sont dans `palette.js`.
- **Transitions tramées** de quelques pixels d'art entre deux strates.
- **Détails clairsemés**, placés de façon déterministe à partir de la graine du niveau. La même graine donne la même terre.
- Mise en cache comme aujourd'hui.

## 5. Tige, héros, fleurs

### Tige (`plant.js`)

- **Forme :** 3 pixels d'art d'épaisseur, contour sombre d'un pixel, corps vert sain, reflet clair d'un pixel, le long de la trace actuelle.
- **Feuilles :** des paires tous les ~40 px de trace, fixes.
- **Anciennes tiges :** plus sombres, sans feuilles ni visage.
- **Graine du fond :** un petit sprite en code, aux yeux fermés.

### Héros (`hero.js`)

- **La tête :** un bourgeon d'environ 11 × 11 pixels d'art, orienté selon la pointe.
- **Les clignements :** toutes les 2 à 5 s.
- **Les humeurs**, calculées par une fonction pure `FP.hero.mood(state, memory)` qui ne lit que l'état existant. Par ordre de priorité :

| Priorité | Humeur | Condition (état existant) | Expression |
|---|---|---|---|
| 1 | `dead` | `mode === 'dying'` | yeux en croix (obstacle) ; visage qui fond (lixiviat, brûlure) |
| 2 | `toxic` | exposition toxique en cours | teint verdâtre, grimace ; yeux qui tournent près de la brûlure |
| 3 | `graze` | frôlement actif | yeux plissés, dents serrées ; goutte de sueur si intensité forte |
| 4 | `alarm` | danger proche sans frôlement | gros yeux ronds |
| 5 | `focus` | doigt posé | sourcils froncés |
| 6 | `calm` | sinon | regard dans le sens de la pousse |

- **Tenue minimale d'une humeur :** 0,25 s, contre le clignotement. La mort s'affiche immédiatement.
- **Avec le bouclier :** air sûr de lui, sous la membrane.

### Fleurs (`flowers.js`)

- **À l'éclosion :** la tête s'ouvre en fleur, avec 5 à 8 pétales autour du visage. Pendant l'étape `show`, le visage est radieux : yeux fermés de joie, grand sourire.
- **Dans le parterre :** la fleur a un air apaisé et reste figée en cache, comme aujourd'hui.
- **Fleurs bonus** (pollen) : plus petites, même air paisible.
- **Variantes :** une empreinte `FP.flowersRender.variant(flower)`, fonction pure, est tirée des données existantes de la fleur (position, inclinaison, palette). Elle choisit :
  - la forme des pétales : ronds, pointus, en coupe ou double rang ;
  - leur nombre : de 5 à 8 ;
  - la couleur : la palette plus un léger décalage de teinte ;
  - la tige : sa hauteur et la position des feuilles ;
  - le visage apaisé : mi-clos, endormi avec un « z », sourire en coin, joues rosées, clin d'œil, ou plus rarement la langue tirée.

  Une même fleur donne toujours la même variante.

## 6. Obstacles, dangers, effets

- **Obstacles :** chaque sprite est réduit une fois à sa taille en pixels d'art (environ 40 px, environ 100 pour le T-Rex) :
  - réduction par moyenne, puis palette simplifiée et alpha tranché ;
  - contour sombre d'un pixel ;
  - ancrage sombre conservé ;
  - cache par sprite et par miroir.
- **Nappes toxiques :** taches de vert acide tramées avec lobes. Elles pulsent par alternance de motifs de tramage, sans transparence. La pellicule et l'anneau d'exposition sont aussi en pixels.
- **Limaces :** petites créatures pixel avec contour, qui clignotent au contact.
- **Bonus :** glyphes source, spore et pollen en petits sprites dessinés en code. La membrane du bouclier est en pixels.
- **Effets :** anneaux tracés pixel par pixel. Les chiffres « +Ɇ » restent dans la couche nette.
- **Particules :** carrés de 1 à 2 pixels d'art.

## 7. Étapes

Chaque étape est jouable et donne lieu à une capture avant / après soumise à l'utilisateur.

1. **Toile monde :** `px.js`, `palette.js`, pipeline (`view.js`, `frame.js`) et couche nette pour le HUD.
2. **Décor :** ciel, surface et pelouse, strates.
3. **Obstacles :** réduction, contour, ancrage. Capture de lisibilité en jeu à côté de la v4.0.1.
4. **Tige, graine et héros**, avec ses expressions.
5. **Fleurs à visage** et leurs variantes.
6. **Dangers, bonus, effets et particules.**
7. **Finitions :** performance, documentation, relecture finale, version v4.1.0.

Le travail se fait sur la branche `pixel`, avec une PR vers `main` à la fin.

## 8. Vérification

- **Banc existant** (`node dev/run-checks.js`) : tous les tests actuels restent verts sans modification.
- **Contrainte de chargement :** `px.js`, `palette.js`, `hero.js` et `flowers.js` ne touchent pas au DOM au chargement. Leurs canvas de cache sont créés à la première utilisation. On peut donc les charger dans `dev/check.html` et sous Node.
- **Nouveaux tests sans DOM**, chargés par `dev/check.html` :
  - `px` : arrondi sur la grille, forme d'un disque et d'un anneau, ligne continue ;
  - `palette` : aucune couleur `danger` dans une palette de décor ;
  - `hero.mood` : priorités, tenue de 0,25 s, mort immédiate ;
  - `flowers.variant` : stable pour une même fleur, au moins 20 variantes distinctes sur 30 fleurs.
- **Navigateur :**
  - captures à chaque étape ;
  - `?perf=1` sous 4 ms de rendu ;
  - aucune erreur en console ;
  - partie jouée de la graine à l'écran de fin.

## 9. Hors périmètre

- **Pas de nouveaux PNG pour l'instant.** Des détails semés générés par SpriteCook (os, racines, canettes) pourront venir plus tard, avec l'accord de l'utilisateur pour chaque dépense de crédits.
- **Pas de changement de gameplay**, de réglages ni d'audio.
- **Pas de parallaxe ni de décor animé au-delà du ciel.**
