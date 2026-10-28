// render/sky.js — ciel en pixels : bandes tramées de la nuance du niveau, puis le décor du milieu (astre, météo, horizon).
// Lit     : state.world.{width,surfaceY,skyVariant,milieu}, state.camera.y, state.time, FP.view.{W,art}, FP.palette.milieux,
//           FP.decor (render/decor-*.js), FP.soil.surfaceTop.
// Écrit   : rien dans l'état (deux caches de la partie fixe, créés à la première utilisation).
// Expose  : FP.sky.draw(actx, state) — repère d'art, la caméra est appliquée ici.
// Ordre (v4.11.0) : fond (bandes + astre du décor), ciel animé du décor, horizon du décor, animations de l'horizon.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  let back = null, front = null, cacheKey = '';

  // Ciel du milieu (v4.9.0) : la nuance tirée, ramenée au nombre de nuances du milieu.
  const skyOf = (world) => { const s = FP.palette.milieux[world.milieu].sky; return s[world.skyVariant % s.length]; };

  // Partie fixe. h = hauteur du ciel en pixels d'art (jusqu'au haut de la pelouse).
  function build(w, h, pal, decor) {
    const { px } = FP;
    back = back || document.createElement('canvas'); front = front || document.createElement('canvas');
    back.width = front.width = w; back.height = front.height = h;   // redimensionner vide les toiles
    const g = back.getContext('2d');
    // Bandes du zénith à l'horizon, raccordées par 4 rangées tramées.
    const band = h / pal.length;
    for (let i = 0; i < pal.length; i++) {
      const y0 = Math.round(i * band), y1 = Math.round((i + 1) * band);
      px.rect(g, 0, y0, w, y1 - y0, pal[i]);
      if (i > 0) for (let k = 0; k < 4; k++) px.dither(g, 0, y0 - 2 + k, w, 1, pal[i - 1], pal[i], 4 + k * 3);
    }
    decor.skyStatic(g, w, h, pal);
    decor.horizon(front.getContext('2d'), w, h);
  }

  function draw(actx, state) {
    const { px } = FP, world = state.world;
    const w = Math.ceil(Math.max(world.width, FP.view.W) / px.SCALE);
    const h = Math.max(1, px.toArt(FP.soil.surfaceTop(world)));
    const oy = px.toArt(state.camera.y);
    if (oy >= h) return;                                   // ciel hors écran
    const decor = FP.decor[world.milieu], pal = skyOf(world), t = state.time;
    const key = w + '|' + h + '|' + world.milieu + '|' + world.skyVariant;
    if (key !== cacheKey) { build(w, h, pal, decor); cacheKey = key; }
    actx.drawImage(back, 0, -oy);
    decor.back(actx, w, h, oy, t, pal);
    actx.drawImage(front, 0, -oy);
    decor.front(actx, w, h, oy, t);
  }

  FP.sky = { draw };
})();
