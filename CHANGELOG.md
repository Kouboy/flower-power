# Changelog

## v3.41 - Visual Slice

- Vertical slice sur six familles : smartphone, batterie, fût nucléaire, drone, sac poubelle et T-Rex.
- Remplace le principe « asset + sticker » par des morphologies et détails intégrés : écrans actifs, coque ouverte, cellules visibles, réparation, nid, caméra pendante, déchets inclus, pousses prisonnières, mise en scène muséale, etc.
- Ajoute le T-Rex talisman « NON AUX ESSAIS NUCLÉAIRES » comme rencontre rare : 0 ou 1 fois par partie, jamais miroir. `?talisman=1` force sa présence pour les tests.
- Supprime les ombres portées des obstacles, power-ups et limaces de lixiviat du sous-sol.
- Ajoute trois morphologies de limaces de lixiviat, dont une avec fragments de déchets incorporés.
- Redessine la source d'eau comme poche organique prise entre des racines.
- Ajoute un test A/B depuis l'écran titre : A = cadrage actuel ; B = zoom +18 %, pousse -12 % et densité solide légèrement réduite.
- Le mode B réduit aussi l'amplitude du zoom de frôlement pour éviter un cadrage excessif.

## v3.40 - Full Obstacle Character Pass

- Étend le système de variantes à toutes les familles d’obstacles solides, hors zones toxiques et lixiviat.
- Tire un sous-pool de variantes au début de chaque génération de niveau puis les distribue en alternance.
- Désactive automatiquement le miroir pour toute variante comportant du texte lisible.
- Ajoute des micro-récits satiriques : greenwashing, compensation, techno-solutionnisme, labels absurdes, audits, apps éco-responsables, signalétique réglementaire et branding "vert".
- Enrichit chaque obstacle avec 1 détail satirique principal et plusieurs détails secondaires (QR fictifs, sceaux, fissures, rubalise, jauges, corrosion, leds, étiquettes, marquages).
- Conserve les collisions et silhouettes de gameplay de la v3.38.
- Les libellés sont pré-rastérisés dans de petits canvases offscreen afin de limiter le coût de `fillText` en jeu.

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
