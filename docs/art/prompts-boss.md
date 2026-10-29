# Prompts des images de boss (v4.12.0)

Rien n'est généré : ce document ne contient que du texte. Aucune image ne doit être créée sans le feu vert explicite de l'utilisateur.

## Modèle et coût

- Modèle des images existantes (`docs/art/spritecook-assets.json`) : **Nano Banana 2.1, 12 crédits par image**, fond cyan uni à détourer (comme les obstacles ; la planche de référence `docs/art/reference-crepuscule.png` sert d'image de style).
- 4 images par boss (3 morceaux + 1 « détruit ») : **48 crédits par boss, 192 crédits pour les 4**.
- Le compte a 4 crédits : il faut le recharger d'environ **190 crédits** (de quoi générer le tout une fois, sans reprise ; prévoir une marge pour les reprises).

## Découpage attendu par le moteur

Le boss est une pile de 4 tronçons (du bas vers le haut : 0, 1, 2, 3), accrochés tour à tour à un flanc de l'écran. Le côté du tronçon 0 est tiré par la graine du niveau, puis ça alterne : **chaque image doit donc pouvoir être retournée horizontalement** (dessiner chaque morceau accroché au **bord gauche** de l'image, sa face tournée vers la droite ; le moteur le miroite pour les tronçons à droite).

Dimensions du moteur (monde de 360 de large, un pixel d'art = 2 px d'écran) : un tronçon fait **45 % de la largeur** (162 px) sur environ **298 px de haut** (rapport 0,54 ; la hauteur varie un peu avec le niveau, par le rayon du couloir). Les images sont donc à demander en **260 px de large sur environ 478 px de haut** (même rapport) et seront réduites à la taille du monde. Fond cyan uni, pas d'ombre portée au sol, aucun élément hors du cadre.

Trois morceaux par boss, plus l'image détruite :

| Image | Sert pour | Remarque |
|---|---|---|
| `bas` | tronçon 0 (le plus bas) | le plus massif, pieds ou socle au bord bas |
| `milieu` | tronçons 1 et 2 (un sur deux est miroité par le moteur) | haut et bas raccordables à un voisin, sans motif qui trahit le retournement |
| `haut` | tronçon 3 (le plus haut) | cheminée, tête ou couronnement au bord haut |
| `detruit` | un tronçon dont le point faible est percé | même silhouette que `milieu`, éventré au point faible, fumée, fûts renversés |

Repères communs à **chaque morceau** (en fraction de l'image, l'origine en haut à gauche, le morceau étant accroché au bord gauche, face à droite) :

