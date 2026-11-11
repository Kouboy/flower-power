# Boss cohérent — design (v5.7.0, puis v5.8.0)

Validé avec l'utilisateur le 2026-11-11, section par section, après son retour de jeu sur la v5.6.0.

## Retour de jeu (v5.6.0) et intention

- L'usine en arrière-plan remplaçait la terre : retirée en v5.6.1.
- Le premier plan flou flottait, n'était rattaché à rien, et il était trop transparent : il ne servait à rien.
- Les tourelles ne se sentaient pas, et on ne voyait pas leur taille.
- Les zones dangereuses (hachures orange), les points faibles et le cœur étaient peu convaincants : « à part la couleur pétante, rien ne
  justifie qu'on s'attaque à ces points précis ».

Le but : rendre le boss **cohérent**. Murs, tunnels, points faibles et cœur doivent appartenir visiblement à **une seule énorme machine**,
qui surgit de la terre par endroits et laisse une poche de terre où la fleur éclot à la victoire.

Réussite :
- on comprend sans texte pourquoi on attaque les pompes, puis le cœur ;
- chaque danger se voit comme une machine qui se prépare ;
- les tourelles se remarquent ;
- la géométrie, les collisions, les durées et la difficulté ne changent pas ;
- le robot de test bat toujours chaque boss.

Choix de l'utilisateur :
- **logique « pompes qui nourrissent »** ;
- **défenses en vraie machinerie** à la place des hachures ;
- **tuyaux qui relient les murs** à la place du premier plan flottant ;
- **la terre** (bords rongés et poche autour de la tête) ;
- **tourelles visibles et menaçantes**, à difficulté égale ;
- **dessin par le code**, en gardant les images PixelLab de la v5.6.0 (matière béton, toupie, plaques), avec une image de pompe par boss.

## Pompes, tuyaux, cœur

**Pompes.** Chaque cible (3 par boss) devient une pompe : corps sombre, piston qui va et vient, voyant. C'est une image PixelLab par boss,
et le code l'anime (le piston oscille, le voyant pulse). La pompe reste la seule chose claire du boss.

**Tuyaux.**
- Un gros tuyau rouillé part de chaque pompe. Il est dessiné par le code, dans le style de `render/decor-tube.js` : coudes, colliers,
  rouille.
- Il longe ou traverse les murs, et franchit les tunnels au-dessus ou au-dessous du couloir de jeu, **jamais dedans**.
- Les trois tuyaux convergent vers le cœur.
- Des tuyaux de liaison relient aussi des murs entre eux. Ils remplacent le premier plan flou, qui est retiré.
- Des pulsations vert toxique circulent de la pompe vers le cœur.

**Pompe cassée.** Son tuyau se rompt à la sortie et crache une fuite qui retombe. Le flux de ce tuyau s'arrête. Sa plaque tombe du cœur,
comme aujourd'hui.

**Cœur.**
- Blindé tant qu'une pompe tourne, il tremble au rythme du flux qui arrive.
- À nu, les trois tuyaux morts y restent plantés et il lance des étincelles ; la lueur qui pulse actuelle est gardée.

## Terre

- Les bords extérieurs des murs (ceux qui ne donnent pas sur un couloir) sont rongés de terre : mottes, cailloux, quelques racines, aux
  couleurs du sous-sol du milieu. La machine semble déterrée par endroits.
- Une poche de terre entoure la tête, au-dessus d'elle jusqu'à la surface : c'est là que la fleur éclot à la victoire.
- Tout cela est dessiné par le code et ne change aucun solide ni aucune collision.

## Défenses

Les hachures disparaissent. La zone touchée ne change pas (une moitié de salle, sur toute la hauteur), ni les durées (avertissement ≥ 1 s,
coup, repos). Chaque défense est une machine fixée à sa salle, reliée à un tuyau, qui **remplit visiblement toute la moitié frappée**.

| Défense (salles) | Repos | Avertissement | Coup |
|---|---|---|---|
| Béton (4) | goulotte fermée au plafond de la moitié | la trappe s'entrouvre, des gouttes grises tombent, la goulotte vibre | un rideau de béton coule sur toute la moitié, puis s'égoutte |
| Vapeur (2) | rangée de buses sur la paroi de la moitié | sifflement, petites bouffées blanches, les buses rougissent | des jets de vapeur blancs traversent la moitié |
| Flamme (1) | brûleurs sur la paroi, veilleuses bleues | les veilleuses grossissent et virent à l'orange | une nappe de flammes balaie la moitié |
| Radiation (1) | émetteur éteint au plafond | il se charge : lueur verte qui monte, arcs | un rideau vert pulse sur la moitié |

Pendant l'avertissement, un mince **liseré clignotant** marque le bord de la zone visée. Il remplace les hachures comme repère de jeu.

## Tourelles

- **Taille :** socle bien visible, vissé au mur qui la porte et relié à un tuyau, d'environ 16 pixels d'art.
- **Repos :** le canon est au repos, la lentille sombre.
- **Visée :** le canon pivote vers la pousse et la lentille passe de l'orange au rouge en s'élargissant. La ligne de visée part du bout du
  canon.
