// Briques de visage communes (render/faces.js) : chaque humeur tient dans sa boîte et le danger se voit.
const faceCases = () => {
  const out = [];
  for (const mood of FP.faces.MOODS) for (const blink of [false, true]) {
    const variants = mood === 'dead' ? [{ cause: 'solid' }, { cause: 'melt' }] : (mood === 'toxic' ? [{ dizzy: false }, { dizzy: true }] : [{}]);
    for (const v of variants) out.push({ mood, o: { gaze: { x: .5, y: .5 }, blink, t: 1.3, skin: '#7fb04a', ...v } });
  }
  return out;
};
const inBox = (c) => [...c.px.keys()].every(k => k.split(',').every(n => Math.abs(+n) <= 12));
const faceDraw = (mood, o) => { const c = fakeCtx(); FP.faces.eyes(c, 0, 0, mood, o); FP.faces.mouth(c, 0, 0, mood, o); return c; };
const pixelsOf = (c) => [...c.px.entries()].map(e => e.join('=')).sort().join(';');
FP.test('faces: chaque humeur reste dans la boîte', () => {
  for (const { mood, o } of faceCases()) { const c = faceDraw(mood, o); FP.assert(c.px.size > 0 && inBox(c), mood + ' ' + JSON.stringify(o)); }
});
FP.test('faces: alerte et mort se distinguent du calme', () => {
  const calm = pixelsOf(faceDraw('calm', {}));
  for (const o of [['alarm', {}], ['dead', { cause: 'solid' }], ['dead', { cause: 'melt' }]]) FP.assert(pixelsOf(faceDraw(o[0], o[1])) !== calm, o[0]);
});
FP.test('faces: la paupière prend la peau donnée', () => {
  const c = faceDraw('focus', { skin: '#123456' });
  FP.assert([...c.px.values()].includes('#123456'));
});
FP.test('faces: aucune couleur de danger chez les personnages', () => {
  for (const col of Object.values(FP.palette.cast)) FP.assert(!FP.palette.danger.includes(col), col);
});
