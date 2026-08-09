# Checklist de test

## Lancement

- [ ] L'écran titre s'affiche.
- [ ] Un toucher ou clic lance la partie.
- [ ] Aucun écran noir après le panneau titre.
- [ ] Aucun message d'erreur JavaScript visible.

## Gameplay

- [ ] La pousse répond immédiatement au doigt ou à la souris.
- [ ] Le scrolling vertical reste fluide.
- [ ] Les collisions correspondent aux silhouettes.
- [ ] Les frôlements produisent des ÉcoCrédits™ sans faux positif évident.
- [ ] Les zones toxiques diffuses ne scintillent pas et restent lisibles.
- [ ] Les limaces de lixiviat sont lisibles en mouvement.
- [ ] L'arrivée à la surface déclenche correctement l'éclosion.
- [ ] Le game over permet de recommencer.

## Affichage

- [ ] Le jeu respecte le ratio 9:16.
- [ ] Le HUD ne masque pas la zone de jeu utile.
- [ ] La terre et les déchets appartiennent visuellement au même monde.
- [ ] La transition vers la surface n'est pas brutale.

## Plateformes

- [ ] Firefox desktop.
- [ ] Chrome ou Brave desktop.
- [ ] Android Chrome ou Brave.
- [ ] Test tactile en orientation portrait.


## Performance v3.38

- Tester au moins 5 floraisons successives et vérifier l'absence de chute brutale à l'approche de la surface.
- Tester une run avec beaucoup de fleurs déjà accumulées.
- Vérifier que les fleurs matures persistent visuellement après les transitions.
- Ajouter `?perf=1` et relever FPS, update, render, soil, hazards et plant près de la surface.
- Vérifier les zones toxiques diffuses : lisibles sans bord dur, mais règle de contamination compréhensible.
- Vérifier que le son de frottement reste continu sans micro-freezes.
