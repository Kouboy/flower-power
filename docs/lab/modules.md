# Les modules de l'Encounter Lab — première livraison (v5.13.0)

Spec : `docs/superpowers/specs/2026-11-18-modules-premiere-livraison-design.md`. Données : `assets/lab/circuits.js`.
Jouer un module : `?lab=N` (N de 1 à 10). Après un passage réussi, le même module revient en miroir (gauche ↔ droite) une fois sur deux.

Chaque module se traverse du bas vers le haut. On ajoute des éco-crédits en prenant les pièces au passage. Les rythmes (limaces, tourelles, impulsions) partent quand la pointe entre dans le module. Ils sont donc identiques à chaque passage : plus on joue, mieux on les connaît.

| # | Module | Silhouette | Pièces en jeu | Le dilemme | Ce qu'on apprend |
|---|---|---|---|---|---|
| 1 | La Gueule | deux mâchoires dentelées au centre, deux joues sur les côtés | 2 limaces en travers de la sortie des joues ; les dents | la gorge, étroite et dentelée, rapporte pièces et frôlements ; les joues sont larges, mais une limace en garde la sortie | onduler de dent en dent ; lire la limace avant de sortir de la joue |
| 2 | L'Escalier | quatre marches décalées, en zigzag | 2 tourelles, une en bas, une en haut | traverser chaque palier vite et près des marches, ou large et plus longtemps à découvert | chaque marche abrite de l'une ou de l'autre tourelle ; traverser pendant la recharge |
| 3 | Le Peigne | quatre fentes parallèles | une limace au-dessus de chaque fente, quatre rythmes | choisir sa fente : la plus rapide garde les pièces | lire quatre rythmes d'un coup d'œil, avant d'entrer |
| 4 | Le Sablier | large, un goulot, large | une impulsion dans le goulot ; des pièces dans les poches | foncer au centre au bon moment, ou flâner dans les poches pour les pièces et décaler son passage | le tempo de l'impulsion ; s'en servir pour se placer |
| 5 | Le Carrefour | une croix | 2 limaces qui traversent le bras horizontal, à deux rythmes | tout droit à travers la circulation, ou un crochet sur le bras pour les pièces | traverser entre deux limaces |
| 6 | Les Dents de scie | deux parois en dents décalées | 3 grosses nappes à l'extérieur des virages ; des pièces sur les lignes droites | serrer chaque dent (court, au ras du béton, frôlements) ou prendre large et mordre la nappe | anticiper chaque virage d'une dent |
| 7 | Le Tetris | des blocs imbriqués | 1 tourelle en bas | le chemin court, par le milieu, à découvert ; ou le détour par la droite, abrité derrière les blocs | se cacher derrière un bloc au moment du tir |
| 8 | La Tour de guet | une chambre fermée, trois piliers | 2 tourelles en bas, en alternance | le centre rapporte les pièces sous deux feux ; les bords longent les piliers | aller de pilier en pilier au rythme des tirs |
| 9 | La Herse | une rangée de piliers | une nappe dans un créneau ; 2 limaces derrière | choisir son créneau (un des créneaux libres, celui des pièces, ou celui que la nappe resserre), puis improviser derrière | planifier l'entrée, improviser la sortie |
| 10 | Le Grand Huit | deux blocs en S | une impulsion qui remonte la corde centrale | la corde, courte, sous l'impulsion ; ou les deux grandes boucles, longues, avec les pièces | le tempo de l'impulsion, ou la patience |

## Règles de dessin (rappel de la spec)

- Un module a une silhouette qu'on peut nommer, et deux trajets de référence au moins (`path`, `alt`), qui sont les options du dilemme.
- Les passages font au moins `config.lab.channelMin` (48 px à 360 px de large, proportionnel à la largeur). Les trajets de référence restent à une demi-largeur de passage des murs.
- Tout ce qui compte (pièces, limaces, tourelles, voies d'impulsion, trajets) reste dans la bande sûre. Les murs ferment les bords du monde.
- Une tourelle vise au moins 1 s avant de tirer. Une limace de module fait des allers-retours à rythme fixe, sans accélérer.
- Les sols (argile, sable) restent dans le code, mais aucun module de cette livraison ne s'en sert.

Ces règles sont vérifiées par `dev/tests/lab.test.js`, à quatre largeurs et dans les deux sens.
