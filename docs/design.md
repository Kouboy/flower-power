# Game design — v4

Ce que le jeu **doit** faire. Les docs v3 complètes sont dans `archive/docs/`.

## Pitch

Une graine tente de rejoindre la surface dans une terre saturée de pollution. Le joueur guide sa croissance en temps réel, évite les déchets létaux et exploite les frôlements risqués pour générer des ÉcoCrédits™.

## Piliers

1. **Pousse organique** : la trajectoire doit sembler vivante, souple et satisfaisante.
2. **Lisibilité** : chaque danger doit être compris immédiatement sur un écran vertical 9:16.
3. **Tension de l'évitement** : le joueur peut frôler, prendre des risques et comprendre ses erreurs.
4. **Satire écologique** : l'humour vient des ÉcoCrédits™, des objets abandonnés et du grotesque toxique — portée par les PNG authorés.
5. **Éclosion** : atteindre la surface produit un contraste net avec la traversée souterraine.

## Dangers

- **Déchets solides** : 11 familles PNG authorées (server, nuclear, tire, sarcophagus, drone, solar, battery, cone, trashbag, extinguisher, microwave) + le T-Rex signature « NON AUX ESSAIS NUCLÉAIRES » (au plus une apparition par partie). Collision = polygone authoré. Contact = rupture.
- **Zones toxiques diffuses** : exposition continue qui dévie la croissance ; le bouclier ne les bloque pas.
- **Limaces de lixiviat** : mobiles ; contact = rupture.

Les familles sans PNG reviendront une à une avec leurs PNG, via l'Asset Editor.

### Placement

- Les solides ne se chevauchent jamais visuellement (empreinte visuelle + marge, test SAT).
- La densité est une cible, pas un quota : après plusieurs essais, l'obstacle est abandonné.
- Un chemin sûr existe toujours.
- Toxiques et lixiviat peuvent recouvrir les objets.

## Frôlement et flyover

- Frôler un solide sans le toucher (bande de graze du JSON authoré) rapporte des ÉcoCrédits™, avec combo.
- Un **flyover qualifié** exige une progression ascendante réelle autour puis au-dessus de l'obstacle ; stationner dans la zone ne suffit pas.
- La récompense dépend surtout de la durée utile, pondérée par la proximité et la progression :
  - **Pollen** (court) : bonus de score différé, une fleur de plus à l'arrivée. Hors slot.
  - **Goutte** (soutenu) : bouclier organique à usage unique, absorbe la prochaine collision avec un solide ou le lixiviat. Le bris ne modifie pas la direction de pilotage.
  - **Spore** (long + risqué) : nettoyage ponctuel de zone ; libère le slot dès l'explosion.
- **Un seul power-up gameplay actif** (goutte ou spore). Pendant ce temps, aucune autre goutte/spore n'apparaît (rien n'est mis en file) ; le pollen reste possible.
- Le spawn est prédictif : devant la pointe, décalé latéralement, rejeté s'il tombe dans un danger. Une récompense ratée disparaît derrière la pointe.

## Surface

Atteindre la surface fait éclore une fleur. Trois graines (réserves) par partie. Le record est sauvegardé localement.

## Hors périmètre v4.0

Portes béton/tuyau, bonus `amber`, autocollants satiriques procéduraux, bascule d'échelle A/B (le cadrage B est retenu).
