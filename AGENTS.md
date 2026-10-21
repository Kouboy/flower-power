# Contrat d'itération — Flower Power v4

À lire par toute IA (Claude Code, ChatGPT…) avant de modifier ce dépôt. Pour ChatGPT, coller ce fichier en début de conversation.

Lire `docs/architecture.md` avant toute modification.

## Les 6 règles

1. Chaque demande nomme les fichiers modifiables (un ou deux). L'IA renvoie ces fichiers en entier, et rien d'autre.
2. `index.html` n'est modifié que pour ajouter une ligne `<script>`.
3. Réglage → `config.js` uniquement. Visuel → `render/*` uniquement, jamais `play/*`.
4. Un fichier > 400 lignes est découpé d'abord, dans une étape séparée.
5. Pas de code mort « au cas où » : ce qui est remplacé est supprimé.
6. Une demande = un ou plusieurs commits ciblés ; une entrée de CHANGELOG par version ; `dev/check.html` vert et une partie jouée avant de valider.

## Vérifier

- `dev/check.html` (double-clic) doit afficher tout vert. En ligne de commande : `node dev/run-checks.js`.
- Comparer le ressenti avec `archive/v3.43.16/index.html`, à taille de fenêtre identique (une même graine ne donne pas le même niveau dans les deux versions).
