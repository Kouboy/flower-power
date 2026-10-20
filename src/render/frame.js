// render/frame.js — dessin d'une frame. Lecture seule de l'état.
// Lit     : state.world, state.camera.y, FP.view, FP.soil, FP.obstacles.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.render.frame(state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function frame(state) {
    const { ctx, W } = FP.view;
    const world = state.world, camY = state.camera.y, viewH = world.viewH;

    ctx.save();
    ctx.translate(0, -camY);
    ctx.beginPath(); ctx.rect(-24, camY - 48, W + 48, viewH + 96); ctx.clip();
    FP.soil.draw(ctx, world, camY, viewH);
    FP.obstacles.draw(ctx, world, camY, viewH);
    ctx.restore();
  }

  FP.render = { frame };
})();
