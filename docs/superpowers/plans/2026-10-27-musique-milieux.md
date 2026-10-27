# Musique des milieux — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque milieu joue sa propre musique (3 ou 4 variantes) et chaque niveau de boss la version boss de cette musique (v4.10.0).

**Architecture:** les partitions restent des données (`FP.songs`), écrites avec des constructeurs partagés (`FP.score`), un fichier par milieu. `FP.music.songFor` choisit le morceau d'après le niveau généré (`world.milieu`, `world.boss`) ; le séquenceur et les couches ne changent pas. Les nouveaux timbres sont des entrées de `FP.synth.INSTRUMENTS` et des percussions de `drum()`.

**Tech Stack:** JavaScript sans dépendance (modules IIFE sur `window.FP`), Web Audio (FM 2 opérateurs), tests maison `dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-27-musique-milieux-design.md` ; partitions validées : `docs/audio/maquettes-milieux.js` (I4, BI4, D3, N4E).

## Global Constraints

- Seul `src/audio/synth.js` crée des nœuds Web Audio ; tout reste en FM ou bruit filtré ; le jeu marche en `file://`.
- `index.html` : seulement des lignes `<script>` en plus, et le `<title>` de version.
- Fichiers sous 400 lignes ; si `synth.js` dépasse, `INSTRUMENTS` passe d'abord dans `src/audio/instruments.js` (commit séparé).
- Pas de code mort : les noms `game*` et `FP.songs.gameVariants` disparaissent.
- Couches : `groove`, `clav`, `perc`, `organ`, `sitar`, `ghost`, mêmes rôles partout.
- Noms : `friche0..3`, `fricheBoss`, `industrie0..2`, `industrieBoss`, `decharge0..2`, `dechargeBoss`, `nucleaire0..2`, `nucleaireBoss`.
- Densité : notes par seconde de chaque morceau ≤ 1,3 × celles de `friche0`.
- Volume (navigateur, rendu hors ligne) : morceau de jeu à ±2 dB de `friche0`, boss entre +2 et +4 dB.
- Tests : `node dev/run-checks.js </dev/null` (≈ 2 min) ; une entrée de CHANGELOG ; version `4.10.0`.
- Commits terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Mort sur le niveau de boss puis nouvelle graine : le thème du boss continue (le niveau régénéré reste un niveau de boss).
2. Après la boutique d'avant boss (mode `ready`) : thème du boss en veille, pas une variante du milieu.
3. Saison 2 (retour en friche après le 4ᵉ boss) : la friche revient, sans relais en fin de mesure depuis le nucléaire.
4. Pendant l'éclosion du dernier niveau d'un milieu : la musique de ce milieu continue jusqu'à la régénération.
5. Écran de fin, titre, boutique, certificat : morceaux inchangés.

Les tests de ces cinq cas sont dans la tâche 7.

---

### Task 1: constructeurs partagés, friche renommée

**Files:**
- Create: `src/audio/score.js`
- Modify: `src/audio/songs.js`, `src/audio/music.js`, `index.html`, `dev/check.html`
- Test: `dev/tests/music.test.js`, `dev/tests/sequencer.test.js`

**Interfaces:**
- Produces: `FP.score.song(bpm, pcs, fill, bars = 8) → { bpm, bars, beatsPerBar: 4, pcs, notes }` où `fill(bar, add, hit)`, `add(layer, inst, beat, midi, dur, vel = 1, extra)`, `hit(layer, kind, beats, vel = 1 | (beat) => vel)` (beats dans la mesure) ; `FP.score.q(i) = i / 4` ; `FP.score.ALL16`, `EIGHTHS`, `OFF` ; `FP.score.soft16(beat)` ; `FP.score.melody(add, layer, inst, items, vel = 1, extra)` ; `FP.score.melt(bar, cents) = -cents * bar / 7`. Mêmes définitions que dans `docs/audio/maquettes-milieux.js`.
- Produces: `FP.songs.friche0..3`, `FP.songs.variants(id) → nombre de variantes` (4 pour `'friche'`).

