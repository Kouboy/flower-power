// Encounter Lab (v5.12.0, spec docs/superpowers/specs/2026-11-16-encounter-lab-design.md) : 6 micro-circuits faits à la main, un par
// niveau (?lab=N), deux sols (argile, sable), une impulsion montante, une mesure par circuit.
const LAB_IDS = ['slalom', 'slalom-argile', 'rigole', 'fourche', 'cheminee', 'combine'];
const LAB_WIDTHS = [280, 300, 360, 440];
const labRun = (n, W = 360) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = n; FP.level.startRun(s); s.mode = 'playing';
  return s;
};
const labEach = (fn) => { for (const W of LAB_WIDTHS) LAB_IDS.forEach((id, i) => fn({ s: labRun(i + 1, W), W, id, n: i + 1, at: `${id} W=${W}` })); };
const labPolys = (s) => s.world.solids.filter(o => o.kind === 'lab').map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));
const labSamples = (pts) => { const out = []; for (let i = 1; i < pts.length; i++) for (let k = 0; k <= 20; k++) out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k / 20, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k / 20 }); return out; };

FP.test('lab: 6 circuits, dans l’ordre de la spec', () => {
  FP.assertEqual(window.FLOWER_POWER_LAB.map(c => c.id).join(), LAB_IDS.join());
  for (const c of window.FLOWER_POWER_LAB) FP.assert(c.height >= .5 && c.height <= 1.5, c.id + ' : hauteur ' + c.height);
});

FP.test('lab: le slalom argile reprend le tracé du slalom nu', () => {
  const [a, b] = window.FLOWER_POWER_LAB;
  FP.assertEqual(JSON.stringify(b.walls), JSON.stringify(a.walls)); FP.assertEqual(JSON.stringify(b.path), JSON.stringify(a.path));
  FP.assertEqual(a.soils.length, 0); FP.assert(b.soils.length > 0 && b.soils.every(z => z.kind === 'argile'), 'argile seulement');
});

FP.test('lab: chaque circuit se traverse', () => {
  labEach(({ s, at }) => {
    const L = s.world.labLevel, walls = labPolys(s), half = L.channelMin / 2;
    for (const path of [L.path, ...L.alt]) {
      FP.assert(path[0].y > L.bottom && path[path.length - 1].y < L.top, 'du dessous au-dessus du circuit ' + at);
      for (const q of labSamples(path)) for (const P of walls) FP.assert(FP.geom.sdPoly(q.x, q.y, P) >= half - 1e-6, `trajet à ${FP.geom.sdPoly(q.x, q.y, P).toFixed(1)} px d'un mur en (${q.x | 0},${q.y | 0}) ` + at);
    }
  });
});

FP.test('lab: tout dans la bande sûre', () => {
  labEach(({ s, W, at }) => {
    const L = s.world.labLevel, m = FP.camera.safeX(W), r = FP.config.coins.radius, inBand = (x, pad = 0) => x - pad >= m - 1e-6 && x + pad <= W - m + 1e-6;
    for (const z of L.soils) FP.assert(z.poly.every(([x]) => inBand(x)), 'sol ' + at);
    for (const l of L.lanes) FP.assert(inBand(l.x0) && inBand(l.x1), 'voie ' + at);
    for (const c of s.world.coins) FP.assert(inBand(c.x, r), 'pièce ' + at);
    for (const path of [L.path, ...L.alt]) for (const q of path.slice(1, -1)) FP.assert(inBand(q.x), 'trajet ' + at);
  });
});

FP.test('lab: sols et voies attendus', () => {
  const kinds = (c) => [...new Set(c.soils.map(z => z.kind))].sort().join();
  const C = Object.fromEntries(window.FLOWER_POWER_LAB.map(c => [c.id, c]));
  FP.assertEqual(kinds(C.slalom), ''); FP.assertEqual(kinds(C['slalom-argile']), 'argile'); FP.assertEqual(kinds(C.rigole), 'sable');
  FP.assertEqual(kinds(C.fourche), 'argile,sable'); FP.assertEqual(kinds(C.combine), 'argile,sable');
  FP.assert(C.fourche.coins.length > 0, 'pièces de la fourche');
  const s = labRun(4), L = s.world.labLevel, sand = L.soils.find(z => z.kind === 'sable');
  FP.assert(s.world.coins.every(c => FP.geom.sdPoly(c.x, c.y, sand.poly) <= 0), 'les pièces de la fourche sont côté sable');
  FP.assertEqual(C.cheminee.lanes.length, 2); FP.assertEqual(JSON.stringify(C.cheminee.pulse.lanes), '[0,1]');
  FP.assertEqual(C.combine.pulse.lanes.length, 1); FP.assert(C.combine.pulse.slow < 1, 'impulsion plus lente'); FP.assert(C.combine.coins.length > 0, 'tentation');
  for (const id of ['slalom', 'slalom-argile', 'rigole', 'fourche']) FP.assertEqual(C[id].pulse, null, id);
});

