# Changelog

Une entrée par version (voir `AGENTS.md`).

## v4.17.0 — Retours de playtest : parterre, enfouissement, limaces

- le parterre repart vierge à chaque nouveau site : les fleurs d’un milieu ne s’entassent plus sur la pelouse du suivant (le compte des fleurs du run et le certificat ne changent pas) ;
- obstacles PixelLab (`?obstacles=pixel`) : la moitié sont enfouis, sous 36 à 50 % de leur hauteur (au lieu d’un tiers sous 28 %, que leur flaque au pied rendait invisible) ;
- limaces de lixiviat : à partir du niveau équivalent 6, une part croissante d’entre elles (jusqu’à 45 % au niveau 10) barre le chemin sûr ; au bout de sa course, chacune laisse le passage libre : on attend son moment pour passer. Avant le niveau 6, rien ne change ;
- banc : 707 tests.

## v4.16.0 — Nouveaux obstacles par milieu (version PixelLab)

- avec `?obstacles=pixel`, trois obstacles inédits par milieu, dans le même style : friche (caddie, matelas, palette), zone industrielle (bidon d’huile, engrenage, tuyau), décharge (frigo, télé cathodique, canapé), site nucléaire (combinaison vide, masque à gaz, canard mutant) ; chacun a son cri de mort ;
- les versions PNG et dessinée ignorent ces familles : leurs niveaux restent identiques ;
- matelas, palette et combinaison, les plus larges, ont un poids d’apparition relevé pour se placer aussi souvent que les autres ;
- banc : 704 tests.

## v4.15.0 — Obstacles PixelLab (version test)

- `?obstacles=pixel` ouvre une version test où les 14 obstacles sont des sprites PixelLab simples et cartoon (aplats, contour noir, coulures vert acide), plus raccord avec la pousse, la graine et la tige ; combinable avec `?sansboss=1`. Sans le paramètre, rien ne change ;
- un pixel de l’image = un pixel d’art (deux pour le T-Rex) : aucun rééchantillonnage ; tailles proches des PNG actuels, plus petites pour le panneau solaire, la borne et le cercueil, plus grandes pour le pneu et le drone ;
- collisions calculées depuis les silhouettes (`dev/tools/import-pixel.js`) ;
- banc : 701 tests.

## v4.14.0 — Obstacles dessinés (version test)

