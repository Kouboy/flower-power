// ui/menu.js — écran titre et démarrage d'une partie.
// Lit     : l'élément #menu, le clavier (Espace / Entrée → FP.input.press en partie), FP.view (via createRun), FP.level.startRun, FP.plant.launch.
// Écrit   : FP.state.current (nouveau run), state.mode, state.events (runStart) ; à chaque redimensionnement, la taille de vue du run.
// Expose  : rien.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  const menu = document.getElementById('menu');

  function startRun() {
    const state = FP.state.createRun();
    FP.level.startRun(state);
    state.events.push({ type: 'runStart' });
    FP.plant.launch(state);
    FP.state.current = state;
    menu.style.display = 'none';
  }

  window.addEventListener('pointerdown', (e) => {
    // Écran titre ou fin de partie : un appui démarre un run neuf.
    const mode = FP.state.current && FP.state.current.mode;
    if (mode !== 'menu' && mode !== 'over') return;
    e.preventDefault();
    startRun();
  });

  // Clavier (v3) : Espace ou Entrée démarre depuis le titre ou la fin de partie, sinon vaut un appui.
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    const mode = FP.state.current && FP.state.current.mode;
    if (mode === 'menu' || mode === 'over') startRun();
    else FP.input.press();
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