FP.test('lab: hauteur du niveau', () => {
  labEach(({ s, at }) => {
    const w = s.world, L = w.labLevel, c = window.FLOWER_POWER_LAB.find(q => q.id === L.circuit.id);
    FP.assertEqual(w.height, FP.labLevel.heightFor(c, w), at);
    FP.assert(Math.abs(w.height - FP.config.plant.seedOffset - L.bottom - w.viewH / 2) < 1e-6, 'demi-écran libre au départ ' + at);
    FP.assert(Math.abs(L.top - w.surfaceY - w.viewH / 2) < 1e-6, 'demi-écran jusqu’à la surface ' + at);
    FP.assertEqual(w.toxics.length + w.leaks.length + w.bonuses.length, 0, 'rien au hasard ' + at);
    FP.assert(w.solids.every(o => o.kind === 'lab'), 'seuls les murs du circuit ' + at);
  });
});

// --- Mode Lab (tâche 2) : lancement, enchaînement, morts, vitesse, jeu normal intact.
FP.test('lab: paramètre', () => {
  FP.assertEqual(FP.parseParams('?lab=3').lab, 3);
  for (const q of ['?lab=7', '?lab=abc', '?lab=0', '?lab=', '?lab=-2', '?lab=2.5']) FP.assertEqual(FP.parseParams(q).lab, 1, q);
  FP.assertEqual(FP.parseParams('').lab, null);
  FP.assertEqual(FP.parseParams('?lab=2&stats=reset').stats, 'reset'); FP.assertEqual(FP.parseParams('?lab=2&stats').stats, true);
  FP.assertEqual(FP.parseParams('?lab=2').stats, false);
});
const labBloom = (s) => { s.events.length = 0; s.plant.tip.y = s.world.surfaceY - 1; FP.flow.update(s, 1 / 60); for (let i = 0; i < 600 && s.mode !== 'ready'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); } };
FP.test('lab: une éclosion passe au circuit suivant, le 6e ramène au 1er', () => {
  for (const [from, to] of [[1, 2], [5, 6], [6, 1]]) {
    const s = labRun(from); FP.plant.launch(s); const seen = [];
    labBloom(s);
    FP.assertEqual(s.run.lab, to, `${from} → ${to}`); FP.assertEqual(s.mode, 'ready'); FP.assertEqual(s.world.labLevel.circuit.id, LAB_IDS[to - 1]);
    FP.assertEqual(s.shop, null, 'pas de boutique'); FP.assert(!s.run.boss, 'pas de boss');
  }
});
FP.test('lab: une mort relance le même circuit sans perdre de graine', () => {
  const s = labRun(3); FP.plant.launch(s); const before = s.plant.reserves;
  const wall = s.world.solids[0]; s.plant.tip = { x: wall.x, y: wall.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.plant.reserves, before, 'graine gardée');
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
    FP.assertEqual(s.run.lab, null); FP.assertEqual(w.labLevel, null);
    const j = JSON.stringify([w.height, w.solids.map(o => [o.kind, Math.round(o.x), Math.round(o.y)]), w.toxics.map(t => [Math.round(t.x), Math.round(t.y)]),
      w.leaks.map(l => [Math.round(l.x), Math.round(l.y)]), w.coins.map(c => [Math.round(c.x), Math.round(c.y)])]);
    let h = 2166136261; for (const ch of j) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    out.push(h);
  }
  FP.assertEqual(out.join(), '2481539369,4256782594');
});

