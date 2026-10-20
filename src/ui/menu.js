// ui/menu.js — écran titre et démarrage d'une partie.
// Lit     : l'élément #menu, FP.view (via createRun), FP.level.startRun.
// Écrit   : FP.state.current (nouveau run), state.mode.
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

  FP.state.current = FP.state.createRun();
})();
