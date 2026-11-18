// Encounter Lab : les 10 modules de la première livraison (v5.13.0, spec docs/superpowers/specs/2026-11-18-modules-premiere-livraison-design.md,
// fiches docs/lab/modules.md), un par niveau (?lab=N), en miroir un passage réussi sur deux ; le mode Lab et sa mesure. Les mécaniques
// (sols, impulsion, pièces posées, horloge, tourelle) sont testées sur des modules d'essai : lab-mechanics.test.js.
const LAB_IDS = ['gueule', 'escalier', 'peigne', 'sablier', 'carrefour', 'dents-de-scie', 'tetris', 'tour-de-guet', 'herse', 'grand-huit'];
const LAB_WIDTHS = [280, 300, 360, 440];
const labRun = (n, W = 360, mirror = false) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = n; if (mirror) s.run.labPasses[LAB_IDS[n - 1]] = 1; FP.level.startRun(s); s.mode = 'playing';
  return s;
};
const labEach = (fn) => { for (const W of LAB_WIDTHS) for (const mirror of [false, true]) LAB_IDS.forEach((id, i) => fn({ s: labRun(i + 1, W, mirror), W, id, n: i + 1, at: `${id} W=${W}${mirror ? ' miroir' : ''}` })); };
const labPolys = (s) => s.world.solids.filter(o => o.kind === 'lab').map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));
const labSamples = (pts) => { const out = []; for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 20; k++) out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 20, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 20 }); return out; };
const labMod = (id) => window.FLOWER_POWER_LAB.find(c => c.id === id);

FP.test('lab: 10 modules, dans l’ordre de la spec', () => {
  FP.assertEqual(window.FLOWER_POWER_LAB.map(c => c.id).join(), LAB_IDS.join());
  for (const c of window.FLOWER_POWER_LAB) {
    FP.assert(c.height >= .5 && c.height <= 1.5, c.id + ' : hauteur ' + c.height);
    FP.assert(c.name && c.idea, c.id + ' : nom et idée'); FP.assertEqual(c.soils.length, 0, c.id + ' : pas de sol (plus tard)');
    FP.assert(c.alt.length >= 1 && c.coins.length > 0, c.id + ' : un dilemme et des pièces');
  }
});

FP.test('lab: chaque module se traverse, dans les deux sens', () => {
  labEach(({ s, at }) => {
    const L = s.world.modules[0], walls = labPolys(s), half = L.channelMin / 2;
    for (const path of [L.path, ...L.alt]) {
      FP.assert(path[0].y > L.bottom && path[path.length - 1].y < L.top, 'du dessous au-dessus du module ' + at);
      for (const q of labSamples(path)) for (const P of walls) FP.assert(FP.geom.sdPoly(q.x, q.y, P) >= half - 1e-6, `trajet à ${FP.geom.sdPoly(q.x, q.y, P).toFixed(1)} px d'un mur en (${q.x | 0},${q.y | 0}) ` + at);
    }
  });
});

FP.test('lab: tout dans la bande sûre, dans les deux sens', () => {
  labEach(({ s, W, at }) => {
    const L = s.world.modules[0], m = FP.camera.safeX(W), r = FP.config.coins.radius, inBand = (x, pad = 0) => x - pad >= m - 1e-6 && x + pad <= W - m + 1e-6;
    for (const l of L.lanes) FP.assert(inBand(l.x0) && inBand(l.x1), 'voie ' + at);
    for (const c of s.world.coins) FP.assert(inBand(c.x, r), 'pièce ' + at);
    for (const l of s.world.leaks) for (const k of [-.5, .5]) FP.assert(inBand(l.x + Math.cos(l.angle) * l.len * k, l.r), 'limace ' + at);
    for (const q of L.turrets) FP.assert(inBand(q.x, FP.config.boss.turret.size / 2), 'tourelle ' + at);
    for (const path of [L.path, ...L.alt]) for (const q of path.slice(1, -1)) FP.assert(inBand(q.x), 'trajet ' + at);
  });
});

FP.test('lab: les murs ferment les bords du monde', () => {
  labEach(({ s, W, at }) => {
    const L = s.world.modules[0], walls = labPolys(s);
    for (let y = L.top + 2; y <= L.bottom - 2; y += 6) for (const x of [2, W - 2]) FP.assert(walls.some(P => FP.geom.sdPoly(x, y, P) <= 0), `bord ouvert en (${x},${y | 0}) ` + at);
  });
});

