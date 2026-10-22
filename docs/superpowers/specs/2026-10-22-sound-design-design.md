# Sound design FM « hippie contaminé » — design (v4.3.0)

Statut : validé en séance de conception le 2026-10-22, à relire avant le plan.

## 1. Intention

Le jeu a une identité visuelle homogène (pixel Mega Drive, interface « hippie contaminé »), mais son son date de la v3 : une quinzaine de bips en ondes simples, aucune musique. On refait **tout le son** dans l'esprit de la console : une bande-son **groovy mais spooky** et des effets, tous joués par **un même synthé FM** imitant la puce de la Mega Drive (YM2612).

Critères de réussite :
- une musique pour l'écran titre et une musique de jeu qui réagit à la partie (couches, tempo) ;
- tous les effets refaits avec le même instrument, plus des sons pour les éléments qui n'en avaient pas ;
- les sons qui informent le joueur (bourdonnement du frôlement, grattement de la tige) restent lisibles par-dessus la musique ;
- un réglage du son sur l'écran titre (tout / effets seuls / muet), mémorisé ;
- le jeu marche toujours en double-clic (file://), **sans aucun fichier son** ;
- coût processeur raisonnable sur téléphone, aucune erreur ; un son raté ne casse jamais une frame.

Décisions de l'utilisateur :
- **Une vraie bande-son FM** (option A), groovy mais spooky.
- **Musique à couches** dont **le tempo suit la partie** (option C).
- **Tous les effets refaits en FM** (option A).
- **Icône de réglage du son sur l'écran titre seulement** (option A) : tout → effets seuls → muet, mémorisé.
- **Direction musicale** (maquettes écoutées) : la démo **A « psyché 60s qui a mal tourné »** pour l'écran titre, la démo **B « funk 70s hanté »** pour le jeu ; l'orgue et le sitar de A reviennent dans B comme couches de danger.
- **Approche 1** : synthèse FM jouée en direct, partitions écrites en données dans le code, séquenceur planifié sur l'horloge audio.

## 2. Référence

`docs/audio/maquettes-direction.html` : les deux maquettes écoutées en séance (page autonome, bouton « Écouter »). Elles fixent le timbre et l'esprit :
- **A** — 92 BPM, mi phrygien dominant (mi fa sol♯ la si do ré). Orgue tremblant doublé d'une couche désaccordée, basse ronde, sitar FM (ratio inharmonique 3,51, glissés), tambourin aux croches, long écho.
- **B** — 100 BPM, mi mineur blues (mi sol la si♭ si ré). Basse slap FM (indice fort qui chute vite), clavinet étouffé sur les contretemps, cuivres qui tombent, boîte à rythmes qui boite (léger retard aléatoire), thérémine fantôme lointain.

Les morceaux finaux sont composés dans ces directions ; ils peuvent reprendre des motifs des maquettes.

## 3. Architecture

Tout le son vit dans `src/audio/`, découpé par rôle. La simulation (`play/*`, `world/*`) et le rendu ne changent pas.

| Fichier | Rôle |
|---|---|
| `audio/synth.js` | Moteur FM : voix à 2 opérateurs (porteuse + modulateur, indice qui décroît), batterie (grosse caisse, caisse claire, charleston, tambourin), écho (retard + rétroaction filtrée). Trois bus : **musique**, **effets**, **général**. Expose un moteur Web Audio, remplaçable par un espion dans les tests. |
| `audio/songs.js` | Partitions, données pures : `title` (A), `game` (B) et ses couches, les jingles. |
| `audio/sequencer.js` | Séquenceur : `FP.sequencer.notesBetween(song, fromBeat, toBeat)` (pur, testé) liste les notes à jouer ; la planification les envoie au moteur un peu en avance sur l'horloge audio (fenêtre d'environ 0,1 s, réveil toutes les 25 ms). Le tempo ne change qu'en début de mesure. |
| `audio/music.js` | Direction musicale, fonctions pures testées : `songFor(state)` (morceau du mode), `layersFor(state)` (volume cible de chaque couche), `tempoFor(state)` (BPM selon les éclosions), `duckFor(state, events)` (baisse de la musique). Applique les cibles au séquenceur et aux bus, en fondus. |
| `audio/sfx.js` | Recettes FM de tous les effets ; bourdonnement continu du frôlement ; grattement de la tige. Anti-rafale par type de son (comme aujourd'hui). |
| `audio/audio.js` | Chef d'orchestre : déblocage du son au premier geste, événements de la frame → `sfx` et `music`, réglage du son (`FP.audio.setting()`, `FP.audio.cycleSetting()`), pause quand l'onglet est caché. |

**Qui déclenche quoi :**
- **Sons de jeu** : par les **événements** de la simulation (`death`, `bloom`, `blossom`, `eco`, `grazeStart`, `pickup`, `bomb`, `shieldBreak`, `toxicEnter`, `growthTick`, `stemStart`, `runStart`, `ready`), comme aujourd'hui.
- **Sons d'interface** : appelés **directement** par l'écran concerné au bon instant de son animation, via `FP.audio.sfx(nom)` : réveil du titre (`ui/title.js`), lettres du cri (`ui/shout.js`), machine à écrire, tampon et record battu (`ui/certificate.js`), toucher de l'icône (`ui/menu.js`). Pas de nouvel événement dans la simulation.
- **Icône de son** : dessinée par `ui/title.js` (mode `menu` seulement, pas sur l'écran d'accueil) ; `ui/menu.js` reconnaît un toucher sur sa zone, appelle `FP.audio.cycleSetting()` et ne lance pas la partie.

**Réglage du son** : trois états, `all` → `sfx` → `mute` → `all`. `sfx` coupe le bus musique ; `mute` coupe le bus général. Mémorisé avec `FP.storage` sous la clé `flower_power_v4_sound` ; `all` par défaut.

**Robustesse** : tout appel au moteur est protégé (un son raté ne casse pas la frame) ; sans Web Audio, le jeu tourne muet ; l'audio ne démarre qu'après le premier geste (écran « PRESS TO START »).

## 4. Musique

### Morceaux par mode

| Moment | Musique |
|---|---|
| `splash` (écran d'accueil) | silence (son pas encore débloqué) |
| réveil du titre (`menu`) | **A** monte en fondu (≈ 1 s) en même temps que le logo s'anime, en boucle |
| départ d'un run (`runStart`) | A s'efface en 0,5 s ; son de départ ; **B** démarre au premier temps |
| `playing` | **B** avec ses couches (ci-dessous) |
| `death` (graines restantes) | jingle « cuivres qui tombent » ; B baisse (≈ −9 dB) pendant 1 s puis remonte |
| `bloom` puis `blossom` | son de la motte qui se fend, puis jingle « fleur qui sort » au `blossom` ; B baisse pendant le jingle |
| `ready` (entre deux niveaux) | B **en veille** : basse et batterie seules, filtrées (passe-bas) ; tout repart au lancement de la tige |
| `over` (fin de partie) | B s'arrête sur le jingle de mort ; silence pendant l'écriture du certificat ; au tampon, jingle « record battu » si c'est le cas ; puis **A** revient doucement (volume réduit) |

### Couches de B

| Couche | Instruments | Quand |
|---|---|---|
| groove | basse slap, boîte à rythmes (grosse caisse, caisse claire) | toujours en jeu |
| clav | clavinet étouffé, cuivres de fin de mesure | toujours en jeu, sauf en veille |
| perc | charlestons serrés, tambourin, caisse claire fantôme | pendant un frôlement (`state.graze.active` non vide), intensité selon le frôlement le plus fort |
| organ | orgue tremblant de A | tige contaminée (`state.plant.corruption > 0` ou `toxicTimer > 0`) |
| sitar | ligne de sitar de A | pointe dans le dernier tiers avant la surface |
| ghost | thérémine fantôme | une fois toutes les 4 mesures, très bas, toujours |

Fondus de couche : 0,2 s à la montée, 0,4 s à la descente. **Baisse pendant le frôlement** : le bus musique descend jusqu'à −6 dB selon l'intensité du bourdonnement, pour qu'il reste lisible.

### Tempo

`tempoFor(state)` = `min(125, 100 + 3.5 × state.score.flowers)` BPM pour B (plafond atteint à la 8e éclosion) ; A reste à 92 BPM. Le séquenceur applique le nouveau tempo au début de la mesure suivante.

### Équilibre

Bus musique ≈ 0,5 du bus effets. Écho partagé, plus présent sur A (titre) que sur B (jeu).

### Pause

Onglet caché (`visibilitychange`) : le contexte audio est suspendu et le séquenceur s'arrête ; au retour, reprise au début de la mesure suivante.

## 5. Effets

Accordés en mi pour sonner juste par-dessus la musique, joués par le moteur FM, sur le bus effets.

| Déclencheur | Son |
|---|---|
| `growthTick` | grattement de terre (bruit filtré) + petit « tchk » FM de foreuse, plus aigu quand la tige va vite |
| frôlement (continu) | bourdonnement FM : hauteur et brillance avec la proximité, épaisseur avec la durée ; coupé net sur `death`, `shieldBreak`, `bloom`, `runStart` |
| `grazeStart` | petite attaque FM sur l'entrée en frôlement |
| `eco` | « kling » de caisse enregistreuse FM ; un demi-ton plus haut à chaque palier de combo (jusqu'à +5) |
| `stemStart` | coup de pioche FM et souffle |
| `pickup` (goutte) | bulle FM qui monte |
| `pickup` (bourgeon / pollen) | deux notes de clochette FM |
| `bomb` (spore) | boum grave et pluie de cliquetis |
| `shieldBreak` | verre qui casse (bruit aigu + FM inharmonique), souffle |
| `toxicEnter` | gargouillis acide (grave FM + bruit qui ondule) |
| `death` (déchet) | impact métallique sourd + jingle « cuivres qui tombent » |
| `death` (limace, nappe) | grésillement acide + même jingle |
| `bloom` | craquement de la motte, mottes qui retombent |
| `blossom` | jingle « fleur qui sort » : arpège montant de sitar et d'orgue en mi |
| `ready` | deux notes d'orgue douces |
| `runStart` | son de départ (accord FM qui s'ouvre) |

Sons d'interface : `wake` (accord d'orgue qui s'ouvre, au réveil du titre), `letter` (« toc » de chaque lettre du cri qui atterrit), `type` (cliquetis de machine à écrire, une fois par ligne du certificat), `stamp` (« BAM » du tampon), `record` (mini-jingle de record battu), `toggle` (bip de l'icône de son).

## 6. Vérification

- **Tests sous Node** (`node dev/run-checks.js`), avec un moteur espion qui enregistre les notes, bruits, réglages de bus et de couches demandés :
  - partitions valides : chaque note de `title`, `game` et des jingles appartient à la gamme du morceau, chaque mesure a la bonne longueur ;
  - `notesBetween` : les notes d'un intervalle, ni doublon ni oubli à la jonction de deux fenêtres, boucle correcte ;
  - `songFor` : silence en `splash`, A en `menu`, B en jeu, A réduit après le tampon en `over` ;
  - `layersFor` : chaque couche s'allume et s'éteint selon l'état (frôlement, contamination, dernier tiers, veille) ;
  - `tempoFor` : 100 au départ, +3,5 par éclosion, plafond 125 ;
  - chaque événement de jeu déclenche son effet ; anti-rafale ; sans Web Audio, rien ne plante ;
  - réglage : `all` → `sfx` → `mute` → `all`, mémorisé et relu ; `sfx` coupe la musique, pas les effets ;
  - un toucher sur l'icône change le réglage sans lancer la partie (logique de zone pure, testée).
- **En jeu** : aucune erreur console sur une partie complète (titre → jeu → éclosions → morts → certificat → titre) ; coût de l'audio mesuré (temps de planification par frame) ; double-clic en file://.
- **À l'oreille : l'utilisateur.** L'implémenteur ne peut pas entendre. Livraison par étapes écoutables : (1) moteur + musique du titre, (2) musique de jeu et ses couches, (3) effets et sons d'interface ; chaque étape est validée à l'oreille avant la suivante.

## 7. Étapes

1. Moteur FM (`synth.js`), séquenceur (`sequencer.js`), partition du titre ; musique du titre jouée au réveil. **Écoute utilisateur.**
2. Partition de jeu et couches (`songs.js`, `music.js`) : morceaux par mode, couches, tempo, veille, baisse pendant le frôlement, pause onglet caché. **Écoute utilisateur.**
3. Effets FM (`sfx.js`), sons d'interface, jingles ; retrait des anciennes recettes v3. **Écoute utilisateur.**
4. Icône et réglage du son sur l'écran titre.
5. Version 4.3.0, CHANGELOG, `docs/architecture.md`, vérification complète.

## 8. Hors périmètre

- Musique différente selon le niveau ou la profondeur (au-delà des couches).
- Réglage de volume fin (curseur) ; seulement les trois états.
- Sons positionnés en stéréo.
- Fichiers audio enregistrés.
