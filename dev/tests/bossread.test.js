// Lisibilité des boss (v5.16.0, spec docs/superpowers/specs/2026-11-19-lisibilite-boss-design.md) : côté des brûleurs, tirs en ondes dans la
// terre, sons des défenses et des tourelles, réticules dorés sur les points faibles. Aides : bossRun, bossDirect (boss.test.js), thr* et
// shot* (bossthreats.test.js), recCtx (decor.test.js), withBackend, sounding, auRun (audio.test.js).

// Une salle à défense murale (brûleurs de la Décharge, vapeur de l'Industrie), la pointe dedans, juste avant la fin de l'avertissement.
const readWall = (defense) => {
  for (const m of [0, 1, 2, 3]) {
    const s = thrRun(m), r = s.world.bossLevel.rooms.find(q => q.defense === defense);
    if (!r) continue;
    s.plant.tip = thrIn(r, .25);
    const W = FP.bossThreats.timing(0, FP.config.milieux[m].id).warn;
    for (let i = 0; i < 400 && thrStage(s, r) !== 'warn'; i++) thrStep(s);
    for (let i = 0; i < Math.floor(W * .8 * 60); i++) thrStep(s);
    return { s, r, e: s.bossThreats.rooms[r.id] };
  }
  return null;
};
FP.test('lisibilité: les veilleuses grandissent et pointent vers la moitié frappée', () => {
  for (const defense of ['flamme', 'vapeur']) {
  const w = readWall(defense); FP.assert(w, 'une salle à ' + defense);
  FP.assertEqual(w.e.stage, 'warn', 'encore l’avertissement (' + defense + ')');
  const { s, r, e } = w, b = FP.bossMachines.layout(r, e.half, r.defense), Q = FP.palette.boss.machines;
  s.camera.y = (r.y0 + r.y1) / 2 - s.world.viewH / 2;
  const g = recCtx(); bossDirect(() => FP.bossMachines.draw(g, s));
  const wall = FP.px.toArt(b.side < 0 ? b.x0 : b.x1), cols = [Q.pilot, ...Q.flame, ...Q.steam, Q.hot];
  const xa = FP.px.toArt(b.x0), xb = FP.px.toArt(b.x1), cam = FP.px.toArt(s.camera.y), ya = FP.px.toArt(r.y0) - cam, yb = FP.px.toArt(r.y1) - cam;
  const mine = g.rects.filter(q => cols.includes(q.c) && q.x >= xa - 1 && q.x + q.w <= xb + 1 && q.y >= ya && q.y <= yb);   // la moitié frappée seulement
  const reach = Math.max(0, ...mine.map(q => b.side < 0 ? q.x + q.w - wall : wall - q.x));
  FP.assert(reach >= 18, `${defense} : l'annonce avance de ${reach} px d'art vers la moitié frappée (au moins 18)`);
  }
});

FP.test('lisibilité: un tir de tourelle est une onde dans la terre, pas une boule de feu', () => {
  const s = shotRun(1), r = shotRoom(s); s.plant.tip = thrIn(r, .4);
  for (let i = 0; i < 900 && !s.bossThreats.shots.length; i++) thrStep(s);
  const sh = s.bossThreats.shots[0]; FP.assert(sh, 'un tir en vol');
  s.camera.y = sh.y - s.world.viewH / 2;
  const g = recCtx(); FP.bossRender.drawThreats(g, s);
  const P = FP.palette.boss.pulse;
  FP.assert(g.rects.some(q => q.c === P.core), 'noyau'); FP.assert(g.rects.some(q => P.wave.includes(q.c)), 'anneaux d’onde'); FP.assert(g.rects.some(q => P.dirt.includes(q.c)), 'terre soulevée');
  FP.assert(!g.rects.some(q => q.c === FP.palette.boss.aim[1]), 'plus de halo rouge de boule de feu');
});

FP.test('lisibilité: les défenses et les tourelles font du bruit, accordé au biome', () => {
  for (const type of ['bossStrike', 'bossAim', 'bossLock', 'bossShot', 'bossSpot']) withBackend(b => { FP.audio.consume([{ type }], auRun(), 0); FP.assert(sounding(b).length > 0, type); });
  const A = [], Bk = [];
  withBackend(b => { FP.sfx.play(b, 'bossStrike', 1, 'friche'); A.push(...b.calls.filter(c => c[0] === 'note').map(c => c[2])); });
  withBackend(b => { FP.sfx.play(b, 'bossStrike', 1, 'industrie'); Bk.push(...b.calls.filter(c => c[0] === 'note').map(c => c[2])); });
  FP.assert(A.length && A.join() !== Bk.join(), 'le coup change de note avec le biome');
});

// Réticules : un point faible intact qui entre dans le champ est repéré (une fois par niveau), avec un son ; le réticule se dessine en or.
const readSpot = () => { const s = bossRun(360, 1); s.mode = 'playing'; s.plant.tip = { x: 0, y: 0 }; return s; };
FP.test('lisibilité: un point faible repéré en entrant dans le champ, une seule fois', () => {
  const s = readSpot(), t = s.world.bossLevel.targets[0].solid;
  s.camera.y = t.y + s.world.viewH * 2; s.events.length = 0; FP.bossSpot.update(s, 1 / 60);
  FP.assertEqual(s.events.filter(e => e.type === 'bossSpot').length, 0, 'hors champ');
  s.camera.y = t.y - s.world.viewH / 2; FP.bossSpot.update(s, 1 / 60);
  FP.assertEqual(s.events.filter(e => e.type === 'bossSpot' && e.target === 0).length, 1, 'repéré');
  s.events.length = 0; FP.bossSpot.update(s, 1 / 60); s.camera.y = t.y + s.world.viewH * 2; FP.bossSpot.update(s, 1 / 60); s.camera.y = t.y - s.world.viewH / 2; FP.bossSpot.update(s, 1 / 60);
  FP.assertEqual(s.events.filter(e => e.type === 'bossSpot').length, 0, 'une seule fois');
  FP.boss.destroy(s, 1); const t1 = s.world.bossLevel.targets[1].solid; s.camera.y = t1.y - s.world.viewH / 2; s.events.length = 0; FP.bossSpot.update(s, 1 / 60);
  FP.assertEqual(s.events.filter(e => e.type === 'bossSpot' && e.target === 1).length, 0, 'pas de réticule sur une cible détruite');
});
FP.test('lisibilité: le réticule est doré, jamais rouge', () => {
  const s = readSpot(), t = s.world.bossLevel.targets[0].solid; s.camera.y = t.y - s.world.viewH / 2;
  FP.bossSpot.update(s, 1 / 60); s.time += .6;
  const g = recCtx(), R = FP.palette.boss.reticle; FP.bossRender.drawThreats(g, s);
  FP.assert(g.rects.some(q => R.includes(q.c)), 'réticule doré dessiné');
  FP.assert(!R.some(c => FP.palette.boss.aim.includes(c) || FP.palette.boss.alert.includes(c)), 'aucune couleur de menace');
});
FP.test('lisibilité: le cœur à nu est repéré à son tour', () => {
  const s = readSpot(); for (const i of [0, 1, 2]) FP.boss.destroy(s, i);
  const h = s.world.bossLevel.head.solid; s.camera.y = h.y - s.world.viewH / 2; s.events.length = 0; FP.bossSpot.update(s, 1 / 60);
  FP.assertEqual(s.events.filter(e => e.type === 'bossSpot' && e.target === 'head').length, 1);
});
