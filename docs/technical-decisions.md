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


## v3.38 — Budget de rendu

- Le décor sol/surface statique est pré-rendu dans un canvas offscreen et recopié par tranche visible.
- Les fleurs matures sont baked dans un cache de surface ; seules les fleurs en éclosion restent animées individuellement.
- Les collisions utilisent une broad phase puis une seule requête consolidée par frame.
- Les sons de bruit réutilisent un AudioBuffer persistant.
- Les `shadowBlur` sont réservés aux feedbacks ponctuels.
- Le profiler est opt-in via `?perf=1` afin de ne pas coûter en production.


## v3.39 — Variantes d’obstacles

- Chaque famille d’obstacles peut déclarer un catalogue de variantes visuelles et satiriques.
- Au début de la génération du niveau, un sous-pool est tiré pour chaque famille concernée.
- Le spawn choisit ensuite une variante dans ce sous-pool, ce qui garde de la variété sans rendre le niveau visuellement incohérent.
- Les variantes ne modifient ni la collision ni la silhouette de lecture rapide ; elles enrichissent seulement le caractère de l’obstacle.
