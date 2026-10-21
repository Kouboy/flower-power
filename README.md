# Flower Power

**Flower Power** est un jeu HTML Canvas vertical en 9:16. Le joueur guide une graine qui pousse vers la surface à travers une terre polluée, en évitant les déchets, les zones toxiques diffuses et les limaces de lixiviat. Le score secondaire absurde s'appelle **ÉcoCrédits™**.

## Statut

**v4.1.0 — rendu pixel.** Le jeu complet de la v3.43.16, redessiné en pixel art façon Mega Drive :
- un ciel de crépuscule pollué et une terre en strates ;
- un héros à visage, dont l'expression raconte le danger ;
- un parterre de fleurs qui gardent ce visage.

La parité avec la v3 est suivie dans `docs/parite-v3.md`, la direction artistique est décrite dans `docs/design.md`.

La v3.43.16 reste jouable pour comparer : `archive/v3.43.16/index.html`.

## Lancer

Aucune installation. Ouvrir `index.html` par double-clic dans un navigateur récent (Edge, Chrome, Firefox).

## Contrôles

- Maintenir le clic / le doigt : orienter la pousse.
- Espace ou Entrée : démarrer une partie, lancer la pousse suivante.
- Frôler les obstacles sans les toucher : générer des ÉcoCrédits™.
- Atteindre la surface : faire éclore une fleur.

## Paramètres d'URL

- `?seed=N` : génération reproductible (entier de 0 à 4 294 967 295).
- `?freecam=1` : caméra libre (molette, flèches, glisser, Début/Fin) pour inspecter un niveau.
- `?perf=1` : profileur (FPS, coût update / render, tranches de dessin).
- `?flydebug=1` : bandeau qui explique chaque décision de flyover.

## Développer

- Lire `AGENTS.md` (contrat d'itération) puis `docs/architecture.md`.
- Tests : ouvrir `dev/check.html` (tout doit être vert), ou `node dev/run-checks.js`. Temps de génération : `node dev/bench-level.js`.
- Gamefeel : comparer le ressenti avec `archive/v3.43.16/index.html` à taille de fenêtre identique (une même graine ne donne pas le même niveau dans les deux versions).

## Organisation

```text
flower-power/
├── index.html, style.css
├── AGENTS.md, README.md, CHANGELOG.md
├── src/          code du jeu (core, world, play, render, audio, ui, debug)
├── assets/       PNG + JSON authorés + manifest.js
├── dev/          banc d'assertions
├── docs/         design.md, architecture.md, specs et plans
└── archive/      v3.43.16 jouable + docs v3
```
