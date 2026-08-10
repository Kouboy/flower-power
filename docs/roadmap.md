# Roadmap

## Jalon actuel

### v3.42 Flyover PowerUps Prototype

- Vérifier que le flyover exige bien une vraie progression autour puis au-dessus de l’obstacle.
- Régler les seuils de durée/proximité afin qu’un simple frôlement rapporte des ÉcoCrédits™ sans forcément produire de power-up.
- Valider le placement prédictif : devant la pousse, latéralement décalé, accessible mais pas offert.
- Tester la lisibilité de la matérialisation obstacle → power-up sur smartphone.
- Vérifier que la Source apparaît sur un beau flyover et que la Spore reste une récompense nettement plus rare.
- Utiliser `?flydebug=1` si les seuils doivent être diagnostiqués.

## Étape suivante

Une fois la boucle agréable, régler précisément les tiers de récompense et décider s’il faut réintroduire une récompense intermédiaire (pollen/ambre) ou rester sur un système volontairement compact.

## Après validation

Produire les autres familles d'assets avec l'éditeur, puis enrichir les pools et variantes sans revenir au système de stickers procéduraux.

## Refactorisation prudente

1. Extraire le CSS.
2. Extraire la configuration et les constantes.
3. Extraire les fonctions de rendu.
4. Extraire les entités et collisions.
5. Conserver une version jouable à chaque étape.
