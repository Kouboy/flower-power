// Encounter Lab, les mécaniques (v5.12.0 à v5.13.0) testées sur des modules d'essai, indépendants des modules livrés (lab.test.js) :
// sols, impulsion montante (deux voies en alternance, ou une voie plus lente), pièces posées, miroir, horloge, tourelle.
// Modules d'essai : les anciens circuits de la v5.12 (fourche à deux sols, cheminée à deux voies, combiné lent).
const labFix = (c, W = 360) => {
  const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) });
  s.run.lab = 1; FP.level.startRun(s); FP.labLevel.generate(s, c); s.mode = 'playing';
  return s;
};
const LAB_SOILS = { id: 'essai-sols', name: 'ESSAI SOLS', height: 1.3,
  walls: [[[0, 0], [.4, 0], [.4, .12], [.14, .28], [.14, .76], [.4, .92], [.4, 1], [0, 1]],
    [[1, 0], [1, 1], [.6, 1], [.6, .92], [.86, .76], [.86, .28], [.6, .12], [.6, 0]],
    [[.3, .34], [.38, .26], [.46, .34], [.46, .6], [.6, .6], [.6, .66], [.46, .66], [.46, .7], [.4, .74], [.3, .66]]],
  soils: [{ kind: 'argile', poly: [[.14, .32], [.3, .32], [.3, .7], [.14, .7]] }, { kind: 'sable', poly: [[.46, .28], [.86, .28], [.86, .76], [.46, .76]] }],
  lanes: [], pulse: null, coins: [[.66, .7]], path: [[.5, 1], [.5, 0]], alt: [] };
const LAB_POSTS = [.03, .13, .23, .33, .43, .53, .63, .73, .83, .93].map(y => [[.48, y], [.52, y], [.52, y + .025], [.48, y + .025]]);
const LAB_TWIN = { id: 'essai-deux-voies', name: 'ESSAI DEUX VOIES', height: 1.2,
  walls: [[[0, 0], [.28, 0], [.28, 1], [0, 1]], [[1, 0], [1, 1], [.72, 1], [.72, 0]], ...LAB_POSTS],
  soils: [], lanes: [{ x0: .28, x1: .48, y0: 0, y1: .96 }, { x0: .52, x1: .72, y0: 0, y1: .96 }], pulse: { lanes: [0, 1] }, coins: [],
  path: [[.38, 1], [.38, 0]], alt: [] };
const LAB_SLOW = { id: 'essai-lent', name: 'ESSAI LENT', height: 1.5,
  walls: [[[0, 0], [.14, 0], [.14, 1], [0, 1]], [[1, 0], [1, 1], [.86, 1], [.86, 0]]],
  soils: [], lanes: [{ x0: .14, x1: .36, y0: .1, y1: .6 }], pulse: { lanes: [0], slow: .7, period: 6 }, coins: [], path: [[.5, 1], [.5, 0]], alt: [] };

