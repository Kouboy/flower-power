# Visages mutants — design (v4.4.0)

Statut : validé en séance de conception le 2026-10-22, à relire avant le plan.
Maquettes : `docs/art/maquette-visages-1-7.html` et `docs/art/maquette-visages-8-16.html`.

## 1. Intention

Aujourd'hui toutes les pousses ont la même tête-bourgeon (petits yeux 2 × 2), et les fleurs tirent un visage paisible parmi six (sleepy, asleep, smirk, blush, wink, tongue). On donne une **identité à chaque pousse** : un casting de 16 personnages débiles et mutants, dans l'esprit « hippie contaminé » et Earthworm Jim. La fleur qui sort d'une pousse est ce même personnage, épanoui et plus abruti : le parterre devient la galerie des pousses de la partie.

Critères de réussite :
- chaque pousse a un personnage reconnaissable à la taille de jeu (×2) ;
- les humeurs de danger (frôlement, alerte, toxique, mort) restent lisibles chez les 16 ;
- yeux et bouches plus gros et plus expressifs que l'actuel, quitte à déborder de la tête ;
- aucune incidence sur le gameplay (collisions, tirages du niveau) ;
- tout en code (pas d'image), le jeu marche toujours en double-clic (file://).

Décisions de l'utilisateur :
- **Continuité** : la fleur garde le personnage de sa pousse (option A).
- **Les 16 personnages** ci-dessous, tous retenus.
- **Pioche sans remise** : aucun doublon tant que les 16 ne sont pas passés (option A).
- **Fleurs bonus = clones** : toutes les fleurs d'une éclosion portent le personnage de la pousse (option A).
- **Gros yeux, grandes bouches** (planche v2) : yeux globuleux 5 × 5 cerclés, pupilles 2 × 2, bouches de 6 px.

## 2. Le casting

| # | id | Pousse (traits fixes) | Fleur |
|---|----|------------------------|-------|
| 1 | `hippie` | bandeau orange, paupières lourdes, yeux injectés au calme | pupilles qui divergent, sourire béat |
| 2 | `lapin` | deux énormes incisives | incisives + filet de bave, strabisme |
| 3 | `cyclope` | un seul œil énorme (7 px, 9 en alerte) | l'œil roule vers le haut, bagues dentaires |
| 4 | `binoclard` | grosses lunettes rondes, yeux visibles dedans | lunettes de travers, un verre fêlé |
| 5 | `langue` | grande langue qui pend sur le côté | langue jusqu'au menton + bave, strabisme |
| 6 | `antennes` | deux antennes qui brillent | trois yeux |
| 7 | `punk` | crête rose à la place de la pointe | crête + bagues + strabisme |
| 8 | `pendouille` | l'œil droit sorti de l'orbite au bout du nerf | les deux yeux pendent |
| 9 | `depareille` | un œil énorme, un minuscule, regards divergents | idem, l'un à l'envers |
| 10 | `unedent` | bouche édentée, une seule dent | la dent + bave + yeux au plafond |
| 11 | `patate` | gros nez rouge entre les yeux | nez + strabisme |
| 12 | `gourou` | grosse moustache, sourcils broussailleux | moustache en guidon + lunettes teintées |
| 13 | `champi` | un champignon a poussé sur le crâne | le champi a eu des petits |
| 14 | `coquille` | un bout de sa graine en casque | la coquille glisse sur un œil |
| 15 | `gobemouche` | bouche grande ouverte, regard vide au calme | une mouche lui tourne autour |
| 16 | `groucho` | sourcils épais, lunettes noires, nez rose, moustache | les lunettes tombent sur le nez |

Les planches font foi pour le dessin ; l'implémentation peut retoucher un pixel pour la lisibilité.

## 3. Règles de dessin

**Tête.** La tête-bourgeon passe de 13 à 15 px de large (disque de rayon 6 + contour), mêmes couleurs, même teinte verdâtre en toxique. Le dessin seul grossit : rayons de collision inchangés.

**Couches d'un personnage** (toutes optionnelles sauf `flower`) :
- `back` : ce qui dépasse derrière ou au-dessus de la tête (crête, antennes, champi, coquille, bandeau) ; un personnage à `back` peut retirer la pointe du bourgeon.
- `eyes` : yeux spéciaux (cyclope, dépareillés, pendouille) ; reçoit humeur, regard, clignement.
- `mouth` : bouche spéciale (lapin, langue, une dent, gobe-mouche), **seulement au calme et en concentration** ; dès le danger (frôlement, alerte, toxique, mort), la bouche commune reprend la main.
- `front` : posé par-dessus le visage (lunettes du binoclard et de Groucho autour des yeux communs, moustache, nez).
- `flower` : le visage fleur, fixe.

Ce qu'un personnage ne déclare pas est dessiné par les briques communes.

**Humeurs communes** (le calcul de `FP.hero.mood` est inchangé) :

| Humeur | Yeux | Bouche |
|---|---|---|
| calme | pupilles 2 × 2, décalées d'un pixel vers la direction de la pousse | grand sourire ouvert avec langue |
| concentré | paupière basse, sourcils froncés | trait serré |
| frôlement | plissés en chevrons épais (2 px) | dents serrées |
| alerte | yeux 7 × 7, pupille 1 × 1 | O |
| toxique | pupilles qui tournent si vertige, sinon divergentes | zigzag + langue |
| bouclier | paupières mi-closes | sourire en coin |
| mort (choc) | croix | trait |
| mort (fonte) | yeux qui tombent | bouche qui coule |

Plus : **clignement** (paupière de peau sur les yeux pendant 0,12 s, rythme actuel), **goutte de sueur** à côté de la tête quand le frôlement est intense. Bouclier, fonte, clignement et sueur ne figurent pas sur les planches : même esprit.

**Fleurs.** Le cœur de la fleur grossit comme la tête et porte le visage `flower` du personnage. Pendant la célébration (`flow.stage === 'show'`), la fleur garde son visage (plus de visage « joie » générique). Les anciens visages de fleur (`sleepy`, `asleep`, `smirk`, `blush`, `wink`, `tongue`, `joy`) sont supprimés, ainsi que le champ `face` de `variant`. La plus grande fleur doit toujours tenir dans le cache (`extent ≤ CACHE_TOP`).

## 4. Architecture

- **`src/render/faces.js`** (nouveau) : briques de visage au nouveau format — œil globuleux, pupille, paupière, croix, et `eyes(g, ax, ay, mood, opts)` / `mouth(g, ax, ay, mood, opts)` communs. Pur dessin par `FP.px`.
- **`src/render/cast.js`** (nouveau) : `FP.cast.IDS` (les 16 identifiants, dans l'ordre du tableau) et `FP.cast.get(id)` → `{ id, back?, eyes?, mouth?, front?, flower }`. Coupé en deux fichiers s'il dépasse 400 lignes.
- **`src/render/hero.js`** : garde `mood` et `blinking` ; `head` agrandie ; `draw` enchaîne tête, `back`, yeux (personnage ou communs), bouche (personnage au calme/concentré, sinon commune), `front`, sueur. `FP.hero.face` disparaît (remplacé par `faces.js` et `cast.js`).
- **`src/render/flowers.js`** : cœur agrandi, visage `FP.cast.get(f.character).flower` ; plus de `FACES`.
- **Distribution** (`src/play/plant.js`, `src/core/state.js`) : `state.plant.cast` = file des identifiants mélangés, `state.plant.character` = personnage de la pousse en cours. À chaque `launch`, la pousse prend le suivant ; file vide → nouveau mélange. Le mélange (Fisher-Yates) utilise un générateur à part, `FP.createRng(graine de la partie ^ constante)`, pour ne **pas** consommer `state.rng`.
- **Fleurs** (`src/play/flow.js`, `plantFlowers`) : chaque fleur reçoit `character: state.plant.character`.
- `index.html` : ajout des deux balises `<script>` (faces, cast) avant `hero.js`.

## 5. Tests (TDD, sous Node, contexte espion)

- Casting : 16 identifiants distincts, chacun avec une fonction `flower`.
- Pioche : 16 lancements → 16 personnages sans doublon ; le 17e relance un mélange ; même graine → même ordre.
- Tirages du niveau inchangés : `launch` consomme le même nombre de tirages de `state.rng` qu'il remélange la pioche ou non (le mélange ne touche jamais `state.rng`).
- Éclosion : principale et bonus portent `character` = celui de la pousse.
- Dessin : chaque personnage × chaque humeur (calme, concentré, frôlement, alerte, toxique avec et sans vertige, bouclier, mort choc, mort fonte) × clignement se dessine sans erreur et reste dans ±12 px autour du centre de la tête ; idem pour `flower`.
- Lisibilité du danger : pour chacun des 16, les pixels dessinés en alerte et en mort diffèrent de ceux du calme.
- Cache des fleurs : le test existant `extent ≤ CACHE_TOP` passe toujours.
- Tests d'humeur existants inchangés.

## 6. Hors champ

- Collection de personnages d'une partie à l'autre (option C, plus tard, avec la rejouabilité).
- Effets sonores propres aux personnages.
- Tout changement de gameplay.
