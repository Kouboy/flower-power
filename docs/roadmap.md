# Roadmap

## Jalon actuel

### v3.38 Vector Performance Pass

- Restaurer les zones toxiques diffuses.
- Éliminer la chute de performances à l’approche de la surface.
- Mettre en cache le décor et le parterre mature.
- Consolider les requêtes collision / proximité / frôlement.
- Réduire les allocations audio et Canvas récurrentes.
- Mesurer sur mobile avec `?perf=1`.

## Prochain jalon

À décider après validation de la v3.38 sur Android. Ne pas ajouter de contenu tant que la surface n’est pas fluide avec un parterre dense.

## Ensuite

### Refactorisation prudente

1. Extraire le CSS.
2. Extraire la configuration et les constantes.
3. Extraire les fonctions de rendu.
4. Extraire les entités et collisions.
5. Conserver une version jouable à chaque étape.

### Publication

- Activer GitHub Pages après stabilisation.
- Ajouter une capture légère au README.
- Préparer une build mobile partageable sans installation.
