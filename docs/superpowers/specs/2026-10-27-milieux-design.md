# Milieux et boss — vision d'ensemble, puis sous-projet 1 : les milieux

Date : 2026-10-27. Version visée pour le sous-projet 1 : v4.9.0.

## Pourquoi

Les playtests sont positifs mais tièdes : le noyau est agréable, l'expérience reste une « vertical slice ». Une partie n'a pas
d'arc : chaque pousse ressemble à la précédente, en un peu plus dur. On veut de la densité sans s'étaler : peu de systèmes,
qui changent l'expérience. Réponse retenue : **des milieux qui se succèdent, chacun conclu par un boss**.

## Vision d'ensemble (validée en séance)

### Les 4 milieux

| | 1. Friche urbaine | 2. Zone industrielle | 3. Décharge | 4. Site nucléaire |
|---|---|---|---|---|
| Ambiance | crépuscule rose actuel, terre brune | ciel jaune soufre et smog gris, terre grise et ocre | ciel brun-vert, terre jonchée | ciel nuit verdâtre, terre bleu-gris |
| Obstacles | cône, trottinette, pneu, sac, drone | serveur, batterie, panneau solaire, extincteur, drone | micro-ondes, borne d'arcade, sac, pneu, trottinette | fût nucléaire, cercueil, batterie, serveur, T-Rex |
| Danger signature | coulées de béton | jets de vapeur | éboulements | radiation |
| Boss | LA BÉTONNEUSE DU GRAND PROJET — 4 vannes à béton | RAFFINERIE ÉCO-RESPONSABLE™ — 4 vannes | L'INCINÉRATEUR À ÉNERGIE VERTE — 4 brûleurs | LE RÉACTEUR « NEUTRE EN CARBONE » — 4 barres de contrôle |

Communs à tous les milieux : nappes toxiques, limaces, jetons, boutique ; la difficulté par la forme du chemin (v4.8) ;
les strates humus / argile / pierre, teintées par le milieu.

### Le cycle

3 pousses réussies dans le milieu → boutique → niveau de boss → milieu suivant. Après le 4ᵉ boss : écran de fin
« première victoire », puis « Saison 2 » (mêmes milieux, difficulté au palier, score multiplié).

### Les boss (sous-projets 3 et 5)

- Niveau dédié, de la hauteur d'un niveau normal. Le boss est une structure verticale géante (2 à 3 grandes images
  empilées), accrochée alternativement au bord gauche puis au bord droit ; le chemin sûr serpente le long de son flanc.
- 4 points faibles incrustés dans le flanc, côté couloir, répartis sur la hauteur, à portée du chemin sûr.
- Toucher le corps tue ; toucher un point faible avec la pointe le **perce** (gerbe, son, secousse, jetons, icône du HUD).
- Défenses : pièces mobiles en code (bras, pistons, jets) et danger signature du milieu, plus dense ; elles accélèrent
  d'environ 20 % à chaque point faible percé.
- Une trappe ferme toute la largeur sous la surface ; elle s'ouvre quand le 4ᵉ point faible éclate. Atteinte fermée,
  la pousse s'écrase : une graine perdue.
- Le niveau du boss garde sa graine d'une tentative à l'autre, et les points percés restent percés.
- Clarté : carton d'annonce (nom, « PERCE SES 4 VANNES »), 4 icônes dans le HUD, points faibles d'une couleur réservée
  (blanc-jaune incandescent) qui pulsent avec un anneau de cible, flèche de bord vers le prochain, trappe visible.
- Victoire : gros bonus d'ÉcoCrédits™, éclosion sur la carcasse, carton « BOSS VAINCU ».
- Images générées (SpriteCook), **jamais lancées par l'IA** : elle prépare prompts, tailles et découpage ; l'utilisateur
  génère ou donne un feu vert explicite. Par boss : 2 à 3 morceaux d'environ 260 px de large sur fond transparent, plus
  une image « détruit ». Direction : franchement toxique (coulures luisantes, rouille, fumées, fûts qui suintent).

### La musique (sous-projet 2)

Une vraie musique par milieu, pas une variante : friche = la musique de jeu actuelle (psyché funky) ; zone industrielle =
indus métallique (frappes de tôle FM, basse martelée) ; décharge = dub-ska cradingue, cousin sale et rapide du reggae de
la boutique ; nucléaire = synthwave sombre (nappes inquiétantes, arpège qui grésille). Un thème de boss par boss, tiré du
morceau de son milieu (même tonalité, même motif), plus lourd et plus rapide, qui s'emballe à chaque point faible percé.
Coupure nette au carton de milieu, puis entrée du nouveau morceau. Chaque morceau passe par une maquette écoutée et validée.