- `?obstacles=dessin` ouvre une version test où les 14 obstacles sont dessinés pixel par pixel par le code, dans le style de la pousse : 4 teintes par matière, contour teinté, formes rondes et cabossées, usure, coulures vert acide ; 4 variantes par obstacle ; combinable avec `?sansboss=1`. Sans le paramètre, rien ne change ;
- leurs collisions sont calculées depuis les dessins (silhouette rétrécie d'un pixel, polygone de 48 points au plus) : ce qu'on voit est ce qui touche ;
- galerie de développement `dev/obstacles.html` (les 14 familles, leurs variantes, la collision, sur la terre de chaque milieu) ;
- banc : 696 tests.

## v4.13.1 — Le décor ne change plus à l'éclosion

- le décor de surface et la terre gardent leur tirage pendant l'éclosion : leur graine est figée à la génération du niveau, ils ne changent qu'avec la pousse suivante ;
- banc : 553 tests.

## v4.13.0 — Version playtest et difficulté en dents de scie

- `?sansboss=1` ouvre la version playtest : 6 pousses par milieu, bon de commande toutes les 3, jamais de boss ; après la 6ᵉ pousse du site nucléaire, le certificat « SITE RÉHABILITÉ » (sites traversés 4/4) ; « VERSION PLAYTEST » sous le titre ;
- la difficulté suit l'avancée dans les milieux, dans les deux versions : chaque milieu monte de son départ à son sommet, le suivant repart un peu plus bas (0 → 0,25 ; 0,10 → 0,50 ; 0,35 → 0,75 ; 0,60 → 1), le boss se joue au sommet ; le maximum arrive au site nucléaire au lieu de la zone industrielle ;
- le pollen fait monter la difficulté d'une pousse par fleur en plus, dans le milieu en cours ; une mort ne la fait jamais monter ;
- banc : 552 tests.

## v4.12.0 — Moteur de boss

- le niveau de boss est un vrai combat : 4 tronçons de machine accrochés tour à tour aux flancs, un point faible par tronçon à percer de bas en haut, une trappe sous la pelouse qui ne s'ouvre qu'après le quatrième ;
- les tronçons dépassent le milieu de l'écran : le couloir sûr zigzague d'un flanc à l'autre (pas de victoire tout droit par le centre) ; minces, ils laissent de hauts intervalles où chaque changement de flanc monte droit au-delà du coin, traverse en pente douce et remonte droit sous le coin suivant : la tige le suit au doigt, qu'on anticipe ou qu'on suive en retard ;
- défenses propres à chaque milieu (piston, jet, bras) : elles préviennent, frappent, se reposent, et accélèrent à chaque point percé sans jamais sauter d'étape (un perçage ne déclenche aucun coup sans avertissement) ; seul le coup est un obstacle ; la trappe fermée tue aussi, même sous la membrane ;
- une colonne de même facture longe chaque bord et relie les tronçons : le boss se lit comme une seule structure accrochée aux murs (le couloir ne l'approche jamais, la portée des défenses tient compte de sa largeur) ;
- les points percés survivent à une mort ; la flèche, au bord de l'écran zoomé, indique le prochain point au-dessus de la pointe quand on ne le voit pas ; HUD du combat, carton BOSS VAINCU, bonus de perçage et de boss ; un perçage fait jaillir étincelles et jetons, secoue l'écran ; sons de perçage, de trappe et de coup, thème du boss qui s'emballe (+6 BPM par point percé) ;
- avant et pendant un boss, le bon de commande ne propose plus Lobbying ni Bière anti-limaces (sans effet sur ce niveau) ;
- rendu provisoire en blocs dessinés par le code ; les prompts des vraies images (non générées) sont dans `docs/art/prompts-boss.md` ;
- banc : 531 tests.

## v4.11.0 — Décors des milieux

- chaque milieu a son ciel, son horizon, ses accessoires et son sous-sol, en pixel art dessiné par le code : barres d'immeubles et grue (friche), raffinerie, torchère et convoyeur (zone industrielle), montagne d'ordures, grappin et mouettes (décharge), tour de refroidissement, clôture, lune verte et aurore (site nucléaire) ;
- surface : palissade taguée, caddie et plots ; palettes, fûts et rails ; sacs, pneus et frigo ; fûts jaunes, panneaux et herbe mutante qui luit ;
- sous-sol, sur toute la profondeur et en teintes sourdes : briques et canalisations ; conduites rouillées et poches d'huile ; couches de déchets qui suintent ; galeries de béton et fûts enterrés qui fuient ;
- canalisations, conduites et galeries usées : coudes en biais, colliers, rouille, cassures aux bords déchiquetés, galeries fissurées et effondrées, câbles coupés qui pendent ;
- les usines de l'ancien horizon disparaissent ; le décor change d'un niveau à l'autre et suit la largeur de l'écran ;
- banc : 488 tests.

## v4.10.0 — Musique des milieux

- chaque milieu a sa musique, toujours dansante, trop joyeuse pour ce qu'on voit, et malade dessous : funk 70s hanté (friche, inchangé), « funk à la chaîne » (zone industrielle), « cumbia de la benne » (décharge), « disco radieux, EDM malade » (site nucléaire) ; 3 variantes par nouveau milieu, une par pousse ;
- chaque niveau de boss a son thème, tiré de la musique du milieu : plus lourd, plus rapide, demi-temps qui écrase, basse sale, cuivres graves et motif du boss ;
- la musique suit le niveau affiché : coupure nette sous le noir du fondu au changement de milieu, thème du boss dès le niveau de boss (la boutique garde son reggae) ;
- tempo propre à chaque morceau, +4 BPM par pousse réussie dans le milieu ;
- nouveaux timbres FM (tôle, slap robotique, accordéon, contrebasse, cuivres de pub, basse qui gronde, accords qui pompent…) et percussions (clap, vapeur, couvercle, râpe, cloche à vache, compteur) ;
- page d'écoute `docs/audio/ecoute-milieux.html` (partitions du jeu) ;
- banc : 478 tests.

## v4.9.0 — Quatre milieux

- une partie traverse quatre milieux : friche urbaine, zone industrielle, décharge, site nucléaire ; chacun a ses familles d'obstacles, son ciel, sa terre et sa pelouse (le T-Rex ne vit plus qu'au nucléaire) ;
- cycle : 3 pousses réussies dans le milieu, le bon de commande, puis le niveau de boss (provisoire : un niveau normal annoncé « combat en préparation ») ; l'éclore passe au milieu suivant ; après le 4ᵉ, écran de fin « SITE RÉHABILITÉ » puis saison 2, 3… avec des gains ×2, ×3… ;
- le bon de commande ne s'ouvre plus qu'avant chaque boss (et toujours en dernière chance) ; une mort ne fait plus avancer sa cadence ;
- cartons d'entrée de milieu, d'annonce du boss et de victoire ; le HUD montre le milieu et le multiplicateur de saison, le certificat les sites réhabilités, le titre le record de progression ;
- jetons : une traînée peut déborder sur la tranche du dessus, le milieu du niveau n'est plus un creux ;
- police : « », et — ;
- banc : 464 tests.

## v4.8.0 — Le chemin serpente

- la difficulté passe par la forme du chemin plutôt que par le nombre de dangers : du niveau 0 au niveau 10, le chemin sûr serpente de plus en plus (sinuosité 400 → 720 : nœuds tous les 105 px au lieu de 145, changements de côté 45 % au lieu de 18 %, écarts plus larges) ;
- il se resserre aussi : nappes et limaces s'en approchent jusqu'à 16 px (au lieu de 25), les déchets jusqu'à 3 px de marge (au lieu de 8) ;
- pente bornée (1,4 px de côté par px de montée, ≈ 54°, sous le braquage de la tige) : les lacets restent suivables ; le niveau 0 ne change pas ;
- nappes plafonnées à 14 (au lieu de 21) et limaces à 8 (au lieu de 10), atteints vers le niveau 6 : au niveau 14, une image coûte ≈ 27 % de moins sur téléphone simulé ;
- placement exact : l'ellipse d'une nappe et le trajet entier d'une limace sont vérifiés contre le chemin (et plus seulement leur centre ou 9 points) ;
- banc : 435 tests.

## v4.7.5 — Plus fluide sur téléphone

- dessin : les anciennes tiges et le halo de la tige en cours sont dessinés une fois dans des calques puis recopiés ; les six images des jetons et le sillon des limaces aussi (pixels identiques, tige ≈ −45 %, limaces ≈ −40 %, jetons ≈ −50 % sur téléphone simulé) ;
- nappes toxiques construites 3× plus vite et préparées hors des moments de jeu : plus de blocages de 50 à 120 ms quand une nappe apparaît ;
- son : ronron de la foreuse sur trois voix permanentes, filtres, envois d'écho et trémolos partagés, plafond de 40 voix pour la musique (jamais les effets), musique planifiée 0,35 s d'avance ; 145 nœuds Web Audio créés par seconde en jeu au lieu de 301 ;
- banc : 431 tests.

## v4.7.4 — Économie rééquilibrée

- jetons à 10 Ɇ (au lieu de 25, qui remontaient à 25 par l'arrondi du score) ; traînée complète 50 Ɇ (facile) et 150 Ɇ (appât) ;
- prix de la boutique doublés : Graine Bio™ 5 000, Lobbying 1 800, Spore 1 600, Membrane et Filtre 1 400, Premium, Compost et Bière 1 200, Aimant 1 000 ;
- les frôlements redeviennent une vraie source de crédits ; un test verrouille l'équilibre (les jetons de 3 pousses parfaites ne paient pas la graine) ;
- banc : 420 tests.

## v4.7.3 — La graine force

- germination : un grondement FM grave monte et tremble tant qu'on maintient (la graine force), retombe si on lâche, et se coupe net au « pop » du départ ;
- jetons encore plus discrets (~55 % de la v4.7.2) ;
- banc : 419 tests.

## v4.7.2 — Jetons moins forts

- le verre des jetons passe à ~40 % de son volume, avec un peu moins d'écho (il couvrait la musique en jeu) ;
- banc : 417 tests.

## v4.7.1 — Jetons en verre FM

- les jetons sonnent en verre FM cristallin, une octave au-dessus de la musique, avec un écho : ils planent au lieu de se mêler aux instruments ;
- chaque traînée a sa propre petite phrase (montée, descente, arche, question-réponse, vague, escalier), qui boucle tous les 8 jetons ;
- banc : 417 tests.

## v4.7.0 — Germination, joystick au doigt

- germination : chaque pousse attend sur sa graine (début de partie, après une éclosion, après une mort) ; maintenir le doigt ~0,6 s la fait trembler, se fissurer et sortir un germe, lâcher le fait rentrer ; deux craquements puis un « pop » au départ ; « MAINTENIR POUR POUSSER » ;
- au doigt, joystick sur la largeur de l'écran : tiers gauche et droit = virage maximal, tiers central = direction proportionnelle ; la souris vise toujours le pointeur ;
- la musique du titre démarre dès le premier toucher sur mobile (le son se débloque aussi au lever du doigt) ;
- les nappes toxiques grincent de plus en plus fort jusqu'à la brûlure ;
- foreuse un quart plus petite ; jetons ramassés à 20 px (au lieu de 14), avec un éclair et un anneau cuivré ; halo d'éclosion au cœur de la fleur ;
- banc : 418 tests.

## v4.6.3 — Aimant grisant, jetons qui tournent mieux

- l'Aimant à jetons aspire désormais les jetons à moins de 110 px : ils s'arrachent de leur place et filent vers la tête de plus en plus vite, avec une traînée cuivrée ; un halo cuivré pulse autour de la tête tant qu'il est actif ;
- rotation des jetons en 6 images (face, ¾, profil, tranche, puis l'autre côté) ;
- la mélodie des jetons boucle : une phrase de 8 notes, rejouée une octave plus bas un tour sur deux, au lieu de rester sur la dernière note ;
- certificat : « FLEURS ÉCLOSES » au lieu de « FLEURS PLANTÉES » ;
- banc : 398 tests.

## v4.6.2 — Grandes routes de jetons, son rééquilibré

- traînées de jetons en grandes routes sinueuses : 12 à 16 jetons espacés de 45 px, ondulation de 60 à 110 px autour du chemin sûr (resserrée automatiquement si les déchets ou les bords la coupent) ;
- répartition homogène du haut au bas du niveau (tranches égales), et plus aucun jeton juste au-dessus de la graine ;
- « tink » des jetons et accord de la traînée complète plus discrets ; musique (titre et jeu) plus forte ;
- banc : 394 tests.

## v4.6.1 — Boutique moins fréquente, traînées sinueuses

- le bon de commande ne s'ouvre plus qu'une pousse sur trois (la boutique de dernière chance, elle, toujours) ;
- traînées de jetons plus longues (10 à 14), plus espacées (30 px) ; la traînée facile ondule autour du chemin sûr en une ou deux vagues ;
- banc : 390 tests.

## v4.6.0 — Boutique de fin de pousse

- entre deux pousses, un bon de commande en papier recyclé (100 % recyclé*, *à 3 %) propose 3 articles tirés au sort, dont un à −50 % ; on coche, on COMMANDE, et le prix est retiré du score ;
- 9 articles pour la pousse suivante : Graine Bio™ (une graine de plus), Membrane organique (bouclier), Aimant à jetons, Jetons premium, Compost lent, Spore de départ, Filtre à charbon, Bière anti-limaces, Lobbying (moins de déchets) ;
- dernière chance : après la mort de la dernière graine, la Graine Bio™ est toujours proposée — on peut vider son score pour continuer ;
- livraison au bilan carbone soigneusement compensé ; tampon « VALIDÉ » ; effets en FM pur : papier froissé à l’apparition et au départ du bon, gratouillis de crayon à chaque case, tiroir-caisse (bip bip, ding, clonk, pièces) à la commande ;
- pendant le bon, un reggae d'ascenseur pollué tourne en boucle : one drop, basse ronde, skank désaccordé qui vacille, bubble d'orgue, ritournelle de cloches qui dérape, aigus poussés façon sono de supermarché ;
- banc : 386 tests.

## v4.5.0 — Circuits de pièces

- des chapelets de jetons ÉcoCrédits™ rouillés à travers le terrain : à chaque hauteur d'écran, un chapelet facile sur le chemin sûr et un appât près d'un danger (le long d'un déchet, entre deux, au bord d'une nappe, en travers d'une limace) ;
- chaque jeton rapporte 25 Ɇ au multiplicateur du combo en cours et l'entretient ; un chapelet complet rapporte 150 Ɇ (facile) ou 400 Ɇ (appât), fait monter le combo et se fête d'un « KARMA ! », « GREEN ! » ou « 0 DÉCHET ! » ;
- « tink » FM qui monte d'une note à chaque jeton, accord au chapelet complet, éclat cuivré au ramassage ;
- les niveaux eux-mêmes ne changent pas (les pièces ont leur propre tirage) ;
- banc : 346 tests.

## v4.4.2 — Graines lisibles

- les graines restantes (vies) du HUD sont deux fois plus grandes, lisibles sur téléphone ; le pollen remonte d'autant ;
- banc : 314 tests.

## v4.4.1 — Plein écran sur téléphone

- le plein écran est demandé au lever du doigt sur le titre (au doigt, les navigateurs Android ignoraient la demande faite au toucher) ;
- sur téléphone, le jeu remplit tout l'écran, du 9:16 au 9:22 (un peu plus de terrain en hauteur) au lieu de laisser des bandes ; tablette et ordinateur gardent le cadre 9:16 ;
- banc : 313 tests.

## v4.4.0 — Visages mutants

- chaque pousse a son personnage : 16 têtes débiles et mutantes (hippie défoncé, dents de lapin, cyclope, binoclard, langue tirée, mutant à antennes, punk à crête, œil qui pendouille, yeux dépareillés, sourire à une dent, gros nez patate, gourou moustachu, champi sur le crâne, coquille sur la tête, gobe-mouche, lunettes Groucho), tirés sans doublon tant que les 16 ne sont pas passés ;
- gros yeux globuleux et grandes bouches : les humeurs de danger (frôlement, alerte, toxique, mort) restent lisibles par-dessus chaque personnage ;
- la fleur garde le personnage de sa pousse, en plus abruti ; les fleurs bonus d'une éclosion sont ses clones ;
- banc : 313 tests.

## v4.3.1 — Nappes toxiques à la distance

- l'exposition à une nappe suit la distance parcourue dedans, plus le temps : on brûle après environ 75 px de trajet, quelle que soit la vitesse de la tige (plus rapide, on la traversait sans risque) ;
- jeu en ligne : https://kouboy.github.io/flower-power/ (manifeste et icônes pour l'écran d'accueil) ;
- banc : 294 tests.

## v4.3.0 — Sound design FM et tension

- tout le son est refait en synthèse FM façon Mega Drive (puce YM2612), sans aucun fichier son : un même moteur pour la musique et les effets ;
- bande-son « hippie contaminée » : thème psyché 60s au titre, funk 70s hanté en jeu, en 4 variantes (une par pousse) ; couches selon le danger (percussions au frôlement, orgue dans une nappe, sitar près de la surface, thérémine lointain), tempo qui accélère à chaque éclosion (100 → 125 BPM), veille entre deux niveaux, musique qui baisse au frôlement, à la mort et quand la fleur sort ;
- effets refaits en FM, accordés en mi, et nouveaux sons : réveil du titre, départ, ronron de la pousse, motte qui se fend, jingles (mort, fleur, record), lettres du cri, machine à écrire et tampon du certificat ;
- réglage du son sur l'écran titre (tout, effets seuls, muet), mémorisé ; son en pause quand l'onglet est caché ;
- plus de tension : la tige part à 120 (90), gagne +6 par tige et par fleur, plafond 260 ; limaces +50 % ; la marge du chemin sûr se resserre de 25 à 12 au niveau 8 ;
- le squelette de dinosaure militant redevient un monument (280 de large, réglé sur l'écran) ; la tige passe par-dessus la motte ;
- banc : 289 tests.

## v4.2.6 — PRESS TO START

- au lancement, un écran d'accueil figé façon Mega Drive : le titre immobile et « PRESS TO START » ; le premier appui débloque le son, passe en plein écran sur téléphone et tablette (portrait verrouillé quand Android le permet ; sans plein écran sur iPhone) et réveille le titre (logo animé, « TOUCHER POUR POUSSER ») ; sur ordinateur, pas de plein écran ;
- banc : 266 tests.

## v4.2.5 — Finitions de l'interface

- le logo du titre passe en ×2 quand la place le permet (écran d'ordinateur) ; sur téléphone, ×1 reste le maximum ;
- l'aide de première pousse et « TOUCHER POUR POUSSER » passent au-dessus du combo, sans jamais le chevaucher ;
- certificat : la relance attend toujours la chute du tampon, même si la cause tient sur plusieurs lignes ; le libellé du record à battre vient de la config ;
- commentaires et documentation remis à jour ; banc : 263 tests.

## v4.2.4 — Plus fluide sous Firefox

- les lignes en pixels (tige, sillons des limaces, effets) et le corps des limaces peignent d'un seul trait les pixels voisins de même couleur : exactement les mêmes pixels, environ deux fois moins d'appels de dessin ; mesuré dans Firefox (fenêtre 412 × 732, niveau 6) : 4,4 → 3,7 ms par image, limaces 1,26 → 0,73 ms ;
- banc : 260 tests.

## v4.2.3 — Nappes sur toute la hauteur

- les nappes toxiques se répartissent à tour de rôle sur les trois tiers de la hauteur (≈ 33 / 31 / 36 %, surface / milieu / fond), au lieu d'être réservées aux profondeurs (2 / 48 / 50 % avant) : le dernier tiers avant la surface n'est plus un répit ;
- les limaces de lixiviat ne font plus de marche arrière : elles se retournent à chaque demi-tour de leur va-et-vient ;
- banc : 259 tests.

## v4.2.2 — Nappes toxiques

- les nappes toxiques sont plus nombreuses et plus grandes, et se multiplient vite avec les niveaux : 9 dès le premier niveau (5 avant), 14 au niveau 6, 19 au niveau 10 ; de 3,6 % à environ 10 % du terrain au départ, 15 % au niveau 6 ; leur effet ne change pas et elles restent hors du chemin sûr ;
- banc : 257 tests.

## v4.2.1 — Échelle et difficulté

- les déchets à l'échelle du réel (compressée) : la batterie et le drone gardent leur taille, le cône et le sac sont moyens, le rack, la trottinette, le panneau et le cercueil sont grands, la borne d'arcade est la plus grande ; les collisions suivent ;
- la tige part plus vite (90 au lieu de 76, plafond 210 au lieu de 196) ;
- les gains « +Ɇ » s'affichent au-dessus de la tête, à gauche puis à droite, et suivent la pointe ;
- certificat : de l'air autour de la cause du décès ;
- banc : 255 tests.

## v4.2.0 — Interface pixel « hippie contaminé »

- toute l'interface passe en pixels d'art, sur une toile à la même échelle que le monde : police bitmap 5×7 dessinée à la main (majuscules accentuées, Ɇ, ™), contour encre et ombre, sans police système ni emoji ;
- écran titre arcade : logo « Flower Power » groovy 70s qui dégouline de boue violette, « O » en trèfle radioactif qui tourne, « TOUCHER POUR POUSSER » et « © 2026 ÉCOSOFT™ · une filiale de PÉTROFLORE » ; le panneau HTML de règles disparaît ;
- HUD minimal dans les coins du bas : graines en icônes (qui se fendent quand on en perd une), ÉcoCrédits™ en compteur d'arcade ; pollen et combo seulement quand ils sont actifs ; plus de nombre de fleurs ni d'élan ;
- cri de mort court en lettres qui tombent et rebondissent (« RACK SERVEUR ! ») ; aide uniquement à la toute première pousse ; plus aucun message texte dans la simulation ;
- fin de partie en « certificat d'éco-responsabilité » : fleurs plantées, ÉcoCrédits™, tiges sacrifiées, record (battu ou à battre), cause du décès, tampon « VALIDÉ* » ; la relance n'est possible qu'après le tampon ;
- gains « +Ɇ » et doigt en pixels ;
- interface ≈ 0,35 ms par frame en jeu ; banc : 252 tests.

## v4.1.0 — Rendu pixel

- tout le monde est dessiné sur une grille de pixels d'art (grain 2), agrandie sans lissage ; HUD, chiffres « +Ɇ » et textes restent nets ;
- ciel de crépuscule pollué animé (smog, fumées), pelouse, trois strates de terre tramées à contraste bas, d'après une planche de référence générée avec SpriteCook (`docs/art/`) ;
- obstacles ramenés sur la grille (8 niveaux par canal, contour, ancrage tramé) ;
- le héros : une tête-bourgeon à visage avec six humeurs (calme, concentré, frôlement, alerte, toxique, mort), tige pixel à feuilles, graine endormie ;
- à l'éclosion, le héros devient la fleur ; parterre de visages variés (forme, nombre de pétales, teinte, expression) ;
- nappes, limaces, bonus, bouclier, effets et particules en pixels ;
- ciel plus haut qu'en v3 (19 % de la hauteur de vue) pour qu'on voie le crépuscule ;
- plus d'obstacles dès le premier passage (≈ 16 au lieu de 11 à 440 px) et une rampe deux fois plus rapide (≈ 21 au niveau 3), sur une grille plus serrée ; plus de limaces (3 dès le départ, 7 au niveau 6) ;
- dangers en violet chimique (nappes, limaces aux yeux jaune soufre, sillons), distincts de la pousse verte ;
- la tige fouit : tunnel de terre remuée derrière la pointe, mottes qui la recouvrent par endroits (davantage sur les anciennes tiges), racines et mycélium ;
- chaque déchet a sa taille (collision comprise), sa teinte, son usure, et parfois le bas enfoui ;
- deux nouveaux déchets générés avec SpriteCook : trottinette et borne d'arcade ; outil `dev/tools/import-sprite.js` (détourage, contour de collision calculé et vérifié, fiche JSON, manifeste) ;
- grain noir par petites touches dans la terre, le même tramage que le halo des obstacles ; chaque niveau a sa propre terre ;
- halo tramé autour de la tige et de la graine ; la tête de la tige devient une foreuse (mèche de terre rayée qui tourne plus vite quand la pousse accélère, éclats en tourbillon, points de vitesse) ;
- effets de foreuse : fissures qui s'ouvrent devant la mèche, ondes de forage collées à la tête à chaque battement et étincelles quand la mèche racle un obstacle, projetées devant la tête (rien dans le ciel) ;
- émergence en motte de taupe : la pelouse gonfle au-dessus de la pointe qui approche, la mèche en perce le sommet, la motte se fend et projette sa terre, puis la fleur sort ; motte de terre de la couche du haut sous une peau de pelouse soulevée, tas assorti ; un petit tas reste au pied de chaque fleur ;
- les anciennes tiges passent sous les nappes, les limaces et les déchets : le terrain reste lisible ;
- plus d'à-coups quand un déchet entre à l'écran (sprites préparés à l'avance, ancrage calculé sans relecture du GPU) ;
- la tige accélère nettement à chaque pousse (≈ +12 % par éclosion au lieu de +5 %) ;
- rendu au plus 3,6 ms par frame ; banc : 230 tests.

## v4.0.1 — Nettoyage

- une erreur dans la mise à jour, le son ou le rendu ne fige plus le jeu : elle est signalée une fois en console et le reste continue ;
- une fenêtre plus petite que 300 × 520 garde le 9:16 ; `?seed=` limité à 32 bits ;
- règles alignées sur la v3 : une spore ramassée sauve du choc de la même frame, rien n'est payé sur la frame de l'éclosion, un flyover sans place libre ne consomme plus l'obstacle, toutes les limaces touchées clignotent ;
- rendu et son alignés sur la v3 : anneau d'exposition sous la pellicule toxique, bref anneau pour un bonus manqué, drone coupé net sur un choc ;
- derniers réglages de gameplay dans `config.js` (niveaux identiques pour une même graine) ;
- parcours complets testés (frôlement → score, flyover → récompense) ; `dev/bench-level.js` ;
- banc : 180 tests.

## v4.0.0 — Refonte

- parité avec la v3.43.16 (liste de contrôle : `docs/parite-v3.md`) ;
- son procédural de la v3 : effets par événement, anti-rafale, drone du frôlement, grattement de la pousse ;
- particules : gerbes (ÉcoCrédits™, spore, bouclier, ramassages, morts, contamination, éclosion), terre et éclats derrière la pointe, plafond 84 / 128 ; secousse de l'écran ;
- Espace / Entrée : démarrer, lancer la pousse suivante ;
- `?perf=1` (profileur) et `?flydebug=1` (décisions de flyover) ;
- banc : 161 tests.

## v4.0.0-etape6 — Éclosion

- à la surface, 1 + pollen fleurs éclosent en éventail (5 palettes v3), poussent en ~.4 s et restent dans un parterre qui garde la mémoire de la partie ;
- fleurs illustrées (tige contourée, feuilles, 5 pétales irréguliers, cœur ponctué), fleurs finies en cache ;
- anneau d'éclosion doré ; transition par fondu au noir (1,55 s d'éclosion, .46 s, nouveau niveau, .48 s) au lieu du saut de caméra ;
- écran de fin avec la cause de la mort ;
- relecture : le cache du parterre est reconstruit à chaque nouvelle partie (il pouvait montrer la fleur de la partie précédente) ;
- banc : 149 tests.

## v4.0.0-etape5 — Flyover et power-ups

- nappes toxiques et trajets de limaces peuvent sortir par les bords, tant qu'on en voit au moins la moitié ;
- flyover : un frôlement qui contourne un obstacle en montant, de près et longtemps, fait naître devant la pointe un pollen (+1 fleur à l'éclosion), une goutte (bouclier organique) ou une spore (nettoyage, 2 000 Ɇ par obstacle) — règles et seuils de la v3 ;
- un seul power-up gameplay à la fois (le bouclier), pollen hors slot, une récompense par obstacle, récompense ratée qui disparaît ;
- bouclier : absorbe un choc d'obstacle ou de limace, la pointe recule sans changer de direction, .48 s de grâce ; ne protège pas des nappes toxiques ;
- rendu : filament de naissance, glyphes source / spore / pollen, membrane, anneaux de ramassage, rupture, onde de spore, impact à la mort ; ligne d'effet du HUD complète ;
- banc : 141 tests.

## v4.0.0-etape4 — ÉcoCrédits™

- frôler un obstacle ou une limace sans la toucher accumule un frôlement (rien avant .22 s), payé à la sortie : durée, proximité, pic de proximité ; ×1,18 pour le fût irradié et le T-Rex signature, ×1,12 pour une limace ;
- combo : +22 % par gain enchaîné en moins de 2 s, ×8 au plus ; un contact ou la fin de la partie annule les frôlements en cours sans payer ;
- records de fleurs et d'ÉcoCrédits™ dans `flower_power_v4_best`, conservés d'une session à l'autre, stockage corrompu toléré ;
- rendu : chiffres « +1 250Ɇ » qui claquent, anneaux de frôlement, limace frôlée qui clignote, HUD complet de la v3, écran de fin avec records ;
- relecture : le banc d'essai utilise un stockage en mémoire (lancer `dev/check.html` n'écrase plus les records du jeu) ;
- banc : 116 tests.

## v4.0.0-etape3 — Zones toxiques et lixiviat

- génération des nappes toxiques et des limaces portée de la v3, après les solides ; limaces tenues à l'écart du chemin sûr et placées sans dépendre de la caméra ;
- `world/hazards.js` : limaces en va-et-vient, de plus en plus vives au fil de la partie (plafonné) ;
- requête de pointe : intensité toxique, contact lixiviat, frôlement de limace qui fait zoomer ;
- exposition toxique : message, croissance déviée (tremblement, vitesse −10 %, cône 74°), brûlure après ~1,14 s, récupération 5× plus rapide ;
- morts par lixiviat et par brûlure, événements `death` avec `cause` ;
- rendu : nappes qui respirent (sous et devant les sprites), limaces et sillons (clear, fat, debris), anneau d'exposition, bourgeon jaunâtre, ligne « croissance déviée » ;
- message central réduit pour tenir dans la largeur ;
- relecture : toute mort secoue à .28 comme en v3 ; vitesse des limaces réellement plafonnée (phase intégrée — la v3 accélérait sans fin et faisait sauter les limaces) ; plus de saut d'une image à la génération ;
- banc : 98 tests.

## v4.0.0-etape2 — La pousse

- le jeu redevient jouable : croissance et pilotage portés de la v3 (vitesse, rampe par pousse et par fleur, virage, rebond aux bords, trace) ;
- `ui/input.js` : pointeur → instantané par frame, conversion sous zoom, front montant pour relancer, relâchement hors fenêtre ;
- `world/collision.js` : requête de pointe sur les polygones authorés, danger de frôlement ;
- `play/flow.js` : mort et nouvelle pousse sur un nouveau niveau, éclosion minimale (fleur comptée, niveau suivant, « TOUCHE POUR POUSSER »), fin de partie ;
- caméra : cadrage ×1,18 et zoom de frôlement centrés sur la pointe (ou la graine) ;
- rendu de la tige (grain, feuilles primitives), de la graine, du bourgeon, du guide et de la trajectoire prévue ; HUD minimal ;
- obstacles rognés par les bords tant qu'ils restent identifiables (8 px, T-Rex 70 px) ;
- relecture : le cadrage ×1,18 reste pendant la mort (pas de saut de zoom), clic droit ignoré, pointeur capturé hors de la bande de jeu, chaque appui compte ;
- banc : 77 tests.

## v4.0.0-etape1 — Le monde

- `core/geom.js` : distance point-segment, transformation locale → monde, SAT entre polygones convexes ;
- `createRun(seed, {W,H})` fixe largeur, hauteur du monde, hauteur de vue et surface pour tout le run ;
- `world/catalog.js` : les 12 PNG authorés deviennent des solides (taille, polygone mis à l'échelle, miroir interdit si `mirrorSafe:false`, empreinte visuelle avec marge) ;
- `world/level.js` : génération portée de la v3 (grille, chemin sûr, placement sans chevauchement, densité cible, T-Rex signature 1 fois par run) avec des tables d'apparition réduites aux 11 familles PNG ;
- rendu : sol illustré en cache (ciel, nuages, pelouse, strates, grain, racines), obstacles PNG avec leur ancrage sombre, PNG manquant toléré ;
- caméra défilante et caméra libre `?freecam=1` ;
- fenêtre redimensionnée en cours de partie : le niveau garde ses coordonnées, la hauteur visible et les bornes de caméra suivent, le sol couvre toute la largeur ; au menu, un run neuf est recréé ;
- banc : 47 tests ;
- `?seed=N` est reproductible dans la v4 mais ne donne pas le même niveau que l'archive.

## v4.0.0-etape0 — Squelette

- archive la v3.43.16 jouable dans `archive/v3.43.16/` (référence de gamefeel), avec `?seed=N` pour une génération reproductible ;
- déplace les docs v3 dans `archive/docs/` et extrait la banque de gags satiriques (`banque-de-gags.js`) ;
- nouveau squelette en scripts classiques sur `window.FP` : `core/fp.js`, `config.js`, `state.js`, `loop.js`, `render/view.js`, `render/frame.js`, `ui/menu.js` ;
- état unique `FP.state.createRun(seed)`, boucle à ordre fixe, `dt` plafonné ;
- banc d'assertions `dev/check.html` (+ `node dev/run-checks.js`) : 18 tests ;
- contrat d'itération `AGENTS.md`, docs vivantes `docs/design.md` et `docs/architecture.md` ;
- aucun gameplay encore : le menu lance un écran de fond provisoire.

---

## Historique v3

L'historique ci-dessous est celui du prototype monolithique (ordre d'origine conservé).

## v3.43.2 — Visual Cohesion Pass

- rapproche la pousse, la terre, la surface et les fleurs du langage illustré des sprites PNG ;
- remplace le glow de la tige et de la pointe par un dessin végétal mat, contour sombre + chair verte + nervure claire ;
- transforme la pointe de pousse en bourgeon terminal lisible plutôt qu'en orb lumineuse ;
- enrichit le sous-sol en cache offscreen : strates épaisses, inclusions, pierres plates, fibres et réseau de racines superficielles ;
- désature légèrement ciel et pelouse pour mieux laisser respirer les déchets authorés ;
- redessine les fleurs avec tiges/feuilles contourées, cinq pétales irréguliers et cœur plus massif ;
- aucun changement aux collisions, au flyover, aux power-ups ou à l'économie de score de la v3.42.4.

## v3.42.4 — Spore Reward Gate Fix

- La spore-bombe libère immédiatement le slot de power-up dès son explosion.
- Son animation d'explosion reste purement visuelle et ne bloque plus les récompenses de flyover suivantes.

## v3.42.3 — Shield Steering Fix
- Le bris du bouclier organique ne modifie plus le vecteur de direction de la pousse.
- La pointe recule légèrement hors du collider, mais conserve exactement l'intention de pilotage en cours.
- Si le doigt reste maintenu, le guide est recalé immédiatement sur la position du pointeur.

# Changelog

## v3.43.16 - Stem Grain Pass

- Renforce le grain interne de la tige avec davantage de mouchetures et de petites stries stables.
- Garde la silhouette et les nœuds de croissance de la v3.43.15.

## v3.43.15 - Stem Character Pass

- Retravaille la tige souterraine avec un contour plus affirmé, une chair végétale plus mate et une texture interne discrète.
- Ajoute de petites taches et nœuds de croissance pour casser l'aspect trop lisse.
- Redessine légèrement la graine et le bourgeon terminal pour mieux coller au langage visuel des sprites.

## v3.43.14 - Surface Cutaway Pass

- Enrichit la transition surface / sous-sol sans toucher au gameplay.
- Ajoute une croûte de terre irrégulière, des mottes, poches de matière, racines exposées et petits débris végétaux.
- Casse la frontière trop propre entre gazon et terre afin de mieux assumer la vue en coupe.
- Tout reste intégré au cache statique du sol pour préserver les performances.

## v3.43.13 - Inner Stencil Contrast Pass

- Assombrit légèrement la frange intérieure du pochoir, au contact du sprite.
- Conserve la granularité et la transparence progressive des bords extérieurs.

## v3.43.12 - Stronger Granular Falloff Pass

- Pousse davantage la granularité de la frange du pochoir.
- Augmente le nombre de trous, grains et petites ruptures stables dans le dégradé.
- Renforce légèrement la lecture sombre près du sprite.

## v3.43.11 - Granular Stencil Falloff Pass

- Remplace l'effacement uniforme du pochoir par un effilochage granulaire stable.
- Le dégradé reste sombre près du sprite puis se casse en trous, grains et petites ruptures vers l'extérieur.
- Conserve le cache des pochoirs pour éviter tout scintillement.

## v3.43.10 - Stencil Gradient Cache Pass

- Précalcule les pochoirs des sprites à partir de la collision + graze zone pour supprimer le scintillement.
- Remplace l'effet uniforme par un vrai dégradé : plus sombre près du sprite, quasi transparent sur les bords.
- Conserve l'ancrage visuel sans réintroduire les artefacts de silhouette.

## v3.43.9 - Collision Graze Stencil Pass

- Recalcule le pochoir d'ancrage à partir de la collision authorée et du rayon de graze, au lieu de la silhouette brute du PNG.
- Évite les artefacts provoqués par les câbles, antennes et petits détails parasites.
- Renforce ainsi à la fois l'ancrage visuel et la lisibilité de la zone de flyover.

## v3.43.8 - Stronger Flyover Stencil Pass

- Renforce nettement le contraste du pochoir de flyover autour des obstacles.
- Supprime le petit noyau de contact au pied des objets, inadapté à la vue en coupe.
- Conserve un halo/silhouette sombre centré sur la zone de frôlement pour ancrer et contextualiser les obstacles.

## v3.43.7 - Flyover Stencil Pass

- Remplace le simple pochoir d'enfouissement par un halo sombre qui recouvre grosso modo la zone de flyover autour de chaque obstacle.
- Renforce en même temps l'ancrage des objets et la lisibilité visuelle de la zone de frôlement.
- Garde un noyau plus compact au pied de l'objet pour l'impression d'enfoncement.

## v3.43.6 - Burial Stencil Pass

- Remplace l'ancrage local précédent par un pochoir sombre sous les obstacles.
- Supprime la petite lèvre de terre au premier plan.
- Ajoute, pour les assets PNG authorés, une silhouette assombrie et tassée pour donner l'impression qu'ils s'enfoncent dans le sol.

## v3.43.5 - Obstacle Soil Anchoring Pass

- Ajoute un ancrage local des obstacles dans le sol : terre tassée sous les assets, petite lèvre de terre au premier plan, miettes et fibres discrètes.
- Renforce l'intégration visuelle des sprites sans toucher aux collisions ni au gameplay.

## v3.43.4 - Stronger Organic Grain Pass

- Renforce nettement la présence du grain organique dans le sous-sol.
- Augmente le contraste et la densité de la couche de texture répétée.
- Ajoute quelques nappes organiques discrètes pour casser la régularité.

## v3.43.3 - Organic Grain Hotfix

- Corrige le crash au rendu introduit en v3.43.2 par une référence à `soilTheme` inexistante.
- Conserve la nouvelle couche de grain organique.

## v3.43.2 - Organic Grain Pass

- Ajoute une vraie couche de grain répétée sur toute la terre pour un rendu plus texturé et organique.
- Renforce la sensation de matière enfouie sans toucher au gameplay.

## v3.43.1 - Soil Richness & Sky Pass

- Enrichit la texture du sous-sol avec davantage de grain, miettes, inclusions et fibres.
- Laisse apparaître un peu plus de ciel à l'approche de la surface pour mieux respirer et moins couper les fleurs.
- Ajuste légèrement le seuil d'affichage du cache de fleurs.

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

## v3.43.16 - Stem Grain Pass

- Renforce le grain interne de la tige avec davantage de mouchetures et de petites stries stables.
- Garde la silhouette et les nœuds de croissance de la v3.43.15.

## v3.43.15 - Stem Character Pass

- Retravaille la tige souterraine avec un contour plus affirmé, une chair végétale plus mate et une texture interne discrète.
- Ajoute de petites taches et nœuds de croissance pour casser l'aspect trop lisse.
- Redessine légèrement la graine et le bourgeon terminal pour mieux coller au langage visuel des sprites.

## v3.43.14 - Surface Cutaway Pass

- Enrichit la transition surface / sous-sol sans toucher au gameplay.
- Ajoute une croûte de terre irrégulière, des mottes, poches de matière, racines exposées et petits débris végétaux.
- Casse la frontière trop propre entre gazon et terre afin de mieux assumer la vue en coupe.
- Tout reste intégré au cache statique du sol pour préserver les performances.

## v3.43.13 - Inner Stencil Contrast Pass

- Assombrit légèrement la frange intérieure du pochoir, au contact du sprite.
- Conserve la granularité et la transparence progressive des bords extérieurs.

## v3.43.12 - Stronger Granular Falloff Pass

- Pousse davantage la granularité de la frange du pochoir.
- Augmente le nombre de trous, grains et petites ruptures stables dans le dégradé.
- Renforce légèrement la lecture sombre près du sprite.

## v3.43.11 - Granular Stencil Falloff Pass

- Remplace l'effacement uniforme du pochoir par un effilochage granulaire stable.
- Le dégradé reste sombre près du sprite puis se casse en trous, grains et petites ruptures vers l'extérieur.
- Conserve le cache des pochoirs pour éviter tout scintillement.

## v3.43.10 - Stencil Gradient Cache Pass

- Précalcule les pochoirs des sprites à partir de la collision + graze zone pour supprimer le scintillement.
- Remplace l'effet uniforme par un vrai dégradé : plus sombre près du sprite, quasi transparent sur les bords.
- Conserve l'ancrage visuel sans réintroduire les artefacts de silhouette.

## v3.43.9 - Collision Graze Stencil Pass

- Recalcule le pochoir d'ancrage à partir de la collision authorée et du rayon de graze, au lieu de la silhouette brute du PNG.
- Évite les artefacts provoqués par les câbles, antennes et petits détails parasites.
- Renforce ainsi à la fois l'ancrage visuel et la lisibilité de la zone de flyover.

## v3.43.8 - Stronger Flyover Stencil Pass

- Renforce nettement le contraste du pochoir de flyover autour des obstacles.
- Supprime le petit noyau de contact au pied des objets, inadapté à la vue en coupe.
- Conserve un halo/silhouette sombre centré sur la zone de frôlement pour ancrer et contextualiser les obstacles.

## v3.43.7 - Flyover Stencil Pass

- Remplace le simple pochoir d'enfouissement par un halo sombre qui recouvre grosso modo la zone de flyover autour de chaque obstacle.
- Renforce en même temps l'ancrage des objets et la lisibilité visuelle de la zone de frôlement.
- Garde un noyau plus compact au pied de l'objet pour l'impression d'enfoncement.

## v3.43.6 - Burial Stencil Pass

- Remplace l'ancrage local précédent par un pochoir sombre sous les obstacles.
- Supprime la petite lèvre de terre au premier plan.
- Ajoute, pour les assets PNG authorés, une silhouette assombrie et tassée pour donner l'impression qu'ils s'enfoncent dans le sol.

## v3.43.5 - Obstacle Soil Anchoring Pass

- Ajoute un ancrage local des obstacles dans le sol : terre tassée sous les assets, petite lèvre de terre au premier plan, miettes et fibres discrètes.
- Renforce l'intégration visuelle des sprites sans toucher aux collisions ni au gameplay.

## v3.43.4 - Stronger Organic Grain Pass

- Renforce nettement la présence du grain organique dans le sous-sol.
- Augmente le contraste et la densité de la couche de texture répétée.
- Ajoute quelques nappes organiques discrètes pour casser la régularité.

## v3.43.3 - Organic Grain Hotfix

- Corrige le crash au rendu introduit en v3.43.2 par une référence à `soilTheme` inexistante.
- Conserve la nouvelle couche de grain organique.

## v3.43.2 - Organic Grain Pass

- Ajoute une vraie couche de grain répétée sur toute la terre pour un rendu plus texturé et organique.
- Renforce la sensation de matière enfouie sans toucher au gameplay.

## v3.43.1 - Soil Richness & Sky Pass

- Enrichit la texture du sous-sol avec davantage de grain, miettes, inclusions et fibres.
- Laisse apparaître un peu plus de ciel à l'approche de la surface pour mieux respirer et moins couper les fleurs.
- Ajuste légèrement le seuil d'affichage du cache de fleurs.

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