// --- Sols (v5.12.0, gardés pour plus tard) : l'argile ralentit le braquage et le suivi du doigt, le sable accélère et rend nerveux ; transition de 0,3 s.
const labCenter = (z) => { const xs = z.poly.map(q => q[0]), ys = z.poly.map(q => q[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; };
const labSoil = (kind) => { const s = labFix(LAB_SOILS); FP.plant.launch(s); const z = s.world.labLevel.soils.find(q => q.kind === kind); s.plant.tip = labCenter(z); return s; };
FP.test('lab: l’argile ralentit le braquage, le sable accélère', () => {
  const near = (a, b, at) => FP.assert(Math.abs(a - b) <= .02, `${at} : ${a.toFixed(3)} au lieu de ${b}`);
  const a = labSoil('argile'); for (let i = 0; i < 60; i++) FP.plant.soilStep(a, 1 / 60);
  let f = FP.plant.soilFactors(a); near(f.turn, .55, 'argile braquage'); near(f.guide, .55, 'argile doigt'); near(f.speed, 1, 'argile vitesse');
  const s = labSoil('sable'), v = FP.plant.speed(s); for (let i = 0; i < 60; i++) FP.plant.soilStep(s, 1 / 60);
  f = FP.plant.soilFactors(s); near(f.speed, 1.35, 'sable vitesse'); near(f.turn, 1.4, 'sable braquage'); near(FP.plant.speed(s) / v, 1.35, 'vitesse réelle');
});
FP.test('lab: transition douce', () => {
  const s = labSoil('sable'); for (let i = 0; i < 6; i++) FP.plant.soilStep(s, 1 / 60);
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

// --- Dessin des sols (v5.12.0) : argile, sable. Aides : skinCtx (bossskin.test.js).
const labDraw = (s, y) => { s.camera.y = y; const g = skinCtx(); FP.labRender.draw(g, s); return g; };
const labMid = (s, z) => { const ys = z.poly.map(q => q[1]); return (Math.min(...ys) + Math.max(...ys)) / 2 - s.world.viewH / 2; };
FP.test('labRender: sols dessinés', () => {
  const s = labFix(LAB_SOILS), L = s.world.labLevel, P = FP.palette.lab;
  const g = labDraw(s, labMid(s, L.soils[0]));
  for (const [name, cols] of [['argile', P.argile], ['sable', P.sable]]) FP.assert(g.rects.some(r => cols.includes(r.c)), name);
});
FP.test('labRender: la frontière d’un sol se voit', () => {
  const s = labFix(LAB_SOILS), L = s.world.labLevel, z = L.soils[0], g = labDraw(s, labMid(s, z)), cam = FP.px.toArt(s.camera.y);
  const xs = z.poly.map(q => FP.px.toArt(q[0])), x0 = Math.min(...xs), x1 = Math.max(...xs);
  FP.assert(g.rects.some(r => r.c === FP.palette.lab.argile[0] && (Math.abs(r.x - x0) <= 1 || Math.abs(r.x + r.w - 1 - x1) <= 1)), 'bord clair de l’argile');
});

// --- Impulsion montante (v5.12.0) : annoncée ≥ 1 s avant d'atteindre la pointe, d'abord dans l'autre voie, puis en alternance.
const laneX = (l) => (l.x0 + l.x1) / 2;
// La pointe tenue à une hauteur fixe dans la voie k (la tige « fait du surplace » pour le test) ; rend les événements horodatés.
const pulseSim = (c, k, frac, secs, tip0) => {
  const s = labFix(c), L = s.world.labLevel, lane = L.lanes[k], log = [];
  FP.plant.launch(s);
  s.plant.tip = tip0 ? tip0(s) : { x: laneX(lane), y: lane.y1 - (lane.y1 - lane.y0) * frac };
  for (let t = 0; t < secs; t += 1 / 60) {
    s.events.length = 0; s.time += 1 / 60; FP.labPulse.update(s, 1 / 60);
    for (const e of s.events) log.push({ t, ...e });
    const hit = s.world.solids.some(o => o.kind === 'pulse' && !o.off && FP.collision.distanceTo(o, s.plant.tip.x, s.plant.tip.y) <= 0);
    if (hit) log.push({ t, type: 'hit' });
  }
  return { s, L, log };
};
FP.test('lab: l’impulsion est annoncée au moins 1 s avant d’atteindre la pointe', () => {
  for (const k of [0, 1]) for (const frac of [.02, .1, .4, .8]) {
    const { log } = pulseSim(LAB_TWIN, k, frac, 8);
    const hits = log.filter(e => e.type === 'hit');
    FP.assert(hits.length > 0, `touchée un jour (voie ${k}, ${frac})`);
    const firstHit = hits[0].t, warn = log.filter(e => e.type === 'labWarn' && e.lane === k && e.t <= firstHit).pop();
    FP.assert(warn && firstHit - warn.t >= 1 - 1e-6, `annonce ${warn ? (firstHit - warn.t).toFixed(2) : 'absente'} s avant (voie ${k}, ${frac})`);
  }
});
FP.test('lab: la première impulsion vise l’autre voie, puis elles alternent', () => {
  for (const k of [0, 1]) {
    const lanes = pulseSim(LAB_TWIN, k, .3, 6).log.filter(e => e.type === 'labWarn').map(e => e.lane);
    FP.assert(lanes.length >= 3, 'plusieurs impulsions');
    FP.assertEqual(lanes[0], 1 - k, 'la première dans l’autre voie');
    for (let i = 1; i < lanes.length; i++) FP.assertEqual(lanes[i], 1 - lanes[i - 1], 'alternance');
  }
});
FP.test('lab: une pointe dans l’autre voie n’est jamais touchée', () => {
  const { s, log } = pulseSim(LAB_TWIN, 0, .5, 6);
  const L = s.world.labLevel, other = { x: laneX(L.lanes[1]), y: s.plant.tip.y };
  FP.assert(!log.some(e => e.type === 'hit' && false), '');
  for (let t = 0; t < 6; t += 1 / 60) {
    s.time += 1 / 60; FP.labPulse.update(s, 1 / 60);
    for (const o of s.world.solids.filter(q => q.kind === 'pulse' && !q.off && q.lane === 0)) FP.assert(FP.collision.distanceTo(o, other.x, other.y) > 0, 'voie 1 épargnée par la voie 0');
  }
});
FP.test('lab: une impulsion tue', () => {
  const s = labFix(LAB_TWIN); FP.plant.launch(s); s.events.length = 0;
  const L = s.world.labLevel; s.plant.tip = { x: laneX(L.lanes[1]), y: L.lanes[1].y1 - 40 };
  for (let i = 0; i < 400 && s.mode === 'playing'; i++) { s.time += 1 / 60; FP.labPulse.update(s, 1 / 60); FP.collision.update(s); FP.flow.update(s, 1 / 60); }
  const d = s.events.find(e => e.type === 'death');
  FP.assert(d && d.kind === 'pulse', 'mort par l’impulsion'); FP.assertEqual(s.flow.overReason, FP.config.text.death.pulse);
});
FP.test('lab: rien ne reste après une mort, une génération ou hors du circuit', () => {
  const live = (s) => s.world.solids.filter(o => o.kind === 'pulse' && !o.off).length;
  let { s } = pulseSim(LAB_TWIN, 0, .5, 3); FP.assert(live(s) > 0 || s.labPulse.active, 'actif');
  s.mode = 'dying'; FP.labPulse.update(s, 1 / 60); FP.assertEqual(live(s), 0, 'mort'); FP.assertEqual(s.labPulse.active, false);
  ({ s } = pulseSim(LAB_TWIN, 0, .5, 3)); FP.level.generate(s); FP.labPulse.update(s, 0); FP.assertEqual(live(s), 0, 'génération');
  ({ s } = pulseSim(LAB_TWIN, 0, .5, 3)); s.plant.tip = { x: s.world.width / 2, y: s.world.labLevel.top - 80 }; FP.labPulse.update(s, 1 / 60); FP.assertEqual(live(s), 0, 'sortie');
  const q = pulseSim(LAB_TWIN, 0, .5, 3, (st) => ({ x: st.world.width / 2, y: st.world.labLevel.bottom + 120 }));
  FP.assertEqual(q.log.filter(e => e.type === 'labWarn').length, 0, 'rien avant d’entrer');
});
FP.test('lab: le combiné, une seule voie et plus lent', () => {
  const a = pulseSim(LAB_SLOW, 0, .3, 8, (st) => ({ x: st.world.width * .68, y: st.world.labLevel.lanes[0].y1 - 10 }));
  FP.assert(a.log.some(e => e.type === 'labPulse'), 'des impulsions'); FP.assert(a.log.filter(e => e.type === 'labWarn').every(e => e.lane === 0), 'une seule voie');
  FP.assertEqual(FP.labPulse.speedFor(a.s, 0) / FP.labPulse.speedFor(pulseSim(LAB_TWIN, 0, .3, .1).s, 0), .7);
});
FP.test('lab: hors Lab, rien', () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s); s.events.length = 0;
  FP.labPulse.update(s, .1); FP.assertEqual(s.events.length, 0); FP.assert(!s.world.solids.some(o => o.kind === 'pulse'), 'aucune colonne');
});

// Dessin et son de l'impulsion : la buse s'allume pendant l'annonce, la colonne de gaz se voit, une flèche au bas de l'écran signale une
// buse sous l'écran ; l'annonce et le départ font un son.
FP.test('labRender: buse annoncée, colonne de gaz et flèche', () => {
  const P = FP.palette.lab;
  const { s } = pulseSim(LAB_TWIN, 0, .5, .2);   // une annonce en cours (voie 1)
  const L = s.world.labLevel, lane = L.lanes[1];
  s.camera.y = lane.y1 - s.world.viewH / 2; let g = skinCtx(); FP.labRender.drawThreats(g, s);
  FP.assert(g.rects.some(r => r.c === P.glow), 'buse allumée');
  for (let i = 0; i < 90; i++) { s.time += 1 / 60; FP.labPulse.update(s, 1 / 60); }
  const shot = s.labPulse.shots.find(q => !q.solid.off); FP.assert(shot, 'une colonne en vol');
  s.camera.y = shot.solid.y - s.world.viewH / 2; g = skinCtx(); FP.labRender.drawThreats(g, s);
  FP.assert(g.rects.some(r => P.gas.includes(r.c)), 'colonne de gaz');
  const n = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(n); const gn = skinCtx(); FP.labRender.drawThreats(gn, n); FP.assertEqual(gn.rects.length, 0, 'hors Lab');
});
FP.test('lab: annonce et départ font un son', () => {
  for (const type of ['labWarn', 'labPulse']) withBackend(b => { FP.audio.consume([{ type, lane: 0 }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
});

FP.test('lab: une spore n’efface pas le gaz', () => {
  const { s } = pulseSim(LAB_TWIN, 0, .5, 2.5), cols = s.world.solids.filter(o => o.kind === 'pulse').length;
  FP.assert(cols > 0, 'des colonnes'); FP.powerups.detonate(s, s.world.width / 2, s.world.labLevel.lanes[0].y1 - 100);
  FP.assertEqual(s.world.solids.filter(o => o.kind === 'pulse').length, cols, 'gaz intact');
});
FP.test('labRender: la flèche reste dans le cadre zoomé', () => {
  const { s } = pulseSim(LAB_TWIN, 0, .5, .2);   // annonce dans la voie 1, pointe haut dans la voie 0
  const L = s.world.labLevel, lane = L.lanes[1], H = Math.ceil(s.world.viewH / FP.px.SCALE);
  s.camera.y = lane.y1 - s.world.viewH * .97;   // buse juste sous le bas visible (rognée par le zoom), mais au-dessus du bas de la toile
  const f = FP.camera.zoomFrame(s); FP.assert(f && f.z > 1, 'cadrage zoomé');
  const visBottom = (f.fy + (s.world.viewH - f.fy) / f.z) / FP.px.SCALE;
  const g = skinCtx(); FP.labRender.drawThreats(g, s);
  const arrow = g.rects.filter(r => r.c === FP.palette.lab.glow);
  FP.assert(arrow.length > 0, 'une flèche pour une buse rognée');
  FP.assert(arrow.every(r => r.y + r.h <= visBottom && r.y < H), 'dans le cadre visible : ' + JSON.stringify(arrow.map(r => r.y)) + ' / ' + visBottom.toFixed(1));
});

// v5.12.1 (retour de jeu : « comment je fais là ?! ») : des colonnes lentes et longues bloquaient les deux voies à la fois à hauteur de
// la pointe. La pousse monte à sa vitesse, et à chaque instant une voie au moins reste libre à sa hauteur.
FP.test('lab: toujours une voie libre à hauteur de la pointe', () => {
  for (const W of [280, 360, 440]) for (const [n, start] of [[LAB_TWIN, 0], [LAB_TWIN, 1], [LAB_SLOW, 0]]) {
    const s = labFix(n, W), L = s.world.labLevel; FP.plant.launch(s);
    const lanes = L.circuit.pulse.lanes.map(i => L.lanes[i]), x = (lanes[start % lanes.length].x0 + lanes[start % lanes.length].x1) / 2, pad = 6;
    s.plant.tip = { x, y: L.bottom - 2 };
    for (let f = 0; f < 60 * 12 && s.plant.tip.y > L.top; f++) {
      s.time += 1 / 60; FP.labPulse.update(s, 1 / 60);
      s.plant.tip.y -= FP.plant.speed(s) / 60;
      const y = s.plant.tip.y;
      const blocked = L.circuit.pulse.lanes.filter(i => s.world.solids.some(o => o.kind === 'pulse' && !o.off && o.lane === i && Math.abs(o.y - y) <= o.collision[2][1] + pad));
      if (lanes.length > 1) FP.assert(blocked.length < lanes.length, `les deux voies bloquées à y=${y | 0} (${n.id}, W=${W}, t=${(f / 60).toFixed(2)})`);
    }
  }
});

// --- Modules (v5.13.0, tâche 1) : obstacles, limaces, nappes et tourelles posés à la main, miroir, horloge de module.
const LAB_FIXTURE = {
  id: 'essai', name: 'ESSAI', idea: 'module d’essai du banc', height: 1,
  walls: [[[0, 0], [.2, 0], [.2, 1], [0, 1]], [[1, 0], [1, 1], [.8, 1], [.8, 0]]],
  obstacles: [{ kind: 'tire', x: .35, y: .5, a: .3, flip: 1 }], slugs: [{ x0: .3, y0: .3, x1: .7, y1: .3, period: 2, phase: 0 }],
  toxics: [{ x: .6, y: .7 }], turrets: [{ x: .3, y: .85, side: -1, period: 3, offset: .5 }],
  soils: [], lanes: [], pulse: null, coins: [[.5, .5]], path: [[.6, 1], [.6, 0]], alt: [[[.6, 1], [.6, 0]]]
};
const fixtureRun = (W = 360) => labFix(LAB_FIXTURE, W);
FP.test('lab: obstacles, nappes et limaces posés', () => {
  const a = fixtureRun(), b = fixtureRun(), w = a.world;
  FP.assert(w.solids.some(o => o.kind === 'tire'), 'obstacle'); FP.assertEqual(w.toxics.length, 1); FP.assertEqual(w.leaks.length, 1);
  FP.assertEqual(w.leaks[0].lab.period, 2); FP.assertEqual(w.labLevel.turrets.length, 1);
  const key = (s) => JSON.stringify([s.world.solids.map(o => [o.kind, Math.round(o.x), Math.round(o.y)]), s.world.toxics.map(t => [Math.round(t.x), Math.round(t.y), Math.round(t.rx)]), s.world.leaks.map(l => [Math.round(l.x), Math.round(l.y), Math.round(l.len)])]);
  FP.assertEqual(key(a), key(b), 'déterministe');
});
FP.test('lab: miroir', () => {
  const s = fixtureRun(), W = s.world.width, n = FP.labLevel.place(LAB_FIXTURE, s.world, false), m = FP.labLevel.place(LAB_FIXTURE, s.world, true);
  n.walls.forEach((P, i) => P.forEach(([x, y], k) => { FP.assert(Math.abs(m.walls[i][k][0] - (W - x)) < 1e-6 && m.walls[i][k][1] === y, 'mur'); }));
  n.coins.forEach((c, i) => FP.assert(Math.abs(m.coins[i].x - (W - c.x)) < 1e-6, 'pièce'));
  FP.assertEqual(m.turrets[0].side, 1); FP.assert(Math.abs(m.turrets[0].x - (W - n.turrets[0].x)) < 1e-6, 'tourelle');
  FP.assertEqual(m.obstacles[0].a, -n.obstacles[0].a); FP.assertEqual(m.obstacles[0].flip, -n.obstacles[0].flip);
});
FP.test('lab: un passage réussi inverse le sens, une mort non', () => {
  const s = labRun(1); FP.plant.launch(s);
  FP.assertEqual(s.world.labLevel.mirror, false, 'premier passage normal');
  const id = s.world.labLevel.circuit.id;
  labBloom(s); FP.assertEqual(s.run.labPasses[id], 1, 'une réussite');
  s.run.lab = 1; FP.level.generate(s); FP.assertEqual(s.world.labLevel.mirror, true, 'retour au même module : miroir');
  FP.plant.prepare(s); FP.plant.launch(s); s.mode = 'playing';
  const wall = s.world.solids.find(o => o.kind === 'lab'); s.plant.tip = { x: wall.x, y: wall.y }; FP.collision.update(s); FP.flow.update(s, 1 / 60);
  for (let i = 0; i < 600 && s.mode !== 'ready'; i++) { s.time += 1 / 60; FP.flow.update(s, 1 / 60); }
  FP.assertEqual(s.run.labPasses[id], 1, 'une mort ne compte pas'); FP.assertEqual(s.world.labLevel.mirror, true, 'même sens au retry');
});
FP.test('lab: horloge et patrouille', () => {
  const at = (frac) => {
    const s = fixtureRun(), L = s.world.labLevel, l = s.world.leaks[0];
    s.plant.tip = { x: s.world.width / 2, y: L.bottom + 50 };
    for (let i = 0; i < 60; i++) FP.labHazards.update(s, 1 / 60);   // 1 s avant l'entrée : rien ne bouge
    const start = [l.cx, l.cy];
    s.plant.tip.y = (L.top + L.bottom) / 2; FP.labHazards.update(s, 0);
    for (let i = 0; i < Math.round(60 * 2 * frac); i++) FP.labHazards.update(s, 1 / 60);
    return { s, l, start };
  };
  const a = at(0);
  FP.assert(Math.abs(a.start[0] - a.s.world.width * .3) < 1e-6, 'phase de départ avant l’entrée : ' + a.start[0]);
  const h = at(.5); FP.assert(Math.abs(h.l.cx - h.s.world.width * .7) < 1, 'tout le trajet à mi-période : ' + h.l.cx);
  const q1 = at(.25), q2 = at(.25); FP.assertEqual(q1.l.cx, q2.l.cx, 'même position au même t');
});
// Empreinte relevée avant le Lab v5.13 : seed 3, 360 × 640, 30 pas de 1/60 s.
FP.test('lab: les limaces du jeu normal ne changent pas', () => {
  const s = FP.state.createRun(3, { W: 360, H: 640 }); FP.level.startRun(s); FP.plant.launch(s);
  for (let i = 0; i < 30; i++) { s.time += 1 / 60; FP.hazards.update(s, 1 / 60); FP.labHazards.update(s, 1 / 60); }
  FP.assertEqual(s.world.leaks.map(l => l.cx.toFixed(3) + ',' + l.cy.toFixed(3)).join(' '), '245.971,794.729 226.872,457.198 137.701,542.710');
});

// --- Tourelle hors des boss (tâche 2) : visée d'au moins 1 s, figée, rafale de 3 en éventail, à rythme fixe depuis l'entrée.
const turretSim = (secs, tipAt) => {
  const s = fixtureRun(), L = s.world.labLevel, log = [];
  FP.plant.launch(s); s.plant.tip = tipAt ? tipAt(s) : { x: s.world.width * .6, y: (L.top + L.bottom) / 2 };
  for (let t = 0; t < secs; t += 1 / 60) {
    s.events.length = 0; s.time += 1 / 60; FP.labHazards.update(s, 1 / 60); FP.labTurret.update(s, 1 / 60);
    for (const e of s.events) log.push({ t, ...e });
  }
  return { s, L, log };
};
FP.test('lab: la tourelle vise au moins 1 s avant de tirer', () => {
  const { log } = turretSim(6), aim = log.find(e => e.type === 'bossAim'), shot = log.find(e => e.type === 'bossShot');
  FP.assert(aim && shot, 'une visée puis un tir'); FP.assert(shot.t - aim.t >= 1 - 1e-6, 'visée de ' + (shot.t - aim.t).toFixed(2) + ' s');
  FP.assert(log.some(e => e.type === 'bossLock' && e.t > aim.t && e.t < shot.t), 'la visée se fige avant le tir');
});
FP.test('lab: rafale de 3, en éventail', () => {
  const { s, log } = turretSim(6), C = FP.config.boss.shot, shots = log.filter(e => e.type === 'bossShot');
  FP.assert(shots.length >= 3, 'trois tirs'); const first = shots.slice(0, 3).map(e => e.t);
  FP.assert(Math.abs(first[1] - first[0] - C.burstGap) < .02 && Math.abs(first[2] - first[1] - C.burstGap) < .02, 'espacés de burstGap : ' + first.map(t => t.toFixed(2)));
});
FP.test('lab: un tir s’arrête dans un mur', () => {
  const { s } = turretSim(3.2, (st) => ({ x: st.world.width * .05, y: st.world.labLevel.top + 10 }));   // la pointe derrière le mur gauche
  const shots = s.labTurret.shots;
  for (let i = 0; i < 120; i++) { s.time += 1 / 60; FP.labTurret.update(s, 1 / 60); }
  FP.assert(!s.world.solids.some(o => o.kind === 'shot' && FP.collision.distanceTo(s.world.solids.find(w => w.kind === 'lab'), o.x, o.y) < -2), 'aucun tir dans le béton');
});
FP.test('lab: la même mesure à chaque entrée', () => {
  const times = () => turretSim(8).log.filter(e => e.type === 'bossAim').map(e => e.t.toFixed(2)).join();
  FP.assertEqual(times(), times());
});
FP.test('lab: rien hors du module ni après une mort', () => {
  let { s } = turretSim(4.5); FP.assert(s.labTurret.shots.length || Object.keys(s.labTurret.aims).length, 'actif');
  s.mode = 'dying'; FP.labTurret.update(s, 1 / 60);
  FP.assertEqual(s.labTurret.shots.length, 0); FP.assertEqual(s.world.solids.filter(o => o.kind === 'shot').length, 0, 'mort');
  ({ s } = turretSim(4.5)); s.plant.tip = { x: s.world.width / 2, y: s.world.labLevel.top - 80 }; FP.labTurret.update(s, 1 / 60);
  FP.assertEqual(s.world.solids.filter(o => o.kind === 'shot').length, 0, 'sortie');
  const pre = turretSim(4, (st) => ({ x: st.world.width / 2, y: st.world.labLevel.bottom + 100 }));
  FP.assertEqual(pre.log.filter(e => e.type === 'bossAim').length, 0, 'rien avant l’entrée');
});
FP.test('lab: un tir tue', () => {
  const s = fixtureRun(); FP.plant.launch(s); s.events.length = 0; const L = s.world.labLevel;
  s.plant.tip = { x: s.world.width * .45, y: L.top + (L.bottom - L.top) * .62 };
  for (let i = 0; i < 600 && s.mode === 'playing'; i++) { s.time += 1 / 60; FP.labHazards.update(s, 1 / 60); FP.labTurret.update(s, 1 / 60); FP.collision.update(s); FP.flow.update(s, 1 / 60); }
  const d = s.events.find(e => e.type === 'death'); FP.assert(d && d.kind === 'shot', 'mort par un tir');
});
FP.test('labRender: tourelle et ligne de visée dessinées', () => {
  const { s } = turretSim(1.0), L = s.world.labLevel, q = L.turrets[0];
  s.camera.y = q.y - s.world.viewH / 2; const g = skinCtx(); FP.labRender.drawThreats(g, s);
  const M = FP.palette.boss.milieux.friche, A = FP.palette.boss.aim;
  FP.assert(g.rects.some(r => r.c === M.edge), 'socle'); FP.assert(g.rects.some(r => A.includes(r.c)), 'ligne de visée');
});
