// ui/menu.js — écran titre et démarrage d'une partie.
// Lit     : l'élément #menu, FP.view (via createRun), FP.level.startRun.
// Écrit   : FP.state.current (nouveau run), state.mode ; à chaque redimensionnement, la taille de vue du run.
// Expose  : rien.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const menu = document.getElementById('menu');

  function startRun() {
    const state = FP.state.createRun();
    FP.level.startRun(state);
    state.mode = 'playing';
    FP.state.current = state;
    menu.style.display = 'none';
  }

  window.addEventListener('pointerdown', (e) => {
    if (FP.state.current && FP.state.current.mode !== 'menu') return;
    e.preventDefault();
    startRun();
  });

  // Redimensionnement (après render/view.js, chargé avant) : au menu on repart d'un run neuf à la bonne taille,
  // en partie on garde le niveau et on adapte seulement la hauteur visible.
  window.addEventListener('resize', () => {
    const s = FP.state.current;
    if (!s || s.mode === 'menu') FP.state.current = FP.state.createRun();
    else FP.state.applyView(s, FP.view);
  }, { passive: true });

  FP.state.current = FP.state.createRun();
})();