### Découpage

1. **Milieux (v4.9)** — ce document.
2. **Musique des milieux (v4.10)** — 3 nouveaux morceaux de jeu, maquette par maquette.
3. **Moteur de boss (v4.11)** — niveau dédié, flanc, points faibles, trappe, persistance, défenses, victoire, avec des
   boss provisoires dessinés en blocs ; prompts des images préparés en parallèle.
4. **Dangers signature (v4.12 → v4.15)** — un par milieu, un par version.
5. **Vrais boss (v4.16 →)** — images, pièces mobiles et thème musical, un boss par version.

---

## Sous-projet 1 : les milieux (v4.9.0)

But : une partie qui a un arc dès cette version. Les milieux sont jouables ; le niveau de boss est encore un niveau normal,
annoncé comme tel.

### 1. Données — `FP.config.milieux`

Un tableau de 4 entrées, dans l'ordre de la partie, chacune :

- `id` : `'friche' | 'industrie' | 'decharge' | 'nucleaire'` ;
- `name` : « FRICHE URBAINE », « ZONE INDUSTRIELLE », « DÉCHARGE », « SITE NUCLÉAIRE » ;
- `line` : la ligne satirique du carton d'entrée :
  - friche : « Futur éco-quartier. Livraison prévue : jamais. »
  - industrie : « Taux d'emploi local : 0,3 robot par habitant. »
  - décharge : « Tri sélectif : la décharge choisit qui elle garde. »
  - nucléaire : « Énergie décarbonée. Déchets : à voir dans 24 000 ans. »
- `kinds` : les familles d'obstacles du milieu (tableau ci-dessus ; `cone`, `scooter`, `tire`, `trashbag`, `drone` pour la
  friche, etc., avec les identifiants de `FP.config.spawnTables`) ;
- `boss` : `{ name, order }` — « LA BÉTONNEUSE DU GRAND PROJET » / « PERCE SES 4 VANNES À BÉTON », etc.

Les palettes de décor d'un milieu vivent dans `render/palette.js` (règle « visuel → render/* ») : `FP.palette.milieux[id]`
= `{ sky: [2 à 4 nuances], strata: { humus, clay, stone }, lawn: [2 à 4 nuances] }`. La friche reprend les palettes
actuelles telles quelles. Les trois autres sont tirées de leur ambiance (tableau ci-dessus), assombries et désaturées
pour la terre selon les règles de lisibilité de la v4.1 : aucune teinte de `FP.palette.danger` (violet chimique) ni de
vert acide dans un décor. `FP.palette.strataTone(d, k)` prend le milieu en paramètre (tous ses appelants le passent).

### 2. État de la partie

Nouveau bloc `state.run = { milieu: 0, step: 0, saison: 1, bosses: 0, boss: false }` :

- `milieu` (0 à 3) : le milieu en cours ;
- `step` (0 à 3) : pousses **réussies** dans le milieu (une éclosion = +1, quel que soit le nombre de fleurs ; une mort ne
  change rien) ;
- `boss` : vrai pendant le niveau de boss du milieu ;
- `bosses` : boss vaincus dans la partie (toutes saisons) ;
- `saison` : 1, puis 2, 3… après chaque tour complet des 4 milieux.

`state.level` continue de monter comme aujourd'hui (difficulté, densité) : il n'est pas lié au milieu.
`state.world.milieu` (id) est écrit par `FP.level.generate` pour le rendu.

### 3. Le cycle

- Éclosion d'une pousse normale : `step += 1`. Si `step` atteint 3 : la boutique s'ouvre (bon de commande actuel), puis le
  niveau suivant est le **niveau de boss** (`boss = true`) — carton de boss pendant la germination.
- Éclosion du niveau de boss = **boss vaincu** (provisoire, en attendant le sous-projet 3) : `bosses += 1`, carton
  « BOSS VAINCU », puis milieu suivant (`milieu += 1`, `step = 0`, `boss = false`) et son carton d'entrée.
- Après le boss du milieu 4 : écran de fin (§ 5), puis `saison += 1`, retour au milieu 1.
- Mort : rien ne change dans le cycle (on rejoue une pousse du même milieu, ou le niveau de boss).
- **La boutique** : elle s'ouvre juste avant chaque niveau de boss, et toujours à la dernière chance (graine garantie,
  inchangée). La cadence « toutes les 3 pousses » (`FP.config.shop.every`) est supprimée.
