// core/loop.js — boucle principale, ordre fixe d'une frame.
// Lit     : FP.config.loop, FP.state.current, les modules FP.<système> présents, FP.perf (?perf=1).
// Écrit   : state.time, vide state.events en fin de frame.
// Expose  : FP.loop.UPDATE_ORDER, FP.loop.step(state, rawDt), FP.loop.start().
// Une erreur dans une frame est signalée une fois en console ; la partie continue à la frame suivante.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  // Ordre de la spec §6. Chaque système expose update(state, dt) ; un système absent (pas encore porté) est sauté.
  // hazards avant collision (les limaces bougent avant la requête de pointe), camera en dernier (suit la pointe).
  // flow (mort, éclosion, transitions) après le score, avant la caméra.
  // Les systèmes tournent dans tous les modes sauf 'menu' : chacun décide selon state.mode.
  // powerups après scoring : ramassage et bouclier interceptent un choc avant que flow ne décide d'une mort.
  const UPDATE_ORDER = ['input', 'plant', 'hazards', 'collision', 'graze', 'scoring', 'powerups', 'flow', 'camera'];

  // Messages déjà signalés : une erreur qui se répète à chaque frame ne s'affiche qu'une fois.
  const reported = new Set();

  function step(state, rawDt) {
    try { frame(state, rawDt); }
    catch (e) {
      const msg = (e && e.message) || String(e);
      if (!reported.has(msg)) { reported.add(msg); console.error('Flower Power : erreur dans la frame', e); }
    }
    state.events.length = 0;   // l'événement fautif n'est pas rejoué
  }

  function frame(state, rawDt) {
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
  }

  function start() {
    let last = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      const rawDt = (now - last) / 1000;
      last = now;
      if (FP.state.current) step(FP.state.current, rawDt);
    };
    requestAnimationFrame(tick);
  }

  FP.loop = { UPDATE_ORDER, step, start };
})();
