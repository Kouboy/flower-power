// ui/menu.js — écran d'accueil « PRESS TO START » (premier appui : son, plein écran sur écran tactile, réveil du titre),
// puis démarrage d'une partie depuis l'écran titre (dessiné par ui/title.js) ou la fin de partie.
// Lit     : le clavier (Espace / Entrée → FP.input.press en partie), FP.view (via createRun), FP.level.startRun, FP.plant.launch,
//           FP.scoring.records, FP.certificate.canRestart, FP.title.{wake,wantsFullscreen}, document.documentElement (plein écran), screen.orientation.
// Écrit   : FP.state.current (nouveau run), state.mode, state.events (runStart), state.camera.y (titre : tout en haut, sur le ciel),
//           state.score.recordBefore (records d'avant la partie, pour le certificat) ;
//           à chaque redimensionnement, la taille de vue du run.
// Expose  : rien.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Run du titre : la caméra montre le ciel et la pelouse. Au lancement, il commence figé sur l'écran d'accueil.
  function titleRun(mode) {
    const state = FP.state.createRun();
    state.camera.y = 0;
    state.mode = mode;
    return state;
  }

  // Plein écran et portrait verrouillé quand le navigateur le permet (Android) ; sinon (iPhone, refus), on continue sans.
  function goFullscreen() {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      const lock = () => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); };
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (e) { /* plein écran refusé : le jeu continue dans la page */ }
  }

  // Le toucher en pixels d'art de la toile d'interface, comparé à la zone de l'icône du son.
  function onIcon(e) {
    const canvas = FP.view.canvas, r = canvas.getBoundingClientRect(), S = FP.px.SCALE;
    const ax = (e.clientX - r.left) * FP.view.W / r.width / S, ay = (e.clientY - r.top) * FP.view.H / r.height / S;
    return FP.title.hitIcon(ax, ay, FP.view.ui.w, FP.view.ui.h);
  }

  // Premier appui : le son est débloqué par audio.js (même geste) ; le titre se réveille, la partie ne démarre pas encore.
  // Le plein écran attend le lever du doigt : au doigt, seul pointerup compte comme geste pour le navigateur.
  let fullscreenPending = false;
  function wake(s, pointerType) {
    fullscreenPending = FP.title.wantsFullscreen(pointerType);
    FP.title.wake(s);
    FP.audio.sfx('wake');   // après unlock (même geste) : le son est débloqué
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
    if (s && s.mode === 'splash') { e.preventDefault(); wake(s, e.pointerType); return; }
    // Titre : un toucher sur l'icône du son change le réglage, sans lancer la partie.
    if (s && s.mode === 'menu' && onIcon(e)) { e.preventDefault(); FP.audio.cycleSetting(); return; }
    if (!atStart(s)) return;
    e.preventDefault();
    if (mayStart(s)) startRun();
  });

  window.addEventListener('pointerup', () => { if (fullscreenPending) { fullscreenPending = false; goFullscreen(); } });

  // Clavier (v3) : Espace ou Entrée démarre depuis le titre ou la fin de partie, sinon vaut un appui.
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    const s = FP.state.current;
    if (s && s.mode === 'splash') wake(s);
    else if (atStart(s)) { if (mayStart(s)) startRun(); }
    else FP.input.press();
  });

  // Redimensionnement (après render/view.js, chargé avant) : au menu on repart d'un run neuf à la bonne taille,
  // en partie on garde le niveau et on adapte seulement la hauteur visible.
  window.addEventListener('resize', () => {
    const s = FP.state.current;
    if (!s || s.mode === 'splash' || s.mode === 'menu') FP.state.current = titleRun(s ? s.mode : 'splash');
    else FP.state.applyView(s, FP.view);
  }, { passive: true });

  FP.state.current = titleRun('splash');
})();
