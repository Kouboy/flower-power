// Défenses signature des salles de boss (v5.1.0) : avertissement long, coup sur la moitié de la pointe, repos. Aides : bossRun (boss.test.js).
const thrRun = (milieu = 1) => { const s = bossRun(360, milieu); s.mode = 'playing'; s.plant.tip = { x: 0, y: 0 }; return s; };
const thrRoom = (s, k = 0) => s.world.bossLevel.rooms[k];
const thrIn = (r, fx) => ({ x: r.x0 + (r.x1 - r.x0) * fx, y: (r.y0 + r.y1) / 2 });
const thrStage = (s, r) => (s.bossThreats.rooms[r.id] || { stage: 'idle' }).stage;
const thrStep = (s, dt = 1 / 60) => { FP.bossThreats.update(s, dt); };

FP.test('threats: timing par boss — avertissement 1,2 s, coup et repos du boss, accélération par cible, avertissement ≥ 1 s', () => {
  for (const id of MILIEUX) {
    const R = FP.config.boss.ramp[id], k = 1 - R.speedup, t0 = FP.bossThreats.timing(0, id), t1 = FP.bossThreats.timing(1, id);
    FP.assertEqual(t0.warn, 1.2, id); FP.assertEqual(t0.strike, R.strike, id); FP.assertEqual(t0.rest, R.rest, id);
    FP.assert(Math.abs(t1.strike - R.strike * k) < 1e-9 && Math.abs(t1.rest - R.rest * k) < 1e-9 && Math.abs(t1.warn - Math.max(1, 1.2 * k)) < 1e-9, 'une cible ' + id);
    for (let n = 0; n <= 3; n++) FP.assert(FP.bossThreats.timing(n, id).warn >= 1, `avertissement ≥ 1 s (${id}, ${n})`);
    FP.assertEqual(FP.bossThreats.timing(3, id).warn, 1, 'plancher ' + id);
  }
});

// v5.1.0 (retours de playtest) : un cran de difficulté par boss, de la friche (boss 1) au nucléaire (boss 4).
FP.test('threats: un cran de difficulté par boss — canaux, coup, repos, accélération, tirs', () => {
  const R = MILIEUX.map(id => FP.config.boss.ramp[id]), list = (f) => JSON.stringify(R.map(f));
  FP.assertEqual(list(r => r.channelMin), '[52,49,47,44]');
  FP.assertEqual(R[0].strike, .9); FP.assertEqual(R[3].strike, 1.1);
  FP.assertEqual(R[0].rest, 1.3); FP.assertEqual(R[3].rest, .9);
  FP.assertEqual(R[0].speedup, .12); FP.assertEqual(R[3].speedup, .18);
  FP.assertEqual(R[0].shot, null, 'pas de tirs au boss 1');
  FP.assertEqual(list(r => r.shot && [r.shot.speed, r.shot.gap]), '[null,[440,2.6],[480,2.3],[520,2]]');
  for (let k = 0; k < 3; k++) {
    const a = R[k], b = R[k + 1], at = MILIEUX[k] + ' → ' + MILIEUX[k + 1];
    FP.assert(b.channelMin < a.channelMin && b.strike > a.strike && b.rest < a.rest && b.speedup > a.speedup, 'plus dur ' + at);
    if (a.shot) FP.assert(b.shot.speed > a.shot.speed && b.shot.gap < a.shot.gap, 'tirs plus durs ' + at);
  }
  FP.assertEqual(FP.config.boss.defense.warn, 1.2); FP.assertEqual(FP.config.boss.defense.warnMin, 1);
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
  const s = thrRun(), r = thrRoom(s), warn = FP.bossThreats.timing(0, 'industrie').warn;
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
  FP.assertEqual(JSON.stringify(s.bossThreats), '{"rooms":{},"shots":[],"aim":null,"cooldown":0}');
  FP.assert(s.world.bossLevel.rooms.every(q => q.zone.off), 'zones éteintes');
});

FP.test('threats: hors niveau de boss, rien', () => {
  const s = FP.state.createRun(5, { W: 360, H: 640 }); FP.level.startRun(s); FP.level.generate(s); s.mode = 'playing';
  FP.bossThreats.update(s, .1); FP.assertEqual(JSON.stringify(s.bossThreats), '{"rooms":{},"shots":[],"aim":null,"cooldown":0}');
});

