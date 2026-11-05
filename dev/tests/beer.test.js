// Bière qui défonce les limaces (v5.2.0) : elles tanguent, la pointe les fait éclater au lieu de mourir.
// Utilise shopRun / nextStem (shop.test.js), fakeCtx (px.test.js), withBackend / auRun / sounding (audio.test.js).
const beerRun = (beer = true) => {
  const s = beer ? nextStem(shopRun(), ['beer']) : shopRun(), t = s.plant.tip;
  s.world.solids = []; s.world.toxics = []; s.power.shield = false; s.power.shieldGrace = 0;
  s.world.leaks = [slug(t.x, t.y)];
  return s;
};
const slug = (x, y) => ({ x, y, len: 0, angle: 0, phase: 0, rate: 1, r: 12, s: 0, cx: x, cy: y, cr: 12, hitFlash: 0 });
// Une frame de jeu dans l'ordre de la boucle (collision → frôlement → bouclier → flow).
const frame = (s) => { FP.collision.update(s); FP.graze.update(s, 1 / 60); FP.powerups.update(s, 1 / 60); FP.flow.update(s, 1 / 60); };

FP.test('bière: la pointe fait éclater la limace, la pousse continue, +150 × saison', () => {
  const s = beerRun(); s.run.saison = 2; const e0 = s.score.eco;
  frame(s);
  FP.assertEqual(s.mode, 'playing'); FP.assertEqual(s.world.leaks.length, 0);
  FP.assertEqual(s.score.eco - e0, FP.config.shop.popEco * 2);
  FP.assertEqual(FP.config.shop.popEco, 150);
  const pop = s.events.filter(e => e.type === 'leakPop');
  FP.assertEqual(pop.length, 1); FP.assertEqual(pop[0].x, s.plant.tip.x); FP.assertEqual(pop[0].y, s.plant.tip.y);
  frame(s); FP.assertEqual(s.events.filter(e => e.type === 'leakPop').length, 1, 'pas d’éclatement double');
});
FP.test('bière: sans bière, la même limace touchée tue (cause leak)', () => {
  const s = beerRun(false); frame(s);
  FP.assertEqual(s.mode, 'dying'); FP.assert(s.events.some(e => e.type === 'death' && e.cause === 'leak'));
  FP.assertEqual(s.world.leaks.length, 1); FP.assert(!s.events.some(e => e.type === 'leakPop'));
});
FP.test('bière: la membrane n’est pas consommée par l’éclatement', () => {
  const s = beerRun(); s.power.shield = true; frame(s);
  FP.assertEqual(s.power.shield, true); FP.assert(!s.events.some(e => e.type === 'shieldBreak'));
  FP.assertEqual(s.world.leaks.length, 0);
});
FP.test('bière: un frôlement en cours survit à l’éclatement (pas sans bière)', () => {
  const run = (beer) => {
    const s = beerRun(beer), t = s.plant.tip, other = slug(t.x + 40, t.y);   // 40 px : dans la couronne de frôlement de l'autre limace
    s.world.leaks.push(other); frame(s);
    return { s, other };
  };
  const a = run(true); FP.assert(a.s.graze.active.has(a.other), 'frôlement conservé');
  const b = run(false); FP.assertEqual(b.s.graze.active.size, 0);
});
FP.test('bière: une limace ne déclenche plus le zoom de danger', () => {
  const near = (beer) => { const s = beerRun(beer), t = s.plant.tip; s.world.leaks = [slug(t.x + 40, t.y)]; FP.collision.update(s); return s.query.danger; };
  FP.assertEqual(near(true), 0); FP.assert(near(false) > 0);
});
FP.test('bière: les limaces tanguent d’au plus l’amplitude, et varient dans le temps', () => {
  const lateral = (beer) => {
    const s = beerRun(beer), l = s.world.leaks[0], seen = [];
    l.x = 200; l.y = 600; l.len = 80; l.angle = 1.1; l.phase = .7;
    for (let i = 0; i < 240; i++) {
      s.time += 1 / 60; FP.hazards.update(s, 1 / 60);
      seen.push((l.cx - l.x) * -Math.sin(l.angle) + (l.cy - l.y) * Math.cos(l.angle));
    }
    return seen;
  };
  const drunk = lateral(true), sober = lateral(false), amp = FP.config.shop.beerSway;
  FP.assertEqual(amp, 6); FP.assertEqual(FP.config.shop.beerSwayHz, 2.2);
  FP.assert(Math.max(...drunk.map(Math.abs)) <= amp + 1e-9, 'amplitude');
  FP.assert(Math.max(...drunk.map(Math.abs)) > amp * .9, 'tangue vraiment');
  FP.assert(new Set(drunk.map(v => Math.round(v * 10))).size > 10, 'varie dans le temps');
  FP.assert(Math.max(...sober.map(Math.abs)) < 1e-9, 'sans bière : aucun écart');
});
FP.test('bière: l’éclatement se dessine (écume, anneau) sans erreur', () => {
  const s = beerRun(); s.events.push({ type: 'leakPop', x: 100, y: 500 });
  FP.particles.draw(fakeCtx(), s);
  FP.assert(s.fx.particles.length > 0 && s.fx.particles.every(p => p.type !== 'acid' && p.type !== 'shield'), 'gerbe de mousse');
  FP.assert(s.fx.particles.some(p => p.type === 'foam') && s.fx.particles.some(p => p.type === 'beer'));
  FP.effects.draw(fakeCtx(), s); FP.assert(s.fx.effects.some(e => e.type === 'pop'));
  s.events.length = 0; s.time += 1; FP.effects.draw(fakeCtx(), s); FP.assert(!s.fx.effects.some(e => e.type === 'pop'), 'l’anneau s’éteint');
});
FP.test('bière: le rot est joué sur leakPop', () => withBackend(b => {
  FP.audio.consume([{ type: 'leakPop', x: 1, y: 1 }], auRun(), 0);
  FP.assert(sounding(b).length > 0);
}));
FP.test('bière: « SANTÉ ! » s’affiche au-dessus de la pointe puis disparaît', () => {
  const s = beerRun(), saved = FP.font.draw, drawn = [];   // pas de toile sous Node : on espionne le dessin du texte
  FP.font.draw = (g, text, x, y) => { drawn.push({ text, x, y }); return 0; };
  try {
    s.events.push({ type: 'leakPop', x: 1, y: 1 }); FP.cheer.draw(null, s);
    FP.assertEqual(FP.config.text.pop, 'SANTÉ !'); FP.assertEqual(drawn.map(d => d.text).join(''), 'SANTÉ !');
    FP.assert(drawn.every(d => d.y < s.plant.tip.y / FP.px.SCALE), 'au-dessus de la pointe');
    s.events.length = 0; drawn.length = 0; s.time += 5; FP.cheer.draw(null, s);
    FP.assertEqual(drawn.length, 0); FP.assertEqual(s.fx.ui.pop, null);
  } finally { FP.font.draw = saved; }
});
FP.test('bière: la ligne du bon dit « elles éclatent »', () => FP.assertEqual(FP.config.text.shop.lines.beer, 'elles éclatent'));
