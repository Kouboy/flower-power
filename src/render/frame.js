// render/frame.js — dessin d'une frame en deux couches. Lecture seule de l'état.
// 1. Le monde est dessiné dans la toile monde à mi-résolution (FP.view.art), en pixels d'art.
// 2. Elle est agrandie sans lissage vers l'écran, avec secousse et zoom.
// 3. La couche nette (doigt, HUD, debug, fondu) est dessinée par-dessus à pleine résolution.
// Lit     : FP.config.camera.{zoomEpsilon,focalY}, state.world, state.camera.y, state.plant.{tip,seed}, FP.view, FP.camera.totalZoom, FP.input.focalX,
//           FP.view.art, FP.px.SCALE, state.flow.fade, FP.sky, FP.soil, FP.hazardsRender, FP.obstacles, FP.powerupsRender, FP.plantRender, FP.flowersRender,
//           FP.effects, FP.particles, FP.drillFx, FP.hud ; state.camera.shake (secousse) ; FP.perf, FP.flydebug (outils de réglage).
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

  // Couche 1 : le monde, en pixels d'art. Ordre v3 : ciel, sol, nappes, limaces, obstacles, bonus, plante, fleurs,
  // anneau d'exposition, pellicule toxique, effets, particules.
  function drawWorld(g, state, perf) {
    const world = state.world, camY = state.camera.y;
    let t = perf && performance.now();
    FP.sky.draw(g, state);
    FP.soil.draw(g, state);
    if (perf) t = perf.mark('soil', t);
    FP.hazardsRender.drawBase(g, state);
    FP.hazardsRender.drawLeaks(g, state);
    FP.obstacles.draw(g, world, camY);
    if (perf) t = perf.mark('hazards', t);
    FP.powerupsRender.drawBonuses(g, state);
    if (perf) t = perf.mark('bonuses', t);
    FP.plantRender.draw(g, state);
    FP.flowersRender.draw(g, state);
    FP.hazardsRender.drawExposure(g, state);   // v3 : dans drawPlant, donc sous la pellicule toxique
    FP.hazardsRender.drawOverlay(g, state);
    if (perf) perf.mark('plant', t);
    FP.effects.draw(g, state);
    FP.particles.draw(g, state);
    FP.drillFx.draw(g, state);   // fissures, onde, anneau, étincelles de la foreuse
  }

  function frame(state) {
    const { ctx, W, art } = FP.view;
    const viewH = state.world.viewH;
    // ?perf=1 : tranches sol / dangers / bonus / plante (comme la v3).
    const perf = FP.perf;

    // Hors des moments de jeu (titre, prêt, fin, fondus), on prépare les sprites des obstacles, une famille par frame.
    if (state.mode !== 'playing' && state.mode !== 'dying' || state.flow.fade > 0) FP.obstacles.prewarm();
    // Une erreur dans le monde ne doit pas figer l'image : on agrandit et on dessine le HUD quand même, puis on la relance
    // (la boucle la signale une fois).
    let worldError = null;
    try { drawWorld(art.ctx, state, perf); } catch (e) { worldError = e; }

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
      // Chiffres « +Ɇ » : nets, mais dans le repère du monde (même zoom, même caméra).
      ctx.translate(0, -state.camera.y);
      FP.effects.drawLabels(ctx, state);
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
    if (worldError) throw worldError;
  }

  FP.render = { frame };
})();
