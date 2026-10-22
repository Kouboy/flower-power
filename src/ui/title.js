// ui/title.js — écran titre arcade : le logo, « TOUCHER POUR POUSSER » qui clignote, et la ligne de pied d'ÉCOSOFT™.
// Lit     : state.time, FP.config.text.{ready,footer}, FP.logo, FP.font, FP.view.ui.
// Écrit   : rien (la toile d'interface uniquement).
// Expose  : FP.title.draw(g, state).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FOOTER = '#c9a87a';

  function draw(g, state) {
    const { w, h } = FP.view.ui, t = state.time, text = FP.config.text, L = FP.logo.layout();
    FP.logo.draw(g, Math.round(w / 2 - L.width / 2), Math.round(h * .3), t);
    if (Math.floor(t * 1.8) % 2 === 0) FP.font.draw(g, text.ready, w / 2, h - 46, { align: 'center' });
    FP.font.draw(g, text.footer[0], w / 2, h - 20, { align: 'center', color: FOOTER });
    FP.font.draw(g, text.footer[1], w / 2, h - 11, { align: 'center', color: FOOTER });
  }

  FP.title = { draw };
})();