- **Tir :** le canon recule et un éclair jaillit à la bouche. Le son du tir est plus fort.
- La fréquence, la vitesse et la difficulté des tirs ne changent pas.

## Ordre du dessin

1. Terre du milieu.
2. Anciennes tiges.
3. Nappes.
4. Terre qui ronge les bords.
5. Tuyaux et flux.
6. Boss : murs, pompes, tête, plaques.
7. Machines de défense au repos et en coup.
8. Tourelles.
9. Pièces, pousse, effets.
10. Par-dessus tout : liseré d'avertissement, ligne de visée et tirs.

La poche de terre de la tête se dessine avec la terre qui ronge les bords.

## Technique

- **`assets/boss/plans.js`** gagne, pour chaque plan :
  - `pipes: [{ from: <id de cible> | null, to: 'head' | null, pts: [[x, y], …] }]` ;
  - les tuyaux de liaison ont `from` et `to` à `null` ;
  - coordonnées en proportions, comme le reste du plan, pour suivre l'étirement des niveaux.
  `FP.bossPlan.toWorld` les pose dans le monde et `world/boss.js` les range dans `bossLevel.pipes`.
- La place de chaque machine de défense se déduit de la salle :
  - plafond de la moitié pour béton et radiation ;
  - paroi extérieure de la moitié pour vapeur et flamme.
  L'orientation d'une tourelle se déduit du mur le plus proche. Il n'y a rien à saisir à la main pour elles.
- **Nouveaux fichiers de dessin** (moins de 400 lignes chacun) :
  - `src/render/boss-pipes.js` : tuyaux, flux, tuyau rompu ;
  - `src/render/boss-machines.js` : défenses dans leurs trois états, tourelles ;
  - `src/render/boss-earth.js` : bords rongés, poche de la tête.
- **`src/render/boss.js`** garde murs, pompes (image de la cible, animée), tête et plaques. Les hachures et le dessin actuel des tourelles
  en sont retirés. `drawThreats` ne garde que le liseré, la ligne de visée et les tirs.
- **Retrait du premier plan flou :** `src/render/boss-depth.js`, `config.boss.skin` (vitesses, flou, opacité, écart, secousse du premier
  plan), le rôle `fore` d'`assets/boss/art.js` et ses deux images. L'outil `dev/tools/import-boss.js` suit : il gère les rôles présents
  et ne demande plus d'images de premier plan.
- **Réglages** (durées d'animation, tailles, vitesse du flux, nombre de pulsations) dans `config.boss` ; **couleurs** dans
  `FP.palette.boss`.
- Le son du tir de tourelle est plus fort : réglage de gain dans le son existant.
- **Règles AGENTS.md :** réglages dans config.js, dessin dans render/*, fichiers sous 400 lignes, pas de code mort, en-têtes Lit / Écrit /
  Expose. index.html et dev/check.html ne reçoivent que des lignes `<script>`.

## Tests

- **Tuyaux hors des couloirs :** aucun point d'un tuyau ne s'approche des trajets de référence à moins de `channelMin / 2` (même règle que
  les murs), pour les 4 plans, au facteur d'étirement 1 et au maximum.
- **Pompes reliées :** chaque cible a un tuyau qui va jusqu'à la tête.
- **Pompe cassée :** une cible détruite arrête le flux de son tuyau (aucune pulsation dessinée dessus) et fait apparaître la fuite.
- **Machines :** chaque type de défense se dessine sans erreur au repos, en avertissement et en coup, pour chaque salle de chaque boss.
  En coup, le dessin couvre la moitié de salle visée.
- **Liseré :** il est dessiné pendant l'avertissement, et il n'y a plus de hachures.
- **Tourelles :** la tourelle mesure au moins 14 pixels d'art, et son canon est orienté vers la pousse pendant la visée.
- **Terre :** dessiner la terre ne modifie aucun solide.
- **Ordre :** il est vérifié en jeu par un espion JS (frame.js n'est pas chargé par le banc).
- **Secours :** un boss sans images se dessine sans erreur, avec tuyaux, machines et terre.
- **Banc complet vert**, dont le robot qui bat chaque boss, et vérification en jeu (dont un format téléphone).

## Versions et budget

- **v5.7.0 :** moteur cohérent (pompes animées, tuyaux, flux, défenses, tourelles, terre) pour les quatre boss, et l'image de pompe de la
  Bétonneuse. Coût : 1 génération PixelLab, 3 au plus avec des reprises, **avec le feu vert de l'utilisateur**.
- **v5.8.0 :** images des Raffinerie, Incinérateur et Réacteur (matière, tête, pompe, plaque : 4 par boss, 12 en tout), après validation
  de la Bétonneuse en jeu.

## Hors de portée

- Visages de boss ;
- changement de géométrie, de collisions, de durées ou de difficulté ;
- nouveaux types de défense ;
- arrière-plan d'usine (retiré en v5.6.1).
