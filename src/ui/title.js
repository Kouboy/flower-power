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
    // ×2 quand il tient dans 90 % de la largeur (écran d'ordinateur) ; sur téléphone, ×1 est déjà le maximum.
    const s = L.width * 2 <= w * .9 ? 2 : 1;
    g.save(); g.translate(Math.round(w / 2 - L.width * s / 2), Math.round(h * .3 - (s - 1) * L.height / 2)); g.scale(s, s);
    FP.logo.draw(g, 0, 0, t);
    g.restore();
    if (Math.floor(t * 1.8) % 2 === 0) FP.font.draw(g, text.ready, w / 2, h - 46, { align: 'center' });
    FP.font.draw(g, text.footer[0], w / 2, h - 20, { align: 'center', color: FOOTER });
    FP.font.draw(g, text.footer[1], w / 2, h - 11, { align: 'center', color: FOOTER });
  }

  FP.title = { draw };
})();
