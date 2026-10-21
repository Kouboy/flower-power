// core/loop.js — boucle principale, ordre fixe d'une frame.
// Lit     : FP.config.loop, FP.state.current, les modules FP.<système> présents, FP.perf (?perf=1).
// Écrit   : state.time, vide state.events en fin de frame.
// Expose  : FP.loop.UPDATE_ORDER, FP.loop.step(state, rawDt), FP.loop.start().
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Ordre de la spec §6. Chaque système expose update(state, dt) ; un système absent (pas encore porté) est sauté.
  // hazards avant collision (les limaces bougent avant la requête de pointe), camera en dernier (suit la pointe).
  // flow (mort, éclosion, transitions) après le score, avant la caméra.
  // Les systèmes tournent dans tous les modes sauf 'menu' : chacun décide selon state.mode.
  // powerups après scoring : ramassage et bouclier interceptent un choc avant que flow ne décide d'une mort.
  const UPDATE_ORDER = ['input', 'plant', 'hazards', 'collision', 'graze', 'scoring', 'powerups', 'flow', 'camera'];

  function step(state, rawDt) {
    const { maxDt, fallbackDt } = FP.config.loop;
    const dt = Number.isFinite(rawDt) && rawDt > 0 ? Math.min(rawDt, maxDt) : fallbackDt;
    state.time += dt;
    const perf = FP.perf;
    let t = perf && perf.begin(dt);

    if (state.mode !== 'menu') {
      for (const name of UPDATE_ORDER) {
        if (FP[name] && FP[name].update) FP[name].update(state, dt);
      }
    }
    if (FP.audio) FP.audio.consume(state.events, state, dt);
    if (perf) t = perf.mark('update', t);
    if (FP.render) FP.render.frame(state);
    if (perf) perf.mark('render', t);
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