FP.test('threats: un coup sur la pointe tue (kind defense, « emportée par la défense »)', () => {
  const s = bossRun(440, 1); FP.plant.launch(s); s.events.length = 0;
  const r = thrRoom(s); s.plant.tip = thrIn(r, .2);
  for (let i = 0; i < 400 && thrStage(s, r) !== 'strike'; i++) thrStep(s);
  s.events.length = 0; FP.collision.update(s); FP.flow.update(s, 0);
  const d = s.events.find(e => e.type === 'death');
  FP.assert(d && d.cause === 'solid' && d.kind === 'defense', 'mort par la défense');
  FP.assertEqual(s.mode, 'dying'); FP.assertEqual(s.flow.overReason, 'emportée par la défense');
});

FP.test('threats: de la salle A à la salle B pendant l’avertissement → pas de coup en A, avertissement complet en B', () => {
  let s = null, a = null, b = null;
  for (const m of [0, 1, 2, 3]) { const t = thrRun(m); if (t.world.bossLevel.rooms.length >= 2) { s = t; break; } }
  if (!s) return;   // aucun plan à deux salles : rien à vérifier
  [a, b] = s.world.bossLevel.rooms;
  const warn = FP.bossThreats.timing(0, FP.config.milieux[s.run.milieu].id).warn;
  s.plant.tip = thrIn(a, .3); for (let i = 0; i < 30; i++) thrStep(s);
  FP.assertEqual(thrStage(s, a), 'warn');
  s.plant.tip = thrIn(b, .7); let t = 0, warnB = null, strikeA = 0, strikeB = null;
  for (let i = 0; i < 400; i++, t += 1 / 60) {
    s.events.length = 0; thrStep(s);
    for (const e of s.events) {
      if (e.type === 'bossWarn' && e.room === b.id && warnB === null) warnB = t;
      if (e.type === 'bossStrike' && e.room === a.id) strikeA++;
      if (e.type === 'bossStrike' && e.room === b.id && strikeB === null) strikeB = t;
    }
  }
  FP.assertEqual(strikeA, 0); FP.assert(warnB !== null && strikeB !== null && strikeB - warnB >= warn - 1e-6, 'B : avertissement complet ');
});

FP.test('coins: les salles de boss ne sont pas vides de jetons (zones au repos ignorées)', () => {
  for (let m = 0; m < 4; m++) {
    const s = bossRun(360, m), w = s.world;
    FP.assert(w.bossLevel.rooms.every(r => r.zone.off), 'zones au repos');
    const n = w.bossLevel.rooms.reduce((a, r) => a + w.coins.filter(c => c.x >= r.x0 && c.x <= r.x1 && c.y >= r.y0 && c.y <= r.y1).length, 0);
    FP.assert(n > 0, 'jetons dans les salles, milieu ' + m);
  }
});

// Tirs visés (boss 2 à 4) : la tourelle suit la pointe, la ligne se fige, le projectile part le long de la ligne figée.
const shotRun = (milieu = 1) => thrRun(milieu);
const shotRoom = (s) => s.world.bossLevel.rooms.find(r => r.turrets.length);
const shotTick = (s, n) => { for (let i = 0; i < n; i++) thrStep(s); };
const shotEvents = (s, type) => s.events.filter(e => e.type === type);

FP.test('shots: pas de tir à la Bétonneuse', () => {
  const s = shotRun(0); s.plant.tip = thrIn(thrRoom(s), .5);
  shotTick(s, 600); FP.assertEqual(s.bossThreats.shots.length, 0); FP.assertEqual(s.bossThreats.aim, null);
  FP.assert(!s.world.solids.some(o => o.kind === 'shot'), 'aucun solide de tir');
});

