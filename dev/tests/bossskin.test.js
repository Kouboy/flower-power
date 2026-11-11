// Habillage des boss (v5.6.0) : matière des parois, images des pièces, secours sans images. Aides : bossRun (boss.test.js), recCtx (decor.test.js).
const skinImg = (w = 8, h = 8) => ({ width: w, height: h, complete: true });
// Toile espionne : rectangles (recCtx) et appels à drawImage (source et coordonnées).
const skinCtx = () => { const g = recCtx(); g.images = []; g.drawImage = (img, ...a) => g.images.push({ img, a }); return g; };
const skinRun = (milieu = 0) => { const s = bossRun(440, milieu); s.mode = 'playing'; s.time = 2; s.camera.y = s.world.bossLevel.targets[0].solid.y - s.world.viewH / 2; return s; };
const skinId = (m) => FP.config.milieux[m].id;
const skinDraw = (s) => { const g = skinCtx(); FP.bossRender.draw(g, s); return g; };

FP.test('bossSkin: sans images, chaque boss se dessine comme avant (aucune image, des rectangles)', () => {
  FP.bossSkin._reset();
  for (const m of [0, 1, 2, 3]) {
    const g = skinDraw(skinRun(m));
    FP.assertEqual(g.images.length, 0, 'milieu ' + m); FP.assert(g.rects.length > 0, 'dessin actuel, milieu ' + m);
    for (const r of ['matter', 'target', 'head', 'plate', 'turret']) FP.assertEqual(FP.bossSkin.image(skinId(m), r), null);
  }
});

FP.test('bossSkin: la matière remplit chaque paroi rangée par rangée, ancrée au monde', () => {
  const tile = skinImg(16, 16);
  try {
    FP.bossSkin._set('friche', 'matter', tile);
    const s = skinRun(0), a = skinDraw(s).images.filter(q => q.img === tile);
    FP.assert(a.length > 0, 'matière posée');
    FP.assert(a.every(q => q.a[3] === 1 && q.a[7] === 1), 'tranches d’une rangée');
    // rangée du monde → rangée source : y_source = (y_écran + caméra) mod 16, quelle que soit la caméra
    const cam = FP.px.toArt(s.camera.y), rowOf = (q, c) => ((q.a[5] + c) % 16 + 16) % 16;
    FP.assert(a.every(q => q.a[1] === rowOf(q, cam)), 'ancrage vertical');
    s.camera.y += 37; const cam2 = FP.px.toArt(s.camera.y), b = skinDraw(s).images.filter(q => q.img === tile);
    FP.assert(b.every(q => q.a[1] === rowOf(q, cam2)), 'ancrage après déplacement de la caméra');
  } finally { FP.bossSkin._reset(); }
});

FP.test('bossSkin: cible, tête, plaque, tourelle en image quand elle existe', () => {
  const imgs = { target: skinImg(), head: skinImg(), plate: skinImg(), turret: skinImg(12, 8) };
  try {
    for (const r in imgs) FP.bossSkin._set('friche', r, imgs[r]);
    const s = skinRun(0), bl = s.world.bossLevel;
    const at = (o) => { s.camera.y = o.y - s.world.viewH / 2; return skinDraw(s).images.map(q => q.img); };
    FP.assert(at(bl.targets[0].solid).includes(imgs.target), 'cible');
    FP.assert(at(bl.plates[0].solid).includes(imgs.plate), 'plaque');
    FP.assert(at(bl.head.solid).includes(imgs.head), 'tête blindée');
    FP.assert(at(bl.turrets[0]).includes(imgs.turret), 'tourelle');
    s.bossFight.headOpen = true; FP.assert(!at(bl.head.solid).includes(imgs.head), 'tête à nu : la lueur du code');
  } finally { FP.bossSkin._reset(); }
});

