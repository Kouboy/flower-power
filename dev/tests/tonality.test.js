// Sons accordés au biome (v5.10.0, retour de jeu : « tous les effets sonores doivent s'adapter au changement de gamme ») : les sons et
// jingles composés en mi prennent la tonique et le mode du biome (FP.tonality). Aides : audioSpy (sequencer.test.js), auRun, withBackend,
// sounding (audio.test.js).
const TONE_IDS = ['industrie', 'decharge', 'nucleaire'];
const pcOf = (m) => ((m % 12) + 12) % 12;
const biomePcs = (id) => FP.songs[id + '0'].pcs;
// Sons au ton fixe (bruits, papier, crayon, caisse) ou déjà dans la gamme du milieu (ramassages) : hors de cette règle.
const TONE_FREE = new Set(['coin', 'chain', 'eco', 'grazeStart', 'crumple', 'crumpleOut', 'pencil', 'register']);
const sfxNotes = (fn) => { const b = audioSpy(); fn(b); return b.calls.filter(c => c[0] === 'note').map(c => c[2]); };

FP.test('tonality: la Friche et hors biome, rien ne change ; ailleurs, la tonique du biome', () => {
  for (let m = 24; m < 108; m++) { FP.assertEqual(FP.tonality.pitch(m, 'friche'), m); FP.assertEqual(FP.tonality.pitch(m, null), m); FP.assertEqual(FP.tonality.pitch(m, undefined), m); }
  FP.assertEqual(FP.tonality.pitch(64, 'industrie'), 69, 'mi → la');
  FP.assertEqual(FP.tonality.pitch(64, 'decharge'), 67, 'mi → sol');
  FP.assertEqual(FP.tonality.pitch(64, 'nucleaire'), 64, 'mi reste mi');
  FP.assertEqual(FP.tonality.pitch(67, 'nucleaire'), 68, 'tierce mineure → majeure (sol → sol♯)');
  FP.assertEqual(FP.tonality.pitch(68, 'industrie'), 72, 'tierce majeure → mineure (do♯ → do)');
});

FP.test('tonality: chaque note de mi tombe dans la gamme de la musique du biome', () => {
  for (const id of TONE_IDS) for (let m = 48; m < 60; m++) {
    const p = FP.tonality.pitch(m, id);
    FP.assert(biomePcs(id).includes(pcOf(p)), `${id} : ${m} → ${p} hors gamme`);
    FP.assert(Math.abs(p - m - FP.tonality.shift(id)) <= 1, `${id} : ${m} → ${p}, au plus un demi-ton du transposé`);
  }
});

FP.test('tonality: sons et jingles dans la gamme du biome, Friche et menu inchangés', () => {
  const tonal = FP.sfx.NAMES.filter(n => !TONE_FREE.has(n));
  for (const id of TONE_IDS) {
    for (const name of tonal) for (const m of sfxNotes(b => FP.sfx.play(b, name, 1, id))) FP.assert(biomePcs(id).includes(pcOf(m)), `${id} ${name} : ${m}`);
    for (const name of Object.keys(FP.songs.jingles)) {
      const ms = sfxNotes(b => FP.sfx.jingle(b, name, id));
      FP.assert(ms.length > 0, name);
      for (const m of ms) FP.assert(biomePcs(id).includes(pcOf(m)), `${id} jingle ${name} : ${m}`);
    }
    for (const m of sfxNotes(b => { FP.sfx.scrape(b, .5, id); b.cooldowns = {}; b.t = 1; FP.sfx.scrape(b, .5, id); })) FP.assert(biomePcs(id).includes(pcOf(m)), `${id} foreuse : ${m}`);
  }
  for (const name of tonal.filter(n => n !== 'register')) FP.assertEqual(sfxNotes(b => FP.sfx.play(b, name, 1, 'friche')).join(), sfxNotes(b => FP.sfx.play(b, name, 1)).join(), 'Friche : ' + name);
  for (const name of Object.keys(FP.songs.jingles)) FP.assertEqual(sfxNotes(b => FP.sfx.jingle(b, name, 'friche')).join(), sfxNotes(b => FP.sfx.jingle(b, name)).join(), 'Friche : jingle ' + name);
});

FP.test('tonality: la fanfare d’éclosion suit le biome en jeu, pas au menu', () => {
  const heard = (m, mode, type = 'blossom') => { let out = ''; withBackend(b => { const s = auRun(); s.run.milieu = m; s.mode = mode; FP.audio.consume([{ type }], s, 0); out = sounding(b).filter(c => c[0] === 'note').map(c => c[2]).join(); }); return out; };
  FP.assert(heard(1, 'bloom') !== heard(0, 'bloom'), 'Zone industrielle ≠ Friche');
  for (const m of heard(1, 'bloom').split(',').map(Number)) FP.assert(biomePcs('industrie').includes(pcOf(m)), 'éclosion en la : ' + m);
  FP.assertEqual(heard(1, 'menu', 'ready'), heard(0, 'menu', 'ready'), 'au menu, le son reste en mi');
});

FP.test('tonality: le Shop prend aussi le mode du biome', () => {
  for (const id of TONE_IDS) for (const n of FP.songs['shop-' + id].notes) if (n.midi !== undefined) FP.assert(biomePcs(id).includes(pcOf(n.midi)), `shop-${id} : ${n.midi}`);
});
