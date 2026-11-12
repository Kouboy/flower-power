// Machines de défense des boss (v5.7.0, boss cohérent) : la défense de chaque salle est une vraie machine (goulotte de béton, buses de
// vapeur, brûleurs, émetteur) qui remplit la moitié frappée ; un liseré marque la zone pendant l'avertissement. Aides : pipeRun (bosspipes.test.js), skinCtx (bossskin.test.js).
const machRoom = { x0: 100, y0: 1000, x1: 300, y1: 1200 };
const machState = (s, room, stage, half, t = .3) => { s.bossThreats.rooms = { [room.id]: { stage, t, half } }; s.camera.y = (room.y0 + room.y1) / 2 - s.world.viewH / 2; return s; };

FP.test('bossMachines: emplacement selon la défense et la moitié', () => {
  const L = (d, h) => FP.bossMachines.layout(machRoom, h, d);
  for (const d of ['beton', 'radiation']) {
    FP.assertEqual(L(d, -1).mount, 'ceiling'); FP.assertEqual(JSON.stringify([L(d, -1).x0, L(d, -1).x1]), '[100,200]');
    FP.assertEqual(JSON.stringify([L(d, 1).x0, L(d, 1).x1]), '[200,300]');
  }
  for (const d of ['vapeur', 'flamme']) { FP.assertEqual(L(d, -1).mount, 'wall'); FP.assertEqual(L(d, 1).side, 1); FP.assertEqual(L(d, -1).side, -1); }
  FP.assertEqual(L('beton', 1).y0, 1000); FP.assertEqual(L('beton', 1).y1, 1200); FP.assertEqual(L('flamme', 1).kind, 'flamme');
});

// v5.8.0 (retour de jeu : « un gros rectangle gris avec des lignes claires ») : le coup se dessine sur fond transparent, sans aplat, mais
// assez dense pour se lire comme une zone : chaque rangée de la moitié frappée contient de l'effet sur au moins `cover` de sa largeur.
FP.test('bossMachines: en coup, l’effet couvre au moins cover de chaque rangée, sans aplat (4 biomes, 2 largeurs, niveau étiré)', () => {
  const C = FP.config.boss.machines.cover;
  for (const W of [280, 440]) for (const stems of [0, 1e3]) for (const m of [0, 1, 2, 3]) {
    const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) }); FP.level.startRun(s); s.run.milieu = m; s.run.boss = true; s.plant.stemCount = stems;
    FP.level.generate(s); s.mode = 'playing'; s.time = 2;
    for (const room of s.world.bossLevel.rooms) for (const half of [-1, 1]) {
      machState(s, room, 'strike', half);
      const g = skinCtx(); FP.bossMachines.draw(g, s);
      const b = FP.bossMachines.layout(room, half, room.defense), cam = FP.px.toArt(s.camera.y), H = Math.ceil(s.world.viewH / FP.px.SCALE);
      const xa = FP.px.toArt(b.x0), xb = FP.px.toArt(b.x1), ya = Math.max(0, FP.px.toArt(b.y0) - cam), yb = Math.min(H, FP.px.toArt(b.y1) - cam);
      const fx = new Set(Object.values(FP.palette.boss.machines).flat());   // couleurs d'effet (pas la carcasse de la machine)
      FP.assert(!g.rects.some(r => fx.has(r.c) && r.w > (xb - xa) / 2 && r.h > 2), `aplat dans ${room.id}, biome ${m} W=${W}`);
      const rows = new Map();
      for (const r of g.rects) for (let y = r.y; y < r.y + r.h; y++) { if (y < ya || y >= yb) continue; const set = rows.get(y) || new Set(); for (let x = Math.max(r.x, xa); x < Math.min(r.x + r.w, xb); x++) set.add(x); rows.set(y, set); }
      for (let y = ya; y < yb; y++) FP.assert((rows.get(y) || new Set()).size >= C * (xb - xa), `${room.id} ${half} rangée ${y} : ${(rows.get(y) || new Set()).size}/${xb - xa}, biome ${m} W=${W}`);
    }
  }
});

