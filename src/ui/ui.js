// ui/ui.js — aiguillage de l'interface : efface la toile d'interface et dessine l'écran du mode courant.
// Lit     : state.mode, FP.view.ui.
// Écrit   : rien (la toile d'interface uniquement).
// Expose  : FP.ui.draw(g, state) (repère d'interface : pixels d'art, sans caméra ni zoom).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function draw(g, state) {
    g.clearRect(0, 0, FP.view.ui.w, FP.view.ui.h);
  }

  FP.ui = { draw };
})();