- [ ] **Step 1: tests** — dans `music.test.js`, remplacer `FP.songs.game` par `FP.songs.friche0`, `FP.songs.gameVariants` par `[0, 1, 2, 3].map(v => FP.songs['friche' + v])`, l'attente `'game0,game1,game2,game3,game0'` par `'friche0,friche1,friche2,friche3,friche0'`, `startsWith('game')` par `startsWith('friche')` ; dans `sequencer.test.js`, `game0`/`game1` → `friche0`/`friche1`. Ajouter :

```js
FP.test('score: constructeurs partagés', () => {
  const s = FP.score.song(120, [0], (bar, add, hit) => { add('groove', 'bass', 1, 36, .5); hit('perc', 'hat', [0, .5], .4); }, 2);
  FP.assertEqual(s.bars, 2); FP.assertEqual(s.notes.length, 6);
  FP.assertEqual(s.notes.map(n => n.beat).join(), '0,0.5,1,4,4.5,5');
  FP.assertEqual(FP.score.melt(7, 30), -30); FP.assertEqual(FP.songs.variants('friche'), 4);
  FP.assert(!('game' in FP.songs) && !('gameVariants' in FP.songs));
});
```

- [ ] **Step 2: lancer** `node dev/run-checks.js </dev/null` → échecs sur `FP.score` et `friche*`.
- [ ] **Step 3: implémenter** `score.js` (chargé avant `songs.js` dans `index.html` et `dev/check.html`) ; dans `songs.js`, noms `friche0..3`, `variants(id)` qui compte les clés `id + chiffre` présentes ; `music.js` : `songFor` renvoie `'friche' + v`, et un test interne `isGame(name)` (= ni `title` ni `shop`) remplace `startsWith('game')`. Les partitions de la friche ne changent pas.
- [ ] **Step 4: relancer** → tout vert.
- [ ] **Step 5: commit** `musique : constructeurs de partition partagés, friche renommée`.

### Task 2: timbres et percussions des milieux

