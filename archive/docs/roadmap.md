## Jalon courant — v3.43 Visual Cohesion Pass

Cohésion visuelle de la tige, du sous-sol, de la surface et des fleurs avec les sprites PNG authorés, sans modifier le gameplay validé de la v3.42.4.

# Roadmap

## Jalon actuel

### v3.42.1 Organic Shield & Reward Gate

- Valider sur smartphone que la membrane est immédiatement identifiable autour de la pointe.
- Vérifier qu’un choc brise le bouclier de façon spectaculaire sans entraîner une mort à la frame suivante.
- Vérifier que le bouclier protège les solides et le lixiviat mais pas l’exposition toxique prolongée.
- Tester la lisibilité des trois tiers de flyover : pollen → goutte/bouclier → spore.
- Confirmer que les flyovers continuent à rapporter des ÉcoCrédits™ sous power-up actif, mais qu’aucune Goutte/Spore supplémentaire n’apparaît.
- Confirmer que le pollen reste générable pendant un bouclier actif.
- Utiliser `?flydebug=1` pour régler les seuils si la distribution paraît trop généreuse ou trop radine.

## Étape suivante

### v3.43 Visual Cohesion Pass

Revoir tige, sous-sol, surface et fleurs pour les rapprocher du langage graphique des sprites authorés, sans figer la pousse procédurale.

## Après validation

Poursuivre la production des autres assets et variantes via l’éditeur, puis régler finement l’économie des flyovers et la rareté des récompenses.

## Refactorisation prudente

1. Extraire le CSS.
2. Extraire la configuration et les constantes.
3. Extraire les fonctions de rendu.
4. Extraire les entités et collisions.
5. Conserver une version jouable à chaque étape.
