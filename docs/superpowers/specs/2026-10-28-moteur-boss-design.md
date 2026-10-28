# Moteur de boss — design (sous-projet 3, v4.12.0)

Spec parente : `docs/superpowers/specs/2026-10-27-milieux-design.md` (sections « Les boss » et « Le cycle »). Cette version
remplace le niveau de boss provisoire de la v4.9 (un niveau normal annoncé « combat en préparation ») par un vrai combat,
avec des boss **provisoires dessinés en blocs** ; les vraies images (sous-projet 5) se brancheront sur le même moteur.

## But

Un duel clair et tendu à la fin de chaque milieu : longer le flanc du boss, percer ses 4 points faibles incandescents avec la
pointe, esquiver ses défenses, passer la trappe qui s'ouvre au 4ᵉ point, éclore à la surface.

## Le niveau de boss

- **Même hauteur qu'un niveau normal**, même pousse, même caméra, mêmes collisions. Graine propre au boss (dérivée de la
  partie, de la saison et du milieu) : le niveau est **identique d'une tentative à l'autre**.
- **Le boss** : 4 tronçons empilés du bas vers le haut, chacun large d'environ 45 % de l'écran, accrochés alternativement
  au bord gauche et au bord droit (le premier tiré au sort). Les tronçons sont des obstacles mortels (polygones dans
  `world.solids`, famille `boss`). Le couloir sûr zigzague d'un bord à l'autre le long de leur flanc ; il est 30 % plus large
  que le chemin sûr d'un niveau normal au même rang.
- **Rien d'autre que le boss** dans le couloir : pas d'obstacles habituels ni de limaces ; 2 nappes toxiques et quelques
  traînées de jetons.
- **Points faibles** : un par tronçon, au milieu de sa face côté couloir, cercle de rayon 14 (zone de perçage un peu plus
  large que le dessin : 20). La pointe qui y passe le **perce** : gerbe d'étincelles, secousse, jetons qui jaillissent,
  icône du HUD qui s'allume, son de perçage. Un point percé devient un trou fumant inoffensif.