FP.test('shots: la ligne se fige 0,3 s avant le tir, le projectile suit la ligne figée', () => {
  const s = shotRun(1), r = shotRoom(s), cfg = { ...FP.config.boss.shot, ...FP.config.boss.ramp.industrie.shot }, tur = s.world.bossLevel.turrets.find(q => q.room === r.id);
  s.plant.tip = thrIn(r, .3); s.events.length = 0;
  let t = 0, lockT = null, shotT = null, locked = null;
  for (let i = 0; i < 600 && shotT === null; i++, t += 1 / 60) {
    if (lockT === null) s.plant.tip = thrIn(r, .3 + .001 * i);
    else s.plant.tip = thrIn(r, .9);   // après le figement, la pointe s'éloigne
    thrStep(s);
    if (lockT === null && shotEvents(s, 'bossLock').length) { lockT = t; locked = { ...s.bossThreats.aim.lockedAt }; }
    if (shotEvents(s, 'bossShot').length) shotT = t;
  }
  FP.assert(shotEvents(s, 'bossAim').length === 1 && lockT !== null && shotT !== null, 'aim, lock, shot');
  FP.assert(Math.abs((shotT - lockT) - cfg.lock) < .03, 'figé ' + (shotT - lockT) + ' s avant le tir');
  FP.assert(Math.abs(shotT - cfg.track) < .03, 'tir après track');
  const sh = s.bossThreats.shots[0], len = Math.hypot(locked.x - tur.x, locked.y - tur.y);
  FP.assert(Math.abs(sh.vx - cfg.speed * (locked.x - tur.x) / len) < 1e-6 && Math.abs(sh.vy - cfg.speed * (locked.y - tur.y) / len) < 1e-6, 'direction figée');
  const x0 = sh.x, y0 = sh.y; thrStep(s);
  FP.assert(Math.abs(sh.x - x0 - sh.vx / 60) < 1e-6 && Math.abs(sh.y - y0 - sh.vy / 60) < 1e-6, 'avance à la vitesse');
  FP.assert(s.world.solids.some(o => o.kind === 'shot'), 'solide de tir dans world.solids');
});

FP.test('shots: au moins l’espacement du boss entre deux tirs', () => {
  const s = shotRun(2), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  let t = 0; const at = [];
  for (let i = 0; i < 60 * 14; i++, t += 1 / 60) { s.events.length = 0; thrStep(s); if (shotEvents(s, 'bossShot').length) at.push(t); }
  FP.assert(at.length >= 2, 'plusieurs tirs : ' + at.length);
  for (let i = 1; i < at.length; i++) FP.assert(at[i] - at[i - 1] >= FP.config.boss.ramp.decharge.shot.gap - 1e-6, 'écart ' + (at[i] - at[i - 1]));
});

FP.test('shots: pas de visée pendant un coup de la défense', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 400 && thrStage(s, r) !== 'strike'; i++) thrStep(s);
  FP.assertEqual(thrStage(s, r), 'strike'); s.bossThreats.aim = null; s.bossThreats.cooldown = 0; s.events.length = 0;
  thrStep(s); FP.assertEqual(s.bossThreats.aim, null); FP.assertEqual(shotEvents(s, 'bossAim').length, 0);
});

FP.test('shots: pas de visée sur une pointe hors des salles', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = { x: r.x0 - 60, y: r.y0 - 60 };
  shotTick(s, 400); FP.assertEqual(s.bossThreats.aim, null); FP.assertEqual(s.bossThreats.shots.length, 0);
  s.plant.tip = thrIn(r, .5); shotTick(s, 10); FP.assert(s.bossThreats.aim !== null, 'visée dans la salle');
  s.plant.tip = { x: r.x0 - 60, y: r.y0 - 60 }; s.events.length = 0; thrStep(s);
  FP.assertEqual(s.bossThreats.aim, null); FP.assertEqual(shotEvents(s, 'bossShot').length, 0);
});

FP.test('shots: les projectiles disparaissent à la mort', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 200 && !s.bossThreats.shots.length; i++) thrStep(s);
  FP.assert(s.bossThreats.shots.length === 1 && s.world.solids.some(o => o.kind === 'shot'), 'un tir en vol');
  s.mode = 'dying'; thrStep(s);
  FP.assertEqual(s.bossThreats.shots.length, 0); FP.assertEqual(s.bossThreats.aim, null);
  FP.assert(!s.world.solids.some(o => o.kind === 'shot'), 'solide retiré');
});

FP.test('shots: un projectile sorti du cadre est retiré ; un tir touche et tue (« touchée par un tir »)', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 200 && !s.bossThreats.shots.length; i++) thrStep(s);
  const sh = s.bossThreats.shots[0]; sh.x = -500; thrStep(s);
  FP.assert(!s.bossThreats.shots.includes(sh) && !s.world.solids.includes(sh.solid), 'retiré hors cadre');
  const s2 = bossRun(440, 1); FP.plant.launch(s2); const r2 = shotRoom(s2); s2.plant.tip = thrIn(r2, .4);
  for (let i = 0; i < 200 && !s2.bossThreats.shots.length; i++) thrStep(s2);
  const q = s2.bossThreats.shots[0]; q.solid.x = s2.plant.tip.x; q.solid.y = s2.plant.tip.y; s2.events.length = 0;
  FP.collision.update(s2); FP.flow.update(s2, 0);
  const d = s2.events.find(e => e.type === 'death');
  FP.assert(d && d.kind === 'shot', 'mort par un tir'); FP.assertEqual(s2.flow.overReason, 'touchée par un tir');
});

