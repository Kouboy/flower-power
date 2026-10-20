// core/loop.js — boucle principale, ordre fixe d'une frame.
// Lit     : FP.config.loop, FP.state.current, les modules FP.<système> présents.
// Écrit   : state.time, vide state.events en fin de frame.
// Expose  : FP.loop.UPDATE_ORDER, FP.loop.step(state, rawDt), FP.loop.start().
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Ordre de la spec §6. Un système absent (pas encore porté) est simplement sauté.
  const UPDATE_ORDER = ['input', 'plant', 'collision', 'graze', 'powerups', 'scoring'];

  function step(state, rawDt) {
    const { maxDt, fallbackDt } = FP.config.loop;
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, maxDt) : fallbackDt;
    state.time += dt;

    if (state.mode === 'playing') {
      for (const name of UPDATE_ORDER) {
        if (FP[name] && FP[name].update) FP[name].update(state, dt);
      }
    }
    if (FP.audio) FP.audio.consume(state.events);
    if (FP.render) FP.render.frame(state);
    state.events.length = 0;
  }

  function start() {
    let last = performance.now();
    const tick = (now) => {
      const rawDt = (now - last) / 1000;
      last = now;
      if (FP.state.current) step(FP.state.current, rawDt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  FP.loop = { UPDATE_ORDER, step, start };
})();