FP.test('bossMachines: repos, avertissement et coup se dessinent, et l’avertissement prépare la machine', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m);
    for (const room of s.world.bossLevel.rooms) {
      const count = (stage) => { machState(s, room, stage, 1, .6); const g = skinCtx(); FP.bossMachines.draw(g, s); return g.rects.length; };
      const idle = count('idle'), warn = count('warn'), strike = count('strike');
      FP.assert(idle > 0, 'machine au repos ' + room.id);
      FP.assert(warn > idle && strike > idle, `${room.id} : ${idle} < ${warn}, ${strike}`);   // le coup couvre toute la moitié (test précédent)
    }
  }
  const n = pipeRun(0); n.world.bossLevel = null; const g = skinCtx(); FP.bossMachines.draw(g, n); FP.assertEqual(g.rects.length, 0, 'hors boss');
});

FP.test('bossRender: liseré pendant l’avertissement, plus de hachures', () => {
  FP.assert(!('hatch' in FP.palette.boss), 'la couleur des hachures n’existe plus');
  const s = pipeRun(1), room = s.world.bossLevel.rooms[0], A = FP.palette.boss.alert;
  const lit = (t) => { machState(s, room, 'warn', 1, t); const g = skinCtx(); FP.bossRender.drawThreats(g, s); return g.rects.filter(r => A.includes(r.c)); };
  let seen = null; for (let t = 0; t < .5 && !seen; t += .02) { const r = lit(t); if (r.length) seen = r; }
  FP.assert(seen, 'liseré dessiné');
  const w = FP.config.boss.machines.border;
  FP.assert(seen.every(r => r.w <= w || r.h <= w), 'un liseré fin, pas un remplissage');
  machState(s, room, 'strike', 1); const g = skinCtx(); FP.bossRender.drawThreats(g, s);
  FP.assertEqual(g.rects.filter(r => A.includes(r.c)).length, 0, 'pas de liseré pendant le coup');
});

// Tourelles (v5.7.0) : visibles, le canon vise la pousse, recul et éclair au tir ; elles tombent avec le boss transpercé.
const turState = (m = 1) => { const s = pipeRun(m), q = s.world.bossLevel.turrets[0]; s.camera.y = q.y - s.world.viewH / 2; return { s, q }; };
const turBox = (s) => { const g = skinCtx(); FP.bossMachines.draw(g, s); return g; };
FP.test('bossMachines: la tourelle mesure au moins 22 pixels d’art (v5.8.0)', () => {
  for (const m of [0, 1, 2, 3]) {
    const { s, q } = turState(m), x = FP.px.toArt(q.x), y = FP.px.toArt(q.y) - FP.px.toArt(s.camera.y);
    s.bossThreats.rooms = {}; const g = turBox(s);
    const near = g.rects.filter(r => Math.abs(r.x - x) <= 16 && Math.abs(r.y - y) <= 16);
    const xs = near.flatMap(r => [r.x, r.x + r.w]), ys = near.flatMap(r => [r.y, r.y + r.h]);
    FP.assert(Math.max(...xs) - Math.min(...xs) >= 22 && Math.max(...ys) - Math.min(...ys) >= 22, 'taille, milieu ' + m);
  }
});
FP.test('bossMachines: le canon vise la pousse, puis le point figé', () => {
  const { s, q } = turState(1);
  s.plant.tip = { x: q.x + 100, y: q.y + 60 };
  s.bossThreats.aim = { turret: q.id, t: .5, lockedAt: null };
  let p = FP.bossMachines.turretPose(s, q);
  FP.assert(Math.abs(p.angle - Math.atan2(60, 100)) < .05, 'vers la pousse ' + p.angle);
  FP.assert(p.lens > 0, 'la lentille s’allume');
  s.bossThreats.aim.lockedAt = { x: q.x - 80, y: q.y }; p = FP.bossMachines.turretPose(s, q);
  FP.assert(Math.abs(Math.abs(p.angle) - Math.PI) < .05, 'vers le point figé ' + p.angle);
  FP.assert(Math.hypot(p.muzzle.x - q.x, p.muzzle.y - q.y) > 6, 'la bouche du canon est au bout du canon');
});
FP.test('bossMachines: recul et éclair après un tir, puis repos', () => {
  const { s, q } = turState(1), id = FP.config.milieux[1].id, gap = FP.config.boss.ramp[id].shot.gap;
  s.bossThreats.aim = null; s.bossThreats.cooldown = gap - .02;
  s.bossThreats.shots = [{ x: q.x + 400 * .02, y: q.y, vx: 400, vy: 0, solid: {} }];
  FP.assert(FP.bossMachines.turretPose(s, q).recoil > 0, 'recul juste après le tir');
  s.bossThreats.cooldown = gap - 1; s.bossThreats.shots = [{ x: q.x + 400, y: q.y, vx: 400, vy: 0, solid: {} }];
  FP.assertEqual(FP.bossMachines.turretPose(s, q).recoil, 0, 'au repos ensuite');
  const other = s.world.bossLevel.turrets.find(t => Math.hypot(t.x - q.x, t.y - q.y) > 40);
  if (other) { s.bossThreats.cooldown = gap - .02; s.bossThreats.shots = [{ x: q.x + 8, y: q.y, vx: 400, vy: 0, solid: {} }]; FP.assertEqual(FP.bossMachines.turretPose(s, other).recoil, 0, 'seule la tourelle qui a tiré recule'); }
});
FP.test('bossMachines: tourelles absentes quand la tête est transpercée', () => {
  const { s, q } = turState(1); s.bossThreats.rooms = {};
  const before = turBox(s).rects.length; s.world.bossLevel.head.solid.off = true;
  FP.assert(turBox(s).rects.length < before, 'moins de dessin sans tourelles');   // le socle lui-même : bossdeath.test.js
});