FP.test('bossSkin: une pièce off (paroi effondrée, cible détruite, plaque tombée) n’est pas habillée', () => {
  const imgs = { matter: skinImg(), target: skinImg(), plate: skinImg() };
  try {
    for (const r in imgs) FP.bossSkin._set('friche', r, imgs[r]);
    const s = skinRun(0), bl = s.world.bossLevel;
    for (const w of bl.walls) w.off = true;
    for (const t of bl.targets) t.solid.off = true;
    for (const p of bl.plates) p.solid.off = true;
    for (const o of [bl.targets[0].solid, bl.plates[0].solid, bl.walls[0]]) {
      s.camera.y = o.y - s.world.viewH / 2;
      FP.assertEqual(skinDraw(s).images.length, 0);
    }
  } finally { FP.bossSkin._reset(); }
});

FP.test('bossSkin: le calque est refait quand une image devient prête', () => {
  const saved = FP.px.layer; let made = 0;
  FP.px.layer = (w, h) => { made++; return { canvas: { width: w, height: h }, g: skinCtx() }; };
  try {
    FP.bossSkin._reset();
    const s = skinRun(0); FP.bossRender.draw(skinCtx(), s); FP.bossRender.draw(skinCtx(), s);
    const once = made;
    FP.bossSkin._set('friche', 'matter', skinImg()); FP.bossRender.draw(skinCtx(), s);
    FP.assertEqual(made, once + 1, 'calque refait');
    FP.bossRender.draw(skinCtx(), s); FP.assertEqual(made, once + 1, 'puis gardé');
  } finally { FP.px.layer = saved; FP.bossSkin._reset(); }
});

FP.test('bossSkin: art.js — chaque milieu décrit a ses 5 images, sans premier plan', () => {
  for (const [id, a] of Object.entries(window.FLOWER_POWER_BOSS_ART)) {
    FP.assert(FP.config.milieux.some(m => m.id === id), 'milieu connu ' + id);
    for (const r of ['matter', 'target', 'head', 'plate', 'turret']) FP.assert(typeof a[r] === 'string' && a[r].endsWith('.png'), id + ' ' + r);
    FP.assert(!('fore' in a), id + ' : plus de premier plan (v5.7.0)');
  }
});

FP.test('bossSkin: une plaque qui tombe garde sa matière', () => {
  const img = skinImg();
  try {
    FP.bossSkin._set('friche', 'plate', img);
    const s = skinRun(0), o = s.world.bossLevel.targets[0].solid; s.fx = s.fx || {};
    s.events.push({ type: 'bossTarget', i: 0, x: o.x, y: o.y }); FP.bossFx.update(s); s.events.length = 0;
    FP.assert(s.fx.boss.plates.length > 0, 'plaque détachée'); s.time += .05;
    const g = skinCtx(); FP.bossFx.draw(g, s); FP.assert(g.images.some(q => q.img === img), 'image de la plaque');
  } finally { FP.bossSkin._reset(); }
});

// Revue finale (v5.6.0) : une image de pièce n'est pas déformée par une boîte étirée ; une plaque est répétée à l'échelle 1.
FP.test('bossSkin: une pièce garde les proportions de son image, centrée dans sa boîte', () => {
  const img = skinImg(8, 8), g = skinCtx(), box = [[0, 0], [20, 0], [20, 60], [0, 60]];
  FP.bossSkin.piece(g, box, img);
  FP.assert(g.images.length > 0, 'dessinée');
  for (const q of g.images) FP.assert(Math.abs(q.a[2] / q.a[6] - q.a[3] / q.a[7]) < 1e-9, 'même échelle en x et en y : ' + q.a.join());
  const ys = g.images.map(q => q.a[5]); FP.assert(Math.min(...ys) >= 20 && Math.max(...ys) < 40, 'centrée en hauteur : ' + Math.min(...ys) + '…' + Math.max(...ys));
});
FP.test('bossSkin: une plaque habillée est répétée sans déformation', () => {
  const img = skinImg(16, 8);
  try {
    FP.bossSkin._set('friche', 'plate', img);
    const s = skinRun(0), p = s.world.bossLevel.plates[0].solid; s.camera.y = p.y - s.world.viewH / 2;
    const a = skinDraw(s).images.filter(q => q.img === img);
    FP.assert(a.length > 0 && a.every(q => q.a[2] === q.a[6] && q.a[3] === q.a[7]), 'échelle 1');
  } finally { FP.bossSkin._reset(); }
});
