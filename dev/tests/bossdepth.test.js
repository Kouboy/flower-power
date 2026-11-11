// Profondeur des boss (v5.6.0) : arrière-plan lointain, premier plan flou en parallaxe. Aides : skinImg, skinCtx, skinRun (bossskin.test.js), growRun (grow.test.js).
const depthImgs = () => { FP.bossSkin._set('friche', 'back', skinImg(60, 40)); FP.bossSkin._set('friche', 'fore', [skinImg(20, 80), skinImg(64, 48)]); };
const depthStretched = () => {
  const s = growRun(440, 30, 12); s.run.boss = true; s.run.milieu = 0; FP.level.generate(s); s.mode = 'playing'; s.time = 2; return s;
};

FP.test('bossDepth: parallaxe', () => {
  FP.assertEqual(FP.bossDepth.parallax(1000, 400, .6), 760);
  FP.assertEqual(FP.bossDepth.parallax(1000, 400, 1.8), 280);
});

FP.test('bossDepth: placement identique d’une tentative à l’autre', () => {
  const a = FP.bossDepth.place(7, 'friche', 1000, 6000, 780, 2), b = FP.bossDepth.place(7, 'friche', 1000, 6000, 780, 2);
  FP.assertEqual(JSON.stringify(a), JSON.stringify(b));
  FP.assert(a.length >= 3, 'plusieurs éléments : ' + a.length);
  for (const e of a) { FP.assert(e.x >= 0 && e.x <= 1 && (e.i === 0 || e.i === 1), 'x, i'); }
  FP.assert(JSON.stringify(FP.bossDepth.place(8, 'friche', 1000, 6000, 780, 2)) !== JSON.stringify(a), 'une autre graine change le placement');
});

FP.test('bossDepth: l’arrière-plan couvre toute la zone du boss, même au facteur max', () => {
  try {
    FP.bossSkin._reset(); depthImgs();
    const s = depthStretched(), z = FP.bossPlan.zone(s.world), H = Math.ceil(s.world.viewH / FP.px.SCALE);
    FP.assert(s.world.growK > 2, 'étiré : ' + s.world.growK);
    for (const camY of [z.top - s.world.viewH / 2, (z.top + z.bottom) / 2, z.bottom - s.world.viewH / 2]) {
      s.camera.y = camY; const g = skinCtx(); FP.bossDepth.drawBack(g, s);
      const ya = Math.max(0, FP.px.toArt(z.top - camY)), yb = Math.min(H, FP.px.toArt(z.bottom - camY));
      const rows = new Set(); for (const q of g.images) for (let y = q.a[5]; y < q.a[5] + q.a[7]; y++) rows.add(y);
      for (let y = ya; y < yb; y++) FP.assert(rows.has(y), 'rangée ' + y + ' couverte (caméra ' + Math.round(camY) + ')');
      FP.assert(![...rows].some(y => y < ya || y >= yb), 'rien hors de la zone');
    }
  } finally { FP.bossSkin._reset(); }
});

FP.test('bossDepth: sans images, ni arrière-plan ni premier plan', () => {
  FP.bossSkin._reset();
  for (const m of [0, 1, 2, 3]) {
    const s = skinRun(m), g = skinCtx(); FP.bossDepth.drawBack(g, s); FP.bossDepth.drawFore(g, s);
    FP.assertEqual(g.images.length + g.rects.length, 0, 'milieu ' + m);
  }
  const n = bossRun(440, 0); n.world.bossLevel = null; const g = skinCtx(); depthImgs();
  try { FP.bossDepth.drawBack(g, n); FP.bossDepth.drawFore(g, n); FP.assertEqual(g.images.length, 0, 'hors boss'); } finally { FP.bossSkin._reset(); }
});

// Toile cachée factice : contexte avec ou sans `filter`, appels comptés.
const depthLayers = (withFilter) => {
  const made = [];
  const fakeLayer = (w, h) => { const g = skinCtx(); if (withFilter) g.filter = 'none'; const l = { canvas: { width: w, height: h }, g }; made.push(l); return l; };
  return { made, fakeLayer };
};

FP.test('bossDepth: flou préparé une seule fois par image', () => {
  const saved = FP.px.layer, L = depthLayers(true); FP.px.layer = L.fakeLayer;
  try {
    const img = skinImg(20, 80);
    for (let i = 0; i < 60; i++) FP.bossDepth.blurred(img);
    FP.assertEqual(L.made.length, 1);
    FP.assert(/blur/.test(L.made[0].g.filter), 'flou demandé : ' + L.made[0].g.filter);
    FP.assertEqual(FP.bossDepth.blurred(img).sharp, false);
  } finally { FP.px.layer = saved; }
});

FP.test('bossDepth: sans ctx.filter, plus transparent et sans erreur', () => {
  const saved = FP.px.layer, L = depthLayers(false); FP.px.layer = L.fakeLayer;
  try {
    const img = skinImg(20, 80), b = FP.bossDepth.blurred(img);
    FP.assertEqual(b.sharp, true);
    FP.assertEqual(FP.bossDepth.alphaOf(b), FP.config.boss.skin.foreAlphaNoBlur);
    FP.assertEqual(FP.bossDepth.alphaOf({ sharp: false }), FP.config.boss.skin.foreAlpha);
  } finally { FP.px.layer = saved; }
});

FP.test('bossDepth: le premier plan défile plus vite que la caméra et tremble plus pendant un avertissement', () => {
  try {
    FP.bossSkin._reset(); depthImgs();
    const s = skinRun(0), z = FP.bossPlan.zone(s.world), list = FP.bossDepth.layout(s), e = list[0];
    const at = (camY) => { s.camera.y = camY; return FP.bossDepth.layout(s)[0]; };
    const a = at(z.top), b = at(z.top + 100);
    FP.assert(a.y - b.y >= 100 * 1.4 / FP.px.SCALE - 1 && a.y - b.y <= 100 * 1.8 / FP.px.SCALE + 1, 'plus vite que la caméra (pixels d’art) : ' + (a.y - b.y));
    FP.assertEqual(a.x, e.x, 'pas de secousse au repos');
    const r = s.world.bossLevel.rooms[0]; s.bossThreats.rooms[r.id] = { stage: 'warn', t: .3, half: 1 };
    const xs = new Set([0, 1 / 30 + 1e-3].map(dt => { s.time = 2 + dt; return at(z.top).x - e.x; }));
    FP.assert(xs.has(FP.config.boss.skin.foreShake) && xs.has(-FP.config.boss.skin.foreShake), 'secousse ± ' + [...xs]);
  } finally { FP.bossSkin._reset(); }
});

FP.test('bossDepth: au plus un élément du premier plan à l’écran, même au facteur max', () => {
  try {
    FP.bossSkin._reset(); FP.bossSkin._set('friche', 'fore', [skinImg(16, 147), skinImg(120, 83)]);
    const s = depthStretched(), z = FP.bossPlan.zone(s.world), H = Math.ceil(s.world.viewH / FP.px.SCALE);
    let seen = 0, frames = 0;
    for (let c = z.top - s.world.viewH; c < z.bottom; c += 4) {
      s.camera.y = c; frames++;
      const v = FP.bossDepth.layout(s).filter(e => e.y < H && e.y + e.img.height > 0);
      FP.assert(v.length <= 1, 'deux éléments à la caméra ' + Math.round(c));
      if (v.length) seen++;
    }
    FP.assert(seen / frames > .3, 'présent souvent : ' + (seen / frames).toFixed(2));
  } finally { FP.bossSkin._reset(); }
});