// Revue finale (v5.8.0).
FP.test('bossMachines: pendant la rafale, le canon vise le point figé et recule à chaque tir', () => {
  const { s, q } = turState(1), C = FP.config.boss.shot;
  s.bossThreats.aim = null; s.bossThreats.cooldown = 0;
  const to = { x: q.x - 90, y: q.y + 40 };
  s.bossThreats.burst = { turret: q.id, to, n: 2, t: C.burstGap + .02 };
  const p = FP.bossMachines.turretPose(s, q);
  FP.assert(Math.abs(p.angle - Math.atan2(to.y - q.y, to.x - q.x)) < .05, 'vers le point figé : ' + p.angle);
  FP.assert(p.recoil > 0, 'recul après le 2e tir');
});
FP.test('bossMachines: la console de chaque tourelle s’accroche à un mur (4 biomes, 2 largeurs, étiré)', () => {
  for (const W of [280, 440]) for (const stems of [0, 1e3]) for (const m of [0, 1, 2, 3]) {
    const s = FP.state.createRun(7, { W, H: Math.round(W * 16 / 9) }); FP.level.startRun(s); s.run.milieu = m; s.run.boss = true; s.plant.stemCount = stems; FP.level.generate(s);
    const bl = s.world.bossLevel, walls = bl.walls.map(o => o.collision.map(([x, y]) => [o.x + x, o.y + y]));
    for (const q of bl.turrets) {
      const e = FP.bossMachines.armEnd(bl, q);
      FP.assert(e && walls.some(P => FP.geom.sdPoly(e.x, e.y, P) <= 1), `${q.id} sans mur, biome ${m} W=${W}`);
    }
  }
});

// v5.9.0 : l'effet se dessine dans la part déployée seulement, et la couvre ; une fois déployée, la vapeur atteint le bout de la moitié.
const machEffect = (g) => { const fx = new Set(Object.values(FP.palette.boss.machines).flat()); return g.rects.filter(r => fx.has(r.c)); };
FP.test('machines: l’effet dessiné reste dans la part déployée', () => {
  const C = FP.config.boss.machines.cover, D = FP.config.boss.defense.deploy;
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m); s.time = 2;
    for (const room of s.world.bossLevel.rooms) for (const half of [-1, 1]) {
      machState(s, room, 'strike', half, D / 2);
      const g = skinCtx(); FP.bossMachines.draw(g, s);
      const b = FP.bossThreats.reach(room, half, .5), cam = FP.px.toArt(s.camera.y), H = Math.ceil(s.world.viewH / FP.px.SCALE);
      const xa = FP.px.toArt(b.x0), xb = FP.px.toArt(b.x1), ya = FP.px.toArt(b.y0) - cam, yb = FP.px.toArt(b.y1) - cam;
      const lay = FP.bossMachines.layout(room, half, room.defense), la = FP.px.toArt(lay.x0), lb = FP.px.toArt(lay.x1), ly = FP.px.toArt(lay.y0) - cam, lyb = FP.px.toArt(lay.y1) - cam;
      // l'effet du coup : dans la moitié, hors de la carcasse (plafond : un rect tout entier dans la carcasse ; paroi : tout entier dans la colonne des buses)
      const housing = (r) => (FP.bossThreats.MOUNT[room.defense] === 'ceiling' ? r.y + r.h <= ly + 7 : (half < 0 ? r.x + r.w <= la + 4 : r.x >= lb - 4));
      const rows = new Map();
      for (const r of machEffect(g)) {
        const inHalf = r.x >= la - 1 && r.x + r.w <= lb + 1 && r.y >= ly - 1 && r.y + r.h <= lyb + 1;
        if (!inHalf || housing(r)) continue;
        FP.assert(r.x >= xa - 1 && r.x + r.w <= xb + 1 && r.y >= ya - 1 && r.y + r.h <= yb + 1, `effet hors du front ${room.id} ${half} biome ${m} : ${JSON.stringify(r)} / ${[xa, xb, ya, yb]}`);
        for (let y = r.y; y < r.y + r.h; y++) { const set = rows.get(y) || new Set(); for (let x = Math.max(r.x, xa); x < Math.min(r.x + r.w, xb); x++) set.add(x); rows.set(y, set); }
      }
      for (let y = Math.max(0, ya); y < Math.min(H, yb); y++) FP.assert((rows.get(y) || new Set()).size >= C * (xb - xa), `${room.id} ${half} rangée ${y}, biome ${m}`);
    }
  }
});

