# Décors des milieux — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque milieu a son ciel, son horizon, ses accessoires de surface et son sous-sol, dessinés en pixel art par le code (v4.11.0).

**Architecture:** un module de décor par milieu (`FP.decor[id]`, contrat commun), branché dans `render/sky.js` (deux caches : fond et horizon) et `render/soil.js` (accessoires et sous-sol peints dans le cache de la terre, petites animations sur la tranche visible). Les dessins reprennent la maquette validée.

**Tech Stack:** JavaScript sans dépendance (IIFE sur `window.FP`), canvas 2D via `FP.px`, tests maison `dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-28-decors-milieux-design.md` ; maquette de référence : `docs/art/maquette-decors.js` (friche variante 0 = A ; industrie, décharge, nucléaire variante 1 = B).

## Global Constraints

- Pixel art uniquement via `FP.px` (rect, line, disc, ring, dither) ; pas de `getImageData` ; le jeu marche en `file://`.
- `render/*` lit l'état, n'écrit rien ; `world/*` ne lit pas `render/*`.
- Aucune teinte de décor à moins de 60 (distance RVB) d'une teinte de `FP.palette.danger` ; lueurs radioactives en vert d'eau `#3ab88a`, `#5ad0a0`, `#8af0c0`.
- Sous-sol sourd : jamais de noir pur (luminance < 10) ; poches d'huile brun-noir proches de la strate.
- Accessoires de surface : hauteur ≤ 22 pixels d'art, au plus un tiers de la largeur couverte.
- Fichiers sous 400 lignes ; pas de code mort (les usines de `sky.js` disparaissent) ; `index.html` : lignes `<script>` et `<title>` seulement.
- Tests : `node dev/run-checks.js </dev/null` ; version `4.11.0` ; une entrée de CHANGELOG ; commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Contrat d'un module de décor (toutes les tâches)

`FP.decor[id] = { palette, skyStatic, back, horizon, front, layout, surface, under, glow }`, en pixels d'art :

