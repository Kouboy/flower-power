# La tresse : deux chemins dans le niveau tiré au hasard (`?lab`) — design

Date : 2026-11-19. Fait suite à l'échec des modules (v5.13–v5.14 : salles de béton faites à la main, retirées du jeu en v5.14.1).

## Intention

Les modules ont montré ce qui ne marche pas dans Flower Power : des salles d'un autre matériau, plus faciles, aux transitions brutales.
L'idée qu'ils portaient reste bonne : **des choix voulus, sous pression**. Comme Spelunky, on veut obtenir ces choix **avec les
matériaux du jeu** (déchets, nappes, limaces), en apprenant au générateur à fabriquer une situation, au lieu de poser une salle dessinée.

On commence petit, avec ce qu'on a : **la tresse**. Le niveau a deux chemins sûrs au lieu d'un. A est toujours le plus sûr, B le plus
risqué et le plus payant. Ils s'écartent et se croisent plusieurs fois du départ à la surface. Le joueur peut suivre A, puis B, couper
hors piste, revenir sur B, puis sur A, puis éclore. L'utilisateur juge en jouant ; on garde ce qui marche et on itère.

Les modules sont abandonnés. `?lab` devient le terrain d'essai de la tresse.

## Ce qu'on construit

### 1. Le Lab devient une partie normale avec la tresse

- `?lab` (sans numéro) lance **une partie normale** : biomes, boutique, boss, graines perdues à la mort, vitesse qui monte. Dans chaque
  niveau tiré au hasard (pas au boss), la tresse remplace le chemin sûr unique.
- « LAB » reste sur l'écran titre. Une partie au Lab n'écrit pas les records du jeu normal (comme avant).
- **On retire les modules et tout ce qui ne servait qu'à eux :** les 10 modules (`assets/lab/circuits.js`), leur pose
  (`world/lab.js`), leur horloge et leurs limaces (`play/lab-hazards.js`), l'impulsion (`play/lab-pulse.js`), la tourelle hors boss
  (`play/lab-turret.js`, `render/lab-turret.js`), le béton et les sols (`render/lab.js`, sols de `play/plant.js`), la mesure
  (`play/lab-stats.js`, `ui/lab-stats.js`, `&stats`), leurs réglages, couleurs, sons (`labWarn`, `labPulse`) et textes (« bétonnée »,
  « soufflée par le gaz »), leurs tests et la fiche `docs/lab/modules.md`. Les règles propres au Lab des modules partent aussi :
  graines illimitées, vitesse d'un premier niveau, enchaînement des modules sans boutique ni boss, miroir, `labPasses`, `world.modules`.
  Les specs et plans passés restent dans `docs/superpowers/` (historique).
- Sans `?lab`, le jeu normal est identique (même niveau pour une même graine : empreinte du banc).

### 2. La tresse

- **A est le chemin sûr d'aujourd'hui**, tracé exactement comme sans `?lab` (même graine, mêmes nœuds), avec sa largeur garantie
  (`safeRadius`) et ses règles de placement inchangées.