FP.test('machines: la vapeur atteint le bout de la moitié', () => {
  let seen = 0;
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m);
    for (const room of s.world.bossLevel.rooms) {
      if (room.defense !== 'vapeur') continue;
      for (const half of [-1, 1]) for (const t of [.3, .47, .81]) {
        s.time = 2 + t; machState(s, room, 'strike', half, t); seen++;
        const g = skinCtx(); FP.bossMachines.draw(g, s);
        const b = FP.bossMachines.layout(room, half, 'vapeur'), cam = FP.px.toArt(s.camera.y), H = Math.ceil(s.world.viewH / FP.px.SCALE);
        const far = half < 0 ? FP.px.toArt(b.x1) - 1 : FP.px.toArt(b.x0), ya = Math.max(0, FP.px.toArt(b.y0) - cam), yb = Math.min(H, FP.px.toArt(b.y1) - cam);
        const steam = new Set(FP.palette.boss.machines.steam), hit = new Set();
        for (const r of g.rects) if (steam.has(r.c) && r.x <= far && r.x + r.w > far) for (let y = r.y; y < r.y + r.h; y++) hit.add(y);
        for (let y = ya; y < yb; y++) FP.assert(hit.has(y), `vapeur courte ${room.id} ${half} rangée ${y}`);
      }
    }
  }
  FP.assert(seen > 0, 'au moins une salle de vapeur');
});

// Revue en jeu (v5.9.0) : jusqu'au bout, mais des jets hachés qui défilent, pas un aplat : dans au moins la moitié des rangées, la vapeur laisse
// des trous entre la paroi et le front.
FP.test('machines: la vapeur reste des jets, pas un aplat', () => {
  const s = pipeRun(1), room = s.world.bossLevel.rooms.find(r => r.defense === 'vapeur'), steam = new Set(FP.palette.boss.machines.steam);
  for (const half of [-1, 1]) for (const t of [.3, .55]) {
    s.time = 2 + t; machState(s, room, 'strike', half, t);
    const g = skinCtx(); FP.bossMachines.draw(g, s);
    const b = FP.bossMachines.layout(room, half, 'vapeur'), cam = FP.px.toArt(s.camera.y), H = Math.ceil(s.world.viewH / FP.px.SCALE);
    const xa = FP.px.toArt(b.x0), xb = FP.px.toArt(b.x1), ya = Math.max(0, FP.px.toArt(b.y0) - cam), yb = Math.min(H, FP.px.toArt(b.y1) - cam);
    let holed = 0, rows = 0;
    for (let y = ya; y < yb; y++) {
      const set = new Set(); for (const r of g.rects) if (steam.has(r.c) && y >= r.y && y < r.y + r.h) for (let x = Math.max(r.x, xa + 4); x < Math.min(r.x + r.w, xb - 4); x++) set.add(x);
      rows++; if (set.size < (xb - xa - 8) * .9) holed++;
    }
    FP.assert(holed >= rows * .5, `vapeur en aplat (${holed}/${rows} rangées trouées), moitié ${half}`);
  }
});
