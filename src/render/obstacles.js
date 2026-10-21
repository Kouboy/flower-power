// render/obstacles.js — obstacles PNG ramenés sur la grille de pixels d'art, avec contour et ancrage sombre.
// Lit     : world.solids (x, y, a, flip, w, h, pivot, collision, grazeRadius, broadR, assetKey), FP.sprites, FP.px, FP.geom.sdPoly,
//           FP.view.art.h.
// Écrit   : o._anchor sur chaque solide — cache de rendu uniquement, jamais lu par la simulation.
// Expose  : FP.obstacles.draw(actx, world, cameraY) — repère d'art, la caméra est appliquée ici.
// Chaque sprite est réduit une seule fois par (sprite, miroir) : moyenne, 8 niveaux par canal, contour d'un pixel.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  // Masquage : un obstacle est dessiné tant que son rayon (au moins 44 px) plus 90 px touche l'écran (visuel, v3).
  const CULL_MIN_R = 44, CULL_PAD = 90;
  const OUTLINE = '#120c08', ANCHOR = '#0a0605';
  const sprites = new Map();   // clé `${assetKey}|${w}|${h}|${flip}` → canvas en pixels d'art (contour compris)

  const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  // Chemin complet : relecture des pixels, moyenne, 8 niveaux par canal, contour d'un pixel.
  function reducedByPixels(img, aw, ah, flip) {
    const { px } = FP, src = canvasOf(img.naturalWidth || img.width, img.naturalHeight || img.height), sg = src.getContext('2d');
    if (flip !== 1) { sg.translate(src.width, 0); sg.scale(-1, 1); }
    sg.drawImage(img, 0, 0);
    const reduced = px.outline(px.posterize(px.downscale(sg.getImageData(0, 0, src.width, src.height), aw, ah), 8), OUTLINE);
    const c = canvasOf(reduced.width, reduced.height), g = c.getContext('2d'), out = g.createImageData(c.width, c.height);
    out.data.set(reduced.data); g.putImageData(out, 0, 0);
    return c;
  }

  // Repli sans relecture (jeu ouvert en file://, où le navigateur interdit getImageData sur une image locale) :
  // réduction par drawImage, contour fait de quatre silhouettes décalées d'un pixel. Pas de postérisation.
  function reducedByDrawing(img, aw, ah, flip) {
    const small = canvasOf(aw, ah), sg = small.getContext('2d');
    if (flip !== 1) { sg.translate(aw, 0); sg.scale(-1, 1); }
    sg.drawImage(img, 0, 0, aw, ah);
    const sil = canvasOf(aw, ah), lg = sil.getContext('2d');
    lg.drawImage(small, 0, 0); lg.globalCompositeOperation = 'source-in'; lg.fillStyle = OUTLINE; lg.fillRect(0, 0, aw, ah);
    const c = canvasOf(aw + 2, ah + 2), g = c.getContext('2d');
    for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(sil, dx, dy);
    g.drawImage(small, 1, 1);
    return c;
  }

  function spriteFor(o) {
    const { px } = FP, aw = Math.max(2, px.toArt(o.w)), ah = Math.max(2, px.toArt(o.h));
    const key = `${o.assetKey}|${aw}|${ah}|${o.flip}`;
    if (sprites.has(key)) return sprites.get(key);
    const img = FP.sprites.get(o.assetKey);
    if (!img) return null;     // PNG pas encore chargé ou manquant : la collision existe quand même
    let c;
    try { c = reducedByPixels(img, aw, ah, o.flip); }
    catch (e) { c = reducedByDrawing(img, aw, ah, o.flip); }   // file:// : relecture des pixels interdite (canvas « tainted »)
    const entry = { canvas: c, ox: -o.pivot[0] * aw - 1, oy: -o.pivot[1] * ah - 1 };
    sprites.set(key, entry);
    return entry;
  }

  // Ancrage : un halo sombre tramé autour du polygone de collision, plus dense près du bord. Calculé une fois par obstacle,
  // dans le repère local (non tourné) en pixels d'art.
  function anchorFor(o) {
    if (o._anchor) return o._anchor;
    const { px } = FP, s = px.SCALE, pad = Math.max(3, Math.round((o.grazeRadius || 14) * .6 / s));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of o.collision) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const x0 = Math.floor(minX / s) - pad, y0 = Math.floor(minY / s) - pad;
    const w = Math.ceil(maxX / s) + pad - x0, h = Math.ceil(maxY / s) + pad - y0;
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = FP.geom.sdPoly((x + x0 + .5) * s, (y + y0 + .5) * s, o.collision) / s;
        if (d <= -1 || d >= pad) continue;
        const level = Math.round(16 * .45 * (1 - Math.max(0, d) / pad));
        px.dither(g, x, y, 1, 1, 'rgba(0,0,0,0)', ANCHOR, level);
      }
    }
    o._anchor = { canvas: c, ox: x0, oy: y0 };
    return o._anchor;
  }

  function draw(actx, world, cameraY) {
    const { px } = FP, oy = px.toArt(cameraY), top = cameraY, bottom = cameraY + FP.view.art.h * px.SCALE;
    for (const o of world.solids) {
      const pad = Math.max(CULL_MIN_R, o.broadR) + CULL_PAD;
      if (o.y + pad < top || o.y - pad > bottom) continue;
      actx.save();
      try {
        actx.translate(px.toArt(o.x), px.toArt(o.y) - oy);
        actx.rotate(o.a);
        const a = anchorFor(o);
        actx.drawImage(a.canvas, a.ox, a.oy);
        const sp = spriteFor(o);
        if (sp) actx.drawImage(sp.canvas, Math.round(sp.ox), Math.round(sp.oy));
      } finally { actx.restore(); }
    }
  }

  FP.obstacles = { draw };
})();
