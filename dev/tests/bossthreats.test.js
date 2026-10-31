// Défenses signature des salles de boss (v5.1.0) : avertissement long, coup sur la moitié de la pointe, repos. Aides : bossRun (boss.test.js).
const thrRun = (milieu = 1) => { const s = bossRun(360, milieu); s.mode = 'playing'; s.plant.tip = { x: 0, y: 0 }; return s; };
const thrRoom = (s, k = 0) => s.world.bossLevel.rooms[k];
const thrIn = (r, fx) => ({ x: r.x0 + (r.x1 - r.x0) * fx, y: (r.y0 + r.y1) / 2 });
const thrStage = (s, r) => (s.bossThreats.rooms[r.id] || { stage: 'idle' }).stage;
const thrStep = (s, dt = 1 / 60) => { FP.bossThreats.update(s, dt); };

FP.test('threats: timing — 1,2 / 0,8 / 1,5 s, −10 % par cible, avertissement ≥ 1 s', () => {
  const t0 = FP.bossThreats.timing(0), t1 = FP.bossThreats.timing(1), t3 = FP.bossThreats.timing(3);
  FP.assertEqual(t0.warn, 1.2); FP.assertEqual(t0.strike, .8); FP.assertEqual(t0.rest, 1.5);
  FP.assert(Math.abs(t1.strike - .72) < 1e-9 && Math.abs(t1.rest - 1.35) < 1e-9 && Math.abs(t1.warn - 1.08) < 1e-9, 'une cible');
  FP.assertEqual(t3.warn, 1); FP.assert(Math.abs(t3.strike - .8 * .729) < 1e-9, 'trois cibles');
});

FP.test('threats: roomAt trouve la salle sous un point', () => {
  const s = thrRun(), bl = s.world.bossLevel, r = thrRoom(s), p = thrIn(r, .5);
  FP.assertEqual(FP.bossThreats.roomAt(bl, p.x, p.y), r);
  FP.assertEqual(FP.bossThreats.roomAt(bl, -999, -999), null);
});

FP.test('threats: la salle s’éveille quand la pointe entre et vise sa moitié', () => {
  for (const [fx, half] of [[.2, -1], [.8, 1]]) {
    const s = thrRun(), r = thrRoom(s), p = thrIn(r, fx);
    thrStep(s); FP.assertEqual(thrStage(s, r), 'idle');
    s.plant.tip = p; s.events.length = 0; thrStep(s);
    FP.assertEqual(thrStage(s, r), 'warn'); FP.assertEqual(s.bossThreats.rooms[r.id].half, half);
    FP.assert(s.events.some(e => e.type === 'bossWarn' && e.room === r.id && e.half === half), 'bossWarn');
    FP.assertEqual(r.zone.off, true);
  }
});

FP.test('threats: la zone ne couvre jamais plus de la moitié de la salle', () => {
  for (const milieu of [0, 1, 2, 3]) for (const fx of [.1, .9]) {
    const s = thrRun(milieu), r = thrRoom(s); s.plant.tip = thrIn(r, fx);
    for (let i = 0; i < 400 && thrStage(s, r) !== 'strike'; i++) thrStep(s);
    FP.assertEqual(thrStage(s, r), 'strike'); FP.assertEqual(r.zone.off, false); FP.assert(s.world.solids.includes(r.zone), 'dans world.solids');
    const xs = r.zone.collision.map(q => r.zone.x + q[0]), ys = r.zone.collision.map(q => r.zone.y + q[1]);
    FP.assert(Math.max(...xs) - Math.min(...xs) <= (r.x1 - r.x0) / 2 + 1, 'largeur');
    FP.assert(Math.min(...xs) >= r.x0 - 1e-9 && Math.max(...xs) <= r.x1 + 1e-9, 'dans la salle');
    FP.assert(Math.abs(Math.max(...ys) - Math.min(...ys) - (r.y1 - r.y0)) < 1e-9, 'pleine hauteur');
    const mid = (r.x0 + r.x1) / 2, side = fx < .5 ? -1 : 1;
    FP.assert(side < 0 ? Math.max(...xs) <= mid + 1e-9 : Math.min(...xs) >= mid - 1e-9, 'moitié visée');
  }
});

