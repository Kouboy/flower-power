// render/sky.js — ciel de crépuscule pollué en pixels : bandes tramées, soleil voilé, usines, smog qui dérive.
// Lit     : state.world.{width,surfaceY,skyVariant}, state.camera.y, state.time, FP.view.{W,art}, FP.palette.sky, FP.soil.surfaceTop.
// Écrit   : rien dans l'état (cache de la partie fixe, créé à la première utilisation).
// Expose  : FP.sky.draw(actx, state) — repère d'art, la caméra est appliquée ici.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  let cache = null, cacheKey = '';
  const SILHOUETTE = '#24122e', SILHOUETTE_LIGHT = '#341a3e';

  // Partie fixe : bandes, soleil, usines. h = hauteur du ciel en pixels d'art (jusqu'au haut de la pelouse).
  function build(w, h, variant) {
    const { px, palette } = FP;
    const pal = palette.sky[variant % palette.sky.length];
    cache = cache || document.createElement('canvas');
    cache.width = w; cache.height = h;
    const g = cache.getContext('2d');
    // Bandes du zénith à l'horizon, raccordées par 4 rangées tramées.
    const band = h / pal.length;
    for (let i = 0; i < pal.length; i++) {
      const y0 = Math.round(i * band), y1 = Math.round((i + 1) * band);
      px.rect(g, 0, y0, w, y1 - y0, pal[i]);
      if (i > 0) for (let k = 0; k < 4; k++) px.dither(g, 0, y0 - 2 + k, w, 1, pal[i - 1], pal[i], 4 + k * 3);
    }
    // Soleil voilé, bas sur l'horizon : halo tramé puis disque pâle.
    const sx = Math.round(w * .62), sy = Math.round(h * .78), r = Math.max(6, Math.round(w * .07));
    for (let k = 3; k >= 1; k--) px.ring(g, sx, sy, r + k * 2, pal[pal.length - 2], 2);
    px.disc(g, sx, sy, r, pal[pal.length - 1]);
    px.rect(g, sx - r, sy + Math.round(r * .3), 2 * r + 1, 1, pal[pal.length - 2]);   // stries de brume sur le soleil
    px.rect(g, sx - r + 2, sy + Math.round(r * .6), 2 * r - 3, 1, pal[pal.length - 2]);
    // Usines et cheminées en silhouette sur l'horizon.
    let x = 0, n = 0;
    while (x < w) {
      const bw = 10 + ((n * 37) % 14), bh = 4 + ((n * 23) % 9);
      px.rect(g, x, h - bh, bw, bh, n % 3 === 0 ? SILHOUETTE_LIGHT : SILHOUETTE);
      if (n % 2 === 0) { const cx = x + 2 + ((n * 7) % Math.max(1, bw - 4)); px.rect(g, cx, h - bh - 10 - (n % 3) * 3, 2, 10 + (n % 3) * 3, SILHOUETTE); }
      x += bw + ((n * 13) % 5); n++;
    }
  }

  // Cheminées dont la fumée monte : mêmes positions que dans build (recalculées, sans état).
  function chimneys(w, h) {
    const out = [];
    let x = 0, n = 0;
    while (x < w) {
      const bw = 10 + ((n * 37) % 14), bh = 4 + ((n * 23) % 9);
      if (n % 2 === 0) out.push({ x: x + 3 + ((n * 7) % Math.max(1, bw - 4)), y: h - bh - 10 - (n % 3) * 3, n });
      x += bw + ((n * 13) % 5); n++;
    }
    return out;
  }

  function draw(actx, state) {
    const { px, palette } = FP, world = state.world;
    const w = Math.ceil(Math.max(world.width, FP.view.W) / px.SCALE);
    const h = Math.max(1, px.toArt(FP.soil.surfaceTop(world)));
    const oy = px.toArt(state.camera.y);
    if (oy >= h) return;                                   // ciel hors écran
    const key = w + '|' + h + '|' + world.skyVariant;
    if (key !== cacheKey) { build(w, h, world.skyVariant); cacheKey = key; }
    actx.drawImage(cache, 0, -oy);

    const pal = palette.sky[world.skyVariant % palette.sky.length], t = state.time;
    // Nuages de smog : grappes de disques plats qui dérivent lentement et reviennent par l'autre bord.
    for (let i = 0; i < 4; i++) {
      const speed = 2 + i * .6, span = w + 60;
      const cx = ((i * 71 + t * speed) % span + span) % span - 30, cy = Math.round(h * (.18 + i * .13)) - oy;
      const col = i % 2 ? pal[3] : pal[4], shade = pal[2];
      for (let k = 0; k < 4; k++) px.disc(actx, cx + k * 7 - 10, cy + ((k * 3) % 4) - (k === 1 || k === 2 ? 2 : 0), 4 + (k % 2) * 2, col);
      px.rect(actx, Math.round(cx) - 14, cy + 4, 30, 1, shade);
    }
    // Fumée des cheminées : bouffées qui montent, grossissent puis s'éteignent (boucle de 3 s).
    for (const c of chimneys(w, h)) {
      for (let k = 0; k < 3; k++) {
        const ph = ((t / 3 + k / 3 + c.n * .17) % 1);
        px.disc(actx, c.x + Math.round(ph * 6), c.y - oy - Math.round(ph * 22), Math.round(1 + ph * 3), ph < .6 ? pal[2] : pal[1]);
      }
    }
  }

  FP.sky = { draw };
})();