- `palette` : tableau de toutes les teintes hexadécimales que le module dessine (en plus de celles de `FP.palette.milieux[id]`).
- `skyStatic(g, w, h)` — astre, brume, étoiles fixes ; dans le cache du fond du ciel (`h` = hauteur du ciel jusqu'au haut de la pelouse).
- `back(g, w, h, oy, t)` — ciel animé, derrière l'horizon ; dessiné décalé de `-oy` (caméra).
- `horizon(g, w, h)` — silhouettes fixes posées sur `y = h` ; dans le cache de premier plan du ciel.
- `front(g, w, h, oy, t)` — animations de l'horizon, décalées de `-oy`.
- `layout(w, top, bottom, rnd) → { surface: [{kind, x}], under: [{kind, x, y}] }` — placements tirés de `rnd` (pur, déterministe ; `top` = haut de la terre, `bottom` = bas du niveau, en pixels d'art).
- `surface(g, L, y)` — accessoires de `L.surface` posés sur `y` (haut de la pelouse).
- `under(g, L)` — décor fixe de `L.under` et éléments longs (traversent la largeur).
- `glow(g, L, y, oy, viewH, t)` — petites animations (surface et sous-sol) des éléments de `L` visibles dans `[oy − 8, oy + viewH + 8]`, dessinées décalées de `-oy`.

Taille d'écran : le dessin de la maquette (ciel de 70, largeur 220) est un **motif** répété tous les 220 pixels sur la largeur ; ses hauteurs sont multipliées par `min(1, h / 70)`, posées sur le bas du ciel ; l'astre et la météo se placent en proportion de `w` et `h`. (Ceci précise la spec, qui ne fixe pas la façon de remplir la largeur.)

## Review Focus

1. Écran très étroit (ciel de 50 pixels d'art) : l'horizon ne déborde pas en haut du ciel, la tour/grue reste entière.
2. Écran large (400 pixels d'art) : l'horizon se répète sans trou ni coupure visible au raccord.
3. Niveau très profond (grand `bottom`) : le décor enterré se répartit sur toute la hauteur, sans paquet en haut.
4. Changement de milieu sous le noir : le décor du nouveau milieu s'affiche au carton (les caches suivent `world.milieu`).
5. Fleurs de l'éclosion et graine : jamais cachées par un accessoire (ordre de dessin).

Tests : 1, 2 et 3 dans `checkDecor` (tâche 1) ; 4 et 5 dans la vérification au navigateur (tâche 5).

---

### Task 1: friche (A) et le contrat testé

**Files:**
- Create: `src/render/decor-friche.js` ; `dev/tests/decor.test.js`
- Modify: `index.html`, `dev/check.html` (le script, après `palette.js`, et le test)

**Interfaces:**
- Produces: `FP.decor.friche` (contrat ci-dessus) ; dans `decor.test.js`, `checkDecor(id)` réutilisé par les tâches 2 à 4.

- [ ] **Step 1: test** — `decor.test.js` :

```js
// Faux contexte qui retient chaque rectangle peint (x, y, w, h, couleur) ; drawImage ignoré.
const recCtx = () => ({ rects: [], set fillStyle(c) { this._c = c; }, get fillStyle() { return this._c; },
  fillRect(x, y, w, h) { this.rects.push({ x, y, w, h, c: this._c }); }, drawImage() {}, clearRect() {} });
const rng = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
function checkDecor(id) {
  const D = FP.decor[id], known = new Set([...D.palette, ...FP.palette.decor()]);
  for (const f of ['skyStatic', 'back', 'horizon', 'front', 'layout', 'surface', 'under', 'glow']) FP.assert(typeof D[f] === 'function', id + ' ' + f);
  for (const c of D.palette) for (const d of FP.palette.danger) FP.assert(dist(c, d) >= 60, id + ' ' + c + ' trop proche de ' + d);
  const used = (g) => g.rects.forEach(r => FP.assert(known.has(r.c), id + ' teinte hors palette ' + r.c));
  for (const [w, h] of [[180, 50], [220, 70], [400, 120]]) {
    let g = recCtx(); D.skyStatic(g, w, h); D.back(g, w, h, 0, 3.7); used(g);
    g = recCtx(); D.horizon(g, w, h); D.front(g, w, h, 0, 3.7); used(g);
    FP.assert(g.rects.every(r => r.y >= 0 && r.y + r.h <= h + 1), id + ' horizon hors du ciel (' + w + '×' + h + ')');
    const cols = new Set(); g.rects.forEach(r => { if (r.y + r.h >= h - 2) for (let x = Math.max(0, r.x); x < Math.min(w, r.x + r.w); x++) cols.add(x); });
    FP.assert(cols.size > w * .5, id + ' horizon troué (' + w + ')');
  }
  const top = 100, bottom = 1900, L = D.layout(300, top, bottom, rng(5));
  FP.assertEqual(JSON.stringify(L), JSON.stringify(D.layout(300, top, bottom, rng(5))));
  FP.assert(JSON.stringify(L) !== JSON.stringify(D.layout(300, top, bottom, rng(6))), id + ' : même décor pour deux niveaux');
  FP.assert(L.under.length >= (bottom - top) / 300 && L.under.length <= (bottom - top) / 50, id + ' densité ' + L.under.length);
  FP.assert(L.under.some(u => u.y > top + (bottom - top) * .66), id + ' : rien dans le bas du niveau');
  let g = recCtx(); D.surface(g, L, top - 2); used(g);
  FP.assert(g.rects.every(r => r.y >= top - 2 - 22 && r.y + r.h <= top + 1), id + ' accessoire trop haut');
  const cover = new Set(); g.rects.forEach(r => { for (let x = r.x; x < r.x + r.w; x++) cover.add(x); });
  FP.assert(cover.size <= 300 / 3, id + ' accessoires trop larges : ' + cover.size);
  g = recCtx(); D.under(g, L); used(g);
  FP.assert(g.rects.every(r => r.y >= top && r.y < bottom && Math.max(...rgb(r.c)) >= 10), id + ' sous-sol hors terre ou noir pur');
  g = recCtx(); D.glow(g, L, top - 2, 600, 400, 2.3); used(g);
  FP.assert(g.rects.every(r => r.y >= -8 - 22 && r.y <= 400 + 8), id + ' glow hors de la tranche visible');
}
FP.test('decor: friche', () => checkDecor('friche'));
```
- [ ] **Step 2: lancer** → échec (`FP.decor` absent).
- [ ] **Step 3: écrire** `decor-friche.js` d'après la maquette, variante 0 : `skyStatic` = soleil voilé ; `back` = smog qui dérive ; `horizon` = barres d'immeubles et grue (motif de 220, répété) ; `front` = fenêtres qui s'allument/s'éteignent ; `layout`/`surface` = palissade taguée, caddie, plots (positions tirées, sans chevauchement) ; `under` = briques, gravats, canalisation et câble (éléments longs sur la largeur, répartis en profondeur) ; `glow` = aucune animation (fonction vide qui respecte le contrat). En-tête Lit/Écrit/Expose.
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `décors : friche et contrat des décors`.

### Task 2: zone industrielle (B)

**Files:** Create `src/render/decor-industrie.js` (+ scripts) ; test `FP.test('decor: industrie', () => checkDecor('industrie'));`

- [ ] **Step 1: test** ; **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** d'après la maquette, variante 1 : brume de soufre et panaches lents ; raffinerie, torchère qui vacille, convoyeur et ses caisses, panaches qui montent ; palettes, fûts, rails ; conduites rouillées, scories, poches d'huile **sourdes** (brun-noir, ex. `#1e1a14` / `#26201a`, reflet `#3a3830` qui luit par intermittence dans `glow`).
- [ ] **Step 4: relancer** → vert. **Step 5: commit** `décors : zone industrielle`.

### Task 3: décharge (B)

**Files:** Create `src/render/decor-decharge.js` (+ scripts) ; test `FP.test('decor: décharge', () => checkDecor('decharge'));`

- [ ] **Step 1: test** ; **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** d'après la maquette, variante 1 (avec les retouches : poussière seulement sur le bas du ciel, fumée aux teintes 4-5 du ciel) : montagne d'ordures mouchetée (une par motif, raccordée au motif voisin), grue à grappin qui se balance, fumée de brûlage, mouettes ; sacs, pneus, frigo ; couches de déchets compactés, suintements qui gouttent (`glow`).
- [ ] **Step 4: relancer** → vert. **Step 5: commit** `décors : décharge`.

### Task 4: site nucléaire (B)

**Files:** Create `src/render/decor-nucleaire.js` (+ scripts) ; test `FP.test('decor: nucléaire', () => checkDecor('nucleaire'));` et

```js
FP.test('decor: un décor pour chaque milieu', () => { for (const m of FP.config.milieux) FP.assert(FP.decor[m.id], m.id); });
```
- [ ] **Step 1: tests** ; **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** d'après la maquette, variante 1 (vapeur réduite) : étoiles, grosse lune verte, aurore épaisse ; tour de refroidissement géante qui fume, clôture barbelée, trèfle ; fûts jaunes, panneaux, herbe mutante qui luit ; galerie de béton, fûts enterrés qui fuient, cailloux qui luisent.
- [ ] **Step 4: relancer** → vert. **Step 5: commit** `décors : site nucléaire`.

### Task 5: branchement dans le ciel et la terre, vérification, version

**Files:**
- Modify: `src/render/sky.js`, `src/render/soil.js`, `src/core/config.js` (`version: '4.11.0'`), `index.html` (`<title>`), `dev/tests/state.test.js`, `docs/architecture.md`, `CHANGELOG.md`

**Interfaces:**
- Consumes: `FP.decor[world.milieu]` (tâches 1 à 4).

- [ ] **Step 1: test de version** → `'4.11.0'` ; lancer → échec ; changer version et titre ; relancer → vert.
- [ ] **Step 2: `sky.js`** — deux caches (clé : largeur, hauteur, milieu, nuance) : fond = bandes tramées + `skyStatic` ; premier plan = `horizon`. `draw` : fond, `back(actx, w, h, oy, t)`, premier plan, `front(...)`. Les usines, cheminées, `chimneys()` et le smog générique disparaissent (le smog de la friche vit dans `decor-friche.back`). En-tête à jour.
- [ ] **Step 3: `soil.js`** — dans `build`, après la pelouse : `L = decor.layout(w, topArt, hArt, rng(seed ^ 0x5eed))`, gardé avec le cache ; `decor.under(g, L)` **avant** la frange et la pelouse, `decor.surface(g, L, topArt - 2)` après la pelouse ; dans `draw`, après la recopie : `decor.glow(actx, L, topArt - 2, oy, viewH, state.time)`. En-tête à jour.
- [ ] **Step 4: suite** → vert.
- [ ] **Step 5: navigateur** (serveur local, graine fixe, partie invincible accélérée comme pour la v4.10) : captures de chaque milieu à la surface et en profondeur, sur 360×780 et 1000×780 ; décor du nouveau milieu au carton ; fleurs et graine devant les accessoires ; aucune erreur de console. Perf : `dev/bench-level.js` (même machine, même moment) avant/après, pas plus de 10 % de temps d'image en plus.
- [ ] **Step 6: docs et CHANGELOG** (entrée v4.11.0, nombre de tests ; `architecture.md` : arbre `render/`, liste des scripts, rendu du ciel et de la terre) ; suite verte ; commit `v4.11.0 — Décors des milieux`.
