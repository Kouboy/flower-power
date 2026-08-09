# Flower Power

**Flower Power** est un jeu HTML Canvas vertical mobile en 9:16. Le joueur guide une graine qui pousse vers la surface à travers une terre polluée, en évitant les déchets, les poches de poison et les limaces de lixiviat.

Le prototype mêle arcade mobile, satire écologique et esthétique de livre pour enfants déglingué. Le score secondaire absurde s'appelle **ÉcoCrédits™**.

## Version actuelle

**v3.37 Vector Reset**

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
│   ├── technical-decisions.md
│   ├── visual-direction.md
│   ├── test-checklist.md
│   └── roadmap.md
└── archive/
    └── README.md
```

La v3.37 reste volontairement monolithique pour préserver une base jouable. Le découpage en modules viendra progressivement, avec un test navigateur après chaque étape.

## Statut

Prototype en développement. La priorité actuelle est de stabiliser le rendu vectoriel et le feeling de pousse avant toute refactorisation importante.