**Files:**
- Modify: `src/audio/synth.js` (ou d'abord `src/audio/instruments.js` si > 400 lignes)
- Test: `dev/tests/synth.test.js`

**Interfaces:**
- Produces: dans `FP.synth.INSTRUMENTS`, les instruments de la maquette (`metal, siren, hum2, strings, slide, choir, sbrass, rslap, accordion, melodica, horn, upright, pulse, arp, pad, doom, sub, lowbrass, growl, saws`, `cowbell`), valeurs identiques à `docs/audio/maquettes-milieux.js` ; dans `FP.synth.DRUMS` : `clap, steam, lid, tick, guiro, cowbell`, joués par `drum()` comme dans `EXTRA` de la maquette (sans le `wrap`).

- [ ] **Step 1: test**

```js
FP.test('synth: timbres et percussions des milieux', () => {
  for (const k of ['metal','siren','hum2','strings','slide','choir','sbrass','rslap','accordion','melodica','horn','upright','pulse','arp','pad','doom','sub','lowbrass','growl','saws','cowbell'])
    FP.assert(FP.synth.INSTRUMENTS[k] && FP.synth.INSTRUMENTS[k].ratio > 0, k);
  for (const d of ['clap','steam','lid','tick','guiro','cowbell']) FP.assert(FP.synth.DRUMS.includes(d), d);
  const ac = fakeAudioContext(), e = FP.synth.create(ac);   // l'espion de synth.test.js
  for (const d of ['clap','steam','lid','tick','guiro','cowbell']) { const before = ac.created; e.drum(d, 0, 1, { bus: 'music', layer: 'groove' }); FP.assert(ac.created > before, d + ' joue'); }
});
```
(Adapter `fakeAudioContext`/`ac.created` au nom réel de l'espion existant dans `synth.test.js`.)
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: implémenter** ; vérifier `wc -l src/audio/synth.js` ≤ 400 (sinon découpage d'abord, commit séparé `audio : instruments dans leur fichier`, chargé avant `synth.js`).
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : timbres et percussions des milieux`.

### Task 3: zone industrielle — Funk à la chaîne

**Files:**
- Create: `src/audio/songs-industrie.js` (+ `index.html`, `dev/check.html` après `songs.js`)
- Create test: `dev/tests/songs.test.js`

**Interfaces:**
- Consumes: `FP.score` (tâche 1), instruments (tâche 2).
- Produces: `FP.songs.industrie0..2`, `FP.songs.industrieBoss` ; helper de test `checkMilieuSongs(id, count)` dans `songs.test.js`, réutilisé par les tâches 4 à 6.

- [ ] **Step 1: test**

```js
const LAYERS = ['groove', 'clav', 'perc', 'organ', 'sitar', 'ghost'];
const nps = (s) => s.notes.length / (s.bars * s.beatsPerBar * 60 / s.bpm);
function checkMilieuSongs(id, count) {
  FP.assertEqual(FP.songs.variants(id), count, id);
  const all = [...Array(count).keys()].map(v => FP.songs[id + v]).concat([FP.songs[id + 'Boss']]);
  for (const s of all) {
    FP.assert(s && s.notes.length, id);
    for (const l of LAYERS) FP.assert(s.notes.some(n => n.layer === l), id + ' couche ' + l);
    for (const n of s.notes) {
      FP.assert(FP.synth.DRUMS.includes(n.inst) || FP.synth.INSTRUMENTS[n.inst], id + ' ' + n.inst);
      if (!FP.synth.DRUMS.includes(n.inst)) FP.assert(s.pcs.includes(n.midi % 12), id + ' ' + n.inst + ' ' + n.midi);
    }
    FP.assert(nps(s) <= 1.3 * nps(FP.songs.friche0), id + ' trop dense : ' + nps(s).toFixed(1));
  }
  FP.assert(FP.songs[id + 'Boss'].bpm >= FP.songs[id + '0'].bpm + 10, id + ' : boss plus rapide');
  for (const inst of new Set(FP.songs[id + '0'].notes.filter(n => n.layer === 'groove' && !FP.synth.DRUMS.includes(n.inst)).map(n => n.inst)))
    FP.assertEqual(new Set([...Array(count).keys()].map(v => FP.songs[id + v].notes.filter(n => n.inst === inst).map(n => n.midi).join())).size, count, id + ' : riffs différents');
}
FP.test('songs: zone industrielle, 3 variantes et un boss', () => checkMilieuSongs('industrie', 3));
```
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** `industrie0` = I4 de la maquette, `industrieBoss` = BI4 tels quels (via `FP.score`) ; `industrie1`, `industrie2` = même instrumentation, même tonalité (la mineur blues), même batterie, autres riffs de slap, autres accords de clavinet et autres phrases de cordes (sur le modèle des 4 variantes de la friche).
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : zone industrielle, funk à la chaîne et son boss`.

### Task 4: décharge — Cumbia de la benne

**Files:** Create `src/audio/songs-decharge.js` (+ scripts) ; test `dev/tests/songs.test.js`.

- [ ] **Step 1: test** `FP.test('songs: décharge, 3 variantes et un boss', () => checkMilieuSongs('decharge', 3));`
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** `decharge0` = D3 ; `decharge1..2` : même instrumentation et tonalité (sol mineur harmonique), autres lignes de contrebasse, autres grilles (ex. Cm–D, Eb–D), autres ritournelles d'accordéon ; `dechargeBoss` d'après le gabarit de la spec (BI4) : +10 à +15 BPM, demi-temps qui écrase, basse sale + sous-basse, cuivres graves sur un accord diminué, motif du boss (4 notes tirées de la ligne de basse, cuivres graves, fin de mesure paire), le gag (cuivres fatigués) qui tombe d'un triton, deux sirènes en triton (toxique), ligne chromatique descendante (surface) ; râpe et accordéon gardés pour qu'on reconnaisse la cumbia.
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : décharge, cumbia de la benne et son boss`.

### Task 5: site nucléaire — Disco radieux, EDM malade

**Files:** Create `src/audio/songs-nucleaire.js` (+ scripts) ; test `dev/tests/songs.test.js`.

- [ ] **Step 1: test** `FP.test('songs: site nucléaire, 3 variantes et un boss', () => checkMilieuSongs('nucleaire', 3));`
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** `nucleaire0` = N4E **allégé** jusqu'à ≤ 1,3 × la densité de `friche0` (accords qui pompent à 2 notes, désaccord par paires remplacé par un seul désaccord qui grandit ; arpège gardé) ; `nucleaire1..2` : mêmes timbres et tonalité (mi majeur), autres grilles et autres basses, chacune avec sa montée en 7ᵉ-8ᵉ mesure ; `nucleaireBoss` d'après le gabarit, en gardant le drop, la basse qui gronde et le compteur Geiger.
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : site nucléaire, disco radieux EDM malade et son boss`.

### Task 6: thème du boss de la friche

**Files:** Modify `src/audio/songs.js` ; test `dev/tests/songs.test.js`.

- [ ] **Step 1: test** `FP.test('songs: friche, 4 variantes et un boss', () => checkMilieuSongs('friche', 4));`
- [ ] **Step 2: lancer** → échec.
- [ ] **Step 3: écrire** `fricheBoss` d'après le gabarit, à partir de `friche0` (mi mineur blues, slap, clavinet, orgue, sitar, thérémine) ; si `songs.js` approche 400 lignes, le mettre dans `src/audio/songs-friche.js` avec la friche.
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : thème du boss de la friche`.

### Task 7: quel morceau, quand

**Files:**
- Modify: `src/world/level.js` (≈ l. 350), `src/audio/music.js`
- Test: `dev/tests/music.test.js`, `dev/tests/milieux.test.js`

**Interfaces:**
- Consumes: `FP.songs.variants(id)` (tâche 1) ; toutes les partitions des tâches 3 à 6 (le nombre de variantes de chaque milieu en dépend).
- Produces: `state.world.boss` (booléen, écrit par `FP.level.generate` = `state.run.boss`) ; `FP.music.songFor(state)` → `{ song: '<milieu><v>' | '<milieu>Boss', gain: 1 }` en jeu ; `FP.music.tempoFor(state)` ; `FP.music.layersFor(state)`.

- [ ] **Step 1: tests** (helper `inMilieu(s, i, boss)` : `s.run.milieu = i; s.run.boss = boss; FP.level.generate(s)`) :

```js
FP.test('level: le niveau sait s’il est un niveau de boss', () => {
  const s = mRun(); FP.assertEqual(s.world.boss, false); s.run.boss = true; FP.level.generate(s); FP.assertEqual(s.world.boss, true);
});
FP.test('music: le morceau suit le milieu du niveau, sa variante la pousse', () => {
  const s = mRun(); inMilieu(s, 1, false); s.plant.stemCount = 1; FP.assertEqual(FP.music.songFor(s).song, 'industrie0');
  s.plant.stemCount = 4; FP.assertEqual(FP.music.songFor(s).song, 'industrie0');   // 3 variantes en boucle
  s.plant.stemCount = 3; FP.assertEqual(FP.music.songFor(s).song, 'industrie2');
});
FP.test('music: niveau de boss → thème du boss, après une mort et sur la graine après la boutique', () => {
  const s = mRun(); inMilieu(s, 2, true); FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
  s.mode = 'ready'; FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
  s.mode = 'shop'; FP.assertEqual(FP.music.songFor(s).song, 'shop');
  s.mode = 'dying'; FP.level.generate(s); FP.assertEqual(FP.music.songFor(s).song, 'dechargeBoss');
});
FP.test('music: pendant l’éclosion, le morceau du niveau joué continue jusqu’à la régénération', () => {
  const s = mRun(); inMilieu(s, 0, true); s.mode = 'bloom'; s.run.milieu = 1; s.run.boss = false;   // boss battu, pas encore régénéré
  FP.assertEqual(FP.music.songFor(s).song, 'fricheBoss'); FP.level.generate(s); FP.assert(FP.music.songFor(s).song.startsWith('industrie'));
});
FP.test('music: tempo du morceau + 4 par pousse du milieu ; un boss à son tempo', () => {
  const s = mRun(); inMilieu(s, 0, false); s.plant.stemCount = 1; s.run.step = 0; FP.assertEqual(FP.music.tempoFor(s), 100);
  s.run.step = 2; FP.assertEqual(FP.music.tempoFor(s), 108);
  s.score.flowers = 40; FP.assertEqual(FP.music.tempoFor(s), 108);
  inMilieu(s, 0, true); s.run.step = 3; FP.assertEqual(FP.music.tempoFor(s), FP.songs.fricheBoss.bpm);
});
FP.test('music: sur un niveau de boss, la couche de surface reste ouverte', () => {
  const s = mRun(); inMilieu(s, 1, true); FP.assertEqual(FP.music.layersFor(s).sitar, 1);
});
FP.test('music: relais en fin de mesure seulement entre deux variantes du même milieu', () => {
  FP.assert(FP.music.relay('friche0', 'friche1')); FP.assert(!FP.music.relay('nucleaire2', 'friche0'));
  FP.assert(!FP.music.relay('industrie1', 'industrieBoss')); FP.assert(!FP.music.relay('shop', 'industrieBoss'));
});
```
Remplacer le test « tempo 100, +3,5 par éclosion, plafond 125 » (supprimé) et, dans « la variante suivante démarre au tempo acquis », poser `s.run.step = 2` au lieu de `s.score.flowers = 4` et attendre 108 BPM au lieu de 114.
- [ ] **Step 2: lancer** → échecs attendus (pas de `world.boss`, noms `friche*` partout, `relay` absent).
- [ ] **Step 3: implémenter** — `level.generate` : `world.boss = !!state.run.boss` à côté de `world.milieu` (mettre à jour l'en-tête « Écrit ») ; `music.js` : `songFor` en jeu lit `world.milieu`/`world.boss` ; `tempoFor(state)` = `bpm` du morceau de `songFor` (+ `4 * state.run.step` hors boss), 100 si la partition manque ; `layersFor` : `sitar: 1` si `world.boss` hors veille ; `relay(prev, next)` exposé ; `update` passe `atBar: relay(current, next)`. En-têtes « Lit/Expose » à jour.
- [ ] **Step 4: relancer** → vert.
- [ ] **Step 5: commit** `musique : le morceau suit le milieu et le boss du niveau`.

### Task 8: page d'écoute, volumes, validation à l'oreille, version

**Files:**
- Create: `docs/audio/ecoute-milieux.html`
- Modify: `src/core/config.js` (`version: '4.10.0'`), `index.html` (`<title>`), `dev/tests/state.test.js` (version), `docs/architecture.md` (arbre `audio/`, liste des scripts, paragraphe Son), `CHANGELOG.md`

- [ ] **Step 1:** test de version → `'4.10.0'` ; lancer → échec ; changer la version et le titre ; relancer → vert.
- [ ] **Step 2: page d'écoute** qui charge `src/audio/synth.js`, `score.js`, `songs*.js`, `sequencer.js` (aucune copie de partition) : par milieu, un bouton par variante et un pour le boss ; boutons surface / frôlement / toxique / veille comme dans les maquettes.
- [ ] **Step 3: volumes** — dans le navigateur (serveur local), rendu hors ligne de chaque morceau (méthode des maquettes : `OfflineAudioContext`, `suspend` tous les 0,1 s) : morceaux de jeu à ±2 dB de `friche0`, boss entre +2 et +4 dB ; retoucher les `vel`/gains sinon.
- [ ] **Step 4: validation à l'oreille** — envoyer la page à l'utilisateur ; appliquer ses retouches sur la branche (suite verte après chaque retouche).
- [ ] **Step 5: partie jouée** dans le navigateur (graine fixe, invincible) jusqu'au 2ᵉ milieu et à travers un boss : morceau qui change au carton, thème du boss sur la graine après la boutique, aucune erreur de console.
- [ ] **Step 6: docs et CHANGELOG** (entrée v4.10.0, nombre de tests) ; suite complète verte ; commit `v4.10.0 — Musique des milieux`.
