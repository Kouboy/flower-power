# Flower Power

**Flower Power** est un jeu HTML Canvas vertical mobile en 9:16. Le joueur guide une graine qui pousse vers la surface à travers une terre polluée, en évitant les déchets, les zones toxiques diffuses et les limaces de lixiviat.

Le prototype mêle arcade mobile, satire écologique et esthétique de livre pour enfants déglingué. Le score secondaire absurde s'appelle **ÉcoCrédits™**.

## Version actuelle

**v3.42.1 Flyover PowerUps Prototype**

Cette passe teste le pipeline hybride retenu :

- pousse, terrain, fluides et éléments de secours toujours dessinés en Canvas ;
- obstacles authorés en PNG transparent lorsque disponibles ;
- collisions polygonales exportées par le Flower Power Asset Editor ;
- aucune bibliothèque externe ;
- ouverture directe de `index.html` conservée grâce à un manifeste local.

## Lancer le jeu

Aucune installation n'est nécessaire.

1. Télécharger ou cloner le dépôt.
2. Ouvrir `index.html` dans un navigateur récent.
3. Sur mobile, maintenir ou toucher l'écran pour guider la pousse.

## Contrôles

- Maintenir ou toucher l'écran : orienter la pousse.
- Frôler les obstacles sans les toucher : générer des ÉcoCrédits™.
- Atteindre la surface : faire éclore une fleur.

## Organisation du dépôt

```text
flower-power/
├── index.html
├── README.md
├── CHANGELOG.md
├── .gitignore
├── assets/
│   └── obstacles/   # PNG + JSON authorés + manifest.js
├── docs/
│   ├── game-design.md
│   ├── obstacle-variants.md
│   ├── technical-decisions.md
│   ├── visual-direction.md
│   ├── test-checklist.md
│   └── roadmap.md
└── archive/
    └── README.md
```

La v3.42 reste volontairement monolithique pour préserver une base jouable. Le découpage en modules viendra progressivement, avec un test navigateur après chaque étape.

## Statut

Prototype en développement. La priorité actuelle est de valider la boucle flyover → prise de risque → apparition dynamique d’un power-up, tout en conservant le pipeline PNG + collisions authorées.

## Diagnostic performances

Ajouter `?perf=1` à l'URL affiche le profiler intégré (FPS et coût update/render/sol/hazards/plante).


## Variantes d’obstacles

La v3.40 introduit un catalogue de variantes satiriques pour toutes les familles d’obstacles solides. Deux variantes par famille sont tirées au début de chaque génération puis distribuées en alternance. Les variantes comportant du texte sont automatiquement rendues sans miroir afin de préserver leur lisibilité.


## v3.41 — Visual Slice

Cette version ne cherche pas encore à refaire les 23 familles. Elle valide d'abord le langage visuel sur six familles fortes : smartphone, batterie, fût nucléaire, drone, sac poubelle et T-Rex. Les détails sont intégrés à la structure de l'objet plutôt que plaqués sous forme de stickers. L'écran titre permet de comparer le cadrage A et le cadrage B (+18 %, croissance ralentie). Le T-Rex « NON AUX ESSAIS NUCLÉAIRES » est une rencontre signature rare, limitée à une apparition maximum par partie.


## Power-ups

Depuis la v3.41.1, aucun power-up n’est placé par la génération du niveau. En v3.42, un flyover qualifié peut faire naître une Source claire devant la pousse ; un flyover plus long et très risqué peut libérer une Spore. La position est recherchée devant la graine mais décalée de sa trajectoire, et refusée si elle tombe dans un danger ou un obstacle.
