# Game design

## Pitch

Une graine tente de rejoindre la surface dans une terre saturée de pollution. Le joueur guide sa croissance en temps réel, évite les déchets létaux et exploite les frôlements risqués pour générer des ÉcoCrédits™.

## Piliers

1. **Pousse organique** : la trajectoire doit sembler vivante, souple et satisfaisante.
2. **Lisibilité mobile** : chaque danger doit être compris immédiatement sur un écran vertical.
3. **Tension de l'évitement** : le joueur doit pouvoir frôler, prendre des risques et comprendre ses erreurs.
4. **Satire écologique** : l'humour vient des ÉcoCrédits™, des objets abandonnés et du grotesque toxique.
5. **Éclosion** : atteindre la surface doit produire un contraste net avec la traversée souterraine.

## Dangers

- Déchets solides abandonnés.
- Poches de poison enfouies.
- Limaces de lixiviat mobiles.
- Flaques et coulures toxiques, à réévaluer séparément.

## Récompenses et systèmes

- ÉcoCrédits™ pour les frôlements prolongés.
- Aucun power-up n’est pré-généré : les récompenses naissent uniquement d’un flyover réussi et leur nature dépend principalement de la durée, pondérée par la proximité et la progression autour de l’obstacle.
- **Pollen/fleur** : récompense de score différée, ajoute une fleur à l’arrivée et ne modifie pas le gameplay immédiat.
- **Goutte d’eau** : crée un bouclier organique visible, à usage unique, qui absorbe la prochaine collision directe.
- **Spore** : nettoyage ponctuel de zone pour les flyovers les plus engagés.
- Un seul power-up gameplay peut être actif à la fois. Tant qu’il agit, aucun autre power-up gameplay ne peut apparaître ; le pollen/fleur est la seule exception.
- Fleur produite à la surface.

## Hors-scope actuel

- Retour au pixel-art.
- Refonte complète du gameplay.
- Framework ou moteur externe.


### Lisibilité des obstacles
Les obstacles solides ne se chevauchent jamais visuellement. Leur collision peut rester plus petite que leur illustration afin d'autoriser des flyovers généreux, mais la génération réserve l'espace graphique complet de chaque asset. La lisibilité prime sur le quota de densité.