- **Score de saison** : tous les gains sont multipliés par `saison` (×2 en saison 2, ×3 en saison 3…), affiché dans le HUD
  à côté du score (« ×2 ») à partir de la saison 2.

### 4. Génération

- `FP.level.generate` tire les obstacles dans les tables de bande existantes (`spawnTables.upper/middle/deep`), restreintes
  aux familles du milieu (`kinds`), poids d'origine conservés. Une bande sans famille du milieu reprend toutes les
  familles du milieu, poids égaux.
- Le T-Rex signature n'apparaît que dans le site nucléaire (une fois par partie, comme aujourd'hui).
- Ciel et pelouse : `skyVariant` / `lawnVariant` tirés parmi les nuances du milieu.
- Le niveau de boss provisoire est un niveau normal du milieu (même génération).

### 5. Interface

- **Carton d'entrée de milieu** (à la germination de la première pousse du milieu) : « MILIEU 2/4 », le nom, la ligne
  satirique. En saison 2 et plus : « SAISON 2 — MILIEU 1/4 ».
- **Carton de boss** (germination du niveau de boss) : le nom du boss et son ordre ; en v4.9, une mention
  « (combat en préparation) ».
- **Carton « BOSS VAINCU »** à l'éclosion du niveau de boss, avant le fondu.
- **HUD** : le nom du milieu, discret, en haut ; « ×2 » près du score à partir de la saison 2.
- **Écran de fin** après le 4ᵉ boss de la saison 1 : « Le site est officiellement déclaré réhabilité. Les actionnaires vous
  remercient. » ; un toucher pour continuer en saison 2.
- **Certificat** : il ajoute le milieu atteint et les boss vaincus (« Responsable de la réhabilitation de 2 sites sur 4 »).
- **Écran titre** : le record de progression sous le meilleur score (« Record : Décharge », ou « Record : Saison 2 »).
- **Records** (`FP.scoring.records`, même clé de stockage) : `bestReach` = `{ saison, milieu }` le plus loin atteint, et
  `won` (au moins une saison 1 terminée). Champs absents d'un ancien enregistrement → valeurs par défaut.
- Toutes les chaînes passent par la police pixel : seulement des glyphes qu'elle possède. Elle a `É`, `™`, `Ɇ` mais pas
  les guillemets `«` `»` (nom du réacteur) : on les lui ajoute (glyphes de 5 px de haut, comme `·` et `°` en v4.7).

### 6. Musique

Inchangée dans ce sous-projet (les 4 variantes de jeu tournent par pousse). Le sous-projet 2 attache un morceau à chaque
milieu.

### 7. Tests

- Cycle : 3 éclosions → boutique → niveau de boss ; une mort ne fait pas avancer `step` ; une éclosion à plusieurs fleurs
  (pollen) compte pour une pousse ; boss vaincu → milieu suivant, `step` remis à 0 ; après le 4ᵉ boss → saison 2, milieu 1.
- Boutique : jamais ailleurs qu'avant un boss ou à la dernière chance.
- Génération : sur 20 graines et chaque milieu, tous les obstacles appartiennent aux familles du milieu ; T-Rex seulement
  au nucléaire ; les tests de franchissabilité existants passent dans chaque milieu.
- Palettes : aucune palette de décor de milieu ne contient une teinte de `FP.palette.danger` ; chaque milieu a ses trois
  strates de 4 teintes.
- Score : multiplicateur de saison appliqué à tous les gains.
- Records : ancien enregistrement sans `bestReach` → valeurs par défaut ; progression enregistrée.
- Interface : les textes des cartons tiennent dans l'écran le plus petit et n'utilisent que des glyphes de la police.
- Une partie jouée (dev/check.html vert, puis navigateur).

### 8. Hors périmètre de la v4.9

Musique par milieu, moteur de boss, dangers signature, images de boss, nouvelles familles d'obstacles, sélection d'un
milieu au départ (on commence toujours par la friche).

### 9. Fichiers touchés (prévision)

`core/config.js` (milieux, suppression de `shop.every`), `core/state.js` (`run`), `play/flow.js` (cycle, boutique avant
boss, saison), `play/scoring.js` (multiplicateur, records), `world/level.js` (tables du milieu, T-Rex, `world.milieu`),
`render/palette.js`, `render/sky.js`, `render/soil.js` et les appelants de `strataTone`, `ui/hud.js`, `ui/title.js`,
`ui/certificate.js`, un nouveau `ui/cards.js` (cartons de milieu, de boss, de victoire, écran de fin) ; tests associés.
Chaque fichier reste sous 400 lignes (découpage préalable si besoin, en étape séparée).
