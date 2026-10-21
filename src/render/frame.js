// render/frame.js — dessin d'une frame. Lecture seule de l'état.
// Lit     : FP.config.camera.{zoomEpsilon,focalY}, state.world, state.camera.y, state.plant.{tip,seed}, FP.view, FP.camera.totalZoom, FP.input.focalX,
//           state.flow.fade, FP.soil, FP.hazardsRender, FP.obstacles, FP.powerupsRender, FP.plantRender, FP.flowersRender,
//           FP.effects, FP.particles, FP.hud ; state.camera.shake (secousse) ; FP.perf, FP.flydebug (outils de réglage).
// Écrit   : rien lui-même (le canvas) ; effects et particles, qu'il appelle, tiennent state.fx.
// Expose  : FP.render.frame(state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Zoom centré sur la pointe (bornée dans la partie centrale de l'écran), comme en v3.
  function applyZoom(ctx, state, W, viewH) {
    const z = FP.camera.totalZoom(state);
    if (z <= FP.config.camera.zoomEpsilon) return;
    const focus = state.plant.tip || state.plant.seed;
    const fx = FP.input.focalX(state);
    const f = FP.config.camera.focalY;
    const fy = clamp(focus.y - state.camera.y, viewH * f.min, viewH * f.max);
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
    // ?perf=1 : tranches sol / dangers / plante (comme la v3).
    const perf = FP.perf;
    let t = perf && performance.now();
    // Ordre v3 : sol, nappes, limaces, obstacles, plante, anneau d'exposition, pellicule toxique.
    FP.soil.draw(ctx, world, camY, W, viewH);
    if (perf) t = perf.mark('soil', t);
    FP.hazardsRender.drawBase(ctx, state);
    FP.hazardsRender.drawLeaks(ctx, state);
    FP.obstacles.draw(ctx, world, camY, viewH);
    if (perf) t = perf.mark('hazards', t);
    FP.powerupsRender.drawBonuses(ctx, state);
    if (perf) t = perf.mark('bonuses', t);
    FP.plantRender.draw(ctx, state);
    FP.flowersRender.draw(ctx, state);
    FP.hazardsRender.drawExposure(ctx, state);   // v3 : dans drawPlant, donc sous la pellicule toxique
    FP.hazardsRender.drawOverlay(ctx, state);
    if (perf) perf.mark('plant', t);
    FP.effects.draw(ctx, state);
    FP.particles.draw(ctx, state);
    ctx.restore();

    FP.plantRender.drawFinger(ctx, state);
    FP.hud.draw(ctx, state);
    if (FP.flydebug) FP.flydebug.draw(ctx, state);
    if (perf) perf.draw(ctx, state);
    // Fondu entre deux niveaux, par-dessus tout (v3 : drawFade).
    if (state.flow.fade > 0) {
      ctx.save(); ctx.globalAlpha = Math.min(1, state.flow.fade); ctx.fillStyle = '#020201';
      ctx.fillRect(0, 0, W, FP.view.H); ctx.restore();
    }
  }

  FP.render = { frame };
})();
