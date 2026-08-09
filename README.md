# Flower Power

**Flower Power** est un jeu HTML Canvas vertical mobile en 9:16. Le joueur guide une graine qui pousse vers la surface à travers une terre polluée, en évitant les déchets, les zones toxiques diffuses et les limaces de lixiviat.

Le prototype mêle arcade mobile, satire écologique et esthétique de livre pour enfants déglingué. Le score secondaire absurde s'appelle **ÉcoCrédits™**.

## Version actuelle

**v3.41 Visual Slice**

Cette branche revient à un rendu Canvas sobre et vectoriel :

- aucun sprite PNG ;
- aucune dépendance externe ;
- pousse procédurale ;
- obstacles et dangers dessinés en Canvas ;
- prototype autonome dans `index.html`.

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

La v3.41 reste volontairement monolithique pour préserver une base jouable. Le découpage en modules viendra progressivement, avec un test navigateur après chaque étape.

## Statut

Prototype en développement. La priorité actuelle est de pousser la personnalité du sous-sol sans sacrifier la lisibilité ni les performances acquises en v3.38.

## Diagnostic performances

Ajouter `?perf=1` à l'URL affiche le profiler intégré (FPS et coût update/render/sol/hazards/plante).


## Variantes d’obstacles

La v3.40 introduit un catalogue de variantes satiriques pour toutes les familles d’obstacles solides. Deux variantes par famille sont tirées au début de chaque génération puis distribuées en alternance. Les variantes comportant du texte sont automatiquement rendues sans miroir afin de préserver leur lisibilité.


## v3.41 — Visual Slice

Cette version ne cherche pas encore à refaire les 23 familles. Elle valide d'abord le langage visuel sur six familles fortes : smartphone, batterie, fût nucléaire, drone, sac poubelle et T-Rex. Les détails sont intégrés à la structure de l'objet plutôt que plaqués sous forme de stickers. L'écran titre permet de comparer le cadrage A et le cadrage B (+18 %, croissance ralentie). Le T-Rex « NON AUX ESSAIS NUCLÉAIRES » est une rencontre signature rare, limitée à une apparition maximum par partie.