// --- Dessin (tâche 3) : béton neutre, argile, sable. Aides : skinCtx (bossskin.test.js).
const labDraw = (s, y) => { s.camera.y = y; const g = skinCtx(); FP.labRender.draw(g, s); return g; };
const labMid = (s, z) => { const ys = z.poly.map(q => q[1]); return (Math.min(...ys) + Math.max(...ys)) / 2 - s.world.viewH / 2; };
FP.test('labRender: béton et sols dessinés, rien hors Lab', () => {
  const s = labRun(4), L = s.world.labLevel, P = FP.palette.lab;
  const g = labDraw(s, labMid(s, L.soils[0]));
  for (const [name, cols] of [['béton', P.concrete], ['argile', P.argile], ['sable', P.sable]]) FP.assert(g.rects.some(r => cols.includes(r.c)), name);
  const n = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(n); const gn = skinCtx(); FP.labRender.draw(gn, n);
  FP.assertEqual(gn.rects.length, 0, 'hors Lab');
});
FP.test('labRender: la frontière d’un sol se voit', () => {
  const s = labRun(2), L = s.world.labLevel, z = L.soils[0], g = labDraw(s, labMid(s, z)), cam = FP.px.toArt(s.camera.y);
  const xs = z.poly.map(q => FP.px.toArt(q[0])), x0 = Math.min(...xs), x1 = Math.max(...xs);
  FP.assert(g.rects.some(r => r.c === FP.palette.lab.argile[0] && (Math.abs(r.x - x0) <= 1 || Math.abs(r.x + r.w - 1 - x1) <= 1)), 'bord clair de l’argile');
});

// --- Sols (tâche 4) : l'argile ralentit le braquage et le suivi du doigt, le sable accélère et rend nerveux ; transition de 0,3 s.
const labCenter = (z) => { const xs = z.poly.map(q => q[0]), ys = z.poly.map(q => q[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
const labSoil = (n, kind) => { const s = labRun(n); FP.plant.launch(s); const z = s.world.labLevel.soils.find(q => q.kind === kind); s.plant.tip = labCenter(z); return s; };
FP.test('lab: l’argile ralentit le braquage, le sable accélère', () => {
  const near = (a, b, at) => FP.assert(Math.abs(a - b) <= .02, `${at} : ${a.toFixed(3)} au lieu de ${b}`);
  const a = labSoil(4, 'argile'); for (let i = 0; i < 60; i++) FP.plant.soilStep(a, 1 / 60);
  let f = FP.plant.soilFactors(a); near(f.turn, .55, 'argile braquage'); near(f.guide, .55, 'argile doigt'); near(f.speed, 1, 'argile vitesse');
  const s = labSoil(4, 'sable'), v = FP.plant.speed(s); for (let i = 0; i < 60; i++) FP.plant.soilStep(s, 1 / 60);
  f = FP.plant.soilFactors(s); near(f.speed, 1.35, 'sable vitesse'); near(f.turn, 1.4, 'sable braquage'); near(FP.plant.speed(s) / v, 1.35, 'vitesse réelle');
});
FP.test('lab: transition douce', () => {
  const s = labSoil(3, 'sable'); for (let i = 0; i < 6; i++) FP.plant.soilStep(s, 1 / 60);
  FP.assert(s.plant.soil.sable >= .2 && s.plant.soil.sable <= .5, 'à 0,1 s : ' + s.plant.soil.sable);
  for (let i = 0; i < 60; i++) FP.plant.soilStep(s, 1 / 60);
  s.plant.tip = { x: s.world.width / 2, y: s.world.height - 30 };   // sortie : plus de sable
  let prev = FP.plant.soilFactors(s).turn, maxStep = 0;
  for (let i = 0; i < 60; i++) { FP.plant.soilStep(s, 1 / 60); const t = FP.plant.soilFactors(s).turn; maxStep = Math.max(maxStep, Math.abs(t - prev)); prev = t; }
  FP.assert(maxStep <= .4 / 18 + 1e-9, 'pas de saut : ' + maxStep.toFixed(4));
  const f = FP.plant.soilFactors(s); FP.assertEqual(JSON.stringify([f.turn, f.guide, f.speed]), '[1,1,1]', 'tout revenu à la normale');
});
FP.test('lab: hors Lab, aucun sol', () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s);
  FP.assertEqual(FP.labLevel.soilAt(s.world, s.plant.tip.x, s.plant.tip.y), null);
  for (let i = 0; i < 30; i++) FP.plant.soilStep(s, 1 / 60);
  const f = FP.plant.soilFactors(s); FP.assertEqual(JSON.stringify([f.turn, f.guide, f.speed]), '[1,1,1]');
});
