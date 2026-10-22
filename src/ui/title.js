// ui/title.js — écran titre arcade. Au lancement, il est figé sous « PRESS TO START » (écran d'accueil) : le premier appui
// débloque le son, passe en plein écran sur écran tactile et réveille le titre (logo animé, « TOUCHER POUR POUSSER »).
// Lit     : state.mode, state.time, FP.config.text.{ready,pressStart,footer}, FP.logo, FP.font, FP.view.ui.
// Écrit   : wake() — appelé par ui/menu.js au premier appui — passe state.mode de 'splash' à 'menu' et note state.fx.ui.awakeAt.
// Expose  : FP.title.draw(g, state), FP.title.clock(state), FP.title.wake(state), FP.title.wantsFullscreen(pointerType) (purs, testés).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const FOOTER = '#c9a87a';

  // Temps de l'animation du titre : arrêté sur l'écran d'accueil, puis compté depuis le réveil.
  function clock(state) {
    if (state.mode === 'splash') return 0;
    const ui = state.fx.ui;
    return Math.max(0, state.time - ((ui && ui.awakeAt) || 0));
  }

  function wake(state) {
    const ui = state.fx.ui || (state.fx.ui = {});
    state.mode = 'menu';
    ui.awakeAt = state.time;
  }

  // Plein écran seulement au doigt ou au stylet : un clic de souris ou une touche laissent la fenêtre telle quelle.
  const wantsFullscreen = (pointerType) => pointerType === 'touch' || pointerType === 'pen';

  function draw(g, state) {
    const { w, h } = FP.view.ui, t = state.time, text = FP.config.text, L = FP.logo.layout(), splash = state.mode === 'splash';
    // ×2 quand il tient dans 90 % de la largeur (écran d'ordinateur) ; sur téléphone, ×1 est déjà le maximum.
    const s = L.width * 2 <= w * .9 ? 2 : 1;
    g.save(); g.translate(Math.round(w / 2 - L.width * s / 2), Math.round(h * .3 - (s - 1) * L.height / 2)); g.scale(s, s);
    FP.logo.draw(g, 0, 0, clock(state));
    g.restore();
    if (Math.floor(t * 1.8) % 2 === 0) FP.font.draw(g, splash ? text.pressStart : text.ready, w / 2, h - 46, { align: 'center' });
    FP.font.draw(g, text.footer[0], w / 2, h - 20, { align: 'center', color: FOOTER });
    FP.font.draw(g, text.footer[1], w / 2, h - 11, { align: 'center', color: FOOTER });
  }

  FP.title = { draw, clock, wake, wantsFullscreen };
})();