// Ligne de tir libre entre une tourelle et un point (le béton l'arrête).
const labSees = (s, q, p) => { const walls = labPolys(s); for (let k = 1; k < 60; k++) { const x = q.x + (p.x - q.x) * k / 60, y = q.y + (p.y - q.y) * k / 60; if (walls.some(P => FP.geom.sdPoly(x, y, P) <= 0)) return false; } return true; };
const labExposed = (s, path) => { const L = s.world.modules[0], pts = labSamples(path).filter(q => q.y >= L.top && q.y <= L.bottom); return pts.filter(p => L.turrets.some(q => labSees(s, q, p))).length / pts.length; };
FP.test('lab: chaque module tient sa promesse', () => {
  const C = labMod, periods = (c) => c.slugs.map(l => l.period);
  FP.assertEqual(C('gueule').slugs.length, 2); FP.assert(C('gueule').coins.every(([x]) => x > .37 && x < .63), 'les pièces dans la gorge');
  FP.assertEqual(C('escalier').turrets.length, 2);
  FP.assertEqual(C('peigne').slugs.length, 4); FP.assertEqual(new Set(periods(C('peigne'))).size, 4, 'quatre rythmes');
  for (const id of ['sablier', 'grand-huit']) FP.assertEqual(JSON.stringify(C(id).pulse.lanes), '[0]', id);
  FP.assert(C('carrefour').slugs.every(l => l.y0 === l.y1 && Math.min(l.x0, l.x1) < .5 && Math.max(l.x0, l.x1) > .5), 'la circulation coupe la route');
  FP.assertEqual(C('dents-de-scie').toxics.length, 3); FP.assertEqual(C('tetris').turrets.length, 1);
  FP.assertEqual(C('tour-de-guet').turrets.length, 2); FP.assert(C('tour-de-guet').turrets[0].offset !== C('tour-de-guet').turrets[1].offset, 'en alternance');
  FP.assertEqual(C('herse').toxics.length, 1); FP.assertEqual(C('herse').slugs.length, 2);
  const g = labRun(10), G = g.world.modules[0], lane = G.lanes[0], inLane = (q) => q.x >= lane.x0 && q.x <= lane.x1;
  FP.assert(G.path.every(inLane), 'la corde sous l’impulsion'); FP.assert(G.alt[0].slice(1, -1).some(q => !inLane(q)), 'les boucles hors de l’impulsion');
  const t = labRun(7); FP.assert(labExposed(t, t.world.modules[0].path) > labExposed(t, t.world.modules[0].alt[0]), 'tetris : le chemin court plus à découvert');
  const e = labRun(2), x = labExposed(e, e.world.modules[0].path); FP.assert(x > .25 && x < .75, 'escalier : des abris en chemin, ' + x.toFixed(2));
});

FP.test('lab: hauteur du niveau', () => {
  labEach(({ s, at }) => {
    const w = s.world, L = w.modules[0], c = labMod(L.circuit.id);
    FP.assertEqual(w.height, FP.labLevel.heightFor(c, w), at);
    FP.assert(Math.abs(w.height - FP.config.plant.seedOffset - L.bottom - w.viewH / 2) < 1e-6, 'demi-écran libre au départ ' + at);
    FP.assert(Math.abs(L.top - w.surfaceY - w.viewH / 2) < 1e-6, 'demi-écran jusqu’à la surface ' + at);
    FP.assertEqual(w.bonuses.length, 0, 'pas de bonus ' + at);
    FP.assertEqual(w.leaks.length, c.slugs.length, 'les limaces du module ' + at); FP.assertEqual(w.toxics.length, c.toxics.length, 'les nappes du module ' + at);
    FP.assertEqual(w.solids.length, c.walls.length + c.obstacles.length, 'murs et obstacles du module ' + at);
  });
});

