## v3.42.4 — Spore Reward Gate Fix

- La spore-bombe libère immédiatement le slot de power-up dès son explosion.
- Son animation d'explosion reste purement visuelle et ne bloque plus les récompenses de flyover suivantes.

## v3.42.3 — Shield Steering Fix
- Le bris du bouclier organique ne modifie plus le vecteur de direction de la pousse.
- La pointe recule légèrement hors du collider, mais conserve exactement l'intention de pilotage en cours.
- Si le doigt reste maintenu, le guide est recalé immédiatement sur la position du pointeur.

# Changelog

## v3.42.2 — Reward Gate Fix
- Un power-up raté ou simplement présent dans le monde ne bloque jamais les récompenses suivantes.
- Le verrou gameplay ne dépend plus que du bouclier organique ou de la spore réellement actifs.
- Spawn des récompenses adaptatif près de la surface pour éviter une zone morte sans positions valides.
- `?flydebug=1` indique désormais si le gate est libre lorsqu'un bonus raté disparaît.

## v3.42.1 — Organic Shield & Reward Gate
- la Goutte d’eau ne stabilise plus les contrôles : elle crée un bouclier organique visible autour de la pointe ;
- le bouclier reste actif sans timer et absorbe une collision solide ou un contact direct avec le lixiviat, puis vole en éclats ;
- une courte grâce et un léger recul évitent la mort immédiate dans le même collider après la rupture ;
- le bouclier ne protège pas d’une exposition prolongée aux zones toxiques diffuses ;
- un seul power-up gameplay peut être actif : pendant cet état, les flyovers continuent de scorer mais ne font pas apparaître de nouveau power-up gameplay ;
- aucune récompense bloquée n’est mise en attente ;
- le pollen/fleur est explicitement hors slot gameplay et peut apparaître même sous bouclier ou pendant l’effet d’une spore ;
- les tiers de flyover sont désormais : pollen pour un passage qualifié court, goutte/bouclier pour un passage soutenu, spore pour un passage très long et risqué ;
- nouveaux feedbacks visuels et sonores de membrane organique et de rupture.

## v3.42 — Flyover PowerUps Prototype
- aucun power-up n'est généré avec le niveau ;
- les solides suivent maintenant un flyover directionnel (durée, proximité, progression réelle au-dessus de l'obstacle) ;
- un flyover qualifié peut libérer une Source claire ; un passage long et très risqué peut libérer une Spore ;
- la récompense apparaît devant la pousse mais volontairement décalée de sa trajectoire, après recherche d'une position libre ;
- matérialisation par filament entre l'obstacle et la récompense ;
- un obstacle ne libère au maximum qu'une récompense ;
- `?flydebug=1` affiche les mesures de qualification pour le réglage ;
- le voile des zones toxiques est rendu après les sprites, y compris les nouveaux power-ups.

## v3.41.3 - Toxic Overlay Pass
- Les obstacles solides ne peuvent plus se chevaucher visuellement.
- Ajout d'une empreinte visuelle distincte du polygone de collision gameplay.
- Chaque obstacle possède une marge de respiration ; les PNG authorés utilisent 7 unités par défaut, le T-Rex signature 12.
- Le générateur préfère réduire localement la densité plutôt que forcer un placement qui overlap.
- Le T-Rex signature est placé avant les obstacles courants afin que son grand set-piece réserve son espace.
- Zones toxiques et lixiviat restent libres de passer derrière/devant les obstacles : ils ne participent pas à cette règle d'espacement.
- Aucun changement au principe prévu : les futurs power-ups seront engendrés uniquement par les flyovers et leur valeur dépendra de la prise de risque.

# Changelog

## v3.41.1 - Asset Ingestion Test

- Intègre 11 familles de déchets sous forme de PNG transparents authorés avec l’Asset Editor.
- Utilise les polygones de collision, pivots, tailles monde, règles de miroir et rayons de graze exportés dans les JSON.
- Conserve le T-Rex « NON AUX ESSAIS NUCLÉAIRES » comme asset signature rare, 0 ou 1 fois par partie ; `?talisman=1` le force pour les tests.
- Conserve les exports PNG + JSON intacts dans `assets/obstacles/` et génère un `manifest.js` compatible avec l’ouverture directe de `index.html`.
- Garde un fallback vectoriel pour les familles non encore authorées ou en cas d’échec de chargement d’un PNG.
- Supprime la génération de power-ups avec le niveau : leur futur spawn sera exclusivement déclenché par les flyovers et relatif à la prise de risque.

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
