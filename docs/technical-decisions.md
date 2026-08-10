# Décisions techniques

## Base

- HTML, CSS et JavaScript natifs.
- Canvas 2D.
- Format vertical mobile 9:16.
- Prototype autonome dans un seul `index.html` pour la v3.37.

## Rendu

- Terrain, pousse, fluides et fallback en Canvas procédural.
- Obstacles détaillés authorés en PNG transparent, avec métadonnées JSON produites par l’Asset Editor.
- Les collisions des assets authorés utilisent leurs polygones exportés plutôt qu’une approximation visuelle.
- Pas de dépendance à des fichiers externes au lancement.
- La pousse reste procédurale.

## Collisions

- Formes simples et lisibles : cercles, ellipses, capsules et polygones.
- La collision doit rester cohérente avec la silhouette dessinée.
- Toute approximation doit favoriser la justice du joueur.

## Workflow Git

- `main` : dernière version testée et jouable.
- `work` : développement courant.
- Tags pour les jalons stables, par exemple `v3.37-vector-reset`.

## Refactorisation

Le découpage de `index.html` en modules doit être progressif. Une seule famille de fonctions est extraite à la fois, suivie d'un test desktop et mobile. Aucun grand déménagement de code en une seule passe.


## v3.38 — Budget de rendu

- Le décor sol/surface statique est pré-rendu dans un canvas offscreen et recopié par tranche visible.
- Les fleurs matures sont baked dans un cache de surface ; seules les fleurs en éclosion restent animées individuellement.
- Les collisions utilisent une broad phase puis une seule requête consolidée par frame.
- Les sons de bruit réutilisent un AudioBuffer persistant.
- Les `shadowBlur` sont réservés aux feedbacks ponctuels.
- Le profiler est opt-in via `?perf=1` afin de ne pas coûter en production.


## v3.40 — Architecture des variantes solides

- Toutes les familles d’obstacles solides disposent d’un catalogue de variantes.
- Deux variantes par famille sont tirées au début de la génération du niveau ; une troisième peut entrer dans le pool aux niveaux avancés.
- Les variantes sont distribuées en alternance plutôt qu’avec remise afin d’éviter les répétitions immédiates.
- `mirrorSafe: false` neutralise le flip horizontal pour tous les objets portant du texte ou une signalétique orientée.
- Les textes satiriques sont pré-rastérisés dans un cache de canvases offscreen pour éviter de multiplier les `fillText` coûteux à chaque frame.
- La couche de caractère reste purement visuelle : aucune variante ne modifie collision, hitbox, danger ou scoring.


## v3.41 — Lisibilité et satire intégrée

- Un détail satirique important doit survivre à une lecture smartphone à distance normale.
- Le texte est un outil parmi d'autres, pas le support par défaut du gag.
- Les variantes du vertical slice modifient la morphologie ou la mise en scène de l'objet, pas seulement sa surface.
- Les objets souterrains n'utilisent plus d'ombre portée ; leur intégration repose sur le contour, la matière et la superposition.
- Le T-Rex « NON AUX ESSAIS NUCLÉAIRES » est un asset signature rare, non flippable, limité à une apparition par partie au maximum.
- Le test d'échelle B est un cadrage +18 % accompagné d'une pousse -12 % et d'une densité solide -8 % pour préserver l'anticipation.


## v3.41.1 — Pipeline d’assets authorés

- Le JSON exporté par l’éditeur est la source de vérité pour `worldWidth`, pivot, `mirrorSafe`, collision, graze et éligibilité au flyover.
- Les fichiers JSON d’origine ne sont pas modifiés lors de l’intégration. Un manifeste local fait le pont entre leurs `id` actuels et les `kind` historiques du moteur.
- Le T-Rex signature est géré comme un asset distinct des T-Rex ordinaires.
- Les power-ups ne sont plus générés avec le terrain. Leur prochaine implémentation doit être déclenchée par le flyover et mesurer la prise de risque.

## v3.41.2 — Collision gameplay ≠ encombrement visuel
- Le polygone authoré reste l'autorité pour collision et graze.
- Le placement utilise une empreinte visuelle séparée basée sur le rectangle rendu du sprite, rotation comprise.
- Une marge de respiration est ajoutée à cette empreinte avant le test SAT contre les obstacles déjà placés.
- Les overlaps entre obstacles solides sont interdits.
- La densité est une cible, pas un quota : après plusieurs tentatives infructueuses, le générateur abandonne l'obstacle plutôt que de forcer sa pose.
- Le T-Rex signature réserve son emplacement avant la population standard.
- Toxiques et lixiviat ne sont pas concernés : leur superposition avec les objets fait partie du langage du sous-sol.


## v3.42 — Power-ups issus du flyover
- Aucun power-up n'est placé pendant la génération du niveau.
- Le système réutilise l'enveloppe de graze des collisions authorées.
- La qualification exige une progression ascendante réelle autour puis au-dessus de l'obstacle ; un simple stationnement dans la zone de graze ne suffit pas.
- La prise de risque combine durée utile, proximité et progression.
- Dans ce prototype, la durée utile pilote principalement la nature de la récompense : Source claire pour un flyover qualifié, Spore pour un flyover long et très risqué.
- Le spawn est prédictif : devant la pointe, latéralement décalé, puis rejeté s'il tombe dans un solide, une zone toxique, un trajet de lixiviat ou trop près d'un autre bonus.
- Une récompense ratée disparaît une fois suffisamment derrière la pointe.


## v3.42.1 — Slot de power-up et bouclier organique
- `organicShield` est un état binaire sans durée : la Goutte l’active, la prochaine collision solide ou avec le lixiviat le consomme.
- La rupture applique une très courte fenêtre de grâce et recule légèrement la pointe pour éviter une seconde collision dans le même collider à la frame suivante.
- Les zones toxiques diffuses ignorent le bouclier : elles restent une exposition continue et non un choc discret.
- `gameplayPowerUpActive()` centralise la règle d’exclusivité des effets gameplay.
- Lorsqu’un flyover aurait produit une Goutte ou une Spore pendant qu’un power-up gameplay est actif, le spawn est supprimé et n’est jamais mis en file d’attente.
- Le pollen (`bud`) est une récompense hors slot : il modifie uniquement `flowerBonus`, donc reste autorisé pendant un power-up actif.
- Les tiers actuels servent au tuning, pas de contrat définitif : pollen (court), goutte (soutenu), spore (long + risqué).
