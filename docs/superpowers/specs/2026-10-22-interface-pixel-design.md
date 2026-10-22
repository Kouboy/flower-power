# Interface pixel « hippie contaminé » — design (v4.2.0)

Statut : validé en séance de conception le 2026-10-22, à relire avant le plan.

## 1. Intention

Le monde est passé au pixel art Mega Drive façon *Earthworm Jim* (v4.1.0). L'interface est restée celle de la v3 : police système, panneaux arrondis translucides, emojis, long texte de règles. Elle jure avec le jeu.

On refait toute l'interface sur la même grille de pixels que le monde, avec une identité propre : **le Flower Power hippie, rattrapé par la pollution** (lettrage psychédélique 60-70 qui dégouline de boue violette, symbole radioactif), et la satire du greenwashing déjà présente dans les ÉcoCrédits™.

Critères de réussite :
- toute l'interface est en pixels d'art (même taille de pixel que le monde), sans police système ni emoji ;
- **le moins d'informations possible** à l'écran : rien qui ne serve pas à jouer maintenant ;
- le terrain reste aussi lisible qu'aujourd'hui (le HUD n'en masque pas plus) ;
- le jeu marche toujours en double-clic (file://), sans fichier externe ;
- l'interface coûte moins de 0,5 ms par frame (mesure `?perf=1`) ;
- la simulation ne change pas, sauf le retrait des messages devenus inutiles (§ 6).

Décisions de l'utilisateur :
- **Écran titre arcade** (option A) : le logo, bien graphique et pimpant, et une seule consigne, « TOUCHER POUR POUSSER ». Pas de règles.
- **Logo « groovy qui dégouline »** : lettres rondes 70s crème/jaune à contours empilés encre, rose et orange, coulures de boue violette ; le « O » de POWER est un **trèfle radioactif** jaune soufre, avec sa propre place (il ne mange ni le P ni le w). Lettres bien espacées, lisibles.
- **Ligne de pied** : « © 2026 ÉCOSOFT™ · une filiale de PÉTROFLORE ».
- **HUD dans les coins du bas**, sans panneau (option B).
- **HUD minimal** : graines restantes (icônes) et ÉcoCrédits™ ; pollen et combo seulement quand ils sont actifs. Le nombre de fleurs n'est montré qu'à la fin (le parterre en surface en tient lieu). Plus d'« élan ».
- **Messages** : la cause de mort, courte et percutante, en lettres qui rebondissent ; l'aide uniquement à la toute première pousse ; plus de « TIGE n », plus d'avertissements (contamination, bouclier).
- **Écran de fin en certificat ÉcoCrédits™** (option B) : « certificat d'éco-responsabilité », tampon « VALIDÉ* » (* sous réserve).
- **Approche 1** : tout en canvas, avec une police bitmap et un logo dessinés en pixels dans le code.

## 2. Références visuelles

Maquettes de direction faites en séance (polices web agrandies sans lissage ; le rendu final est dessiné en pixels) :
- `docs/art/maquette-titre.png` — titre (logo retenu, consigne, ligne de pied) ;
- `docs/art/maquette-hud.png` — HUD dans les coins du bas, pollen et combo montrés pour l'exemple ;
- `docs/art/maquette-certificat.png` — certificat de fin.

Ce sont des références de mise en page et d'ambiance, pas des images reprises dans le jeu.

## 3. Architecture

### Couche d'interface

Une nouvelle toile **`FP.view.ui`**, à demi-résolution de l'écran (même grain que le monde : 1 pixel d'art = `FP.px.SCALE` = 2 pixels CSS), créée et redimensionnée par `render/view.js` comme `FP.view.art`.

Ordre d'une frame (`render/frame.js`) :
1. le monde dans `FP.view.art` (inchangé) ;
2. agrandissement du monde, avec secousse et zoom (inchangé), et les « +Ɇ » flottants (désormais en police pixel, voir § 7) ;
3. **l'interface** : `FP.ui.draw(uctx, state)` dessine dans `FP.view.ui` (effacée à chaque frame), puis la toile est agrandie ×2 sans lissage, **sans** secousse ni zoom ;
4. le doigt, le debug et la mesure de performance, le fondu (inchangés).

### Fichiers

| Fichier | Rôle |
|---|---|
| `src/ui/font.js` | Police bitmap : glyphes 5×7 dessinés en code, majuscules. `FP.font.draw(g, texte, x, y, opts)`, `FP.font.measure(texte, opts)`, `FP.font.has(ch)`. Atlas mis en cache par couleur. Pur hors cache, testable sous Node. |
| `src/ui/logo.js` | Logo « Flower Power » : lettres groovy en pixels, contours empilés, trèfle radioactif, coulures ; cache + animation. `FP.logo.draw(g, cx, y, t)`, `FP.logo.layout()` (pur, testé). |
| `src/ui/title.js` | Écran titre. `FP.title.draw(g, state)`. |
| `src/ui/hud.js` | HUD en jeu. Remplace `src/render/hud.js`. `FP.hud.draw(g, state)`, `FP.hud.items(state)` (pur, testé : ce qui est affiché). |
| `src/ui/shout.js` | Cri de mort et aide de première pousse. `FP.shout.draw(g, state)`, `FP.shout.textFor(event)` (pur, testé). |
| `src/ui/certificate.js` | Écran de fin. `FP.certificate.draw(g, state)`, `FP.certificate.lines(state)` (pur, testé). |
| `src/ui/ui.js` | Aiguillage : `FP.ui.draw(g, state)` appelle titre, HUD, cri ou certificat selon `state.mode`. |

Les fichiers `ui/*` lisent l'état et n'écrivent que `state.fx.ui` (réservé à l'interface, comme `state.fx` pour le rendu), à une exception près, décrite au § 5 (`ui/menu.js`).

Supprimés : `src/render/hud.js`, le bloc `#menu` de `index.html` et ses règles dans `style.css` (`.overlay`, `.panel`, `h1`, `p`, `.hint`, `.small`, `.legend`, `.pill`, `@keyframes pulse`). C'est une exception assumée à la règle 2 d'`AGENTS.md` (`index.html` n'est modifié que pour ajouter des `<script>`) : on retire un bloc devenu inutile.

`ui/menu.js` garde l'appui et le clavier ; il n'affiche plus de HTML.

## 4. Police et logo

### Police bitmap (`ui/font.js`)

- **Glyphes 5×7 pixels d'art**, chasse variable (I, 1, ponctuation plus étroits), 1 pixel d'interlettre. Échelle ×1 (texte courant, 10×14 px CSS) ou ×2 (score, titre du certificat, cri de mort).
- **Majuscules seulement**, comme sur Mega Drive : le texte est mis en capitales à l'affichage.
- **Jeu de caractères** : A-Z ; À Â Ç É È Ê Ë Î Ï Ô Ù Û Ü ; 0-9 ; `Ɇ ™ × % ! ? : ' ’ , . * + - / ( ) ©` et l'espace. Un caractère absent s'affiche comme `?` (et un test garantit qu'aucun texte du jeu n'en contient).
- **Rendu** : contour d'1 pixel en encre `#1a0a12`, ombre portée d'1 pixel vers le bas à droite, couleur pleine ; pas de transparence partielle.
- **Palette d'interface** : crème `#fff6c8` (texte courant), vert `#cfff78` (ÉcoCrédits™), or `#ffd166` (combo, record), rose `#ff5fa0` (pollen), saumon `#ffb08a` (danger), encre `#1a0a12`.
- **Performance** : chaque glyphe est rendu une fois par couleur et par échelle dans un atlas (canvas hors écran) ; afficher un texte = un `drawImage` par caractère. Aucune relecture de pixels (`getImageData`) : compatible file://.

### Logo (`ui/logo.js`)

- **Lettres** : F, l, o, w, e, r, P dessinées en matrices de pixels dans le code, environ 22 pixels d'art de haut (FLOWER) et 26 (POWER) ; le logo occupe environ 85 % de la largeur.
- **Contours empilés** : encre `#3a1430`, rose `#ff5fa0`, orange `#ffa94d`, calculés par dilatation des matrices (anneaux réguliers) ; remplissage dégradé crème `#fff7ad` → jaune `#ffd166` par rangées.
- **Espacement** : les lettres ne se chevauchent pas (seuls les contours extérieurs peuvent se toucher) ; un interligne laisse passer les coulures de FLOWER sans toucher POWER.
- **« O » radioactif** : un disque jaune soufre `#ffd166` cerclé de rose et d'orange, trois pales encre et un moyeu ; diamètre d'un « o » minuscule ; une place réservée entre P et w. Il tourne très lentement.
- **Coulures** : placées à la main sous certaines lettres, boue violette (`FP.palette.slug` : `body`, `shade`, reflet `glow`). Une goutte gonfle au bout, se détache, tombe sur quelques pixels et disparaît, en boucle, rythmes décalés.
- **Animation** : chaque lettre monte et descend d'1 pixel, en décalé. Le logo de base (lettres + contours) est mis en cache ; seuls les gouttes et le trèfle sont redessinés.

## 5. Écrans et éléments

### Écran titre (`ui/title.js`, mode `menu`)

- Décor : le vrai premier niveau, caméra tout en haut (ciel, pelouse, terre).
- Logo centré, entre le premier tiers et la moitié de l'écran.
- « TOUCHER POUR POUSSER » qui clignote, en bas.
- Tout en bas, en petit, sur deux lignes : « © 2026 ÉCOSOFT™ » / « UNE FILIALE DE PÉTROFLORE ».
- Un appui ou Espace/Entrée démarre la partie, comme aujourd'hui.

### HUD (`ui/hud.js`, modes `playing`, `dying`, `bloom`, `ready`)

- **En bas à gauche** : une icône de graine par graine restante (pleine), plus les graines perdues (vides, sombres). Quand une graine est perdue, son icône se fend puis s'éteint (~0,4 s).
- **En bas à droite** : « Ɇ » et le score en chiffres ×2, couleur vert ÉcoCrédits™. L'affichage rattrape le vrai score en défilant (compteur d'arcade, ~0,5 s).
- **Pollen** (si `flowerBonus > 0`) : une petite fleur et « +n » en rose au-dessus des graines ; apparaît d'un petit bond.
- **Combo** (si `combo > 1`) : « COMBO ×n » en or au-dessus du score ; petit rebond à chaque palier.
- **Entre deux niveaux** (mode `ready`) : « TOUCHER POUR POUSSER » qui clignote, au-dessus du HUD.
- Rien d'autre : ni fleurs, ni élan, ni ligne d'effets, ni « TIGE n ».

`FP.hud.items(state)` renvoie la liste de ce qui doit être affiché (pur, testé) ; le dessin et les animations s'appuient dessus.

### Cri de mort et aide (`ui/shout.js`)

- À chaque événement `death`, un cri court en lettres ×2, au tiers de l'écran : les lettres tombent une à une et rebondissent, le message tient ~1,2 s puis s'efface (disparition tramée). Couleur saumon, contour encre.
- Le texte vient de `FP.shout.textFor(event)` :
  - obstacle : la partie après « rupture : » de `config.text.death[kind]`, en capitales, suivie de « ! » (« RACK SERVEUR ! », « TROTTINETTE FOSSILE ! ») ; `deathDefault` pour une famille inconnue ;
  - limace : `config.text.shout.leak` (« LIXIVIAT ! ») ;
  - nappe : `config.text.shout.toxic` (« BRÛLÉE ! »).
  Un test garantit que chaque cri tient dans la largeur d'un écran étroit (300 px).
- Aide de la toute première pousse de la partie (`stemCount === 1` et `flowers === 0`) : « MAINTIENS POUR POUSSER » tant que le doigt n'est pas posé, puis « GUIDE LA POINTE », en petit, au-dessus du HUD, jusqu'à ce que la trace dépasse 90 points (comme aujourd'hui).

### Certificat de fin (`ui/certificate.js`, mode `over`)

- **Entrée** : un voile tramé assombrit le jeu en ~0,3 s ; la feuille monte du bas (~0,35 s) ; les lignes s'écrivent l'une après l'autre (machine à écrire, ~0,15 s par ligne) ; le tampon « VALIDÉ* » s'abat (petite secousse de l'interface).
- **Feuille** : papier crème `#efe6c8`, liserés verts, encre vert sombre `#2a3a1c`, libellés brun gris `#5a4a3a`.
- **Lignes** (`FP.certificate.lines(state)`, pur, testé) :
  - « CERTIFICAT » (×2) / « D'ÉCO-RESPONSABILITÉ » ;
  - « FLEURS PLANTÉES … n » ;
  - « ÉCOCRÉDITS™ … Ɇ n » ;
  - « TIGES SACRIFIÉES … n » (`stemCount`) ;
  - « RECORD … BATTU » en rouge si le run a dépassé le record d'avant la partie (fleurs ou crédits), sinon « RECORD … n FLEURS / Ɇ n » ;
  - « CAUSE DU DÉCÈS : » puis la cause complète (`state.flow.overReason`, ex. « RUPTURE : RACK SERVEUR ») ;
  - tampon « VALIDÉ* » incliné, rouge `#c0392b` ; « * SOUS RÉSERVE » en petit.
- **Relance** : « TOUCHER POUR REPOUSSER » clignote sous la feuille **seulement après le tampon**. Un appui avant est ignoré (on ne relance plus par accident en jouant).
- **Record d'avant la partie** : au démarrage d'un run, `ui/menu.js` copie `FP.scoring.records` dans `state.score.recordBefore` (exception d'écriture de l'interface, à côté de `state.mode` qu'il écrit déjà). La relance est autorisée quand `state.fx.ui.certificateReady` est vrai (posé par `ui/certificate.js`).

## 6. Textes et simulation

- `config.text.ready` : « TOUCHER POUR POUSSER ».
- `config.text.shout` : `{ leak: 'LIXIVIAT !', toxic: 'BRÛLÉE !' }` ; `config.text.help` : `{ hold: 'MAINTIENS POUR POUSSER', guide: 'GUIDE LA POINTE' }` ; `config.text.again` : « TOUCHER POUR REPOUSSER » ; `config.text.footer` : les deux lignes de pied ; les libellés du certificat dans `config.text.certificate`.
- **Messages retirés** (règle 5 d'`AGENTS.md`, pas de code mort) : l'interface n'affiche plus `state.flow.message`. On retire donc de la simulation les appels `FP.flow.say` (« POUSSE n », causes de mort avec « graines restantes », zone toxique, flyovers, pollen et goutte ramassés, spore, bouclier rompu, « TOUCHE POUR POUSSER »), `FP.flow.say` lui-même, `state.flow.message` / `messageTimer`, et les textes et durées associés de `config.js` : dans `text`, `stem`, `seedsLeft`, `toxicEnter`, `corrupted`, `flyover`, `pickup`, `shieldBroken`, `shield`, `spore`, `elanStep` ; les durées `flow.stemMessageTime`, `flow.deathMessageTime`, `flow.readyMessageTime`, `toxic.messageTime`, `powerups.messageTime`, `shield.messageTime`. `toxic.messageCooldown` reste : il espace aussi l'événement `toxicEnter`. Les événements (`death`, `pickup`, `toxicEnter`, etc.) restent : l'audio et les effets s'en servent.
- `state.flow.overReason` (la cause complète) reste : le certificat l'affiche.

## 7. Petits éléments du monde

- **« +Ɇ » flottants** (`render/effects.js`, `drawLabels`) : dessinés avec la police pixel ×2 en vert ÉcoCrédits™ (multiplicateur de combo en or), avec le même mouvement qu'aujourd'hui (montée, petit rebond) mais sans rotation ni transparence partielle (disparition tramée en fin de vie). Ils restent dans le repère du monde (zoom et caméra appliqués).
- **Cercle sous le doigt** (`render/plant.js`, `drawFinger`) : anneau tramé en pixels d'art (même grain), plein quand on pilote, discret sinon.

## 8. Étapes

1. Couche d'interface (`FP.view.ui`, `ui/ui.js`) et police bitmap (`ui/font.js`) + tests.
2. HUD (`ui/hud.js`) ; retrait de `render/hud.js`.
3. Cri de mort et aide (`ui/shout.js`) ; retrait des messages de la simulation (§ 6).
4. Logo (`ui/logo.js`) et écran titre (`ui/title.js`) ; retrait du `#menu` HTML et de ses styles.
5. Certificat (`ui/certificate.js`), record d'avant-partie, garde-fou de relance.
6. « +Ɇ » et doigt en pixels.
7. Version 4.2.0, CHANGELOG, `docs/architecture.md`, vérification complète.

Chaque étape laisse le jeu jouable et le banc vert.

## 9. Vérification

- **Tests sous Node** (`node dev/run-checks.js`) :
  - chaque caractère de chaque texte de `config.text` (et des textes de l'interface) existe dans la police ;
  - `FP.font.measure` : largeur exacte, alignements gauche/centre/droite ;
  - logo : aucune lettre ne chevauche une autre (boîtes des remplissages), le trèfle a sa place, le logo tient dans 90 % d'un écran de 300 px ;
  - `FP.hud.items` : pollen absent à 0, combo absent à 1, graines = `reserves` ;
  - `FP.shout.textFor` : un cri par famille d'obstacle, limace et nappe ; tous tiennent en largeur ;
  - `FP.certificate.lines` : record battu / non battu, valeurs justes ;
  - la relance est ignorée avant `certificateReady`.
- **Performance** : interface < 0,5 ms par frame en jeu (mesure `?perf=1`, nouvelle tranche « ui »).
- **En jeu** : captures du titre (logo animé), du HUD (pollen et combo actifs), d'un cri de mort, du certificat (avant et après le tampon) ; une partie complète ; double-clic en file:// (la police et le logo n'utilisent pas `getImageData`).

## 10. Hors périmètre

- L'audio (aucun son nouveau ; le tampon pourrait en avoir un plus tard).
- Les écrans de debug (`?perf=1`, freecam, flydebug) : restent en police système.
- Un écran d'options, de pause ou de crédits.
- La traduction.
