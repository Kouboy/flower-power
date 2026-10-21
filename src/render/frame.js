// render/frame.js — dessin d'une frame. Lecture seule de l'état.
// Lit     : state.world, state.camera.y, state.plant.{tip,seed}, FP.view, FP.camera.totalZoom, FP.input.focalX,
//           state.flow.fade, FP.soil, FP.hazardsRender, FP.obstacles, FP.powerupsRender, FP.plantRender, FP.flowersRender,
//           FP.effects, FP.particles, FP.hud ; state.camera.shake (secousse).
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
    // Secousse (v3 : draw) : décalage aléatoire proportionnel à camera.shake, avant le zoom.
    const shake = state.camera.shake;
    if (shake > 0) ctx.translate((Math.random() * 6 - 3) * shake * 7, (Math.random() * 6 - 3) * shake * 7);
    applyZoom(ctx, state, W, viewH);
    ctx.translate(0, -camY);
    ctx.beginPath(); ctx.rect(-24, camY - 48, W + 48, viewH + 96); ctx.clip();
    // Ordre v3 : sol, nappes, limaces, obstacles, plante, pellicule toxique, anneau d'exposition.
    FP.soil.draw(ctx, world, camY, W, viewH);
    FP.hazardsRender.drawBase(ctx, state);
    FP.hazardsRender.drawLeaks(ctx, state);
    FP.obstacles.draw(ctx, world, camY, viewH);
    FP.powerupsRender.drawBonuses(ctx, state);
    FP.plantRender.draw(ctx, state);
    FP.flowersRender.draw(ctx, state);
    FP.hazardsRender.drawOverlay(ctx, state);
    FP.hazardsRender.drawExposure(ctx, state);
    FP.effects.draw(ctx, state);
    FP.particles.draw(ctx, state);
    ctx.restore();

    FP.plantRender.drawFinger(ctx, state);
    FP.hud.draw(ctx, state);
    // Fondu entre deux niveaux, par-dessus tout (v3 : drawFade).
    if (state.flow.fade > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, state.flow.fade); ctx.fillStyle = '#020201';
      ctx.fillRect(0, 0, W, FP.view.H); ctx.restore();
    }
  }

  FP.render = { frame };
})();
