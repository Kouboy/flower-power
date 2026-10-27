// Moteur FM (audio/synth.js, v4.7.5) : moins de nœuds Web Audio par note pour les téléphones modestes.
// Faux AudioContext : il ne joue rien, il compte les nœuds créés par type.
const fakeAudio = () => {
  const made = {}, param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} });
  const node = (kind, extra) => { made[kind] = (made[kind] || 0) + 1; return Object.assign({ connect() {}, disconnect() {}, start() {}, stop() {} }, extra); };
  return {
    made, currentTime: 0, sampleRate: 8000, destination: {},
    createGain: () => node('gain', { gain: param() }),
    createOscillator: () => node('osc', { frequency: param() }),
    createBiquadFilter: () => node('filter', { frequency: param(), Q: param(), gain: param() }),
    createBufferSource: () => node('source', { buffer: null }),
    createDelay: () => node('delay', { delayTime: param() }),
    createDynamicsCompressor: () => node('compressor'),
    createBuffer: (ch, len, rate) => ({ duration: len / rate, getChannelData: () => new Float32Array(len) })
  };
};
FP.test('synth: les bruits de même réglage partagent un seul filtre', () => {
  const ac = fakeAudio(), e = FP.synth.create(ac), before = ac.made.filter;
  for (let i = 0; i < 20; i++) e.burst(i * .1, .05, .03, 240, 'lowpass', { bus: 'sfx' });
  FP.assertEqual(ac.made.filter - before, 1);
});
FP.test('synth: l’écho passe par un envoi partagé, pas un gain par note', () => {
  const ac = fakeAudio(), e = FP.synth.create(ac), before = ac.made.gain;
  for (let i = 0; i < 10; i++) e.note('glass', 88, i * .5, .1, 1, { bus: 'sfx' });   // glass : wet .4, ni trémolo ni vibrato
  FP.assert(ac.made.gain - before <= 10 * 2 + 1, String(ac.made.gain - before));      // mg + env par note, un seul envoi
});
FP.test('synth: au-delà du plafond de voix, la musique se tait mais les effets jouent', () => {
  const ac = fakeAudio(), e = FP.synth.create(ac), music = { bus: 'music', layer: 'main' };
  for (let i = 0; i < 200; i++) e.note('bass', 40, 0, 2, 1, music);
  const afterMusic = ac.made.osc;
  FP.assert(afterMusic <= 2 * FP.synth.MAX_VOICES, String(afterMusic));
  e.note('pluck', 64, 0, .1, 1, { bus: 'sfx' });
  FP.assertEqual(ac.made.osc, afterMusic + 2);
  ac.currentTime = 3;   // les voix se sont éteintes : la musique reprend
  e.note('bass', 40, 3, 1, 1, music);
  FP.assertEqual(ac.made.osc, afterMusic + 4);
});
FP.test('synth: une route « mono » rejoue sur sa voix permanente, sans nouveaux nœuds', () => {
  const ac = fakeAudio(), e = FP.synth.create(ac), mono = (k) => ({ bus: 'sfx', mono: k });
  e.note('drill', 52, 0, .06, 1, mono('drill')); e.burst(0, .05, .03, 240, 'lowpass', mono('soil'));
  const made = JSON.stringify(ac.made);
  for (let i = 1; i < 50; i++) { ac.currentTime = i * .04; e.note('drill', i % 2 ? 59 : 52, i * .04, .06, 1, mono('drill')); e.burst(i * .04, .05, .03, 240, 'lowpass', mono('soil')); }
  FP.assertEqual(JSON.stringify(ac.made), made);
});
FP.test('sfx: le ronron de la foreuse passe par des voix permanentes', () => {
  const calls = [], b = { now: () => 0, note: (...a) => calls.push(a[5]), burst: (...a) => calls.push(a[5]) };
  for (let i = 0; i < 4; i++) { b.now = () => i; FP.sfx.scrape(b, .5); }
  FP.assert(calls.length > 4 && calls.every(r => r && r.bus === 'sfx' && r.mono), JSON.stringify(calls));
});
FP.test('sequencer: la musique est planifiée au moins 0,3 s d’avance (gel d’image sur téléphone)', () => {
  FP.assert(FP.sequencer.LOOKAHEAD >= .3, String(FP.sequencer.LOOKAHEAD));
});
FP.test('synth: timbres et percussions des milieux (v4.10.0)', () => {
  for (const k of ['metal', 'siren', 'hum2', 'strings', 'slide', 'sbrass', 'rslap', 'accordion', 'melodica', 'horn', 'upright', 'arp', 'pad', 'doom', 'sub', 'lowbrass', 'growl', 'saws', 'cowbell'])
    FP.assert(FP.synth.INSTRUMENTS[k] && FP.synth.INSTRUMENTS[k].ratio > 0, k);
  const ac = fakeAudio(), e = FP.synth.create(ac), sound = () => (ac.made.osc || 0) + (ac.made.source || 0);
  for (const d of ['clap', 'steam', 'lid', 'tick', 'guiro', 'cowbell']) {
    FP.assert(FP.synth.DRUMS.includes(d), d);
    const before = sound(); e.drum(d, 0, 1, { bus: 'music', layer: 'groove' }); FP.assert(sound() > before, d + ' joue');
  }
});
FP.test('synth: chaque timbre des milieux est joué par une partition (pas de timbre mort)', () => {
  const played = new Set(Object.values(FP.songs).filter(s => s && s.notes).flatMap(s => s.notes.map(n => n.inst)));
  for (const k of ['metal', 'siren', 'hum2', 'strings', 'slide', 'sbrass', 'rslap', 'accordion', 'melodica', 'horn', 'upright', 'arp', 'pad', 'doom', 'sub', 'lowbrass', 'growl', 'saws'])
    FP.assert(played.has(k), k + ' n’est joué par aucune partition');
});
