# Boss juste, Shop et musique accordés — design (v5.9.0)

Validé avec l'utilisateur le 2026-11-12, après son retour de jeu sur la v5.8.0 (« C'est bien mieux ! »).

## Retour de jeu (v5.8.0)

1. **Mort injuste :** on peut mourir alors que l'effet des zones dangereuses n'est pas encore complètement déployé. Pendant un coup, la
   moitié de salle entière tue dès la première image, alors que l'effet ne la couvre pas toute ; la vapeur, par exemple, ne couvre que 45 à
   85 % de la largeur de chaque rangée.
2. **Couloir du début :** l'entonnoir d'entrée, en bas du niveau, se résume à deux blocs gris, sans lien visible avec la machine.
3. **Points faibles :** les pompes ne sont pas encore convaincantes. Une petite passe de génération de sprites est demandée.
4. **Poche de terre :** la poche de terre sous la tête est inutile. Une fois le boss détruit, on retrouve la pelouse et la pousse éclot
   normalement, et ça marchait très bien avant elle.
5. **Shop :** quand on n'a les moyens de rien acheter, seul le bouton de refus doit être accessible, même au Game Over.
6. **Musique :** le passage entre la musique du Shop et celle des boss et des biomes est souvent dissonant, dès le premier boss et le
   biome 2.

**Choix de l'utilisateur :** déploiement visible, bouche d'aspiration, châssis en sprite avec animation par le code, libellé ABANDONNER
gardé.

## 1. Coup juste : déploiement visible

- Au début d'un coup, l'effet **jaillit de sa machine** et traverse la moitié de salle en `boss.defense.deploy` (0,25 s) :
  - depuis le plafond vers le bas pour le béton et la radiation ;
  - depuis la paroi extérieure vers l'intérieur pour la vapeur et les flammes.
- **La zone mortelle suit le front.** Le polygone de la zone (solide `defense`) ne couvre à chaque image que la partie que l'effet a déjà
  atteinte, puis toute la moitié une fois le déploiement fini.
- **Front commun.** Le jeu (`play/boss-threats.js`) calcule la part déployée de la zone, et le rendu dessine exactement cette part : ce
  qu'on voit et ce qui tue ne divergent jamais.
- **Une fois déployé, l'effet couvre toute la part.** Les jets de vapeur atteignent tous le bout de la moitié ; leur longueur ne varie plus,
  seuls leur teinte et leur scintillement varient. Les autres effets couvrent déjà toutes leurs colonnes.
- La durée du coup ne change pas : le déploiement est compris dedans.
- **Juge :** le robot de test bat toujours chaque boss. S'il perd, on en parle avant de régler quoi que ce soit.

## 2. Bouche d'aspiration

- L'entonnoir d'entrée (les murs les plus bas du plan, entre lesquels la pousse entre) devient la **prise d'air de la machine** :
  - tôles rivetées sur ses faces ;
  - une rangée de dents d'aspiration et une grille sur ses lèvres basses, du côté du couloir ;
  - un tuyau sur chaque côté, qui monte rejoindre le réseau de tuyaux existant ;
  - au moins une poutrelle au-dessus de la gorge, avec le système de liaisons existant.
- Le dessin seul change : la géométrie et les collisions de l'entonnoir restent les mêmes.
- **Repérage :** les pièces de l'entrée sont marquées dans les plans (`intake: true`), sans deviner par leur position.

## 3. Pompes en sprite (PixelLab)

- **Génération :** un sprite de pompe par biome, généré par PixelLab sur le bonus quotidien (16 générations disponibles aujourd'hui ; au plus
  8 dépensées).
  - Le sprite montre le châssis, la cuve vitrée vide et le volant fixe.
  - L'orientation suit celle des pompes du biome : large pour la Friche et la Zone industrielle, haute et étroite pour la Décharge et le Site
    nucléaire.
- **Retouche, puis import :** chaque sprite est retouché (palette du biome, fond transparent), puis importé avec `dev/tools/import-boss.js`
  dans le rôle `pump`.
- **Animation par le code, par-dessus le sprite :** liquide lumineux et bulles dans la cuve, volant qui tourne, pistons. La cuve reste la
  chose la plus claire du boss.
- **Pompe cassée :** l'épave reste celle d'aujourd'hui, dessinée par le code (cuve brisée, fumée).
- Sans image (chargement raté, banc de test), la pompe dessinée par le code de la v5.8.0 reste en secours.