- **Face côté couloir** : le bord droit du morceau (x = 1,00). Le couloir sûr longe cette face.
- **Point faible** : au milieu de la hauteur de la face, **x = 1,00, y = 0,50**. Le moteur dessine le disque (rayon 14 px d'art, soit 0,09 de la largeur du morceau) ; l'image doit prévoir à cet endroit une plaque, une vanne, un brûleur ou une barre bien nettes, claire sur fond sombre, sans rien de lumineux ailleurs qui la concurrence. Il déborde de 12 px d'art hors de la face : la plaque peut être à cheval sur le bord droit.
- **Monture de la défense** : sur la même face, **x = 1,00, y = 0,25** (un quart depuis le haut du morceau). Prévoir là une bride, un orifice, une rotule ou une gaine (piston, jet, bras selon le boss) ; la défense est dessinée par le code et part de ce point vers le couloir (portée 50 % de la largeur libre).
- Moitié haute entre y = 0,10 et 0,40 de la face : ne rien dessiner qui dépasse du bord droit (la défense y passe). Pas de pièce saillante au-delà de la face, sauf la plaque du point faible.

Défenses par boss (`FP.config.boss.pairs`, tronçons 0, 1, 2, 3 : paire répétée dans l'ordre) :

| Boss | Tronçons 0 et 2 | Tronçons 1 et 3 |
|---|---|---|
| Bétonneuse | piston | jet |
| Raffinerie | jet | bras |
| Incinérateur | bras | jet |
| Réacteur | piston | bras |

## Style commun (à coller en tête de chaque prompt)

> Pixel art, 16-bit adventure game asset, dithered shading, limited palette, hard black outline, side view, the machine is a vertical wall section attached to the LEFT edge of the image and facing right, flat solid cyan (#00FFFF) background, no ground, no shadow, no text, no characters. Franchement toxic, satirical corporate-greenwashing industrial horror: glowing slime drips and runs down the metal, flaking rust streaks, leaking barrels that ooze, smoke and steam seeping from seams, rivets, warning stripes half peeled. Dusk-polluted palette matching the style reference. Canvas 260 x 478 px.

Chaque prompt ci-dessous s'ajoute à ce bloc ; réutiliser `reference-crepuscule.png` comme référence de style.

## 1. Friche urbaine : LA BÉTONNEUSE DU GRAND PROJET (piston, jet)

Une bétonneuse géante empilée en tronçons : tambours rainurés, goulottes de béton gris, panneaux de chantier « GRAND PROJET » écaillés, béton frais verdâtre qui coule et durcit en stalactites.

- `bas` : `Giant concrete mixer, bottom section: massive riveted steel base on rusty caterpillar skirts, a cracked drum cradle, grey concrete sludge with sickly green glow dripping from a chute, leaking barrels at the foot, hazard stripes. On the right face at mid-height a round dull valve plate (the weak point), a quarter of the way down a thick flange with a hydraulic piston socket.`
- `milieu` : `Giant concrete mixer, middle section: spiral-ribbed drum segment with crusted concrete drips, rusted bolted plates, pipes oozing glowing green sludge, steam from seams. Mid-height on the right face a round valve plate (weak point); a quarter of the way down a flange with a nozzle socket. Top and bottom edges flat so it stacks.`
- `haut` : `Giant concrete mixer, top section: drum hatch and a short stack leaking dark smoke, a faded construction-project sign peeling, glowing slime running from the hatch, rust. Mid-height right face a valve plate (weak point); a quarter of the way down a flange. Flat bottom edge so it stacks.`
- `detruit` : `Giant concrete mixer, middle section destroyed: the right face torn open at mid-height, the valve blown out, twisted steel, spilled barrels, thick smoke, gooey green puddle slumping down, same silhouette and size as an intact middle section.`

## 2. Zone industrielle : RAFFINERIE ÉCO-RESPONSABLE™ (jet, bras)

Raffinerie en colonnes de distillation : cuves, tuyauteries en nœuds, passerelles, torchères, fûts qui suintent un goudron irisé, logo feuille « ÉCO » écaillé.

- `bas` : `Oil refinery, bottom section: huge riveted tank base with a peeling green leaf eco-logo, iridescent tar leaking from valves, stacked oozing barrels, rusted catwalk, oily rainbow puddle sheen. Mid-height on the right face a large round red valve wheel (weak point); a quarter of the way down a pipe flange with a nozzle.`
- `milieu` : `Oil refinery, middle section: distillation column ring with tangled pipes, glowing amber drips, corroded gauges, vapor leaking from joints, a pivot bracket for an arm. Mid-height on the right face a round valve (weak point); a quarter of the way down a socket. Flat top and bottom edges.`
- `haut` : `Oil refinery, top section: column head with a flare stack burning toxic orange, black smoke, rusty ladder, peeling eco sign, tar running down. Mid-height on the right face a valve (weak point); a quarter of the way down a flange. Flat bottom edge.`
- `detruit` : `Oil refinery, middle section destroyed: ruptured column wall at mid-height, burst valve, pipes hanging, leaking barrels on their side, black smoke, tar puddle, same silhouette as an intact middle section.`

## 3. Décharge : L'INCINÉRATEUR À ÉNERGIE VERTE (bras, jet)

Incinérateur de déchets : fours à portes de fonte, cheminées, bennes, montagne d'ordures fondue sur les flancs, jus de décharge fluo, fumées vertes.

- `bas` : `Waste incinerator, bottom section: cast-iron furnace doors with glowing embers, melted trash fused to the sides, dripping fluorescent leachate, burnt barrels, heavy soot. Mid-height on the right face a round burner grate (weak point); a quarter of the way down a pivot socket for a swinging arm.`
- `milieu` : `Waste incinerator, middle section: riveted furnace body with soot streaks, a green "ENERGIE VERTE" plaque flaking off, oozing barrels and bags stuck in the wall, smoke from cracks. Mid-height on the right face a round burner grate (weak point); a quarter of the way down a nozzle socket. Flat top and bottom.`
- `haut` : `Waste incinerator, top section: tall chimney crown spewing thick green-grey smoke, ash-covered ladder, glowing slime dripping, rust. Mid-height on the right face a burner grate (weak point); a quarter of the way down a socket. Flat bottom.`
- `detruit` : `Waste incinerator, middle section destroyed: furnace wall burst open at mid-height, burner blown out, glowing embers and melted trash spilling, thick smoke, same silhouette as an intact middle section.`

## 4. Site nucléaire : LE RÉACTEUR « NEUTRE EN CARBONE » (piston, bras)

Réacteur en tronçons de béton et d'acier : tours de refroidissement, barres de contrôle, fûts jaunes qui fuient une lueur verte, trèfle de radiation décoloré, fissures luisantes.

- `bas` : `Nuclear reactor, bottom section: thick cracked concrete containment base, faded radiation trefoil, yellow barrels leaking glowing green ooze, rust, warning stripes. Mid-height on the right face a round control-rod port (weak point); a quarter of the way down a heavy flange with a piston socket.`
- `milieu` : `Nuclear reactor, middle section: steel and concrete ring with luminous green cracks, corroded pipes dripping glow, steam from seams, a swing-arm pivot bracket. Mid-height on the right face a control-rod port (weak point); a quarter of the way down a socket. Flat top and bottom.`
- `haut` : `Nuclear reactor, top section: cooling tower crown with pale green vapor, a "NEUTRE EN CARBONE" plate peeling off, glowing slime running down, rust. Mid-height on the right face a control-rod port (weak point); a quarter of the way down a flange. Flat bottom.`
- `detruit` : `Nuclear reactor, middle section destroyed: concrete ring burst at mid-height, control rod snapped, green glow and smoke pouring out, fallen yellow barrels, same silhouette as an intact middle section.`

## Intégration future (non faite)

Remplacer le dessin en blocs de `render/boss.js` par `FP.sprites.get('boss-<id>-<morceau>')`, miroité selon `segment.side`, ancré sur la boîte `[x0, x1] × [y0, y1]` du tronçon (`world.bossLevel.segments`) ; le morceau `detruit` remplace le tronçon quand `state.bossFight.pierced[i]` est vrai. Le point faible (`weak[i]`) et la monture (`defenses[i]`) restent dessinés par le code aux fractions données plus haut.