- **B est tracé à partir de A**, avec un tirage à part (le tirage du niveau n'est pas décalé) : B oscille autour de A, d'un côté puis
  de l'autre, et le **croise** à intervalles réguliers (environ un écran de hauteur ; au moins deux croisements par niveau). Entre deux
  croisements, B s'écarte assez de A pour que des déchets puissent séparer les deux chemins. B respecte la pente maximale du chemin sûr
  et reste dans la bande sûre de l'écran.
- **B est plus étroit que A** (largeur garantie plus petite) et **plus risqué**, avec le bestiaire actuel :
  - des déchets peuvent le resserrer davantage (frôlements) ;
  - des limaces peuvent le barrer, dès le début de la partie, mais toujours avec un moment pour passer (une limace qui barre B laisse
    libre au moins un bout de sa course, comme les limaces qui barrent A en fin de partie) ;
  - des nappes peuvent mordre ses bords, sans couvrir son milieu.
- **Les pièces suivent surtout B** ; A en garde quelques-unes.
- **Densité :** A garde sa largeur ; on garde le même nombre de déchets, nappes et limaces qu'un niveau normal, serrés dans la place
  qui reste (choix de l'utilisateur : « on garde A tel quel, pour l'instant »).
- Les chemins sont invisibles, comme aujourd'hui : on les lit à la disposition des déchets.

## Objectifs, non-objectifs, anti-objectifs

- Objectifs : de vrais choix pendant la montée (le chemin sûr, le chemin payant, couper entre les deux) ; une partie complète au Lab
  pour juger.
- Non-objectifs : nouveaux dangers (la tourelle enfouie est pour un essai suivant), autres gabarits (goulot, embuscade…), réglage de la
  difficulté de A, affichage des chemins.
- Anti-objectifs : un niveau plus facile qu'aujourd'hui en suivant A ; un B infranchissable ; deux chemins collés qui ne font qu'un
  gros couloir ; un niveau visiblement creusé ; un jeu normal changé sans `?lab`.

## Contraintes

- `AGENTS.md` : réglages dans les fichiers de config (`config.js` est plein : les réglages de la tresse vont dans `config-lab.js`, qui
  ne garde qu'eux et le texte « LAB ») ; fichiers < 400 lignes ; pas de code mort ; en-têtes Lit/Écrit/Expose à jour ; `index.html` et
  `dev/check.html` ne changent que par des lignes `<script>`.
- Banc complet (hors robot de combat) vert ; empreinte du jeu normal inchangée.

## Approches considérées

- **1. Tracer B à partir de A, avec ses propres règles (retenue).** Croisements et écart décidés ; chaque chemin a sa largeur ; les
  règles « loin du chemin » deviennent « loin de A selon A, loin de B selon B », relâchées pour B. Le plus maîtrisé et le plus testable.
- 2. Tirer le niveau puis creuser B : densité irrégulière, contrôle faible de ce que B traverse.
- 3. Deux chemins tirés indépendamment : croisements au hasard, parfois aucun ; ce n'est plus une tresse.

## Décidé par l'utilisateur

- Tresse sur toute la hauteur ; A toujours plus sûr que B ; chemins qui se croisent ; hors piste possible.
- Seulement le bestiaire actuel (obstacles, nappes, limaces).
- A tel quel, même nombre de déchets (« pour l'instant »).
- Approche 1. Dans `?lab` ; les modules sont abandonnés.

## Appels de Claude (à vérifier par l'utilisateur)

- `?lab` = une partie normale complète (boutique, boss, graines, vitesse) ; pas d'écriture des records.
- Retrait de tout le code des modules, y compris la tourelle hors boss, l'impulsion et les sols (rien d'autre ne s'en sert ; git les garde).
- Valeurs de départ (réglables dans `config-lab.js`) : un croisement environ tous les 0,9 écran ; écart maximal de B à A d'environ
  28 % de la largeur ; largeur garantie de B à 60 % de celle de A ; environ deux tiers des traînées de pièces sur B.
- Le paramètre accepte encore `?lab=N` (ignoré) pour que les anciens liens ouvrent le Lab.

## Précisions (relecture ; appels de Claude)

- **Dès le 1er niveau :** la tresse est dans tous les niveaux tirés au hasard, sans montée progressive. B est un choix : qui suit A
  retrouve la difficulté d'aujourd'hui (à la densité près). Les limaces peuvent barrer B dès le début (la règle de fin de partie
  qui retarde les limaces en travers ne vaut que pour A).
- **Ce qui doit être identique :** seulement le tracé de A (mêmes nœuds que le chemin sûr du même niveau sans `?lab`). Les déchets,
  eux, changent (ils évitent aussi B). L'empreinte « jeu normal identique » ne vaut que sans `?lab`.
- **Quand la place manque :** on pose moins (comme aujourd'hui quand le niveau est plein), sans retirer B. Test : sur plusieurs graines,
  au moins 85 % du nombre d'obstacles d'un niveau normal de même graine, en moyenne.
- **Aux croisements**, le couloir garanti est celui de A (le plus large). Rien ne viole jamais le couloir de A.
- **Contre un bord :** quand A longe un bord de l'écran, B part du côté où il y a de la place ; un écart plus court est accepté. Au
  moins deux croisements par niveau dans tous les cas.
- **Pièces :** environ deux traînées sur trois suivent B (en nombre de traînées), avec les règles de pose d'aujourd'hui (hors des
  dangers).
- **Records :** les records du jeu normal (`FP.scoring.records`), comme le faisait déjà le Lab. `?lab=N` ouvre le Lab sans rien afficher
  de plus.

## Laissé au constructeur

- La forme exacte de l'oscillation de B (sinus, segments), la façon de garder l'écart quand A longe un bord de l'écran.
- Comment répartir les traînées de pièces entre A et B ; comment serrer la densité (plus d'essais de placement, par exemple).
- Les tests, pourvu qu'ils couvrent : empreinte du jeu normal sans `?lab` ; `?lab` = partie normale (boutique, boss, graine perdue,
  pas de record) ; A identique au chemin sûr du même niveau sans `?lab` ; B : au moins deux croisements, assez écarté entre deux,
  pente et bande sûre respectées ; rien ne bouche A (règles d'aujourd'hui), ni B (à sa largeur ; limace en travers : un bout libre) ;
  pièces surtout sur B ; nombre de déchets proche de celui d'un niveau normal ; plus aucune trace des modules.
