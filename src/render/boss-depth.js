// render/boss-depth.js — la profondeur des boss (v5.6.0) : arrière-plan d'usine lointain, répété, plus lent que la caméra ;
// éléments de premier plan flous, plus rapides que la caméra, qui peuvent traverser l'écran. Les menaces passent par-dessus (frame.js).
// Lit     : state.{seed, time, camera.y, run.milieu, bossFight.collapse, bossThreats.rooms}, state.world.{width, viewH, bossLevel},
//           FP.config.{milieux, boss.skin (back, fore, blur, foreAlpha, foreAlphaNoBlur, foreGap, foreX, foreShake, backDim)},
//           FP.bossSkin.{image, fore}, FP.bossPlan.zone, FP.palette.boss.milieux, FP.px (dont layer), FP.createRng.
// Écrit   : rien dans l'état (la toile reçue ; une toile floutée en cache par image du premier plan).
// Expose  : FP.bossDepth.parallax(y, camY, f) → y - camY × f (pur) ; place(seed, milieuId, top, bottom, viewH, n) → [{ i, y, x }] (pur) ;
//           blurred(img) → { canvas, pad, sharp } (préparé une fois ; sharp : le navigateur ne sait pas flouter) ; alphaOf(b) → opacité ;
//           layout(state) → [{ img, x, y, f }] (premier plan, pixels d'art de l'écran) ; drawBack(g, state) ; drawFore(g, state).
// Rien hors niveau de boss, ni pour un milieu sans images (son boss reste dessiné par le code).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const JOLT_HZ = 30;   // bascules par seconde de la secousse du premier plan

  const parallax = (y, camY, f) => y - camY * f;
  const idOf = (state) => FP.config.milieux[state.run.milieu].id;

  // Vitesse relative de l'image i parmi n : de fore[0] (première) à fore[1] (dernière).
  const speedOf = (i, n) => { const K = FP.config.boss.skin; return K.fore[0] + (K.fore[1] - K.fore[0]) * (n > 1 ? i / (n - 1) : 0); };

  // Premier plan, placé dans l'espace de la caméra (revue finale) : l'élément k passe au milieu de l'écran quand la caméra est à
  // c_k sous top ; deux passages sont espacés de foreGap écrans de course de caméra, quelle que soit la vitesse de chacun (à
  // vitesses différentes, un espacement dans le monde laissait deux éléments se rattraper sur un long niveau). De la caméra un écran
  // au-dessus de top jusqu'à bottom ; images alternées, abscisse tirée.
  function place(seed, milieuId, top, bottom, viewH, n) {
    const K = FP.config.boss.skin, m = FP.config.milieux.findIndex(q => q.id === milieuId);
    const rng = FP.createRng((seed ^ Math.imul(m + 1, 0x85ebca6b) ^ 0xb055) >>> 0), out = [];
    for (let c = (rng.next() - 1) * viewH, k = 0; c <= bottom - top; k++) {
      const i = k % n;
      out.push({ i, y: top + c * speedOf(i, n) + viewH / 2, x: rng.range(K.foreX[0], K.foreX[1]) });
      c += viewH * rng.range(K.foreGap[0], K.foreGap[1]);
    }
    return out;
  }

  const blurCache = new Map();
  function blurred(img) {
    if (blurCache.has(img)) return blurCache.get(img);
    const pad = Math.ceil(FP.config.boss.skin.blur * 2), l = FP.px.layer(img.width + 2 * pad, img.height + 2 * pad);
    let b = null;
    if (l) {
      const sharp = !('filter' in l.g);
      if (!sharp) l.g.filter = 'blur(' + FP.config.boss.skin.blur + 'px)';
      l.g.drawImage(img, pad, pad);
      b = { canvas: l.canvas, pad, sharp };
    }
    blurCache.set(img, b);
    return b;
  }
  const alphaOf = (b) => (!b || b.sharp ? FP.config.boss.skin.foreAlphaNoBlur : FP.config.boss.skin.foreAlpha);

  // Secousse du premier plan : ± foreShake pendant l'avertissement d'une salle et pendant la mort du boss.
  function jolt(state) {
    const warned = Object.values(state.bossThreats.rooms).some(e => e && e.stage === 'warn');
    if (!warned && !(state.bossFight && state.bossFight.collapse)) return 0;
    return (Math.floor(state.time * JOLT_HZ) % 2 ? 1 : -1) * FP.config.boss.skin.foreShake;
  }

  let placed = null, placedFor = null, placedN = 0;
  function layout(state) {
    const w = state.world, bl = w.bossLevel;
    if (!bl) return [];
    const imgs = FP.bossSkin.fore(idOf(state));
    if (!imgs.length) return [];
    const z = FP.bossPlan.zone(w);
    if (placedFor !== bl || placedN !== imgs.length) {
      placed = place(state.seed, idOf(state), z.top, z.bottom, w.viewH, imgs.length);
      placedFor = bl; placedN = imgs.length;
    }
    const dx = jolt(state), cam = state.camera.y, W = Math.ceil(w.width / FP.px.SCALE), H = Math.ceil(w.viewH / FP.px.SCALE), out = [];
    for (const e of placed) {
      const img = imgs[e.i % imgs.length], f = speedOf(e.i, imgs.length);
      const y = FP.px.toArt(parallax(e.y - z.top, cam - z.top, f)) - Math.floor(img.height / 2);
      if (y > H || y + img.height < 0) continue;
      out.push({ img, x: Math.round(e.x * W) - Math.floor(img.width / 2) + dx, y, f });
    }
    return out;
  }

  function drawFore(g, state) {
    for (const e of layout(state)) {
      const b = blurred(e.img), src = b ? b.canvas : e.img, pad = b ? b.pad : 0;
      g.globalAlpha = alphaOf(b);
      g.drawImage(src, e.x - pad, e.y - pad);
      g.globalAlpha = 1;
    }
  }

  // Arrière-plan : l'image répétée en largeur et en hauteur, à back × la vitesse de la caméra, limitée à la zone du boss, sous un voile sombre.
  function drawBack(g, state) {
    const w = state.world;
    if (!w.bossLevel) return;
    const img = FP.bossSkin.image(idOf(state), 'back');
    if (!img) return;
    const K = FP.config.boss.skin, z = FP.bossPlan.zone(w), cam = state.camera.y, H = Math.ceil(w.viewH / FP.px.SCALE);
    const W = Math.ceil(w.width / FP.px.SCALE), ya = Math.max(0, FP.px.toArt(z.top - cam)), yb = Math.min(H, FP.px.toArt(z.bottom - cam));
    if (yb <= ya) return;
    const oy = FP.px.toArt(parallax(z.top, cam - z.top, K.back) - z.top);   // rangée d'écran où commence une tuile
    for (let y = ya; y < yb;) {
      const sy = ((y - oy) % img.height + img.height) % img.height, h = Math.min(img.height - sy, yb - y);
      for (let x = 0; x < W; x += img.width) { const n = Math.min(img.width, W - x); g.drawImage(img, 0, sy, n, h, x, y, n, h); }
      y += h;
    }
    g.globalAlpha = K.backDim;
    FP.px.rect(g, 0, ya, W, yb - ya, FP.palette.boss.milieux[idOf(state)].edge);
    g.globalAlpha = 1;
  }

  FP.bossDepth = { parallax, place, blurred, alphaOf, layout, drawBack, drawFore };
})();
