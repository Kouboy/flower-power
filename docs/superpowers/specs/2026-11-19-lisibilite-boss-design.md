# Lisibilité des boss — design court (v5.16.0)

Date : 2026-11-19. Retours de l'utilisateur et d'un playtest ; validé en conversation (« Doré, c'est très bien, vas-y ! »).

## Intention

Pendant un boss, le joueur doit comprendre l'action d'un coup d'œil, même quand une partie de la menace est hors champ, et la machine doit
rester cohérente (elle est enfouie dans la terre).

## Ce qu'on fait

1. **Côté des brûleurs.** Pendant l'avertissement, les veilleuses bleues des brûleurs muraux (et les bouffées des buses de vapeur)
   grandissent nettement et pointent vers la moitié qui va être frappée : on lit le côté même quand le haut ou le bas du cadre est hors
   champ.
2. **Tirs des tourelles = impulsions à travers la terre.** Plus de boule de feu : un noyau clair entouré d'anneaux d'onde qui se
   propagent, et une traînée de terre soulevée. Même taille de noyau que le tir actuel (zone de contact inchangée), même vitesse.
3. **Sons.** Le coup du brûleur (et de chaque défense) a un son ; la tourelle a un son de visée, un clic de verrouillage plus marqué et
   un tir sourd « dans la terre ». Tous accordés sur la tonique et le mode du biome (FP.tonality, comme les autres sons).
4. **Réticules dorés sur les points faibles.** Quand un point faible (une pompe intacte, puis le cœur à nu) entre dans le champ pour la
   première fois du niveau, un réticule doré (la couleur de ce qui rapporte, pas le rouge du danger) se referme sur lui avec un petit son
   de verrouillage différent de celui des tourelles ; il reste visible, discret, tant que la cible est intacte et à l'écran.

## Non-objectifs, anti-objectifs

- Rien ne change dans les règles : zones, durées, rafales, vitesses, zones de contact.
- Le réticule ne doit pas ressembler à une menace (pas de rouge, son distinct du verrouillage des tourelles).

## Appels de Claude

- Repérage des cibles côté jeu (`play/boss-spot.js`, événement `bossSpot`), dessin dans `render/boss-reticle.js`.
- Couleurs : `palette.boss.reticle` (or clair, or sombre) ; `palette.boss.pulse` (onde, noyau, terre).
- Les sons de brûleurs suivent l'événement existant `bossStrike` ; la visée, `bossAim`.