- **La trappe** : une plaque pleine largeur juste sous la pelouse, à rayures danger, tant qu'il reste un point à percer
  (obstacle mortel, famille `trap` : l'atteindre fermée coûte une graine, « la trappe est fermée »). Au 4ᵉ point percé
  elle s'ouvre en coulissant (son, secousse) et n'est plus un obstacle.
- **Une seule pousse peut suffire** : percer les 4 points d'affilée puis filer par la trappe ouverte.

## Les défenses

Jeu commun de 3 défenses, dessinées par le code ; **une défense par tronçon**, attachée à sa face côté couloir :

| Défense | Mouvement |
|---|---|
| Bras | balaie le couloir en arc puis se replie |
| Piston | jaillit à l'horizontale depuis le flanc puis revient |
| Jet | une giclée toxique traverse brièvement le couloir |

Paire de chaque boss (alternée sur ses tronçons) : Bétonneuse = piston et jet ; Raffinerie = jet et bras ; Incinérateur =
bras et jet ; Réacteur = piston et bras.

- **Cycle** : avertissement 0,7 s (la pièce tremble, une lueur s'allume), coup environ 0,6 s (la pièce est un obstacle
  mortel, famille `defense`), repos ; cycle de base 2,6 s, décalé d'une défense à l'autre (jamais toutes ensemble).
- **Accélération** : le cycle se raccourcit de 20 % par point percé (avertissement compris). Un tronçon percé garde sa
  défense.
- **Équité** : au repos, une défense ne déborde jamais dans le couloir sûr ; pendant le coup, elle en laisse toujours au
  moins une moitié libre (on peut l'esquiver sans attendre).

## Persistance et cycle

- Les points percés sont gardés dans `state.bossFight` (écrit par `play/boss.js`) : ils **restent percés** après une mort et
  après la dernière chance ; `play/flow.js` les remet à zéro au passage au milieu suivant (donc aussi au boss de la saison 2).
- Victoire : la trappe ouverte, la pousse éclot normalement (cycle de la v4.9 : carton « BOSS VAINCU », milieu suivant) ;
  **bonus de 1 500 ÉcoCrédits™**, multiplié par la saison comme les autres gains.

## Clarté

- Carton du boss : son nom et son ordre (« PERCE SES 4 VANNES ») — « (combat en préparation) » disparaît.
- HUD : 4 icônes de points faibles (vides, puis allumées une à une).
- Points faibles d'une couleur réservée, **blanc-jaune incandescent**, qui pulsent dans un anneau de cible.
- **Flèche au bord de l'écran** vers le prochain point faible non percé, quand il est hors de l'écran.
- La trappe est visible (rayures danger) dès qu'on approche de la surface.

## Rendu provisoire

Chaque boss en blocs aux couleurs de son milieu : tronçons massifs, rivets, rouille, coulures luisantes, un panneau à son
nom ; les points faibles incrustés (vanne, brûleur, barre de contrôle selon le boss, en formes simples). Pièces des défenses
en blocs également. Pas d'image générée.

## Son

Son de perçage, son d'ouverture de la trappe ; le thème du boss **s'emballe de +6 BPM par point percé** (spec musique :
« qui s'emballe à chaque point faible percé »).

## Prompts des vraies images (préparés, rien n'est généré)

`docs/art/prompts-boss.md` : pour chacun des 4 boss, le prompt (direction « franchement toxique » : coulures luisantes,
rouille, fumées, fûts qui suintent), le modèle conseillé, la taille (2 à 3 morceaux d'environ 260 px de large sur fond
transparent, plus une image « détruit ») et le découpage attendu par le moteur (où tombent les 4 points faibles et les
attaches des défenses). Ni génération ni crédit dépensé sans le feu vert explicite de l'utilisateur.

## Réglages (config.js)

Tout ce qui précède est réglable dans `FP.config.boss` : nombre de tronçons (4), largeur des tronçons (45 %), élargissement
du couloir (×1,3), rayons des points faibles (14 / 20), cycle des défenses (2,6 s, avertissement 0,7 s, coup 0,6 s,
accélération 20 %), nappes (2), bonus (1 500), emballement musical (+6 BPM), paires de défenses par boss.

## Architecture

- `world/boss.js` (nouveau) : `FP.bossLevel.generate(state)` construit le niveau de boss quand `state.run.boss` est vrai
  (appelé par `level.generate` à la place de la génération normale) : `world.bossLevel = { segments, weak, defenses, trap }`,
  les tronçons et la trappe ajoutés à `world.solids`, le couloir dans `world.safePath`. `world.boss` (booléen de la v4.10)
  est inchangé.
- `play/boss.js` (nouveau) : `FP.boss.update(state, dt)` fait bouger les défenses (leurs polygones mortels pendant le coup),
  perce les points faibles touchés (événement `bossPierce`), ouvre la trappe (événement `bossTrap`) ; `FP.boss.reset(state)`.
  Pris en compte par l'ordre de mise à jour existant (avant la collision).
- `play/flow.js` : remise à zéro de `bossFight` au milieu suivant ; bonus de victoire (événement `bossDown`).
- `render/boss.js` (nouveau) : boss en blocs, points faibles, défenses, trappe, flèche de bord.
- `ui/hud.js`, `ui/cards.js` : icônes, ordre du boss. `audio/sfx.js`, `audio/music.js` : sons, emballement.
- Textes (morts « boss », « defense », « trap », carton) dans `config.js`.

## Tests

- Génération : 4 tronçons alternés, chacun avec son point faible côté couloir ; le couloir est franchissable (un chemin du
  bas jusqu'à la trappe qui longe chaque point faible sans toucher le corps) ; même graine → même niveau, d'une tentative à
  l'autre ; aucun obstacle habituel ni limace ; 2 nappes au plus, hors des points faibles.
- Combat : la pointe sur un point faible le perce une seule fois (événement, jetons) ; 4 percés → trappe ouverte, plus
  d'obstacle `trap` ; trappe fermée atteinte → mort `trap` ; points percés conservés après une mort et la dernière chance,
  remis à zéro au milieu suivant.
- Défenses : avertissement puis coup puis repos, aux durées réglées ; obstacle seulement pendant le coup ; au repos rien
  dans le couloir ; pendant le coup au moins une moitié du couloir libre ; accélération de 20 % par point percé ; décalage
  (jamais toutes en coup au même instant).
- Victoire : bonus ×saison, carton « BOSS VAINCU », milieu suivant.
- Clarté : ordre du boss sur son carton (plus de « combat en préparation ») ; icônes du HUD ; flèche vers le prochain point
  hors écran.
- Musique : tempo du boss +6 BPM par point percé.
- Navigateur (vérification de fin) : un combat joué en entier dans chaque milieu sans erreur ; captures.

## Hors périmètre

Dangers signature des milieux (sous-projet 4), vraies images et pièces mobiles habillées (sous-projet 5), boss qui bouge
ou riposte autrement qu'avec ses défenses.
