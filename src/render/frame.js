// render/frame.js — dessin d'une frame en deux couches. Lecture seule de l'état.
// 1. Le monde est dessiné dans la toile monde à mi-résolution (FP.view.art), en pixels d'art.
// 2. Elle est agrandie sans lissage vers l'écran, avec secousse et zoom.
// 3. La couche nette (doigt, HUD, debug, fondu) est dessinée par-dessus à pleine résolution.
// Lit     : FP.config.camera.{zoomEpsilon,focalY}, state.world, state.camera.y, state.plant.{tip,seed}, FP.view, FP.camera.totalZoom, FP.input.focalX,
//           FP.view.art, FP.px.SCALE, state.flow.fade, FP.sky, FP.soil, FP.hazardsRender, FP.obstacles, FP.powerupsRender, FP.plantRender, FP.flowersRender,
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

  // Module pas encore converti au pixel : il dessine en coordonnées monde, réduites de moitié dans la toile monde
  // (rendu un peu flou mais juste). Supprimé quand tous les modules seront convertis.
  function legacy(actx, camY, fn) {
    actx.save();
    actx.setTransform(1 / FP.px.SCALE, 0, 0, 1 / FP.px.SCALE, 0, -camY / FP.px.SCALE);
    try { fn(actx); } finally { actx.restore(); }
  }

  // Couche 1 : le monde, en pixels d'art. Ordre v3 : sol, nappes, limaces, obstacles, plante, anneau d'exposition, pellicule toxique.
  function drawWorld(actx, state, perf) {
    const world = state.world, camY = state.camera.y, viewH = world.viewH, W = FP.view.W;
    let t = perf && performance.now();
    FP.sky.draw(actx, state);
    FP.soil.draw(actx, state);
    if (perf) t = perf.mark('soil', t);
    legacy(actx, camY, (c) => { FP.hazardsRender.drawBase(c, state); FP.hazardsRender.drawLeaks(c, state); FP.obstacles.draw(c, world, camY, viewH); });
    if (perf) t = perf.mark('hazards', t);
    legacy(actx, camY, (c) => FP.powerupsRender.drawBonuses(c, state));
    if (perf) t = perf.mark('bonuses', t);
    legacy(actx, camY, (c) => {
      FP.plantRender.draw(c, state);
      FP.flowersRender.draw(c, state);
      FP.hazardsRender.drawExposure(c, state);   // v3 : dans drawPlant, donc sous la pellicule toxique
      FP.hazardsRender.drawOverlay(c, state);
    });
    if (perf) perf.mark('plant', t);
    legacy(actx, camY, (c) => { FP.effects.draw(c, state); FP.particles.draw(c, state); });
  }

  function frame(state) {
    const { ctx, W, art } = FP.view;
    const viewH = state.world.viewH;
    // ?perf=1 : tranches sol / dangers / bonus / plante (comme la v3).
    const perf = FP.perf;

    drawWorld(art.ctx, state, perf);

    // Couche 2 : agrandissement sans lissage. Fond sombre dessous : une secousse ne montre jamais de bord vide.
    ctx.fillStyle = '#020201'; ctx.fillRect(0, 0, W, FP.view.H);
    ctx.save();
    try {
      // Secousse (v3 : draw) : décalage aléatoire proportionnel à camera.shake, avant le zoom.
      const shake = state.camera.shake;
      if (shake > 0) ctx.translate((Math.random() * 6 - 3) * shake * 7, (Math.random() * 6 - 3) * shake * 7);
      applyZoom(ctx, state, W, viewH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art.canvas, 0, 0, art.w * FP.px.SCALE, art.h * FP.px.SCALE);
    } finally {
      ctx.restore();
    }

    // Couche 3 : nette, à pleine résolution.

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
