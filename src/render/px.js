// render/px.js — boîte à outils pixel : tout le dessin « converti » passe par ces primitives, sur la toile monde.
// Lit     : rien (fonctions pures sur le contexte reçu).
// Écrit   : uniquement les pixels du contexte passé en argument, par fillRect (jamais de chemin lissé).
// Expose  : FP.px.{SCALE, toArt, rect, line, disc, ring, dither, downscale, posterize, outline}.
// Coordonnées en pixels d'art entiers (1 pixel d'art = SCALE pixels CSS). Ne touche pas au DOM : testable sous Node.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const SCALE = 2;

  // Matrice de Bayer 4×4 : tramage ordonné, le motif des dégradés Mega Drive.
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  const toArt = (v) => Math.round(v / SCALE);

  function rect(ctx, x, y, w, h, color) {
    if (w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  // Bresenham ; chaque point est un carré de `thick` pixels centré sur la ligne. Les points contigus d'une même rangée
  // (ou d'une même colonne) sont peints d'un seul rectangle : mêmes pixels, beaucoup moins d'appels (Firefox les paie cher).
  function line(ctx, x0, y0, x1, y1, color, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = (thick - 1) >> 1;
    let err = dx + dy, rx = x0, ry = y0, ex = x0, ey = y0;   // segment en cours : de (rx, ry) à (ex, ey)
    const flush = () => ctx.fillRect(Math.min(rx, ex) - o, Math.min(ry, ey) - o, Math.abs(ex - rx) + thick, Math.abs(ey - ry) + thick);
    ctx.fillStyle = color;
    for (;;) {
      if (x0 === x1 && y0 === y1) { flush(); return; }
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
      if (y0 === ey && ry === ey && Math.abs(x0 - ex) === 1) ex = x0;          // même rangée, pixel voisin
      else if (x0 === ex && rx === ex && Math.abs(y0 - ey) === 1) ey = y0;     // même colonne, pixel voisin
      else { flush(); rx = ex = x0; ry = ey = y0; }
    }
  }

  // Un pixel (dx, dy) est dans le disque de rayon r si dx² + dy² ≤ r² + r : bords réguliers, rangée centrale de 2r + 1.
  const halfSpan = (r, dy) => { let h = 0; while ((h + 1) * (h + 1) + dy * dy <= r * r + r) h++; return h; };

  function disc(ctx, cx, cy, r, color) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(0, Math.round(r));
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      if (dy * dy > r * r + r) continue;
      const h = halfSpan(r, dy);
      ctx.fillRect(cx - h, cy + dy, 2 * h + 1, 1);
    }
  }

  // Anneau : les pixels du disque r qui ne sont pas dans le disque r − thick.
  function ring(ctx, cx, cy, r, color, thick = 1) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.max(0, Math.round(r));
    const inner = r - thick;
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      if (dy * dy > r * r + r) continue;
      const h = halfSpan(r, dy);
      const hi = inner >= 0 && dy * dy <= inner * inner + inner ? halfSpan(inner, dy) : -1;
      if (hi < 0) { ctx.fillRect(cx - h, cy + dy, 2 * h + 1, 1); continue; }
      ctx.fillRect(cx - h, cy + dy, h - hi, 1);
      ctx.fillRect(cx + hi + 1, cy + dy, h - hi, 1);
    }
  }

  // Remplissage tramé : `level` de 0 (tout A) à 16 (tout B). Le motif est ancré sur la grille absolue,
  // pour que deux zones voisines se raccordent sans couture.
  function dither(ctx, x, y, w, h, colorA, colorB, level) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    if (level <= 0) return rect(ctx, x, y, w, h, colorA);
    if (level >= 16) return rect(ctx, x, y, w, h, colorB);
    rect(ctx, x, y, w, h, colorA);
    ctx.fillStyle = colorB;
    for (let j = 0; j < h; j++) {
      const row = BAYER[(y + j) & 3];
      for (let i = 0; i < w; i++) if (row[(x + i) & 3] < level) ctx.fillRect(x + i, y + j, 1, 1);
    }
  }

  // --- Images (objets { width, height, data } comme ImageData) : ramener un sprite sur la grille. ---

  // Réduction par moyenne des pixels source couverts, pondérée par l'alpha ; alpha final tranché (0 ou 255).
  function downscale(src, w, h) {
    const out = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
    const sx = src.width / w, sy = src.height / h, s = src.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
        const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) * 4, al = s[i + 3];
          r += s[i] * al; g += s[i + 1] * al; b += s[i + 2] * al; a += al; n++;
        }
        const o = (y * w + x) * 4;
        if (a / n >= 128) { out.data[o] = r / a; out.data[o + 1] = g / a; out.data[o + 2] = b / a; out.data[o + 3] = 255; }
      }
    }
    return out;
  }

  // Chaque canal arrondi à `levels` niveaux (8 = la palette 9 bits de la Mega Drive).
  function posterize(src, levels = 8) {
    const out = { width: src.width, height: src.height, data: new Uint8ClampedArray(src.data) }, k = levels - 1;
    for (let i = 0; i < out.data.length; i += 4) for (let c = 0; c < 3; c++) out.data[i + c] = Math.round(Math.round(out.data[i + c] / 255 * k) * 255 / k);
    return out;
  }

  // Contour d'un pixel : tout pixel transparent voisin (4-connexe) d'un pixel opaque prend `color`.
  // L'image grandit d'un pixel de chaque côté.
  function outline(src, color) {
    const W = src.width + 2, H = src.height + 2, out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    const opaque = (x, y) => x >= 0 && y >= 0 && x < src.width && y < src.height && src.data[(y * src.width + x) * 4 + 3] > 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, sx = x - 1, sy = y - 1;
        if (opaque(sx, sy)) { const i = (sy * src.width + sx) * 4; for (let c = 0; c < 4; c++) out.data[o + c] = src.data[i + c]; continue; }
        if (opaque(sx - 1, sy) || opaque(sx + 1, sy) || opaque(sx, sy - 1) || opaque(sx, sy + 1)) { out.data[o] = rgb[0]; out.data[o + 1] = rgb[1]; out.data[o + 2] = rgb[2]; out.data[o + 3] = 255; }
      }
    }
    return out;
  }

  FP.px = { SCALE, toArt, rect, line, disc, ring, dither, downscale, posterize, outline };
})();
