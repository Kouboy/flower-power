// render/obstacles.js — obstacles PNG ramenés sur la grille de pixels d'art, avec contour et ancrage sombre.
// Lit     : world.solids (x, y, a, flip, w, h, pivot, collision, grazeRadius, broadR, assetKey), FP.sprites, FP.px, FP.catalog.assets,
//           FP.view.art.h, FP.palette.strataTone, FP.soil.surfaceTop.
// Écrit   : o._anchor, o._look sur chaque solide — caches de rendu uniquement, jamais lus par la simulation.
// Expose  : FP.obstacles.draw(actx, world, cameraY) — repère d'art, la caméra est appliquée ici ; FP.obstacles.look(o) (pur) ;
//           FP.obstacles.prewarm() — prépare une famille par appel, hors des moments de jeu.
// Chaque obstacle a son apparence : teinte, luminosité, usure, et pour un tiers d'entre eux le bas enfoui dans la terre.
// Chaque sprite est réduit une seule fois par (sprite, miroir) : moyenne, 8 niveaux par canal, contour d'un pixel.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  // Masquage : un obstacle est dessiné tant que son rayon (au moins 44 px) plus 90 px touche l'écran (visuel, v3).
  const CULL_MIN_R = 44, CULL_PAD = 90;
  const OUTLINE = '#120c08', ANCHOR = '#0a0605', ANCHOR_RGB = [10, 6, 5];
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
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

  // Réduction pixel faite une fois par famille et par sens, à la taille nominale (worldWidth de la fiche) : la relecture
  // des pixels coûte 10 à 20 ms, elle ne doit pas se refaire pour chaque obstacle. La taille propre à chaque obstacle
  // est appliquée ensuite, par une simple copie mise à l'échelle (lookFor).
  function spriteFor(o) {
    const { px } = FP, asset = FP.catalog.assets[o.assetKey], nomW = (asset && asset.render && asset.render.worldWidth) || o.w;
    const aw = Math.max(2, px.toArt(nomW)), ah = Math.max(2, px.toArt(nomW * o.h / o.w));
    const key = `${o.assetKey}|${aw}|${ah}|${o.flip}`;
    if (sprites.has(key)) return sprites.get(key);
    const img = FP.sprites.get(o.assetKey);
    if (!img) return null;     // PNG pas encore chargé ou manquant : la collision existe quand même
    let c;
    try { c = reducedByPixels(img, aw, ah, o.flip); }
    catch (e) { c = reducedByDrawing(img, aw, ah, o.flip); }   // file:// : relecture des pixels interdite (canvas « tainted »)
    const entry = { canvas: c, nomW };
    sprites.set(key, entry);
    return entry;
  }

  // Ancrage : un halo sombre tramé autour du polygone de collision, plus dense près du bord. Calculé une fois par obstacle,
  // dans le repère local (non tourné) en pixels d'art.
  function anchorFor(o) {
    if (o._anchor) return o._anchor;
    const s = FP.px.SCALE, pad = Math.max(3, Math.round((o.grazeRadius || 14) * .6 / s));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of o.collision) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const x0 = Math.floor(minX / s) - pad, y0 = Math.floor(minY / s) - pad;
    const w = Math.ceil(maxX / s) + pad - x0, h = Math.ceil(maxY / s) + pad - y0;
    const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h);
    // Silhouette remplie puis distance de chaque pixel à la silhouette en deux passes (transformée de distance) :
    // coût proportionnel au nombre de pixels, quel que soit le nombre de points du contour.
    // Remplissage par balayage en JavaScript (pas de getImageData : rapatrier une image du GPU coûte plusieurs ms).
    const g = c.getContext('2d'), W = c.width, H = c.height, dist = new Float32Array(W * H).fill(1e9);
    const poly = o.collision.map(([px, py]) => [px / s - x0, py / s - y0]);
    for (let y = 0; y < H; y++) {
      const yc = y + .5, xs = [];
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > yc) !== (yj > yc)) xs.push(xi + (yc - yi) / (yj - yi) * (xj - xi));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - .5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - .5)); x++) dist[y * W + x] = 0;
    }
    const relax = (k, n, w) => { if (dist[n] + w < dist[k]) dist[k] = dist[n] + w; };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (x > 0) relax(k, k - 1, 1);
      if (y > 0) { relax(k, k - W, 1); if (x > 0) relax(k, k - W - 1, 1.414); if (x < W - 1) relax(k, k - W + 1, 1.414); }
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const k = y * W + x;
      if (x < W - 1) relax(k, k + 1, 1);
      if (y < H - 1) { relax(k, k + W, 1); if (x < W - 1) relax(k, k + W + 1, 1.414); if (x > 0) relax(k, k + W - 1, 1.414); }
    }
    const img = g.createImageData(W, H), data = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = dist[y * W + x] - .5;
      if (d < 0 || d >= pad) continue;
      if (BAYER[y & 3][x & 3] >= Math.round(16 * .45 * (1 - d / pad))) continue;
      const i = (y * W + x) * 4;
      data[i] = ANCHOR_RGB[0]; data[i + 1] = ANCHOR_RGB[1]; data[i + 2] = ANCHOR_RGB[2]; data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
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
        if (sp) { const lk = lookFor(o, sp, world); actx.drawImage(lk.canvas, Math.round(lk.ox), Math.round(lk.oy)); }
      } finally { actx.restore(); }
    }
  }

  // --- Apparence propre à chaque obstacle : pas deux extincteurs identiques ---------------------------

  const RUST = ['#5a3418', '#7a4a22', '#2a1c12'];

  // Empreinte stable de l'obstacle (famille et position) : teinte, luminosité, usure, enfouissement. Pure, testée.
  function look(o) {
    let h = 2166136261;
    for (const ch of String(o.kind)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    for (const v of [Math.round(o.x), Math.round(o.y)]) { h = Math.imul(h ^ (v & 0xffff), 16777619); h = Math.imul(h ^ (v >>> 16), 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15; h >>>= 0;
    return { hue: (h % 31) - 15, light: 82 + ((h >>> 5) % 31), wear: (h >>> 10) % 4, buried: (h >>> 12) % 100 < 33 };
  }

  // Cache par obstacle : sprite de sa famille retouché (filtre, sans relecture de pixels : sûr en file://),
  // taches d'usure peintes sur le sprite seulement, mottes de terre sur le bas s'il est à moitié enfoui.
  function lookFor(o, sp, world) {
    if (o._look) return o._look;
    const { px, palette } = FP, L = look(o), c = document.createElement('canvas');
    const sc = o.w / sp.nomW;   // taille propre à l'obstacle (catalog : scale)
    c.width = Math.max(3, Math.round(sp.canvas.width * sc)); c.height = Math.max(3, Math.round(sp.canvas.height * sc));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.filter = 'hue-rotate(' + L.hue + 'deg) brightness(' + L.light + '%)';
    g.drawImage(sp.canvas, 0, 0, c.width, c.height);
    g.filter = 'none';
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < L.wear * 4; i++) {
      const k = (i * 2654435761 + L.light * 97) >>> 0;
      px.rect(g, 2 + k % Math.max(1, c.width - 4), 2 + (k >>> 8) % Math.max(1, c.height - 4), 1 + (k >>> 16) % 2, 1, RUST[(k >>> 20) % 3]);
    }
    if (L.buried) {                                    // la terre ne recouvre que la silhouette (source-atop)
      g.globalCompositeOperation = 'source-atop';
      const d = Math.max(0, Math.min(.999, (o.y - FP.soil.surfaceTop(world)) / (world.height - FP.soil.surfaceTop(world))));
      const base = c.height - Math.round(c.height * .28);
      for (let x = 0; x < c.width; x++) {
        const top = base + Math.round(Math.sin(x * .7 + L.hue) * 1.5 + Math.sin(x * .23) * 1.5);
        px.rect(g, x, top, 1, c.height - top, palette.strataTone(d, 1 + (x % 3 === 0 ? 1 : 0)));
        px.rect(g, x, top, 1, 1, palette.strataTone(d, 0));
      }
      g.globalCompositeOperation = 'source-over';
    }
    o._look = { canvas: c, ox: -o.pivot[0] * (c.width - 2) - 1, oy: -o.pivot[1] * (c.height - 2) - 1 };
    return o._look;
  }

  // Préparation à l'avance : réduit une famille (et un sens) par appel, hors des moments de jeu, pour que le premier
  // obstacle de chaque famille n'ait pas à payer sa réduction (20 à 80 ms) en pleine partie.
  const warmed = new Set();   // familles et sens déjà préparés (`kind|flip`)
  function prewarm() {
    for (const [kind, a] of Object.entries(FP.catalog.assets)) {
      for (const flip of a.render && a.render.mirrorSafe === false ? [1] : [1, -1]) {
        const key = kind + '|' + flip;
        if (warmed.has(key)) continue;
        const o = FP.catalog.makeSolid({ kind, x: 0, y: 0, a: 0, flip });
        if (!o || !FP.sprites.get(o.assetKey)) continue;   // image pas encore chargée : on réessaiera
        spriteFor(o);
        warmed.add(key);
        return true;
      }
    }
    return false;
  }

  FP.obstacles = { draw, look, prewarm };
})();
