# Musique des milieux — design (sous-projet 2, v4.10.0)

Spec parente : `docs/superpowers/specs/2026-10-27-milieux-design.md` (section « La musique »).
Maquettes écoutées et validées : `docs/audio/maquettes-milieux.html` + `maquettes-milieux.js` (2026-10-27).

## But

Chaque milieu a sa vraie musique, et chaque niveau de boss la version boss de cette musique. Le changement de milieu
s'entend autant qu'il se voit.

## Règle d'écriture (validée à l'écoute)

Toujours **un groove qui fait danser**, une **gaieté de pub d'entreprise plaquée sur la catastrophe** et des **gags
sonores** (cuivres qui ratent leur note, sifflet à coulisse, sirène ridicule) — et **dessous quelque chose de malade** :
mode mineur ou modal, notes qui se désaccordent au fil de la boucle (cassette qui fond), note fausse qui revient, couche
toxique franchement mutante. Tout en FM, joué par le moteur du jeu.

## Les morceaux

| Milieu | Morceau | Base validée |
|---|---|---|
| Friche | Funk 70s hanté (inchangé, 4 variantes) | musique actuelle |
| Zone industrielle | **Funk à la chaîne** : 104 BPM, la mineur blues ; batterie d'usine (tôle en caisse claire, vapeur en charleston), slap robotique, fanfare qui rate sa dernière note, sirène qui se désaccorde, cordes qui fondent | maquette I4 |
| Décharge | **Cumbia de la benne** : 96 BPM, sol mineur harmonique ; râpe, contrebasse, accordéon désaccordé sur les contretemps, synthé de supermarché qui fond, ritournelle d'accordéon orientale, cuivres fatigués qui s'affaissent | maquette D3 |
| Site nucléaire | **Disco radieux, EDM malade** : 126 BPM, mi majeur ; 6 mesures de drop (basse qui gronde, accords qui pompent et se désaccordent, arpège qui grince), montée (roulement, sifflet qui grimpe), compteur Geiger, jingle de pub | maquette N4E |

Chaque nouveau milieu a **3 variantes** (une par pousse, en boucle, comme la friche) : même instrumentation, même
tonalité, autre riff et autres accords. La variante 0 est la maquette validée.

### Thèmes de boss (un par milieu, friche comprise)

Gabarit validé sur le boss de l'usine (maquette BI4) : même tonalité et même riff que le milieu, **+10 à +15 BPM**,
**demi-temps qui écrase** (grosse frappe sur le 3ᵉ temps), **basse sale doublée d'une sous-basse**, grosse caisse
doublée, **cuivres graves sur un accord diminué**, **motif du boss** (4 notes tirées du riff, en cuivres graves en fin de
mesure paire), le gag du milieu qui tombe d'un **triton**, deux sirènes en triton en toxique, ligne chromatique
descendante en surface. Environ 3 dB plus fort que le morceau de jeu. Le boss de l'usine est la maquette BI4 telle
quelle ; les trois autres suivent le gabarit. L'emballement à chaque point faible percé viendra avec le moteur de boss
(sous-projet 3).

## Couches (inchangées)

Mêmes noms et mêmes rôles dans tous les morceaux : `groove` = socle (basse, batterie), `clav` = rythmique, `perc` =
frôlement, `organ` = toxique, `sitar` = près de la surface, `ghost` = fond. `FP.music.layersFor` ne change pas, sauf sur un
niveau de boss où `sitar` reste ouverte quelle que soit la profondeur (frôlement et toxique restent réactifs).

## Quel morceau, quand

`FP.music.songFor(state)` en jeu (`playing`, `dying`, `bloom`, `ready`) lit le **niveau généré** :
`state.world.milieu` et `state.world.boss` (nouveau, écrit par `FP.level.generate` depuis `state.run.boss`).

- Niveau de boss → `<milieu>Boss` ; sinon `<milieu><v>` avec `v = (stemCount − 1) mod nombre de variantes du milieu`.
- Le morceau change donc **au moment où le niveau est régénéré**, sous le noir du fondu : changement de milieu = coupure
  nette, le nouveau morceau entre sur le carton de milieu (veille filtrée sur la graine). Entre deux variantes du même
  milieu : relais en fin de mesure, comme aujourd'hui.
- Après la 3ᵉ pousse, le thème du boss s'annonce pendant le fondu, puis la boutique garde son reggae, puis le boss
  reprend sur la graine.
- Titre, boutique, certificat et écran de fin : inchangés.

