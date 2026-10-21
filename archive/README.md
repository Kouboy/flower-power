# Archives

Ce dossier ne contient que les jalons réellement utiles à conserver dans Git.

## v3.43.16 — référence de gamefeel

`v3.43.16/index.html` est le dernier prototype monolithique, jouable tel quel. Il sert de référence pour comparer le gamefeel pendant la reconstruction v4.

- Ouvrir `v3.43.16/index.html` par double-clic. Les assets sont chargés depuis la racine du dépôt (`<base href="../../">`).
- `?seed=N` (entier ≥ 0) rend la génération reproductible : par exemple `v3.43.16/index.html?seed=1234`. La disposition dépend aussi de la taille de la fenêtre : comparer à taille de fenêtre identique.
- `?perf=1` et `?flydebug=1` fonctionnent comme avant.

## Docs v3

`docs/` contient les documents de conception v3 (game design, décisions techniques, roadmap, checklists) et `banque-de-gags.js`, le catalogue des variantes satiriques v3.40 à réutiliser pour les futurs PNG.

## Hors Git

Les gros ZIP, captures, planches pixel-art et Asset Labs restent sur Google Drive afin de ne pas alourdir l'historique du dépôt.
