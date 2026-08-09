# Changelog

## v3.39 - Obstacle Character Pass

- Ajoute une architecture de variantes par type d’obstacle, avec sous-pool tiré au début de chaque génération de niveau.
- Première vague de variantes satiriques pour le crâne de T-Rex, le smartphone cassé, le fût radioactif, la batterie et le sac poubelle.
- Les variantes enrichissent les obstacles sans changer leurs collisions ni leur silhouette de gameplay.

## v3.38 - Vector Performance Pass

- Restaure les zones toxiques sous forme de pollution diffuse, sans contour fermé ni scale animé.
- Met en cache le décor statique sol/surface dans un canvas offscreen.
- Bake les fleurs matures dans un canvas offscreen : le parterre persiste mais ne multiplie plus les drawcalls.
- Regroupe collision, frôlement, proximité caméra et lixiviat dans une seule requête de danger par frame.
- Ajoute une broad phase avant les calculs SDF et supprime plusieurs allocations temporaires de collision.
- Réutilise un buffer de bruit audio au lieu d'en reconstruire un à chaque frottement.
- Réduit les shadowBlur coûteux et cache le formatage des ÉcoCrédits™ du HUD.
- Ajoute un profiler optionnel via `?perf=1`.

Toutes les évolutions notables de Flower Power sont consignées ici.

## [3.37] - 2026-07-12

### Changé

- Retour à une direction sobre et vectorielle.
- Suppression de la dépendance aux sprites pixel-art.
- Conservation de la pousse procédurale et du gameplay hérité de la base v3.29.
- Obstacles, power-ups et fluid hazards rendus directement dans Canvas.

### Contexte

La piste Mega Drive / pixel-art a été explorée dans plusieurs Asset Labs, puis mise de côté car elle compliquait l'intégration, le scaling mobile et la cohérence visuelle générale.
