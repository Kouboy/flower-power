// debug/freecam.js — caméra libre pour inspecter un niveau (?freecam=1).
// Lit     : FP.params.freecam, FP.state.current.
// Écrit   : state.camera via FP.camera.scrollBy (comme un périphérique d'entrée).
// Expose  : rien.
// Molette, flèches haut/bas, glisser vertical ; Début/Fin = haut/bas du monde.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};
  if (!FP.params.freecam) return;

  const STEP = 60;
  const scroll = (dy) => { const s = FP.state.current; if (s && s.mode !== 'menu') FP.camera.scrollBy(s, dy); };

  window.addEventListener('wheel', (e) => { e.preventDefault(); scroll(e.deltaY); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const big = 1e6;
    const moves = { ArrowUp: -STEP, ArrowDown: STEP, Home: -big, End: big };
    if (e.key in moves) { e.preventDefault(); scroll(moves[e.key]); }
  });

  // Glisser : le monde suit le doigt / la souris.
  let dragY = null;
  window.addEventListener('pointerdown', (e) => { dragY = e.clientY; });
  window.addEventListener('pointermove', (e) => {
    if (dragY === null) return;
    scroll(dragY - e.clientY);
    dragY = e.clientY;
  });
  window.addEventListener('pointerup', () => { dragY = null; });
})();
