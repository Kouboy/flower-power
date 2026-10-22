// Effets de la foreuse : quand et d'où ils partent (logique pure).
const fxRun = () => { const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0; return s; };
FP.test('drillFx: les étincelles ne partent que d’un obstacle réellement frôlé, de son côté', () => {
  const s = fxRun(), tip = s.plant.tip, o = { kind: 'server', x: tip.x + 40, y: tip.y };
  FP.assertEqual(FP.drillFx.sparkSources(s).length, 0);
  s.graze.active.set(o, { time: .3, peak: .8, kind: 'solid' });
  s.query = { solid: null, leak: 0, toxic: 0, danger: .8, grazes: [{ obj: o, kind: 'solid', intensity: .8, x: tip.x, y: tip.y }] };
  const src = FP.drillFx.sparkSources(s);
  FP.assertEqual(src.length, 1); FP.assert(src[0].x > tip.x, 'du côté de l’obstacle'); FP.assert(src[0].strength > 0);
});
FP.test('drillFx: une limace frôlée ne fait pas d’étincelles (pas de métal)', () => {
  const s = fxRun(), tip = s.plant.tip, l = { cx: tip.x - 30, cy: tip.y };
  s.graze.active.set(l, { time: .3, peak: .8, kind: 'leak' });
  s.query = { solid: null, leak: 0, toxic: 0, danger: .5, grazes: [{ obj: l, kind: 'leak', intensity: .8, x: l.cx, y: l.cy }] };
  FP.assertEqual(FP.drillFx.sparkSources(s).length, 0);
});
FP.test('drillFx: rien hors de la pousse', () => {
  const s = fxRun(); s.mode = 'bloom';
  FP.assertEqual(FP.drillFx.sparkSources(s).length, 0);
});
