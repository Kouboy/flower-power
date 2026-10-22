// ui/ui.js — aiguillage de l'interface : efface la toile d'interface et dessine l'écran du mode courant.
// Lit     : state.mode, FP.view.ui, FP.hud, FP.shout.
// Écrit   : rien (la toile d'interface uniquement).
// Expose  : FP.ui.draw(g, state) (repère d'interface : pixels d'art, sans caméra ni zoom).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function draw(g, state) {
    g.clearRect(0, 0, FP.view.ui.w, FP.view.ui.h);
    const m = state.mode;
    if (m === 'playing' || m === 'dying' || m === 'bloom' || m === 'ready') { FP.hud.draw(g, state); FP.shout.draw(g, state); }
  }

  FP.ui = { draw };
})();
