# Roadmap

## Jalon actuel

### v3.41.1 Asset Ingestion Test

- Valider le chargement des PNG authorés sur desktop et smartphone.
- Vérifier que `worldWidth` donne la bonne échelle en modes A et B.
- Tester les polygones de collision en situation réelle.
- Vérifier que le rayon de graze exporté correspond au flyover attendu.
- Évaluer le coût des collisions détaillées, notamment le T-Rex signature.
- Confirmer qu'aucun texte orienté n'est retourné lorsque `mirrorSafe=false`.

## Étape suivante

Prototyper le système central de récompense : `flyover -> prise de risque -> spawn dynamique de power-up`. Aucun power-up ne doit être pré-généré. Commencer avec un seul type de récompense avant d'équilibrer plusieurs tiers.

## Après validation

Produire les autres familles d'assets avec l'éditeur, puis enrichir les pools et variantes sans revenir au système de stickers procéduraux.

## Refactorisation prudente

1. Extraire le CSS.
2. Extraire la configuration et les constantes.
3. Extraire les fonctions de rendu.
4. Extraire les entités et collisions.
5. Conserver une version jouable à chaque étape.
