// render/frame.js — dessin d'une frame. Lecture seule de l'état.
// Lit     : state.world, state.camera.y, state.plant.{tip,seed}, FP.view, FP.camera.totalZoom, FP.input.focalX,
//           FP.soil, FP.obstacles, FP.plantRender, FP.hud.
// Écrit   : rien (le canvas uniquement).
// Expose  : FP.render.frame(state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Zoom centré sur la pointe (bornée dans la partie centrale de l'écran), comme en v3.
  function applyZoom(ctx, state, W, viewH) {
    const z = FP.camera.totalZoom(state);
    if (z <= 1.002) return;
    const focus = state.plant.tip || state.plant.seed;
    const fx = FP.input.focalX(state);
    const fy = clamp(focus.y - state.camera.y, viewH * .20, viewH * .78);
    ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-fx, -fy);
  }

  function frame(state) {
    const { ctx, W } = FP.view;
    const world = state.world, camY = state.camera.y, viewH = world.viewH;

    ctx.save();
    applyZoom(ctx, state, W, viewH);
    ctx.translate(0, -camY);
    ctx.beginPath(); ctx.rect(-24, camY - 48, W + 48, viewH + 96); ctx.clip();
    FP.soil.draw(ctx, world, camY, W, viewH);
    FP.obstacles.draw(ctx, world, camY, viewH);
    FP.plantRender.draw(ctx, state);
    ctx.restore();

    FP.plantRender.drawFinger(ctx, state);
    FP.hud.draw(ctx, state);
  }

  FP.render = { frame };
})();
