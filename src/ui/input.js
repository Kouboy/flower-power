// ui/input.js — pointeur (souris / doigt) → instantané d'entrée par frame.
// Lit     : événements pointeur du canvas, FP.view (taille affichée), FP.camera.totalZoom, FP.config.camera.{zoomEpsilon,focalX}, state.plant.{tip,seed}, state.world.width.
// Écrit   : state.input = { x (monde), screenX, y (écran, 0..viewH), down, active, pressed (front montant de cette frame) }.
// Expose  : FP.input.update(state), FP.input.toWorldX(screenX, zoom, focalX), FP.input.focalX(state), FP.input.press(),
//           FP.input._inject(partial), FP.input._reset() — réservés aux tests (simuler un événement, repartir d'un tampon vide).
// Porté de la v3.43.16 (setPointer).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const { clamp } = FP.math;

  // Tampon rempli par les événements, recopié une fois par frame dans l'état.
  const buffer = { x: 0, y: 0, down: false, active: false, pressed: false };

  // Chaque appui compte, même si un autre pointeur est déjà enfoncé ; un bouton resté enfoncé n'émet rien.
  function inject(partial) {
    if (partial.down) buffer.pressed = true;
    Object.assign(buffer, partial);
    buffer.active = true;
  }

  function reset() { Object.assign(buffer, { x: 0, y: 0, down: false, active: false, pressed: false }); }

  // Touche clavier : un appui ponctuel (lance la pousse en « prêt »), sans prendre le contrôle de la direction.
  function press() { buffer.pressed = true; }

  // Le zoom est centré sur un point focal : on ramène l'abscisse écran dans le monde.
  function toWorldX(screenX, zoom, focalX) {
    return zoom > FP.config.camera.zoomEpsilon ? focalX + (screenX - focalX) / zoom : screenX;
  }

  // Point focal du zoom : la pointe, ou la graine tant que la pousse n'est pas lancée.
  function focalX(state) {
    const W = state.world.width, p = state.plant.tip || state.plant.seed, f = FP.config.camera.focalX;
    return clamp(p.x, W * f.min, W * f.max);
  }

  function update(state) {
    const i = state.input;
    i.x = toWorldX(buffer.x, FP.camera.totalZoom(state), focalX(state));
    i.screenX = buffer.x;
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
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;                       // clic droit / molette : ignorés
      e.preventDefault();
      // Capture : on continue de suivre la souris même hors de la bande de jeu (comme en v3).
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointeur déjà relâché */ } }
      inject({ ...fromEvent(e), down: true });
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointermove', (e) => inject(fromEvent(e)));
    // Relâcher hors du canvas ou hors de la fenêtre relâche aussi le contrôle.
    window.addEventListener('pointerup', () => { buffer.down = false; });
    window.addEventListener('pointercancel', () => { buffer.down = false; });
    window.addEventListener('blur', () => { buffer.down = false; });
  }

  FP.input = { update, toWorldX, focalX, press, _inject: inject, _reset: reset };
})();
