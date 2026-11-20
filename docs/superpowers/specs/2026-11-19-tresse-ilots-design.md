# La tresse dans le jeu normal, îlots peuplés — design court (v5.17.0)

Date : 2026-11-19. Validé en conversation : la tresse est « complètement validée », « Tout d'un coup stp ! », « jamais plus d'une
tourelle par îlot ».

## Intention

La tresse (v5.15.0, spec 2026-11-19-tresse-design.md) quitte le Lab : chaque niveau tiré au hasard a ses deux chemins, A (sûr) et B
(plus étroit, plus payant). Les îlots — la terre entre A et B, d'un croisement au suivant — étaient toujours vides (mesuré : 100 % des
îlots, 40 à 85 px de large libre) ; ils deviennent des choix : des déchets dès le premier biome, puis, plus tard, une tourelle enfouie.

## Ce qu'on fait

1. **Tresse partout** (hors niveaux de boss, comme avant). `?lab` disparaît (il ne contiendrait plus rien) : paramètre, mention LAB,
   garde des records. Les réglages passent de `config-lab.js` (`FP.config.lab.braid`) à `config-braid.js` (`FP.config.braid`).
   La largeur de B ne change pas (« je me suis fait des frayeurs » : voulu).
2. **Îlots peuplés de déchets.** Le long de chaque îlot, tous les `islands.step` px, là où la largeur libre le permet, un déchet du
   biome est posé au milieu de l'espace libre, réduit si besoin (jusqu'à `islands.minScale`) pour tenir sans mordre A (marge des
   déchets comprise) ni B. Ces déchets s'ajoutent aux autres (le compte des autres ne change pas).
3. **Tourelle enfouie, au plus une par îlot.** À partir du deuxième biome, chaque îlot assez large reçoit une tourelle avec une chance
   par biome (`islands.turret.chance`), à l'endroit le plus large de l'îlot. Elle est un obstacle (la toucher tue), la spore la nettoie
   comme un déchet. Quand la pointe est à portée (`range` px) et la tourelle à l'écran, elle vise, se verrouille et tire une rafale,
   comme celles des boss (`boss.shot` : visée, verrouillage, rafale, écart), à `speed` px/s, puis attend `gap` s. Les tirs sont les
   impulsions dans la terre de la v5.16.0, arrêtés par les obstacles ; mêmes sons (bossAim, bossLock, bossShot).

## Non-objectifs

- A ne change pas. Rien ne change aux niveaux de boss.
- Pas de nouvel asset PixelLab : la tourelle est dessinée en code, comme celles des boss, enfouie (dôme de terre, trappe, canon).

## Appels de Claude

- Îlots et tourelles posés dans `world/islands.js` (tirage propre de la tresse, après B) ; vie des tourelles dans
  `play/island-turrets.js` ; dessin dans `render/island-turrets.js`.
- Réglages : `islands: { step: 70, minScale: .6, turret: { chance: [0, .35, .5, .6], r: 14, range: 300, speed: 320, gap: 3 } }`.
- Les empreintes « jeu normal intact » sont relevées à nouveau : la génération du jeu normal change exprès.
- Mesuré à l'implémentation : même réduits de moitié, les déchets (36 à 86 px) ne tenaient pas dans les îlots (15 à 55 px). B s'écarte
  donc plus de A (`spread` .3 → .42), et `minScale` est .6 (pas de déchets minuscules) : 60 à 95 % des îlots peuplés en 360–440 px.
- L'alternance forcée de B (A le long d'un bord) commence du côté le moins serré (un îlot de 28 px sinon).

## v5.17.1 (retour de jeu)

- Réduits, les déchets perdaient leur échelle (micro-ondes plus grands que des frigos) : plus de réduction, un îlot prend le premier de
  quelques déchets du biome qui tient à sa taille (`islands.tries`).
- `spread` .42 coûtait ~30 % des déchets du niveau : retour à .3 (choix de l'utilisateur). Les îlots trop étroits reçoivent une nappe à
  leur mesure, allongée (`islands.pool`), bord à `edgeK` × hazardRadius de A (contrôle exact du bord, sans la règle du centre des autres nappes).

## v5.17.2 (retours de jeu)

- « Permets que mes obstacles débordent de l'îlot, on est large » : un déchet d'îlot peut mordre `islands.bite` (.5) de la largeur
  garantie de A et de B (`FP.level.objectFits(world, o, bite)`). À .65, presque tous les îlots auraient un déchet, mais A deviendrait
  visiblement étroit : .5 retenu.
- « Qu'elles visent un peu en amont de la trajectoire » : au verrouillage, le point visé est la pointe + sa direction × sa vitesse ×
  (temps restant avant le tir + trajet du tir) × `turret.lead` (.8). Tourelles des îlots seulement ; celles des boss ne changent pas.
