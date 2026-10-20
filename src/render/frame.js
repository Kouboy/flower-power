// render/frame.js — dessin d'une frame. Lecture seule de l'état.
// Lit     : state.mode, state.world.surfaceY, FP.view, FP.config.palette, FP.config.version.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.render.frame(state).
// Étape 0 : fond provisoire (ciel, pelouse, terre en bandes). Le vrai sol en cache arrive à l'étape 1.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const LAWN_THICKNESS = 14;  // provisoire, remplacé par le sol de l'étape 1
  const SOIL_COLOR = '#221912';

  function drawBackground(ctx, W, H, surfaceY) {
    const { skies, lawns, soilBands } = FP.config.palette;

    const sky = ctx.createLinearGradient(0, 0, 0, surfaceY);
    skies[0].forEach((c, i, all) => sky.addColorStop(i / (all.length - 1), c));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, surfaceY);

    ctx.fillStyle = SOIL_COLOR;
    ctx.fillRect(0, surfaceY, W, H - surfaceY);
    const soilH = H - surfaceY;
    for (const band of soilBands) {
      ctx.fillStyle = band.c;
      ctx.fillRect(0, surfaceY + band.a * soilH, W, (band.b - band.a) * soilH);
    }

    const lawn = ctx.createLinearGradient(0, surfaceY - 4, 0, surfaceY + LAWN_THICKNESS);
    lawns[0].forEach((c, i, all) => lawn.addColorStop(i / (all.length - 1), c));
    ctx.fillStyle = lawn;
    ctx.fillRect(0, surfaceY - 4, W, LAWN_THICKNESS + 4);
  }

  function frame(state) {
    const { ctx, W, H } = FP.view;
    drawBackground(ctx, W, H, state.world.surfaceY);

    if (state.mode === 'playing') {
      ctx.fillStyle = '#f7e9c7';
      ctx.font = '800 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('v' + FP.config.version + ' — squelette', W / 2, H / 2);
    }
  }

  FP.render = { frame };
})();
