// render/px.js — boîte à outils pixel : tout le dessin « converti » passe par ces primitives, sur la toile monde.
// Lit     : rien (fonctions pures sur le contexte reçu).
// Écrit   : uniquement les pixels du contexte passé en argument, par fillRect (jamais de chemin lissé).
// Expose  : FP.px.{SCALE, toArt, rect, line, disc, ring, dither}.
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

  // Bresenham ; chaque point est un carré de `thick` pixels centré sur la ligne.
  function line(ctx, x0, y0, x1, y1, color, thick = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, o = (thick - 1) >> 1;
    let err = dx + dy;
    ctx.fillStyle = color;
    for (;;) {
      ctx.fillRect(x0 - o, y0 - o, thick, thick);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
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

  FP.px = { SCALE, toArt, rect, line, disc, ring, dither };
})();
