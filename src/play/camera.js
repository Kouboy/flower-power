// play/camera.js — caméra défilante verticale.
// Lit     : state.plant.tip, state.world.{height,viewH}, FP.config.camera.
// Écrit   : state.camera.{y,manual}.
// Expose  : FP.camera.update(state, dt), FP.camera.maxY(world), FP.camera.scrollBy(state, dy).
// La caméra reste posée au fond, puis suit la pointe quand elle dépasse le milieu de l'écran.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp, lerp } = FP.math;

  const maxY = (world) => Math.max(0, world.height - world.viewH);

  function update(state, dt) {
    const cam = state.camera, world = state.world, cfg = FP.config.camera;
    if (cam.manual) return;
    const tip = state.plant.tip;
    const target = tip ? clamp(tip.y - world.viewH * cfg.followRatio, 0, maxY(world)) : maxY(world);
    const rate = target < cam.y ? cfg.rateDown : cfg.rateUp;
    cam.y = lerp(cam.y, target, clamp(dt * rate, 0, 1));
  }

  // Caméra libre (debug) : désactive le suivi automatique.
  function scrollBy(state, dy) {
    state.camera.manual = true;
    state.camera.y = clamp(state.camera.y + dy, 0, maxY(state.world));
  }

  FP.camera = { update, maxY, scrollBy };
})();
