# Boutique de fin de pousse — design (v4.6.0)

Statut : validé en séance de conception le 2026-10-23, à relire avant le plan.
Maquette : `docs/art/maquette-bon-de-commande.html` (bon vierge et bon avec deux articles cochés).

## 1. Intention

Deuxième des trois sous-projets d'enrichissement (après les circuits de pièces, avant les bonus posés sur le terrain). Les ÉcoCrédits™ gagnés en frôlant et en ramassant des jetons n'ont aujourd'hui aucun usage. Une boutique entre deux pousses leur donne un sens : on les dépense pour survivre ou gagner davantage à la pousse suivante.

Critères de réussite :
- un passage en boutique se fait en quelques secondes, sans casser le rythme ;
- chaque achat se ressent dès la pousse suivante ;
- dépenser est un vrai pari, puisque le score baisse ;
- le ton satirique (greenwashing) est tenu jusque dans le formulaire ;
- tout en pixels d'art sur la toile d'interface, le jeu marche toujours en double-clic (file://) ;
- les niveaux ne changent pas (tirages propres), sauf l'effet voulu de Lobbying.

Décisions de l'utilisateur :
- **Un seul compteur** (option B) : acheter fait baisser le score (record et certificat compris). Le score ne descend jamais sous zéro.
- **Après chaque pousse** (option A), éclose ou morte.
- **Consommables pour la pousse suivante** (option A), pas d'améliorations permanentes.
- **9 articles** (§ 2), **3 tirés au sort à chaque passage, dont un en promo à −50 %**.
- **Dernière chance** (option B) : après la mort de la dernière graine, la boutique s'ouvre avec une Graine Bio™ garantie ; on peut vider son score pour continuer.
- **Bon de commande en papier recyclé**, par-dessus le jeu (pas en plein écran) : cases à cocher, puis « COMMANDER », avec un bilan CO₂ de livraison **purement satirique**.
- Approche 1 : un vrai mode de jeu `shop` dans le déroulé.

## 2. Règles

### Passage

- Tirage : 3 articles distincts parmi les 9, l'un d'eux à −50 % (prix arrondi à 25). Générateur propre : `FP.createRng((seed ^ shop.salt ^ Math.imul(visit, 2654435761)) >>> 0)`, `visit` = numéro du passage dans la partie (1, 2, …). `state.rng` n'est jamais consommé.
- Dernière chance : si la Graine Bio™ n'est pas tirée, elle remplace le troisième article (sans promo, sauf si c'est elle qui était tirée en promo).
- Coches : on coche autant d'articles qu'on veut tant que le total ≤ score ; un article non coché dont le prix dépasse `score − total` est grisé (non cochable).
- **COMMANDER** : `score.eco −= total` (jamais sous 0), puis application des articles ; sans rien coché, équivaut à NON MERCI.
- **NON MERCI** (« ABANDONNER » en dernière chance) : rien n'est acheté.
- Les records déjà enregistrés ne baissent pas (le record est le meilleur score atteint, comme aujourd'hui).

### Les 9 articles

| id | Nom | Ligne d'explication | Effet | Prix |
|---|---|---|---|---|
| `seed` | GRAINE BIO™ | une graine de plus | `plant.reserves += 1` (immédiat) | 2 500 |
| `membrane` | MEMBRANE ORGANIQUE | encaisse un choc | la pousse part avec le bouclier | 700 |
| `magnet` | AIMANT À JETONS | ramassage ×2 | rayon de ramassage des pièces ×2 | 500 |
| `premium` | JETONS « PREMIUM » | chaque jeton vaut double | valeur d'une pièce ×2 | 600 |
| `compost` | COMPOST LENT | pousse ×0,8 | `FP.plant.speed` ×0,8 | 600 |
| `spore` | SPORE DE DÉPART | ça déblaie | déflagration de spore à la graine au lancement | 800 |
| `filter` | FILTRE À CHARBON | les nappes ne brûlent plus | exposition toxique sans brûlure (la déviation reste) | 700 |
| `beer` | BIÈRE ANTI-LIMACES | elles trinquent ailleurs | vitesse des limaces ×0,3 | 600 |
| `lobbying` | LOBBYING | -40 % de déchets | le niveau est regénéré avec 60 % des obstacles | 900 |

Tous les effets sauf `seed` valent pour **la pousse suivante seulement** et disparaissent à la pousse d'après.

### CO₂ (satirique)

- 0 kg sans article. Chaque article coché ajoute une masse fixe propre à l'article (entre 2 et 9 kg, avec une décimale, dans la config) ; le total s'affiche avec une décimale.
- La ligne de livraison nomme un transport tiré au hasard au passage parmi : DRONE, PORTE-CONTENEURS, JET PRIVÉ, SUV ÉLECTRIQUE, avec « (COMPENSÉS ✓) ».
- Aucun effet en jeu.

## 3. Écran et interactions

- Mode `shop` : le jeu (nouveau niveau, graine en attente) s'assombrit ; le bon glisse depuis le bas en .25 s, incliné de −1,5°, papier recyclé tacheté, en pixels d'art sur la toile d'interface. Le HUD (graines, score) reste visible.
- Contenu, de haut en bas : « BON DE COMMANDE » et « ÉCO-BOUTIQUE · N° 0000xx » (`xx` = `visit`) ; trait pointillé ; 3 lignes (case, nom, ligne d'explication, prix ; promo : ancien prix barré + tampon rose « -50% ») ; trait ; livraison + CO₂ ; TOTAL ; boutons COMMANDER et NON MERCI ; « IMPRIMÉ SUR PAPIER 100 % RECYCLÉ* *À 3 % ».
- Dernière chance : l'en-tête devient « DERNIÈRE CHANCE ! » (rouge), NON MERCI devient ABANDONNER.
- Toucher : une ligne entière (largeur de la feuille, ≥ 20 pixels d'art de haut) coche ou décoche ; les boutons ont ≥ 20 pixels d'art de haut ; un toucher hors de la feuille ne fait rien. Clavier : 1, 2, 3 cochent ; Entrée commande ; Échap refuse.
- COMMANDER : tampon « VALIDÉ » vert qui s'abat (son `stamp`), le score descend en compteur rapide (comportement existant du HUD), la feuille s'envole vers le haut en .3 s, puis la suite. NON MERCI : la feuille glisse vers le bas en .25 s.
- Sons : `tick` (case), `paper` (apparition), `stamp` (existant).
- Le bon tient dans l'écran le plus étroit (`config.view.minW` / `minH`), avec une marge.

## 4. Architecture

- **`src/play/shop.js`** (nouveau, `FP.shop`, logique pure) :
  - `open(state, { lastChance })` → écrit `state.shop = { visit, lastChance, items: [{ id, price, promo, checked }], transport, phase: 'in'|'idle'|'ordered'|'declined', t0 }` (`visit` = `state.shopVisits += 1`) ;
  - `toggle(state, i)`, `total(state)`, `canCheck(state, i)`, `co2(state)` ;
  - `order(state)` → débite, applique (`applyItem(state, id)`), phase `ordered` ; `decline(state)` → phase `declined` ;
  - `update(state, dt)` (dans `UPDATE_ORDER`, avant `flow`) : à la fin de l'animation de sortie, rend la main au déroulé (`FP.flow.afterShop(state, bought)`).
- **`state.boosts`** : `{ magnet, premium, compost, filter, beer }` (booléens) remis à zéro par `FP.plant.prepare` ; lus par `play/coins.js` (aimant, premium), `FP.plant.speed` (compost), `play/flow.js` `expose` (filtre), `world/hazards.js` (bière). `membrane` → `state.power.shield = true` ; `spore` → `FP.powerups.detonate(state, seed.x, seed.y)` au lancement (via un drapeau `state.boosts.spore` lu par `FP.plant.launch`) ; `lobbying` → `FP.level.generate(state, { lobbying: true })` puis `FP.plant.prepare` (les autres effets de la commande sont réappliqués après) ; `seed` → `plant.reserves += 1`.
- **`src/play/flow.js`** : après `dying` : `generate` + `prepare` + `FP.shop.open` (mode `shop`) ; après le fondu de l'éclosion : `FP.shop.open` au lieu de `ready` ; dernière mort : `FP.shop.open(state, { lastChance: true })` au lieu de `over`. `afterShop(state, bought)` : après une mort → `launch` ; après une éclosion → `ready` ; dernière chance → `launch` si une graine a été achetée (reserves > 0), sinon `over`.
- **`src/world/level.js`** : `generate(state, opts)` ; `opts.lobbying` multiplie le nombre d'obstacles par `shop.lobbyingK` (.6).
- **`src/play/powerups.js`** : expose `detonate`.
- **`src/ui/order.js`** (nouveau, `FP.orderForm`) : `layout(uiW, uiH)` → boîtes de la feuille, des 3 lignes et des 2 boutons (pur, testé) ; `hit(state, ax, ay)` → `{ kind: 'line', i } | { kind: 'order' } | { kind: 'decline' } | null` ; `draw(g, state)`.
- **`src/ui/menu.js`** : en mode `shop`, toucher → `FP.orderForm.hit` → `FP.shop.toggle/order/decline` ; touches 1/2/3, Entrée, Échap.
- **`src/ui/ui.js`** : dessine le bon en mode `shop` (après le HUD).
- **`src/audio/sfx.js`** : recettes `tick`, `paper` ; `audio.js` : événements `shopOpen` → `paper`, `shopTick` → `tick`, `shopOrder` → `stamp`.
- **`src/core/config.js`** : `shop: { salt, promo: .5, lobbyingK: .6, items: [{ id, price, co2 }], transports: [...] }` ; textes du bon dans `text.shop` (noms, lignes, en-têtes, boutons, mentions).
- `index.html` / `dev/check.html` : balises `<script>`.

## 5. Tests (TDD, sous Node)

- Tirage : 3 articles distincts, exactement une promo à prix × .5 arrondi à 25 ; même graine et même `visit` → même offre ; `state.rng` intact.
- Dernière chance : la Graine Bio™ est présente sur 50 tirages.
- Coches : impossible de dépasser le score ; `canCheck` faux pour un article trop cher ; total et CO₂ (0 sans article, somme des masses sinon).
- Commande : score débité (jamais < 0) ; un test par article sur l'effet attendu à la pousse suivante ; les effets ne survivent pas à la pousse d'après ; `seed` survit.
- Déroulé : mort → `shop` → `playing` ; éclosion → `shop` → `ready` ; dernière mort → `shop` → `over` si refus, → `playing` avec une graine achetée.
- Lobbying : moins d'obstacles qu'avec la même graine sans lobbying.
- Mise en page : feuille, lignes et boutons dans l'écran minimal, zones ≥ 20 de haut, sans chevauchement ; `hit` hors de la feuille → `null`.
- Bout en bout : mourir, cocher membrane + aimant, commander → la pousse suivante a le bouclier et le rayon de ramassage doublé.

## 6. Hors champ

- Améliorations permanentes, progression entre parties, collection.
- Effet du CO₂ en jeu.
- Bonus posés sur le terrain (sous-projet 3).
