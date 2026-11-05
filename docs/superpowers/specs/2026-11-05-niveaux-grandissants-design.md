# Niveaux qui s'agrandissent avec la vitesse — design (v5.3.0)

## Pourquoi

Retour de playtest (2026-11-04) : « plus on gagne en vitesse, plus les niveaux paraissent petits ». Aujourd'hui la hauteur
d'un niveau est fixée une fois pour toute la partie (`FP.state.createRun` : `config.world.heightRatio` 2,35 hauteurs
d'écran, au moins `viewH + extraMin`), alors que la pousse accélère (`config.plant.speed` : de 120 à 260 px/s × `framing`
.88, selon les pousses et les fleurs). Un niveau qui se traverse en ≈ 15 s au départ n'en dure plus que ≈ 7 à pleine
vitesse : le jeu « rétrécit ».

## But

Les niveaux grandissent avec la vitesse : chaque niveau se traverse en à peu près le même temps du début à la fin, en
paraissant de plus en plus vaste. Même cadrage, même taille d'obstacles, même densité par écran (choix de l'utilisateur :
croissance au rythme de la vitesse ; densité constante par écran ; les boss grandissent aussi).

## 1. La règle de hauteur

- **Hauteur de départ** `H0` : la hauteur actuelle (`worldHeightFor(viewH)`). Le tout premier niveau d'une partie est
  identique à aujourd'hui.
- **Vitesse de lancement** `v` : la vitesse de base de la pousse au moment du lancement — pousses et fleurs accumulées
  (`min(max, base + perStem × (stemCount − 1) + perFlower × flowers)`, comme `FP.plant.speed`), sans l'accélération qui
  vient pendant une longue pousse (`liveRamp`) ni les effets passagers (doigt posé, compost, corruption). `v0` : la vitesse
  d'une pousse neuve (`base`).
- **Facteur d'agrandissement** `k = clamp(v / v0, 1, config.world.growMax)`, `growMax = 2,2` (la vitesse maximale
  actuelle : 260 / 120 ≈ 2,17). **Hauteur du niveau** `H = round(H0 × k)` : ≈ 5 écrans au plus.
- **Quand** : la hauteur est décidée à chaque génération de niveau (`FP.level.generate`) — après une éclosion, après une
  mort qui régénère le niveau, à l'entrée d'un boss, après Lobbying — puis figée pendant qu'on le joue. Elle se calcule
  pour la pousse qui va être lancée (celle qui suit : `stemCount + 1`).
- **Boss** et version playtest (`?sansboss=1`) : même règle.
- `FP.level.heightFor(state)` (pur, testé) rend `{ height, k }` ; `world.growK = k` est rangé avec le niveau.

## 2. Ce qui suit la hauteur

- **Densité constante par écran** : les quantités d'obstacles, de nappes et de lixiviats sont multipliées par `k`, et
  leurs plafonds aussi (`maxExtra` des nappes et des lixiviats, `worldScaleMax` des obstacles : le plafond actuel bride déjà
  la densité au-dessus de la taille de départ). La rampe de difficulté actuelle (chemin sûr plus étroit et plus sinueux,
  densité par écran qui monte avec le niveau, limaces qui barrent le chemin dès le niveau 6) reste inchangée et s'ajoute.
- **Jetons** : déjà placés « un chapelet facile et un appât par hauteur d'écran » (`world/coins.js`) ; ils suivent tels
  quels (vérifié par un test).
- **Ce qui lit déjà `world.height`** et n'a rien d'autre à faire : caméra (bornes), graine et plancher de la pousse,
  chemin sûr, musique (profondeur), récompenses de flyover, rendu de la tige.
- **Décor** : les trois strates (humus, argile, pierre) sont réparties en proportion de la profondeur, elles s'épaississent
  avec le niveau ; le décor enterré (conduites, accessoires) est réparti sur toute la hauteur. Le cache de la terre
  (`render/soil.js`) se reconstruit déjà quand la hauteur change (elle est dans sa clé) ; il grandit jusqu'à ≈ 220 × 900
  pixels d'art.
- **Où la hauteur est écrite** : par la génération du niveau (`world/level.js`), plus seulement par la création de la
  partie (qui pose `H0` et `k = 1`). Le redimensionnement de la fenêtre (`FP.state.applyView`) ne touche toujours pas la
  hauteur du niveau en cours ; la hauteur de départ `H0` suit la vue au niveau suivant.
- **Boss** : leur zone (`FP.bossPlan.zone`) et leurs plans sont proportionnels à la hauteur : ils s'étirent avec elle. Les
  salles plus hautes allongent le temps qu'on y passe (plus de cycles de défense et de tirs) — dans le sens de « boss plus
  durs », à juger au playtest.

## 3. Tests

- **Règle** : premier niveau à `H0` exact ; la hauteur grandit avec la vitesse de lancement (pousses, fleurs) ; plafond
  `growMax` ; figée pendant un niveau (aucun changement entre deux générations) ; recalculée après une éclosion, une mort,
  l'entrée d'un boss.
- **Durée** : à la vitesse de lancement, le temps de traversée (hauteur utile / vitesse) au facteur 1 et au facteur 2,2
  diffère de moins de 10 %.
- **Densité par écran** : obstacles, nappes, lixiviats et jetons rapportés à la hauteur restent stables entre `k = 1` et
  `k = 2,2` (moyenne sur plusieurs graines, tolérance 15 %).
- **Règles des niveaux au facteur 2,2** : chemin sûr dégagé, aucun chevauchement, lixiviats franchissables, nappes hors
  du chemin, T-Rex qui trouve sa place.
- **Boss au facteur 2,2** (en plus du facteur 1) : largeur des canaux, seule la tête mène à la surface (flood fill),
  entrées de salle esquivables, robot piloté, combat complet gagné en ≤ 10 pousses.
- **Rendu** : la terre et le décor de chaque milieu se dessinent sans erreur sur un niveau à `k = 2,2`.

## Risques

- **Perf** : cache de la terre et tige plus grands ; à vérifier avec `?perf=1` sur téléphone au facteur 2,2.
- **Durée d'une partie** : elle s'allonge en fin de saison (chaque niveau dure autant, au lieu de raccourcir).
- **Boss étirés** : plus de temps dans les salles, donc plus de menaces ; à juger au playtest.

## Hors de portée

- Recul de la caméra à grande vitesse (écarté : les obstacles rapetisseraient à l'écran).
- Les retours notés pour plus tard (motte plus tôt, son des pièces, partie enfouie plus visible, tirs des boss qui ne
  partent pas, boutique à chaque fleur) : chantiers séparés.
