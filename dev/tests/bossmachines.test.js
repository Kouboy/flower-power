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

FP.test('bossMachines: en coup, l’effet couvre toute la moitié visée, pour chaque salle de chaque boss', () => {
  for (const m of [0, 1, 2, 3]) {
    const s = pipeRun(m);
    for (const room of s.world.bossLevel.rooms) for (const half of [-1, 1]) {
      machState(s, room, 'strike', half);
      const g = skinCtx(); FP.bossMachines.draw(g, s);
      const b = FP.bossMachines.layout(room, half, room.defense), cam = FP.px.toArt(s.camera.y), H = Math.ceil(s.world.viewH / FP.px.SCALE);
      const xa = FP.px.toArt(b.x0), xb = FP.px.toArt(b.x1), ya = Math.max(0, FP.px.toArt(b.y0) - cam), yb = Math.min(H, FP.px.toArt(b.y1) - cam);
      const rows = new Map();
      for (const r of g.rects) for (let y = r.y; y < r.y + r.h; y++) { if (y < ya || y >= yb) continue; const set = rows.get(y) || new Set(); for (let x = Math.max(r.x, xa); x < Math.min(r.x + r.w, xb); x++) set.add(x); rows.set(y, set); }
      for (let y = ya; y < yb; y++) FP.assert((rows.get(y) || new Set()).size >= .8 * (xb - xa), `${room.id} ${half} rangée ${y} couverte à ${(rows.get(y) || new Set()).size}/${xb - xa}, milieu ${m}`);
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
