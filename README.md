# Flower Power

**Flower Power** est un jeu HTML Canvas vertical en 9:16. Le joueur guide une graine qui pousse vers la surface à travers une terre polluée, en évitant les déchets, les zones toxiques diffuses et les limaces de lixiviat. Le score secondaire absurde s'appelle **ÉcoCrédits™**.

## Statut

**v4.0.0 en reconstruction — étape 5/7 (flyover et power-ups) : jouable.** La pousse se pilote, évite obstacles, nappes toxiques et limaces ; frôler rapporte des ÉcoCrédits™, et contourner un obstacle en montant fait naître pollen, goutte-bouclier ou spore. Éclosion et fleurs à l'étape 6, son et particules à l'étape 7. Le gameplay revient étape par étape (voir `docs/superpowers/specs/2026-10-20-refonte-v4-design.md`, §11).

La dernière version jouable complète est la v3.43.16 : `archive/v3.43.16/index.html`.

## Lancer

Aucune installation. Ouvrir `index.html` par double-clic dans un navigateur récent (Edge, Chrome, Firefox).

## Contrôles

- Maintenir le clic / le doigt : orienter la pousse.
- Frôler les obstacles sans les toucher : générer des ÉcoCrédits™.
- Atteindre la surface : faire éclore une fleur.

## Paramètres d'URL

- `?seed=N` : génération reproductible (entier ≥ 0).
- `?freecam=1` : caméra libre (molette, flèches, glisser, Début/Fin) pour inspecter un niveau.
- `?perf=1` : profiler (FPS, coût update/render). *(revient à l'étape 7)*
- `?flydebug=1` : réglage des seuils de flyover. *(revient à l'étape 7)*

## Développer

- Lire `AGENTS.md` (contrat d'itération) puis `docs/architecture.md`.
- Tests : ouvrir `dev/check.html` (tout doit être vert), ou `node dev/run-checks.js`.
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
