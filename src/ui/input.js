// ui/input.js — pointeur (souris / doigt) → instantané d'entrée par frame.
// Lit     : événements pointeur du canvas, FP.view (taille affichée), FP.camera.totalZoom, state.plant.tip.
// Écrit   : state.input = { x (monde), y (écran, 0..viewH), down, active, pressed (front montant de cette frame) }.
// Expose  : FP.input.update(state), FP.input.toWorldX(screenX, zoom, focalX), FP.input.focalX(state),
//           FP.input._inject(partial) — point d'entrée réservé aux tests (simule un événement).
// Porté de la v3.43.16 (setPointer).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Tampon rempli par les événements, recopié une fois par frame dans l'état.
  const buffer = { x: 0, y: 0, down: false, active: false, pressed: false };

  function inject(partial) {
    if (partial.down && !buffer.down) buffer.pressed = true;
    Object.assign(buffer, partial);
    buffer.active = true;
  }

  // Le zoom est centré sur un point focal : on ramène l'abscisse écran dans le monde.
  function toWorldX(screenX, zoom, focalX) {
    return zoom > 1.002 ? focalX + (screenX - focalX) / zoom : screenX;
  }

  function focalX(state) {
    const W = state.world.width, tip = state.plant.tip;
    return clamp(tip ? tip.x : W / 2, W * .22, W * .78);
  }

  function update(state) {
    const i = state.input;
    i.x = toWorldX(buffer.x, FP.camera.totalZoom(state), focalX(state));
    i.y = buffer.y;
    i.down = buffer.down;
    i.active = buffer.active;
    i.pressed = buffer.pressed;
    buffer.pressed = false;
  }

  if (FP.view && FP.view.canvas) {
    const canvas = FP.view.canvas;
    const fromEvent = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) * (FP.view.W / rect.width),
        y: (e.clientY - rect.top) * (FP.view.H / rect.height)
      };
    };
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); inject({ ...fromEvent(e), down: true }); });
    canvas.addEventListener('pointermove', (e) => inject(fromEvent(e)));
    // Relâcher hors du canvas ou hors de la fenêtre relâche aussi le contrôle.
    window.addEventListener('pointerup', () => { buffer.down = false; });
    window.addEventListener('pointercancel', () => { buffer.down = false; });
    window.addEventListener('blur', () => { buffer.down = false; });
  }

  FP.input = { update, toWorldX, focalX, _inject: inject };
})();
