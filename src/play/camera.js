// play/camera.js — caméra défilante verticale, zoom de cadrage et zoom de frôlement.
// Lit     : state.mode, state.plant.{tip,seed}, state.query.danger, state.world.{height,viewH}, FP.config.camera, FP.input.focalX (au calcul du cadrage).
// Écrit   : state.camera.{y,manual,near,zoom,shake}.
// Expose  : FP.camera.update(state, dt), FP.camera.maxY(world), FP.camera.scrollBy(state, dy), FP.camera.totalZoom(state),
//           FP.camera.zoomFrame(state) → { z, fx, fy } | null (zoom et point focal en pixels d'écran, appliqués par render/frame.js),
//           FP.camera.toScreen(state, x, y) / FP.camera.toWorld(state, sx, sy) (monde ↔ écran par ce cadrage, sans la secousse ; purs).
// Porté de la v3.43.16 (updateScrollCamera, updateCamera, viewScaleBase en cadrage B).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp, lerp } = FP.math;

  const maxY = (world) => Math.max(0, world.height - world.viewH);

  // Le cadrage ×1,18 s'applique partout sauf au menu et sur l'écran de fin (comme le draw() de la v3) :
  // pas de saut de zoom au moment d'une rupture.
  const FRAMED = { playing: true, ready: true, bloom: true, dying: true, shop: true };
  function totalZoom(state) {
    return FRAMED[state.mode] ? state.camera.zoom * FP.config.camera.framing : 1;
  }

  // Zoom autour de la pointe (ou de la graine), son point focal borné dans la partie centrale de l'écran, comme en v3 ; null sans zoom.
  function zoomFrame(state) {
    const z = totalZoom(state), focus = state.plant.tip || state.plant.seed;
    if (z <= FP.config.camera.zoomEpsilon || !focus) return null;
    const f = FP.config.camera.focalY, H = state.world.viewH;
    return { z, fx: FP.input.focalX(state), fy: clamp(focus.y - state.camera.y, H * f.min, H * f.max) };
  }

  function toScreen(state, x, y) {
    const f = zoomFrame(state), sy = y - state.camera.y;
    return f ? { x: f.fx + (x - f.fx) * f.z, y: f.fy + (sy - f.fy) * f.z } : { x, y: sy };
  }

  function toWorld(state, sx, sy) {
    const f = zoomFrame(state);
    return f ? { x: f.fx + (sx - f.fx) / f.z, y: state.camera.y + f.fy + (sy - f.fy) / f.z } : { x: sx, y: state.camera.y + sy };
  }

  // Frôler un obstacle rapproche brièvement la caméra : la tension se lit à l'image.
  function updateZoom(state, dt) {
    const cam = state.camera, cfg = FP.config.camera;
    const target = state.mode === 'playing' ? state.query.danger : 0;
    cam.near = lerp(cam.near, target, clamp(dt * (target > cam.near ? cfg.nearIn : cfg.nearOut), 0, 1));
    const zoomTarget = 1 + Math.pow(clamp(cam.near, 0, 1), cfg.zoomCurve) * cfg.grazeZoom;
    cam.zoom = lerp(cam.zoom, zoomTarget, clamp(dt * (zoomTarget > cam.zoom ? cfg.zoomIn : cfg.zoomOut), 0, 1));
  }

  function update(state, dt) {
    const cam = state.camera, world = state.world, cfg = FP.config.camera;
    cam.shake = Math.max(0, cam.shake - dt);
    updateZoom(state, dt);
    if (cam.manual) return;
    const tip = state.plant.tip;
    // Posée au fond, puis suit la pointe quand elle dépasse le milieu de l'écran.
    const target = tip && state.mode !== 'ready'
      ? clamp(tip.y - world.viewH * cfg.followRatio, 0, maxY(world))
      : maxY(world);
    if (!Number.isFinite(target)) return;
    const rate = target < cam.y ? cfg.rateDown : cfg.rateUp;
    cam.y = lerp(cam.y, target, clamp(dt * rate, 0, 1));
  }

  // Caméra libre (debug) : désactive le suivi automatique.
  function scrollBy(state, dy) {
    state.camera.manual = true;
    state.camera.y = clamp(state.camera.y + dy, 0, maxY(state.world));
  }

  FP.camera = { update, maxY, scrollBy, totalZoom, zoomFrame, toScreen, toWorld };
})();