FP.test('threats: le coup touche la moitié visée, épargne l’autre', () => {
  const s = thrRun(), r = thrRoom(s), a = thrIn(r, .2), b = thrIn(r, .8);
  s.plant.tip = a;
  for (let i = 0; i < 400 && thrStage(s, r) !== 'strike'; i++) thrStep(s);
  FP.assert(FP.collision.queryPoint(s.world, a.x, a.y, false).solid === r.zone, 'touché');
  FP.assert(FP.collision.queryPoint(s.world, b.x, b.y, false).solid !== r.zone, 'épargné');
});

FP.test('threats: pas de coup sans avertissement complet', () => {
  const s = thrRun(), r = thrRoom(s), warn = FP.bossThreats.timing(0).warn;
  let t = 0, warnAt = null, strikes = 0;
  for (let i = 0; i < 1200; i++, t += 1 / 60) {
    const fx = .5 + .45 * Math.sin(t * 1.3);   // la pointe va et vient dans la salle, parfois dehors
    s.plant.tip = i % 400 < 300 ? thrIn(r, fx) : { x: r.x0 - 50, y: r.y0 - 50 };
    s.events.length = 0; thrStep(s);
    for (const e of s.events) {
      if (e.room !== r.id) continue;
      if (e.type === 'bossWarn') warnAt = t;
      if (e.type === 'bossStrike') { strikes++; FP.assert(warnAt !== null && t - warnAt >= warn - 1e-6, 'coup après ' + (t - warnAt)); }
    }
  }
  FP.assert(strikes > 0, 'au moins un coup');
});

FP.test('threats: la pointe sort pendant l’avertissement → aucun coup', () => {
  const s = thrRun(), r = thrRoom(s); s.plant.tip = thrIn(r, .3);
  let strikes = 0;
  for (let i = 0; i < 30; i++) thrStep(s);
  FP.assertEqual(thrStage(s, r), 'warn');
  s.plant.tip = { x: r.x0 - 40, y: r.y0 - 40 };
  for (let i = 0; i < 600; i++) { s.events.length = 0; thrStep(s); strikes += s.events.filter(e => e.type === 'bossStrike').length; }
  FP.assertEqual(strikes, 0); FP.assertEqual(thrStage(s, r), 'idle'); FP.assertEqual(r.zone.off, true);
});

FP.test('threats: rien ne progresse pendant le gel ni hors du mode playing', () => {
  const s = thrRun(), r = thrRoom(s); s.plant.tip = thrIn(r, .3); thrStep(s);
  s.flow.freeze = 1; for (let i = 0; i < 120; i++) thrStep(s);
  FP.assertEqual(thrStage(s, r), 'warn'); FP.assertEqual(s.bossThreats.rooms[r.id].t, 0);
  s.flow.freeze = 0; s.mode = 'dying'; thrStep(s);
  FP.assertEqual(thrStage(s, r), 'idle'); FP.assertEqual(r.zone.off, true);
});

FP.test('threats: aucune menace dans un canal', () => {
  const s = thrRun(), bl = s.world.bossLevel;
  for (const p of s.world.safePath) {
    if (FP.bossThreats.roomAt(bl, p.x, p.y)) continue;
    s.plant.tip = { x: p.x, y: p.y }; thrStep(s);
  }
  for (const r of bl.rooms) FP.assertEqual(thrStage(s, r), 'idle');
});

FP.test('threats: tout se vide à la régénération du niveau', () => {
  const s = thrRun(), r = thrRoom(s); s.plant.tip = thrIn(r, .3);
  for (let i = 0; i < 400 && thrStage(s, r) !== 'strike'; i++) thrStep(s);
  s.bossThreats.shots.push({ x: 1, y: 2 });
  FP.level.generate(s);
  FP.assertEqual(JSON.stringify(s.bossThreats), '{"rooms":{},"shots":[]}');
  FP.assert(s.world.bossLevel.rooms.every(q => q.zone.off), 'zones éteintes');
});

FP.test('threats: hors niveau de boss, rien', () => {
  const s = FP.state.createRun(5, { W: 360, H: 640 }); FP.level.startRun(s); FP.level.generate(s); s.mode = 'playing';
  FP.bossThreats.update(s, .1); FP.assertEqual(JSON.stringify(s.bossThreats), '{"rooms":{},"shots":[]}');
});
