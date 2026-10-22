# Sound design FM « hippie contaminé » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le son v3 par une bande-son FM façon Mega Drive (thème psyché au titre, funk hanté à couches en jeu) et des effets FM, avec un réglage du son sur l'écran titre.

**Architecture:** `src/audio/` est découpé en six fichiers : moteur FM (`synth.js`), partitions (`songs.js`), séquenceur (`sequencer.js`), direction musicale (`music.js`), effets (`sfx.js`) et chef d'orchestre (`audio.js`). Toute la logique de décision est pure et testée sous Node avec un moteur espion ; seul `synth.js` touche Web Audio. Les sons de jeu viennent des événements ; les sons d'interface sont appelés par les écrans `ui/*`.

**Tech Stack:** JavaScript vanilla (IIFE sur `window.FP`), Web Audio API, aucun fichier son ; tests `node dev/run-checks.js`.

**Spec:** `docs/superpowers/specs/2026-10-22-sound-design-design.md` (maquettes : `docs/audio/maquettes-direction.html`).

## Global Constraints

- Aucun fichier son, aucune dépendance : tout est synthétisé (le jeu marche en double-clic, file://).
- Seul `src/audio/synth.js` crée des nœuds Web Audio ; les autres fichiers audio se chargent sous Node sans `window.AudioContext`.
- Un son raté ne casse jamais une frame : chaque appel au moteur est protégé (`try`/`catch`) ; sans Web Audio, le jeu tourne muet.
- Gammes : titre (A) = mi phrygien dominant, classes de hauteur `{4, 5, 8, 9, 11, 0, 2}` ; jeu (B) = mi mineur blues, `{4, 7, 9, 10, 11, 2}`. Effets et jingles accordés en mi.
- Tempos : A = 92 BPM ; B = `min(125, 100 + 3.5 × score.flowers)`, changé seulement en début de mesure.
- Bus : musique ≈ 0,5 × effets ; réglage `all` / `sfx` / `mute`, clé de stockage `flower_power_v4_sound`, défaut `all`.
- Fondus de couche : 0,2 s à la montée, 0,4 s à la descente ; baisse pendant le frôlement jusqu'à −6 dB ; baisse à la mort −9 dB pendant 1 s.
- `AGENTS.md` : pas de code mort (les recettes v3 sont supprimées), fichiers < 400 lignes, commits ciblés, banc vert avant chaque commit ; message de commit terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- L'implémenteur ne peut pas entendre : chaque tâche 1 à 3 se termine par une **écoute de l'utilisateur** avant la suivante (spec § 6).

## Review Focus

- **Gel de frame / onglet en arrière-plan** : après une longue pause (onglet caché, débogueur), le séquenceur ne doit pas rejouer d'un coup toutes les notes en retard (Task 1 : test « pas de rattrapage »).
- **Changement de tempo au milieu d'une mesure** : aucune note sautée ni doublée à la jonction (Task 1 : test à la frontière de mesure).
- **Morts et éclosions en rafale** : les baisses de volume ne s'empilent pas jusqu'au silence (Task 2 : test « baisses non cumulées »).
- **Toucher l'icône de son** ne doit jamais lancer la partie, et un toucher à côté doit la lancer (Task 4 : tests de zone).
- **Réglage illisible en stockage** (valeur inconnue) : retour à `all` sans planter (Task 4).

---

### Task 1: Moteur FM, séquenceur et musique du titre

**Files:**
- Create: `src/audio/synth.js`, `src/audio/songs.js`, `src/audio/sequencer.js`, `src/audio/music.js`, `dev/tests/sequencer.test.js`
- Modify: `src/audio/audio.js` (déblocage via `FP.synth`, appel de `FP.music.update`), `src/ui/menu.js` (rien d'autre que le réveil existant), `index.html`, `dev/check.html`

**Interfaces:**
- Produces:
  - Note de partition : `{ beat: number, dur: number, inst: string, midi?: number, vel?: number, layer: string }` — `beat` et `dur` en temps (noire = 1), `midi` absent pour la batterie.
  - `FP.songs.title = { bpm: 92, bars: number, beatsPerBar: 4, pcs: number[], notes: Note[] }` (notes triées par `beat`, longueur de boucle = `bars × 4` temps). `FP.songs.game` et `FP.songs.jingles` arrivent aux tâches 2 et 3.
  - `FP.sequencer.notesBetween(song, fromBeat: number, toBeat: number) -> Array<{ note: Note, beat: number }>` — pur : toutes les notes dont le début est dans `[fromBeat, toBeat)`, `beat` absolu (boucle dépliée).
  - `FP.sequencer.createPlayer(backend) -> { play(songName, { fade, gain }), stop(fade), setTempo(bpm), setLayers(map), update(now), current() }`. `update(now)` planifie les notes dont le temps tombe dans `[t, now + LOOKAHEAD)` avec `LOOKAHEAD = .2` s ; `setTempo` prend effet au début de la mesure suivante.
  - Moteur (`FP.synth.create(ac)` en web ; espion en test), méthodes : `now()`, `note(inst, midi, time, dur, vel, route)`, `drum(kind, time, vel, route)`, `burst(time, dur, gain, filterHz, type, route)` (bruit filtré), `setGain(target, value, ramp)`, `setFilter(hz, ramp)`, `drone(...)` (signature v3 conservée), `suspend()`, `resume()`. Jusqu'à la Task 3, le moteur garde aussi `tone(...)` et `noise(...)` de la v3 (mêmes signatures) pour que les anciens effets sonnent encore ; la Task 3 les supprime avec les recettes v3. `route = { bus: 'music'|'sfx', layer?: string }` ; `target` = `'master' | 'music' | 'sfx' | 'layer:<nom>' | 'song'`.
  - `FP.synth.INSTRUMENTS` : `organ`, `organ2`, `bass`, `sitar`, `slap`, `clav`, `brass`, `theremin`, `bell`, `pluck` (paramètres FM : ratio, index, indexEnd, indexTime, attack, decay, sustain, release, gain, trem, vibrato, detune, wet) ; batterie : `kick`, `snare`, `hat`, `openhat`, `tamb`.
  - `FP.music.songFor(state) -> { song: 'title'|'game'|null, gain: number }` ; `FP.music.update(state, events, backend)`.

- [ ] **Step 1: Write the failing tests** — `dev/tests/sequencer.test.js`

```js
const loop4 = { bpm: 120, bars: 1, beatsPerBar: 4, pcs: [4], notes: [
  { beat: 0, dur: 1, inst: 'bass', midi: 40, layer: 'groove' }, { beat: 2.5, dur: .5, inst: 'bass', midi: 52, layer: 'groove' } ] };
FP.test('sequencer: notes d’un intervalle, boucle dépliée', () => {
  const n = FP.sequencer.notesBetween(loop4, 0, 8);
  FP.assertEqual(n.map(x => x.beat).join(','), '0,2.5,4,6.5');
});
FP.test('sequencer: deux fenêtres contiguës = ni doublon ni oubli', () => {
  const a = FP.sequencer.notesBetween(loop4, 0, 2.5), b = FP.sequencer.notesBetween(loop4, 2.5, 4);
  FP.assertEqual(a.length + b.length, 2); FP.assertEqual(b[0].beat, 2.5);
});
FP.test('sequencer: le tempo change en début de mesure, sans note sautée ni doublée', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  FP.songs.__t = loop4; p.play('__t', { fade: 0, gain: 1 });
  for (let t = 0; t <= 5; t += .05) { if (Math.abs(t - .7) < .01) p.setTempo(60); spy.t = t; p.update(t); }
  const times = spy.calls.filter(c => c[0] === 'note').map(c => +c[3].toFixed(3));
  FP.assertEqual(new Set(times).size, times.length, 'pas de doublon');
  FP.assert(times.includes(2) && times.includes(2 + 2.5), 'mesure 2 au nouveau tempo (60 BPM) : ' + times);
  delete FP.songs.__t;
});
FP.test('sequencer: pas de rattrapage après un long gel', () => {
  const spy = audioSpy(), p = FP.sequencer.createPlayer(spy);
  FP.songs.__t = loop4; p.play('__t', { fade: 0, gain: 1 }); p.update(0);
  const before = spy.calls.length; p.update(30);   // 30 s sans mise à jour
  FP.assert(spy.calls.length - before <= 2, 'au plus la fenêtre courante : ' + (spy.calls.length - before));
  delete FP.songs.__t;
});
FP.test('songs: le thème du titre reste dans sa gamme, mesures complètes', () => {
  const s = FP.songs.title;
  FP.assertEqual(s.bpm, 92);
  for (const n of s.notes) {
    if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), 'hors gamme : ' + n.midi);
    FP.assert(n.beat >= 0 && n.beat < s.bars * 4, 'hors boucle : ' + n.beat);
    FP.assert(n.inst in FP.synth.INSTRUMENTS || ['kick', 'snare', 'hat', 'openhat', 'tamb'].includes(n.inst), n.inst);
  }
});
FP.test('music: silence à l’accueil, thème du titre une fois réveillé', () => {
  const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'splash';
  FP.assertEqual(FP.music.songFor(s).song, null);
  s.mode = 'menu'; FP.assertEqual(FP.music.songFor(s).song, 'title');
});
```

`audioSpy()` (helper au début du fichier) : objet `{ t, calls, now() { return this.t; }, note(...a) { calls.push(['note', ...a]); }, drum(...a) { calls.push(['drum', ...a]); }, burst(...a) { calls.push(['burst', ...a]); }, setGain(...a) { calls.push(['gain', ...a]); }, setFilter(...a) { calls.push(['filter', ...a]); }, drone() {}, suspend() {}, resume() {} }`, `t` initialisé à 0. Dans `note`, l'argument d'indice 3 de l'enregistrement (`c[3]`) est `time`.

`dev/check.html` : à la place de `../src/audio/audio.js`, charger `synth.js`, `songs.js`, `sequencer.js`, `music.js`, `audio.js` (dans cet ordre) ; `tests/sequencer.test.js` **avant** `tests/audio.test.js` (son espion `audioSpy` sert aussi aux tests audio et musique).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.sequencer` / `FP.songs` / `FP.music` indéfinis).

- [ ] **Step 3: Implement**

- `synth.js` : la voix FM des maquettes (porteuse + modulateur, indice en Hz = indice × fréquence, enveloppe ADSR par `setTargetAtTime`), batterie (grosse caisse : sinus 150 → 42 Hz ; caisse claire : bruit passe-bande 1 900 Hz + ton FM ; charleston : bruit passe-haut 7 500 Hz ; tambourin : bruit passe-bande 9 000 Hz). Graphe : chaque couche `layer:<nom>` → bus `music` → filtre passe-bas (`setFilter`) → `song` (gain du morceau, pour les fondus) → `master` ; bus `sfx` → `master` ; écho (retard 0,33 s, rétroaction 0,38, passe-bas 2 400 Hz) alimenté par la part `wet` de chaque instrument. `master` → compresseur → sortie. Gains par défaut : `master` 1, `music` 0,5, `sfx` 1.
- `songs.js` : `FP.songs.title`, composé dans l'esprit de la maquette A (mi E F E Dm E F C E ; orgue tremblant + `organ2` désaccordé, basse ronde, sitar une mesure sur deux, grosse caisse, caisse claire, tambourin aux croches), 8 mesures, toutes les notes sur la couche `title`.
- `sequencer.js` : `notesBetween` (déplie la boucle : pour chaque tour `k`, notes `n.beat + k × longueur` dans l'intervalle) ; `createPlayer` garde `{ song, anchorTime, anchorBeat, bpm, pendingBpm, next }`. `update(now)` : si `next < now` (gel), repartir de `now` sans planifier le passé ; planifier jusqu'à `now + .2` en coupant la fenêtre à chaque début de mesure pour appliquer `pendingBpm`. `play` règle `setGain('song', gain, fade)` ; `stop(fade)` descend `song` à 0 puis oublie le morceau.
- `music.js` : garde un lecteur par moteur (`WeakMap` moteur → lecteur) ; `songFor` (pour l'instant : `splash` → `null`, `menu` → `{ song: 'title', gain: 1 }`, autres modes → `{ song: 'game', gain: 1 }`) ; `update` démarre ou arrête le lecteur quand le morceau change (fondu d'entrée 1 s pour le titre) et appelle `player.update(backend.now())` ; un morceau absent de `FP.songs` ne joue rien.
- `audio.js` : `unlock` crée le moteur avec `FP.synth.create(ac)` et installe `setInterval(() => FP.music.update(FP.state.current, [], backend), 25)` ; `consume` appelle aussi `FP.music.update(state, events, backend)`. Les recettes v3 restent pour l'instant (retirées en Task 3).
- `index.html` : les cinq scripts audio à la place de `src/audio/audio.js`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 5: Verify in browser, then listening checkpoint**

Partie au serveur local : aucune erreur console ; à l'écran d'accueil, silence ; au réveil, le thème monte en fondu et boucle. **Demander à l'utilisateur d'écouter le thème du titre et attendre son retour** ; corriger la partition ou les instruments selon ses remarques avant de passer à la Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/audio dev/tests/sequencer.test.js index.html dev/check.html
git commit -m "feat(audio): moteur FM, séquenceur et thème du titre"
```

---

### Task 2: Musique de jeu à couches et tempo

**Files:**
- Modify: `src/audio/songs.js` (`FP.songs.game`), `src/audio/music.js`, `src/audio/audio.js` (pause onglet caché)
- Test: `dev/tests/music.test.js` (nouveau ; dans `dev/check.html` après `tests/sequencer.test.js`)

**Interfaces:**
- Consumes: `FP.sequencer.createPlayer`, `FP.synth` (Task 1), `FP.certificate.canRestart(state)` (ui, existant).
- Produces:
  - `FP.songs.game = { bpm: 100, bars: 8, beatsPerBar: 4, pcs: [4, 7, 9, 10, 11, 2], notes }` avec couches `groove` (basse `slap`, `kick`, `snare`), `clav` (`clav`, `brass`), `perc` (`hat`, `openhat`, `tamb`, caisse claire fantôme), `organ` (`organ` de A, accords transposés dans la gamme de B), `sitar` (`sitar` de A dans la gamme de B), `ghost` (`theremin`, une note toutes les 4 mesures).
  - `FP.music.layersFor(state) -> { groove, clav, perc, organ, sitar, ghost }` (0 à 1).
  - `FP.music.tempoFor(state) -> number`.
  - `FP.music.filterFor(state) -> number` (Hz : 900 en `ready`, 20 000 sinon).
  - `FP.music.grazeDuck(intensity) -> number` (facteur de gain, 1 à 10^(−6/20)).

- [ ] **Step 1: Write the failing tests** — `dev/tests/music.test.js`

```js
const mRun = () => { const s = FP.state.createRun(5, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); return s; };
FP.test('music: la partition de jeu reste dans sa gamme', () => {
  const s = FP.songs.game; FP.assertEqual(s.bpm, 100);
  for (const n of s.notes) if (n.midi !== undefined) FP.assert(s.pcs.includes(n.midi % 12), n.inst + ' ' + n.midi);
  for (const l of ['groove', 'clav', 'perc', 'organ', 'sitar', 'ghost']) FP.assert(s.notes.some(n => n.layer === l), 'couche ' + l);
});
FP.test('music: B en jeu, B en veille entre deux niveaux, A réduit après le tampon', () => {
  const s = mRun(); FP.assertEqual(FP.music.songFor(s).song, 'game');
  s.mode = 'ready'; FP.assertEqual(FP.music.songFor(s).song, 'game'); FP.assertEqual(FP.music.filterFor(s), 900);
  s.mode = 'over'; s.fx.ui = { overAt: s.time }; FP.assertEqual(FP.music.songFor(s).song, null);
  s.fx.ui.overAt = s.time - 10; const after = FP.music.songFor(s);
  FP.assertEqual(after.song, 'title'); FP.assert(after.gain < 1);
});
FP.test('music: les couches suivent le jeu', () => {
  const s = mRun(); let L = FP.music.layersFor(s);
  FP.assertEqual(L.groove, 1); FP.assertEqual(L.organ, 0); FP.assertEqual(L.sitar, 0); FP.assertEqual(L.perc, 0);
  s.plant.corruption = .2; FP.assertEqual(FP.music.layersFor(s).organ, 1);
  s.plant.tip.y = s.world.surfaceY + 20; FP.assertEqual(FP.music.layersFor(s).sitar, 1);
  const o = { kind: 'server' }; s.graze.active.set(o, { time: .3 });
  s.query = { grazes: [{ obj: o, kind: 'solid', intensity: .7 }] }; FP.assertEqual(FP.music.layersFor(s).perc, .7);
  s.mode = 'ready'; L = FP.music.layersFor(s); FP.assertEqual(L.clav + L.perc + L.organ + L.sitar, 0); FP.assertEqual(L.groove, 1);
});
FP.test('music: tempo 100, +3,5 par éclosion, plafond 125', () => {
  const s = mRun(); FP.assertEqual(FP.music.tempoFor(s), 100);
  s.score.flowers = 2; FP.assertEqual(FP.music.tempoFor(s), 107);
  s.score.flowers = 20; FP.assertEqual(FP.music.tempoFor(s), 125);
});
FP.test('music: baisse pendant le frôlement, jusqu’à −6 dB', () => {
  FP.assertEqual(FP.music.grazeDuck(0), 1);
  FP.assert(Math.abs(FP.music.grazeDuck(1) - Math.pow(10, -6 / 20)) < 1e-9);
});
FP.test('music: baisses non cumulées en rafale de morts', () => {
  const spy = audioSpy(), s = mRun();
  for (let i = 0; i < 6; i++) { spy.t = i * .1; FP.music.update(s, [{ type: 'death', cause: 'solid' }], spy); }
  const music = spy.calls.filter(c => c[0] === 'gain' && c[1] === 'music').map(c => c[2]);
  FP.assert(Math.min(...music) >= Math.pow(10, -9 / 20) * Math.pow(10, -6 / 20) - 1e-9, 'jamais plus bas que mort + frôlement : ' + Math.min(...music));
});
```

(`audioSpy` est défini dans `sequencer.test.js`, chargé avant.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.songs.game` indéfini, `layersFor`… absents).

- [ ] **Step 3: Implement**

- `songs.js` : `FP.songs.game` composé dans l'esprit de la maquette B (basse slap syncopée, clavinet sur les contretemps, cuivres qui tombent en fin de mesure impaire, boîte à rythmes qui boite : léger retard aléatoire appliqué par le lecteur aux notes `snare`/`hat` de B, jusqu'à 25 ms), 8 mesures, plus les couches `organ` et `sitar` reprises de A et ramenées dans la gamme de B.
- `music.js` :
  - `songFor` : `over` → `null` tant que `FP.certificate.canRestart(state)` est faux, puis `{ song: 'title', gain: .5 }` ; `ready`, `playing`, `dying`, `bloom` → `{ song: 'game', gain: 1 }`.
  - `layersFor` : `groove` 1 en jeu ; `clav` 1 sauf en `ready` ; `perc` = intensité du frôlement actif le plus fort (`state.query.grazes` filtré par `state.graze.active`), 0 en `ready` ; `organ` 1 si `plant.corruption > 0 || plant.toxicTimer > 0` ; `sitar` 1 si `(tip.y − surfaceY) / (height − surfaceY) < 1/3` ; `ghost` 1 ; tout à 0 hors musique de jeu.
  - `tempoFor` (formule des Global Constraints), `filterFor`, `grazeDuck(i) = 10^(−6·i/20)`.
  - `update` : applique `setLayers` (rampes 0,2 / 0,4 s), `setTempo`, `setFilter`, et le gain du bus `music` = `MUSIC_GAIN × grazeDuck(intensité) × deathDuck`, où `deathDuck = 10^(−9/20)` pendant 1 s après le dernier `death` ou pendant le jingle de `blossom` (une seule baisse en cours, jamais cumulée) ; `runStart` : fondu de sortie du titre 0,5 s et départ de B au premier temps.
- `audio.js` : `document.addEventListener('visibilitychange', …)` : caché → `backend.suspend()` et le lecteur s'arrête ; visible → `resume()`, reprise au début de la mesure suivante (garde du web uniquement).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 5: Verify in browser, then listening checkpoint**

Partie complète : B démarre au départ, l'orgue arrive dans une nappe, le sitar dans le dernier tiers, les percussions en frôlant, la veille entre deux niveaux, l'accélération après quelques éclosions, le retour doux de A après le tampon ; aucune erreur. **Demander à l'utilisateur d'écouter et attendre son retour** avant la Task 3.

- [ ] **Step 6: Commit**

```bash
git add src/audio dev/tests/music.test.js dev/check.html
git commit -m "feat(audio): musique de jeu à couches, tempo qui suit la partie"
```

---

### Task 3: Effets FM, sons d'interface et jingles

**Files:**
- Create: `src/audio/sfx.js`
- Modify: `src/audio/songs.js` (`FP.songs.jingles`), `src/audio/audio.js` (retrait des recettes v3, `play(e)` → `FP.sfx`), `src/ui/title.js` (wake → `wake`), `src/ui/menu.js` (son de réveil), `src/ui/shout.js`, `src/ui/certificate.js`, `dev/tests/audio.test.js` (réécrit), `index.html`, `dev/check.html`

**Interfaces:**
- Consumes: moteur et `FP.music` (Tasks 1-2).
- Produces:
  - `FP.sfx.play(backend, name, intensity?)` et `FP.audio.sfx(name, intensity?)` (passe par le moteur courant, ne fait rien s'il n'y en a pas).
  - Noms : `start`, `growStart`, `scrape`, `grazeStart`, `eco`, `water`, `bud`, `bomb`, `shieldBreak`, `contaminate`, `hit`, `acid`, `crack`, `ready`, et interface `wake`, `letter`, `type`, `stamp`, `record`, `toggle`. `eco` prend `intensity` = palier de combo (1 à 6) : hauteur + 1 demi-ton par palier, plafond +5.
  - `FP.songs.jingles = { death, blossom, record, start }` (notes en mi, joués par `FP.sequencer.notesBetween` sur le bus `sfx`).
  - `FP.shout.cues(state) -> string[]` et `FP.certificate.cues(state) -> string[]` : sons d'interface dus depuis le dernier appel (mémoire dans `state.fx.ui`), purs hors de cette mémoire.

- [ ] **Step 1: Write the failing tests** — réécrire `dev/tests/audio.test.js`

```js
const sfxSpy = () => { const s = audioSpy(); s.t = 0; return s; };
const withBackend = (fn) => { const saved = FP.audio._backend; const b = sfxSpy(); FP.audio._backend = b; try { fn(b); } finally { FP.audio._backend = saved; } };
const auRun = () => { const s = FP.state.createRun(1, { W: 440, H: 783 }); s.mode = 'playing'; return s; };
const EVENTS = [['bloom', 'crack'], ['blossom', 'blossom'], ['eco', 'eco'], ['grazeStart', 'grazeStart'], ['bomb', 'bomb'], ['shieldBreak', 'shieldBreak'],
  ['toxicEnter', 'contaminate'], ['stemStart', 'growStart'], ['runStart', 'start'], ['ready', 'ready']];
FP.test('audio: chaque événement de jeu fait un son FM', () => {
  for (const [type] of EVENTS) withBackend(b => { FP.audio.consume([{ type, amount: 500, kind: 'water' }], auRun(), 0); FP.assert(b.calls.some(c => c[0] === 'note' || c[0] === 'burst' || c[0] === 'drum'), type); });
});
FP.test('audio: mort = impact puis jingle des cuivres ; limace = grésillement puis jingle', () => withBackend(b => {
  FP.audio.consume([{ type: 'death', cause: 'solid' }], auRun(), 0);
  FP.assert(b.calls.some(c => c[0] === 'note' && c[1] === 'brass'), 'cuivres');
}));
FP.test('audio: le kling monte d’un demi-ton par palier de combo, plafond +5', () => {
  const pitch = (combo) => { let m = 0; withBackend(b => { FP.audio.consume([{ type: 'eco', amount: 500, combo }], auRun(), 0); m = Math.min(...b.calls.filter(c => c[0] === 'note').map(c => c[2])); }); return m; };
  FP.assertEqual(pitch(2) - pitch(1), 1); FP.assertEqual(pitch(9) - pitch(1), 5);
});
FP.test('audio: anti-rafale par type', () => withBackend(b => {
  FP.audio.consume(Array.from({ length: 8 }, () => ({ type: 'eco', amount: 500, combo: 1 })), auRun(), 0);
  const once = b.calls.length; b.calls.length = 0; FP.audio.consume([{ type: 'eco', amount: 500, combo: 1 }], auRun(), 0);
  FP.assertEqual(b.calls.length, 0, 'un seul kling dans la fenêtre'); FP.assert(once > 0);
}));
FP.test('audio: bourdonnement du frôlement actif, coupé net au choc', () => withBackend(b => {
  const s = auRun(), o = { kind: 'server' }; let drone = [];
  b.drone = (...a) => drone.push(a);
  s.graze.active.set(o, { time: 1 }); s.query = { grazes: [{ obj: o, kind: 'solid', intensity: .8 }] };
  FP.audio.consume([], s, 1 / 60); FP.assert(drone.some(a => a[0] === true));
  s.graze.active.clear(); s.query = { grazes: [] }; FP.audio.consume([{ type: 'death', cause: 'solid' }], s, 1 / 60);
  FP.assert(drone.some(a => a[0] === false && a[1] === true), 'arrêt net');
}));
FP.test('audio: sans Web Audio, aucun plantage', () => {
  const saved = FP.audio._backend; FP.audio._backend = null;
  try { FP.audio.consume([{ type: 'bloom' }, { type: 'eco', amount: 1 }], auRun(), 1 / 60); FP.audio.sfx('stamp'); FP.audio.unlock(); }
  finally { FP.audio._backend = saved; }
});
FP.test('audio: une lettre du cri = un « toc », chaque ligne du certificat = un cliquetis, puis le tampon', () => {
  const s = auRun(); s.fx.ui = { shout: { text: 'RACK SERVEUR !', t0: s.time } };
  s.time += 5; FP.assertEqual(FP.shout.cues(s).filter(c => c === 'letter').length, 'RACK SERVEUR !'.replace(/\s/g, '').length);
  FP.assertEqual(FP.shout.cues(s).length, 0, 'pas deux fois');
  const o = FP.state.createRun(2, { W: 440, H: 783 }); o.mode = 'over'; o.flow.overReason = 'rupture : rack serveur'; o.fx.ui = { overAt: o.time }; o.time += 5;
  const c = FP.certificate.cues(o);
  FP.assert(c.filter(x => x === 'type').length >= 6 && c.includes('stamp'), c.join(','));
});
```

`dev/check.html` : `../src/audio/sfx.js` avant `../src/audio/audio.js`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`FP.sfx`, `FP.shout.cues`, `FP.certificate.cues` indéfinis ; recettes v3 encore jouées).

- [ ] **Step 3: Implement**

- `sfx.js` : une recette par nom (spec § 5), avec `backend.note(inst, midi, time, dur, vel, { bus: 'sfx' })`, `backend.drum`, `backend.burst` ; table d'anti-rafale (`GAPS`, défaut 0,03 s, `grazeStart` 0,10, `contaminate` 0,24, `scrape` 0,032) ; bourdonnement du frôlement et grattement repris de la v3 (même logique d'intensité, même coupure nette sur `death`, `shieldBreak`, `bloom`, `runStart`), avec le timbre FM. Jingles : lus dans `FP.songs.jingles` via `notesBetween` et joués sur le bus `sfx`.
- `audio.js` : `play(e)` → `death` : `hit` (déchet) ou `acid` (limace, nappe) puis jingle `death` ; `bloom` → `crack` ; `blossom` → jingle `blossom` ; `eco` → `eco` avec `e.combo` ; `pickup` → `water` ou `bud` ; les autres comme dans la table d'`EVENTS`. Supprimer `RECIPES`, les compatibilités `tone` / `noise` du moteur et les anciens chemins.
- `ui/menu.js` `wake` : `FP.audio.sfx('wake')` après `FP.title.wake(s)`.
- `ui/shout.js` : `cues(state)` compte les lettres non blanches déjà atterries (`k ≥ 1`, mêmes délais que le dessin) et renvoie un `letter` par nouvelle lettre ; `draw` appelle `cues` puis `FP.audio.sfx` pour chacun.
- `ui/certificate.js` : `cues(state)` (largeur de feuille : `FP.view.ui.w` si la toile existe, sinon `FP.config.view.minW / FP.px.SCALE`, pour les tests sous Node) renvoie un `type` par élément nouvellement révélé, `stamp` au passage de `stampAt`, puis `record` si la ligne du record est battue ; mémoire dans `state.fx.ui.cert` ; `draw` les joue.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK ; `grep -n "RECIPES\|function tone" src/audio` ne renvoie rien.

- [ ] **Step 5: Verify in browser, then listening checkpoint**

Partie complète avec chaque situation (frôlement, gains en combo, goutte, bourgeon, spore, bouclier, nappe, les trois morts, éclosion, certificat) ; aucune erreur. **Demander à l'utilisateur d'écouter et attendre son retour** avant la Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/audio src/ui/menu.js src/ui/shout.js src/ui/certificate.js dev/tests/audio.test.js index.html dev/check.html
git commit -m "feat(audio): effets FM, sons d'interface et jingles ; fin des sons v3"
```

---

### Task 4: Réglage du son sur l'écran titre

**Files:**
- Modify: `src/audio/audio.js`, `src/ui/title.js`, `src/ui/menu.js`
- Test: `dev/tests/title.test.js`, `dev/tests/audio.test.js`

**Interfaces:**
- Produces:
  - `FP.audio.setting() -> 'all'|'sfx'|'mute'`, `FP.audio.cycleSetting() -> string` (applique et mémorise sous `flower_power_v4_sound`, format `{ setting }`).
  - `FP.title.iconRect(w, h) -> { x, y, w, h }` (pixels d'art de la toile d'interface, coin haut droit, 12 × 10 avec 4 px de marge) ; `FP.title.hitIcon(artX, artY, w, h) -> boolean` (zone agrandie de 6 px de chaque côté pour le doigt).

- [ ] **Step 1: Write the failing tests**

```js
// dev/tests/audio.test.js
FP.test('audio: réglage tout → effets seuls → muet → tout, mémorisé', () => {
  const t0 = FP.audio.setting();
  const seq = [FP.audio.cycleSetting(), FP.audio.cycleSetting(), FP.audio.cycleSetting()];
  FP.assertEqual(seq.join(','), t0 === 'all' ? 'sfx,mute,all' : seq.join(','));
  FP.assertEqual(JSON.parse(FP._testStore.getItem('flower_power_v4_sound')).setting, FP.audio.setting());
});
FP.test('audio: « effets seuls » coupe la musique, pas les effets', () => withBackend(b => {
  while (FP.audio.setting() !== 'sfx') FP.audio.cycleSetting();
  const g = b.calls.filter(c => c[0] === 'gain');
  FP.assert(g.some(c => c[1] === 'music' && c[2] === 0) && !g.some(c => c[1] === 'sfx' && c[2] === 0));
  while (FP.audio.setting() !== 'all') FP.audio.cycleSetting();
}));
FP.test('audio: réglage illisible en stockage → tout', () => {
  FP._testStore.setItem('flower_power_v4_sound', '{"setting":"fort"}');
  FP.assertEqual(FP.audio.loadSetting(), 'all');
});
// dev/tests/title.test.js
FP.test('title: l’icône de son est touchable, et seulement elle', () => {
  const r = FP.title.iconRect(206, 366);
  FP.assert(FP.title.hitIcon(r.x + 2, r.y + 2, 206, 366));
  FP.assert(FP.title.hitIcon(r.x - 4, r.y + r.h + 4, 206, 366), 'marge pour le doigt');
  FP.assert(!FP.title.hitIcon(103, 183, 206, 366), 'le centre lance la partie');
  FP.assert(r.x + r.w <= 206 && r.y >= 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node dev/run-checks.js` — Expected: FAIL (`cycleSetting`, `loadSetting`, `iconRect` indéfinis).

- [ ] **Step 3: Implement**

- `audio.js` : `loadSetting()` (lit le stockage, valeur inconnue → `all`), `setting()`, `cycleSetting()` (suivant, mémorise, applique : `all` → `music` 0,5 et `master` 1 ; `sfx` → `music` 0 ; `mute` → `master` 0) ; le réglage est appliqué au moteur à sa création ; `FP.audio.sfx('toggle')` après le changement (inaudible en `mute`, c'est voulu).
- `ui/title.js` : en mode `menu`, dessiner l'icône dans `iconRect` (haut-parleur pixel 12 × 10 crème à contour encre ; `all` : deux ondes, `sfx` : une onde et une petite note barrée, `mute` : une croix saumon) ; `iconRect`, `hitIcon` purs.
- `ui/menu.js` : en mode `menu`, convertir le toucher en pixels d'art (`(clientX − rect.left) × FP.view.W / rect.width / FP.px.SCALE`, idem en y) ; si `FP.title.hitIcon(...)`, `FP.audio.cycleSetting()` et ne pas lancer la partie.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node dev/run-checks.js` — Expected: tous OK.

- [ ] **Step 5: Verify in browser**

Titre : l'icône change d'état à chaque toucher sans lancer la partie ; un toucher ailleurs lance la partie ; le réglage survit à un rechargement ; en « effets seuls », la musique se tait et les effets restent.

- [ ] **Step 6: Commit**

```bash
git add src/audio/audio.js src/ui/title.js src/ui/menu.js dev/tests/audio.test.js dev/tests/title.test.js
git commit -m "feat(audio): réglage du son (tout, effets seuls, muet) sur l'écran titre"
```

---

### Task 5: Version 4.3.0, documentation, vérification complète

**Files:**
- Modify: `src/core/config.js` (`version: '4.3.0'`), `index.html` (`<title>`), `dev/tests/state.test.js`, `CHANGELOG.md`, `docs/architecture.md`

- [ ] **Step 1: Documentation** — CHANGELOG `## v4.3.0 — Sound design FM` (musiques, couches, tempo, effets, sons d'interface, réglage, nombre de tests) ; `docs/architecture.md` : arbre `src/audio/*`, ordre de chargement, rôle de chaque fichier, sons d'interface appelés par `ui/*`.

- [ ] **Step 2: Vérifications**

Run: `node dev/run-checks.js` — Expected: tous OK.
Run: `grep -rn "AudioContext\|createOscillator" src --include=*.js | grep -v "src/audio/synth.js\|src/audio/audio.js"` — Expected: aucune ligne.
Partie complète au serveur local (`?perf=1`) : aucune erreur, coût de `FP.music.update` mesuré (< 0,3 ms par frame en moyenne) ; double-clic en file:// à faire vérifier par l'utilisateur.

- [ ] **Step 3: Commit et push de la branche**

```bash
git add src/core/config.js index.html dev/tests/state.test.js CHANGELOG.md docs/architecture.md
git commit -m "docs: v4.3.0 — sound design FM"
git push -u origin son
```