## 4. Sans poche de terre

- La poche de terre sous la tête disparaît : `boss.earth.pocket` et son dessin sont retirés.
- La frange de terre des murs reste.
- La fin du combat redevient celle d'avant la v5.7.0 : le boss mort, on retrouve la pelouse et la pousse éclot normalement.

## 5. Shop sans les moyens

- Quand aucun article n'est cochable (rien de payable, ou dernière chance sans les moyens de la graine), le bouton **COMMANDER** est grisé
  et inactif, au toucher comme au clavier (Entrée).
- Seul le bouton de refus reste actif. Il garde son libellé : **NON MERCI**, ou **ABANDONNER** à la dernière chance.
- Quand au moins un article est payable, rien ne change : COMMANDER sans rien cocher vaut toujours un refus.

## 6. Shop accordé

- L'air reggae du Shop, en mi mineur (Em Am D Em), est transposé dans la **tonique du biome du niveau qui suit**. Le Shop s'ouvre toujours
  une fois ce niveau généré, donc c'est `state.world.milieu`.

  | Biome | Tonique | Transposition du Shop |
  | --- | --- | --- |
  | Friche | mi | aucune |
  | Zone industrielle | la | +5 demi-tons |
  | Décharge | sol | +3 demi-tons |
  | Site nucléaire | mi | aucune |

- Les thèmes de boss sont dans la tonalité de leur biome. Le Shop qui précède un boss est donc accordé à ce boss.
- Le tempo du reggae ne change pas.
- Les classes de hauteur (`pcs`) de chaque variante sont transposées avec les notes, et contrôlées par les tests comme les autres morceaux.

## Technique

- **Version :** v5.9.0, avec une entrée au CHANGELOG.
- **Réglages :** dans `config.js`, `boss.defense.deploy` ; `boss.earth.pocket` est retiré. **Couleurs :** dans `FP.palette.boss`.
- **Fichiers touchés :**
  - `play/boss-threats.js` : part déployée, polygone de la zone qui grandit ;
  - `render/boss-machines.js` : effets bornés à la part déployée, vapeur pleine largeur ;
  - `render/boss-earth.js` : poche retirée ;
  - un nouveau fichier `render/boss-intake.js` pour la bouche d'aspiration, ou `render/boss-core.js` s'il reste sous 400 lignes ;
  - `render/boss-core.js` : la pompe dessine le sprite puis ses animations ;
  - `render/boss-skin.js` : rôle `pump` ;
  - `assets/boss/art.js` et `assets/boss/plans.js` (`intake`) ;
  - `ui/order.js` et `ui/menu.js` : COMMANDER inactif ;
  - `play/shop.js` : `FP.shop.canOrder(state)` ;
  - `audio/songs.js` et `audio/music.js` : un Shop par tonique.
- **Règles AGENTS.md :** fichiers sous 400 lignes, pas de code mort, en-têtes Lit/Écrit/Expose à jour. index.html et dev/check.html ne
  reçoivent que des lignes `<script>` et la version.

## Tests

- **Coup :**
  - le polygone de la zone grandit avec le déploiement et couvre toute la moitié à la fin ;
  - un point encore hors du front ne tue pas ;
  - l'effet dessiné reste dans la part déployée, et la couvre (chaque rangée au moins 35 %) ;
  - la vapeur atteint le bout de la moitié.
- **Bouche :** les pièces `intake` existent dans chaque plan ; leur dessin ajoute des tôles, des dents et deux tuyaux ; la géométrie reste
  identique.
- **Pompes :** avec image, le sprite est dessiné et la cuve reste la zone la plus claire ; sans image, on revient au dessin par le code ;
  quelque chose bouge entre deux images.
- **Terre :** plus de poche entre la tête et la surface.
- **Shop :** sans les moyens, `canOrder` est faux, et ni le toucher ni Entrée ne commandent ; le refus marche ; le libellé ABANDONNER reste
  à la dernière chance.
- **Musique :** le Shop d'un niveau de chaque biome a la tonique du biome ; ses `pcs` sont contrôlées.
- **Robot :** il bat toujours chaque boss.
- **Banc et jeu :** banc complet vert, puis vérification en jeu au format téléphone, avec captures envoyées à l'utilisateur.

## Hors de portée

- Nouvelles musiques, ou changement du tempo du Shop.
- Changement de la géométrie des murs ou des durées des défenses.
- Sprites pour d'autres pièces que les pompes.