FP.test('shots: aucun tir ne part pendant un coup de la défense (plusieurs cycles, pointe dans la salle)', () => {
  for (const m of [1, 2, 3]) {
    const s = shotRun(m), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
    let shots = 0, cancelled = false;
    for (let i = 0; i < 60 * 40; i++) {
      const was = s.bossThreats.aim; s.events.length = 0; thrStep(s);
      if (thrStage(s, r) === 'strike') {
        FP.assertEqual(shotEvents(s, 'bossShot').length, 0, 'tir pendant le coup, milieu ' + m);
        if (was && !s.bossThreats.aim) cancelled = true;
      }
      shots += shotEvents(s, 'bossShot').length;
    }
    FP.assert(shots > 0, 'des tirs en dehors des coups, milieu ' + m);
    FP.assert(cancelled || m !== 1, 'visée annulée au début d’un coup');
  }
});

FP.test('shots: rien ne progresse pendant le gel (visée, délai, projectiles)', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 200 && !s.bossThreats.shots.length; i++) thrStep(s);
  s.plant.tip = thrIn(r, .4); s.bossThreats.aim = { turret: r.turrets[0], t: .2, lockedAt: null };
  const before = JSON.stringify([s.bossThreats.aim, s.bossThreats.cooldown, s.bossThreats.shots.map(q => [q.x, q.y])]);
  s.flow.freeze = 1; shotTick(s, 120);
  FP.assertEqual(JSON.stringify([s.bossThreats.aim, s.bossThreats.cooldown, s.bossThreats.shots.map(q => [q.x, q.y])]), before);
});

FP.test('shots: avec plusieurs tourelles, la plus proche de la pointe vise', () => {
  const s = shotRun(1), r = shotRoom(s), bl = s.world.bossLevel, first = bl.turrets.find(q => q.room === r.id);
  const far = { id: 'tourelle-test', x: first.x + 5000, y: first.y, room: r.id };   // plus loin que toute pointe de la salle
  bl.turrets.unshift(far); r.turrets = [far.id, ...r.turrets];
  s.plant.tip = { x: first.x + 1, y: first.y + 1 }; thrStep(s);
  FP.assertEqual(s.bossThreats.aim && s.bossThreats.aim.turret, first.id);
  s.bossThreats.aim = null; far.x = first.x + 2; far.y = first.y + 2; s.bossThreats.cooldown = 0; thrStep(s);
  FP.assertEqual(s.bossThreats.aim && s.bossThreats.aim.turret, 'tourelle-test');
});

// Revue finale (v5.1.0) : un tir ne traverse ni paroi, ni cible, ni plaque, ni tête ; une pièce tombée ne l'arrête plus.
FP.test('shots: un projectile qui entre dans une pièce du boss disparaît, pas dans une pièce tombée', () => {
  const s = shotRun(1), r = shotRoom(s), bl = s.world.bossLevel, th = s.bossThreats; s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 200 && !th.shots.length; i++) thrStep(s);
  const sh = th.shots[0];
  FP.assert(sh, 'un tir en vol'); thrStep(s); FP.assert(th.shots.includes(sh), 'il vole d’abord librement');
  const into = (o) => {
    th.shots = [sh]; if (!s.world.solids.includes(sh.solid)) s.world.solids.push(sh.solid);
    sh.x = o.x - sh.vx / 60; sh.y = o.y - sh.vy / 60; th.aim = null; th.cooldown = 99;   // au centre de la pièce à la frame suivante
    thrStep(s); return th.shots.includes(sh);
  };
  for (const o of [bl.walls[0], bl.targets[0].solid, bl.plates[0].solid, bl.head.solid]) {
    FP.assert(!into(o), 'arrêté par ' + o.kind); FP.assert(!s.world.solids.includes(sh.solid), 'solide retiré (' + o.kind + ')');
  }
  bl.targets[1].solid.off = true; FP.assert(into(bl.targets[1].solid), 'une cible détruite ne l’arrête plus');
});
