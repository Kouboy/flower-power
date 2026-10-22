// ui/menu.js — démarrage d'une partie depuis l'écran titre (dessiné par ui/title.js) ou la fin de partie.
// Lit     : le clavier (Espace / Entrée → FP.input.press en partie), FP.view (via createRun), FP.level.startRun, FP.plant.launch,
//           FP.scoring.records, FP.certificate.canRestart.
// Écrit   : FP.state.current (nouveau run), state.mode, state.events (runStart), state.camera.y (titre : tout en haut, sur le ciel),
//           state.score.recordBefore (records d'avant la partie, pour le certificat) ;
//           à chaque redimensionnement, la taille de vue du run.
// Expose  : rien.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Run du titre : la caméra montre le ciel et la pelouse.
  function titleRun() {
    const state = FP.state.createRun();
    state.camera.y = 0;
    return state;
  }

  function startRun() {
    const state = FP.state.createRun();
    state.score.recordBefore = { ...FP.scoring.records };
    FP.level.startRun(state);
    state.events.push({ type: 'runStart' });
    FP.plant.launch(state);
    FP.state.current = state;
  }

  // Titre : on démarre ; fin de partie : seulement une fois le tampon du certificat tombé (pas de relance par accident).
  const atStart = (s) => !!s && (s.mode === 'menu' || s.mode === 'over');
  const mayStart = (s) => s.mode === 'menu' || FP.certificate.canRestart(s);

  window.addEventListener('pointerdown', (e) => {
    const s = FP.state.current;
    if (!atStart(s)) return;
    e.preventDefault();
    if (mayStart(s)) startRun();
  });

  // Clavier (v3) : Espace ou Entrée démarre depuis le titre ou la fin de partie, sinon vaut un appui.
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    const s = FP.state.current;
    if (atStart(s)) { if (mayStart(s)) startRun(); }
    else FP.input.press();
  });

  // Redimensionnement (après render/view.js, chargé avant) : au menu on repart d'un run neuf à la bonne taille,
  // en partie on garde le niveau et on adapte seulement la hauteur visible.
  window.addEventListener('resize', () => {
    const s = FP.state.current;
    if (!s || s.mode === 'menu') FP.state.current = titleRun();
    else FP.state.applyView(s, FP.view);
  }, { passive: true });

  FP.state.current = titleRun();
})();