// --- Mode Lab : lancement, enchaînement, morts, vitesse, jeu normal intact.
FP.test('lab: paramètre', () => {
  FP.assertEqual(FP.parseParams('?lab=3').lab, 3); FP.assertEqual(FP.parseParams('?lab=10').lab, 10);
  for (const q of ['?lab=11', '?lab=abc', '?lab=0', '?lab=', '?lab=-2', '?lab=2.5', '?lab=01']) FP.assertEqual(FP.parseParams(q).lab, 1, q);
  FP.assertEqual(FP.parseParams('').lab, null);
  FP.assertEqual(FP.parseParams('?lab=2&stats=reset').stats, 'reset'); FP.assertEqual(FP.parseParams('?lab=2&stats').stats, true);
  FP.assertEqual(FP.parseParams('?lab=2').stats, false);
});
const labBloom = (s) => { s.events.length = 0; s.plant.tip.y = s.world.surfaceY - 1; FP.flow.update(s, 1 / 60); for (let i = 0; i < 600 && s.mode !== 'ready'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); } };
FP.test('lab: une éclosion passe au module suivant, le 10e ramène au 1er', () => {
  for (const [from, to] of [[1, 2], [9, 10], [10, 1]]) {
    const s = labRun(from); FP.plant.launch(s);
    labBloom(s);
    FP.assertEqual(s.run.lab, to, `${from} → ${to}`); FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.world.modules[0].circuit.id, LAB_IDS[to - 1]);
    FP.assertEqual(s.shop, null, 'pas de boutique'); FP.assert(!s.run.boss, 'pas de boss');
  }
});
FP.test('lab: une mort relance le même module sans perdre de graine', () => {
  const s = labRun(3); FP.plant.launch(s); const before = s.plant.reserves;
  const wall = s.world.solids[0]; s.plant.tip = { x: wall.x, y: wall.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, before, 'graine gardée');
  FP.assertEqual(s.flow.overReason, 'bétonnée', 'cause de mort propre aux murs du Lab');
  for (let i = 0; i < 600 && s.mode !== 'ready'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); }
  FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.run.lab, 3); FP.assertEqual(s.shop, null);
});
FP.test('lab: vitesse d’un premier niveau', () => {
  const s = labRun(1); FP.plant.launch(s);
  s.plant.stemCount = 1; s.score.flowers = 0; const a = FP.plant.speed(s);
  s.plant.stemCount = 30; s.score.flowers = 40; FP.assertEqual(FP.plant.speed(s), a);
});
// Empreinte de deux niveaux normaux (graines 3 et 11, 360 × 640), relevée avant le mode Lab : la génération n'a pas bougé.
FP.test('lab: jeu normal intact', () => {
  const out = [];
  for (const seed of [3, 11]) {
    const s = FP.state.createRun(seed, { W: 360, H: 640 }); FP.level.startRun(s); const w = s.world;
    FP.assertEqual(s.run.lab, null); FP.assertEqual(w.modules.length, 0);
    const j = JSON.stringify([w.height, w.solids.map(o => [o.kind, Math.round(o.x), Math.round(o.y)]), w.toxics.map(t => [Math.round(t.x), Math.round(t.y)]),
      w.leaks.map(l => [Math.round(l.x), Math.round(l.y)]), w.coins.map(c => [Math.round(c.x), Math.round(c.y)])]);
    let h = 2166136261; for (const ch of j) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out.push(h);
  }
  FP.assertEqual(out.join(), '2481539369,4256782594');
});

FP.test('labRender: béton dessiné, rien hors Lab', () => {
  const s = labRun(1), L = s.world.modules[0]; s.camera.y = (L.top + L.bottom - s.world.viewH) / 2; const g = skinCtx(); FP.labRender.draw(g, s);
  FP.assert(g.rects.some(r => FP.palette.lab.concrete.includes(r.c)), 'béton');
  const n = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(n); const gn = skinCtx(); FP.labRender.draw(gn, n);
  FP.assertEqual(gn.rects.length, 0, 'hors Lab');
});

