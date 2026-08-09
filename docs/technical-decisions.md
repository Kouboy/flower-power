# Décisions techniques

## Base

- HTML, CSS et JavaScript natifs.
- Canvas 2D.
- Format vertical mobile 9:16.
- Prototype autonome dans un seul `index.html` pour la v3.37.

## Rendu

- Direction vectorielle procédurale.
- Pas de sprites PNG pour le gameplay courant.
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
