# Décors des milieux — design (v4.11.0)

Maquettes validées : `docs/art/maquette-decors.html` + `maquette-decors.js` (variantes retenues : friche A, industrie B,
décharge B, nucléaire B). Spec parente : `docs/superpowers/specs/2026-10-27-milieux-design.md`.

## But

Chaque site se reconnaît au premier coup d'œil : son ciel (astre, météo), son horizon, ses accessoires sur la pelouse et
son sous-sol. Aujourd'hui (v4.10) les milieux ne diffèrent que par leurs couleurs ; tous ont le même horizon d'usines.

## Ce qu'on voit, par milieu (variante retenue)

| Milieu | Ciel | Horizon | Surface | Sous-sol |
|---|---|---|---|---|
| Friche (A) | crépuscule actuel, soleil voilé, smog qui dérive | barres d'immeubles dont des fenêtres s'allument et s'éteignent, grue | palissade taguée, caddie renversé, plots de chantier | briques, gravats, canalisation, câble |
| Industrie (B) | smog jaune soufre, brume sur l'horizon, gros panaches lents | raffinerie (tours cerclées), torchère qui vacille, convoyeur qui monte des caisses, panaches qui montent | pile de palettes, fûts rouillés, rails | conduites rouillées à joints, poches d'huile **sourdes** (reflet qui luit de temps en temps), scories |
| Décharge (B) | gris-vert, poussière sur l'horizon, mouettes qui tournent | une montagne d'ordures énorme mouchetée de déchets, grue à grappin qui se balance, fumée de brûlage | sacs poubelle, pneus, vieux frigo à la porte entrouverte | couches de déchets compactés (canettes, bouteilles, sacs), suintements qui gouttent |
| Nucléaire (B) | nuit verdâtre, étoiles qui scintillent, grosse lune verte, aurore verte épaisse | une tour de refroidissement géante qui fume, clôture barbelée, trèfle radioactif | fûts jaunes au trèfle, panneaux de danger, herbe mutante dont les pointes luisent | galerie de béton, fûts enterrés qui fuient, cailloux qui luisent |

Les dessins de la maquette font foi (formes, couleurs, animations). L'herbe mutante et les fuites luisent en **vert d'eau**
(`#3ab88a`, `#5ad0a0`, `#8af0c0`), distinct du vert de la pousse ; aucune couleur de décor n'approche le violet des dangers.

## Architecture

- Un fichier par milieu : `src/render/decor-friche.js`, `decor-industrie.js`, `decor-decharge.js`, `decor-nucleaire.js`,
  qui s'enregistrent dans `FP.decor[id]` avec le même contrat (tous les dessins en pixels d'art, via `FP.px`) :
  - `skyStatic(g, w, h, rnd)` — astre, brume ; peint une fois dans le cache du ciel (fond) ;
  - `back(g, w, h, oy, t)` — ciel animé derrière l'horizon (nuages, aurore, étoiles qui scintillent) ;
  - `horizon(g, w, h, rnd)` — horizon fixe ; peint une fois dans le cache de premier plan du ciel ;
  - `front(g, w, h, oy, t)` — animations de l'horizon (fumées, torchère, enseigne, fenêtres, grappin, mouettes) ;
  - `surface(g, w, y, rnd)` — accessoires posés sur la pelouse (y = haut de la pelouse) ; peints dans le cache de la terre ;
  - `under(g, w, top, bottom, rnd)` — décor fixe du sous-sol ; peint dans le cache de la terre, après le grain et les
    détails existants ;
  - `glow(g, w, top, oy, viewH, t, rnd)` — petites animations du sous-sol et de la surface (reflets d'huile, gouttes,
    fuites, herbe qui luit), seulement dans la tranche visible.
  - `palette` — toutes les teintes du décor (pour le test des dangers).
- `render/sky.js` : deux caches (fond = bandes + `skyStatic` ; premier plan = `horizon`) ; à chaque image : fond, `back`,
  premier plan, `front`. Les usines et cheminées actuelles disparaissent (la friche A les remplace par ses immeubles).
- `render/soil.js` : `surface` et `under` peints dans le cache existant ; `glow` à chaque image sur la tranche visible.
- **Taille d'écran** : la hauteur du ciel varie selon le téléphone. L'horizon se pose sur le bas du ciel, les hauteurs des
  silhouettes sont bornées par la hauteur du ciel, l'astre et la météo se placent en proportion ; sur un écran plus large
  que 220 pixels d'art, l'horizon se répète ou s'espace (pas d'étirement).
- **Chaque niveau un peu différent** : positions des accessoires et du décor enterré tirées d'un générateur initialisé par
  la graine du niveau déjà utilisée par la terre (`mix(seed, level, lawnVariant)`) ; le monde n'est pas consulté au-delà
  de ce que le rendu lit déjà (`world.milieu`, `world.width`, `world.height`, `world.surfaceY`).
- **Sous-sol sur toute la profondeur** : le décor enterré se répartit sur toute la hauteur du niveau, à une densité
  modérée (de l'ordre d'un élément par écran), plus dense près de la surface ; les éléments longs (canalisations,
  conduites, galeries) traversent la largeur.

## Lisibilité

- Le décor du sous-sol est **sourd** : teintes voisines de la strate, contraste faible, jamais noir pur ni couleur de
  danger. Les poches d'huile de l'industrie deviennent sourdes (brun-noir proche de la strate), avec un reflet discret.
- Ordre de dessin inchangé : ciel, terre (avec décor), dangers, obstacles, jetons, tige, fleurs… — les accessoires de
  surface passent derrière les fleurs, la graine et la tige ; le décor enterré sous tout ce qui se joue.
- Les accessoires de surface restent bas (≤ 22 pixels d'art) et ne couvrent pas plus du tiers de la largeur.

## Performance

Tout le fixe est peint une fois par niveau dans les caches existants. Les animations par image se limitent à quelques
dizaines de rectangles par milieu (pas de boucle par pixel) ; `glow` ne dessine que dans la tranche visible.

## Tests

- `FP.decor` a les quatre milieux de `FP.config.milieux`, chacun avec les sept fonctions et sa `palette`.
- Aucune teinte de `FP.decor[id].palette` n'approche une teinte de `FP.palette.danger` (même seuil que le test des
  palettes de milieu).
- Avec un faux contexte 2D : chaque fonction dessine sans erreur pour un ciel de 50 à 120 pixels d'art et une largeur de
  180 à 400 ; tout ce que dessine `horizon` reste dans le ciel (y < h) ; `surface` reste au-dessus de la pelouse et sous
  22 pixels ; `glow` ne dessine que dans la tranche visible.
- Deux niveaux différents donnent des positions d'accessoires différentes ; le même niveau, les mêmes.
- Dans le navigateur (vérification de fin) : une partie traverse les 4 milieux sans erreur ; captures de chaque milieu à
  la surface et en profondeur, sur un écran étroit et un écran large ; mesure de perf (bench existant) sans régression
  notable par rapport à la v4.10.

## Fichiers

`src/render/decor-*.js` (4 nouveaux), `src/render/sky.js`, `src/render/soil.js`, `index.html` et `dev/check.html` (scripts),
`dev/tests/decor.test.js` (nouveau), `docs/architecture.md`, `CHANGELOG.md`, version `4.11.0`. Les maquettes restent dans
`docs/art/`. Chaque fichier sous 400 lignes.

## Hors périmètre

Décor propre au niveau de boss, parallaxe, météo qui réagit au jeu, changement des palettes de couleur des milieux.