// --- Mesure (v5.12.0) : par module, passages réussis, morts et causes, temps moyen, frôlements et pièces par passage.
const statsMem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; };
const withStore = (store, fn) => { const had = 'localStorage' in window, saved = window.localStorage; window.localStorage = store; FP.labStats.reset(); try { fn(); } finally { if (had) window.localStorage = saved; else delete window.localStorage; } };
// Une frame de jeu au Lab : la pointe à y, les événements donnés, puis la mesure.
const statsFrame = (s, y, events = [], dt = .5) => { s.plant.tip = { x: s.world.width / 2, y }; s.events.length = 0; s.events.push(...events); FP.labStats.update(s, dt); };
FP.test('lab: un passage réussi enregistre temps, frôlements et pièces', () => withStore(statsMem(), () => {
  const s = labRun(4), L = s.world.modules[0], mid = (L.top + L.bottom) / 2;
  statsFrame(s, L.bottom + 50); statsFrame(s, mid); statsFrame(s, mid, [{ type: 'eco', kind: 'solid' }, { type: 'coin' }, { type: 'coin' }]); statsFrame(s, mid, [{ type: 'eco', kind: 'coin' }]);
  statsFrame(s, L.top - 10, [{ type: 'bloom' }]);
  const r = FP.labStats.summary().find(q => q.id === 'sablier');
  FP.assertEqual(r.runs, 1); FP.assertEqual(r.deaths, 0); FP.assertEqual(r.avgTime, 1.5); FP.assertEqual(r.grazesPerRun, 1);
  FP.assertEqual(r.coinsPerRun, 2); FP.assertEqual(r.coinsTotal, s.world.coins.length);
}));
FP.test('lab: une mort compte avec sa cause', () => withStore(statsMem(), () => {
  const s = labRun(5), L = s.world.modules[0];
  statsFrame(s, (L.top + L.bottom) / 2, [{ type: 'death', cause: 'solid', kind: 'pulse' }]);
  statsFrame(s, (L.top + L.bottom) / 2, [{ type: 'death', cause: 'solid', kind: 'lab' }]);
  const r = FP.labStats.summary().find(q => q.id === 'carrefour');
  FP.assertEqual(r.deaths, 2); FP.assertEqual(r.runs, 0); FP.assertEqual(JSON.stringify(r.causes), '{"pulse":1,"lab":1}');
}));
FP.test('lab: summary fait les moyennes, reset vide', () => withStore(statsMem(), () => {
  const s = labRun(1), L = s.world.modules[0], mid = (L.top + L.bottom) / 2;
  for (const t of [2, 4]) { statsFrame(s, mid, [], t); statsFrame(s, L.top - 5, [{ type: 'bloom' }], 0); }
  const r = FP.labStats.summary().find(q => q.id === 'gueule');
  FP.assertEqual(r.runs, 2); FP.assertEqual(r.avgTime, 3);
  FP.assertEqual(FP.labStats.summary().length, 10);
  FP.labStats.reset(); FP.assertEqual(FP.labStats.summary().find(q => q.id === 'gueule').runs, 0);
}));
FP.test('lab: sans localStorage, rien ne casse', () => withStore({ getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() { throw new Error('bloqué'); } }, () => {
  const s = labRun(2), L = s.world.modules[0];
  statsFrame(s, (L.top + L.bottom) / 2); statsFrame(s, L.top - 5, [{ type: 'bloom' }]);
  FP.assertEqual(FP.labStats.summary().find(q => q.id === 'escalier').runs, 1, 'gardé en mémoire');
}));
FP.test('lab: hors Lab, la mesure ne fait rien', () => withStore(statsMem(), () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s);
  s.events.push({ type: 'bloom' }); FP.labStats.update(s, 1);
  FP.assert(FP.labStats.summary().every(q => q.runs === 0 && q.deaths === 0), 'rien compté');
}));
FP.test('labStats: le tableau se dessine au menu avec &stats', () => withStore(statsMem(), () => {
  const view = FP.view, font = FP.font.draw, drawn = [];
  FP.view = { ...(view || {}), ui: { w: 195, h: 422 } }; FP.font.draw = (g, text) => { drawn.push(text); return 0; };
  const s = labRun(5), L = s.world.modules[0]; statsFrame(s, (L.top + L.bottom) / 2, [{ type: 'death', cause: 'solid', kind: 'pulse' }]); statsFrame(s, (L.top + L.bottom) / 2, [{ type: 'death', cause: 'solid', kind: 'lab' }]);
  try { FP.labStatsView.draw(skinCtx(), labRun(1)); } finally { FP.view = view; FP.font.draw = font; }
  FP.assert(drawn.some(t => t.includes('GAZ ×1') && t.includes('MUR ×1')), 'causes lisibles : ' + drawn.join(' | '));
  for (const c of window.FLOWER_POWER_LAB) FP.assert(drawn.some(t => t.includes(c.name)), 'ligne ' + c.name);
}));

// --- Revue finale : la spore épargne le béton, le Lab n'écrit pas les records, la flèche reste dans le cadre zoomé.
FP.test('lab: une spore n’efface pas les murs', () => {
  for (const n of [1, 4, 5]) {
    const s = labRun(n), L = s.world.modules[0], before = s.world.solids.length;
    FP.labPulse.update(s, 0);
    FP.powerups.detonate(s, s.world.width / 2, L.top + (L.bottom - L.top) / 3);
    FP.assertEqual(s.world.solids.filter(o => o.kind === 'lab').length, before, 'murs intacts, module ' + n);
  }
});
FP.test('lab: le Lab n’écrit pas les records du jeu normal', () => {
  const r = FP.scoring.records, saved = JSON.stringify(r);
  try {
    const s = labRun(1); s.score.flowers = r.flowers + 50; s.score.eco = r.eco + 99999;
    FP.scoring.update(s, 1 / 60);
    FP.assertEqual(JSON.stringify(FP.scoring.records), saved, 'records inchangés');
  } finally { Object.assign(FP.scoring.records, JSON.parse(saved)); }
});

// Revue finale : une pièce n'est jamais dans une nappe (les nappes ont une taille fixe en pixels, les pièces une place proportionnelle).
FP.test('lab: aucune pièce dans une nappe', () => {
  labEach(({ s, at }) => {
    for (const c of s.world.coins) for (const t of s.world.toxics) FP.assert(Math.hypot(c.x - t.x, c.y - t.y) > Math.max(t.rx, t.ry) + FP.config.coins.radius, 'pièce dans une nappe ' + at);
  });
});
