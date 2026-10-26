// Enfouissement de la tige : quelles portions la terre recouvre (fonction pure de la position, pas de l'ordre des points).
const buriedShare = (old) => { const r = FP.createRng(5); let n = 0; for (let i = 0; i < 4000; i++) if (FP.plantRender.buried(r.range(0, 440), r.range(0, 2000), old)) n++; return n / 4000; };
FP.test('plantRender: une même position est toujours recouverte de la même façon', () => {
  for (let i = 0; i < 50; i++) FP.assertEqual(FP.plantRender.buried(i * 17.3, 900 + i * 11.1, false), FP.plantRender.buried(i * 17.3, 900 + i * 11.1, false));
});
FP.test('plantRender: environ un quart de la tige courante est sous la terre', () => { const s = buriedShare(false); FP.assert(s >= .15 && s <= .35, String(s)); });
FP.test('plantRender: les anciennes tiges sont davantage enfouies', () => { const s = buriedShare(true); FP.assert(s >= .5 && s <= .7, String(s)); });
FP.test('plantRender: les mottes sont réparties, pas groupées', () => {
  for (const x of [220, 221.5, 80, 300]) {
    const flags = [];
    for (let y = 1800; y > 200; y -= 8.6) flags.push(FP.plantRender.buried(x, y, false) ? 1 : 0);
    for (let i = 0; i + 12 <= flags.length; i++) { const n = flags.slice(i, i + 12).reduce((a, b) => a + b, 0); FP.assert(n <= 6, 'x=' + x + ' : ' + n + ' segments recouverts sur 12'); }
  }
});
FP.test('plantRender: le halo de la tige s’éclaircit avec la distance et s’arrête au bord de la bande', () => {
  const lv = (d, old) => FP.plantRender.haloLevel(d, old);
  for (let d = 0; d < 3; d += .5) FP.assert(lv(d, false) >= lv(d + .5, false), 'd=' + d);
  FP.assert(lv(0, false) > 0); FP.assertEqual(lv(3, false), 0); FP.assertEqual(lv(10, false), 0);
  FP.assert(lv(0, true) < lv(0, false), 'les anciennes tiges plus clairsemées');
});
const drillRun = (stems) => { const s = FP.state.createRun(3, { W: 440, H: 783 }); FP.level.startRun(s); FP.plant.launch(s); s.plant.stemCount = stems; return s; };
FP.test('plantRender: la foreuse tourne plus vite et s’allonge quand la pousse accélère', () => {
  const slow = FP.plantRender.drill(drillRun(1)), fast = FP.plantRender.drill(drillRun(30));
  FP.assert(slow.active && fast.active);
  FP.assert(fast.spin > slow.spin, slow.spin + ' → ' + fast.spin);
  FP.assert(fast.length >= slow.length);
});
FP.test('plantRender: la foreuse tourne avec le temps et s’éteint hors de la pousse', () => {
  const s = drillRun(1), a = FP.plantRender.drill(s).angle; s.time += .1;
  FP.assert(FP.plantRender.drill(s).angle !== a);
  for (const mode of ['bloom', 'dying', 'over', 'ready']) { s.mode = mode; FP.assert(!FP.plantRender.drill(s).active, mode); }
});
FP.test('plantRender: la foreuse part au-dessus de la tête et de ses accessoires', () => {
  for (const id of FP.config.cast.ids) {
    const c = fakeCtx(); FP.hero.paint(c, 0, 0, id, 'calm', {});
    const top = Math.min(...[...c.px.keys()].map(k => k.split(',').map(Number)).filter(([x]) => Math.abs(x) <= 1).map(([, y]) => y));
    FP.assert(FP.plantRender.drillStart(id) >= -top, id + ' : ' + FP.plantRender.drillStart && FP.plantRender.drillStart(id) + ' < ' + -top);
  }
});
FP.test('plantRender: la foreuse est plus petite (≈ −25 %)', () => {
  const d = FP.plantRender.drill(drillRun(30));
  FP.assert(d.length <= 8 && d.radius <= 4, d.length + ' / ' + d.radius);
});
// Germination (v4.7.0) : la graine tremble, se fissure, un germe vert pointe et grandit.
FP.test('plantRender: le germe pointe et grandit avec la germination', () => {
  const sprout = (germ) => { const c = fakeCtx(); FP.plantRender.seed(c, { x: 100, y: 100 }, 0, germ, 1); return [...c.px.entries()].filter(([k, col]) => col === FP.palette.stem.body && +k.split(',')[1] < 50 - 7).length; };
  FP.assertEqual(sprout(0), 0); FP.assert(sprout(.5) > 0 && sprout(1) > sprout(.5), sprout(.5) + ' / ' + sprout(1));
});
FP.test('plantRender: la graine se fissure à mi-germination', () => {
  const ink = (germ) => { const c = fakeCtx(); FP.plantRender.seed(c, { x: 100, y: 100 }, 0, germ, 0); return [...c.px.values()].filter(v => v === FP.palette.seed.outline).length; };
  FP.assert(ink(.5) > ink(0) && ink(.9) > ink(.5), ink(0) + ' / ' + ink(.5) + ' / ' + ink(.9));
});