Noms dans `FP.songs` : `friche0..3`, `fricheBoss`, `industrie0..2`, `industrieBoss`, `decharge0..2`, `dechargeBoss`,
`nucleaire0..2`, `nucleaireBoss`. Les noms `game*` et `FP.songs.gameVariants` disparaissent (remplacés, pas gardés).
`FP.songs.variants(milieuId)` donne le nombre de variantes d'un milieu.

## Tempo

Le tempo part du tempo propre au morceau et monte avec la progression **dans le milieu** :
`bpm du morceau + 4 × state.run.step` (0, +4, +8). Un boss joue à son tempo. (Aujourd'hui, le tempo suit le nombre total
de fleurs et plafonne dès le 2ᵉ milieu ; avec un tempo de base par morceau, ce plafond n'a plus de sens.)

## Fichiers

- `src/audio/score.js` (nouveau) : petits constructeurs de partition partagés (`song`, `melody`, doubles croches, fonte),
  repris de `songs.js` et des maquettes.
- `src/audio/songs.js` : titre, boutique, jingles, friche (4 variantes, renommées) et `fricheBoss`.
- `src/audio/songs-industrie.js`, `songs-decharge.js`, `songs-nucleaire.js` (nouveaux) : 3 variantes + boss chacun.
- `src/audio/synth.js` : les instruments des milieux et des boss (tôle, slap robotique, cordes, accordéon, mélodica,
  contrebasse, sirène, bourdon, chœur, cuivres de pub, cuivres graves, basse sale, sous-basse, basse qui gronde, accords
  qui pompent, arpège, nappe, cloche à vache…) et les percussions (clap, vapeur, couvercle, tic, râpe, cloche à vache),
  toujours en FM ou en bruit filtré. Si `synth.js` dépasse 400 lignes, `INSTRUMENTS` passe d'abord dans
  `src/audio/instruments.js` (étape séparée).
- `src/audio/music.js` : `songFor`, `tempoFor`, `layersFor` (boss).
- `src/world/level.js` : `world.boss`.
- `index.html`, `dev/check.html` : les nouveaux scripts. `docs/architecture.md`, `CHANGELOG.md`.
- `docs/audio/ecoute-milieux.html` (nouveau) : page d'écoute qui charge les partitions **du jeu** (pas de copie) — chaque
  milieu, chaque variante, chaque boss, avec les boutons surface / frôlement / toxique / veille — pour la dernière écoute.

## Contraintes

- Seul `synth.js` crée des nœuds Web Audio ; tout reste en FM ou bruit filtré ; fonctionne en `file://`.
- **Densité** : aucun morceau ne dépasse 1,3 fois le nombre de notes par seconde de `friche0` (le plafond de 40 voix
  coupe sinon des notes sur un téléphone modeste). La maquette N4E (×1,7) est allégée (accords qui pompent à 2 notes…).
- **Volume** : chaque morceau de jeu à ±2 dB de `friche0`, chaque boss à +2 à +4 dB (mesuré par rendu hors ligne, voir
  tests).
- Fichiers sous 400 lignes ; pas de code mort.

## Tests

- Chaque milieu de `FP.config.milieux` a ses variantes (4 pour la friche, 3 sinon) et son boss dans `FP.songs`.
- Chaque note : instrument connu de `FP.synth.INSTRUMENTS` ou de `FP.synth.DRUMS`, hauteur dans les `pcs` du morceau (les
  notes « malades » hors gamme sont déclarées dans `pcs`), couche parmi les six.
- `songFor` : bonne variante selon la pousse et le milieu du niveau ; boss sur un niveau de boss ; reggae en boutique ;
  changement de morceau quand `world.milieu` change, et pas avant (pendant l'éclosion du niveau précédent).
- `tempoFor` : base du morceau + 4 × step ; boss à son tempo.
- `layersFor` : `sitar` ouverte sur un niveau de boss.
- `level.generate` écrit `world.boss`.
- Densité : notes par seconde de chaque morceau ≤ 1,3 × `friche0`.
- Dans le navigateur (vérification de fin, hors suite) : rendu hors ligne de chaque morceau, volumes dans les bornes ;
  une partie jouée qui traverse les 4 milieux et un boss sans erreur.

## Validation à l'oreille

Les variantes 1-2 et les boss composés d'après le gabarit passent par `docs/audio/ecoute-milieux.html` avant la
fusion ; les retouches demandées se font sur la branche.

## Hors périmètre

Emballement du thème à chaque point faible (moteur de boss, sous-projet 3), musique propre à la saison 2, nouveaux
jingles.
