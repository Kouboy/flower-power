// play/lab-hazards.js — l'horloge d'un module de l'Encounter Lab et ses limaces (v5.13.0). L'horloge part à l'entrée de la pointe dans le
// module (entre top et bottom) : les rythmes d'un module (limaces, tourelles) sont ainsi les mêmes à chaque passage, et s'apprennent.
// Une limace de module fait un aller-retour sur son trajet, avec une période et une phase fixes ; elle n'accélère pas et ignore la bière.
// Lit     : state.{mode, flow.freeze, plant.tip}, state.world.{labLevel.{top, bottom}, leaks (celles qui ont lab : { period, phase })}.
// Écrit   : state.labClock = { level, t (s depuis l'entrée), on } ; leak.{cx, cy, cr, hitFlash} des limaces de module.
// Expose  : FP.labHazards.update(state, dt).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const tri = (u) => (u < .5 ? 2 * u : 2 - 2 * u);   // 0 → 1 → 0 sur une période

  function update(state, dt) {
    const L = state.world.labLevel;
    if (!L) return;
    if (!state.labClock || state.labClock.level !== L) state.labClock = { level: L, t: 0, on: false };   // nouveau niveau : l'horloge repart
    const c = state.labClock, tip = state.plant.tip, live = state.mode === 'playing' && !(state.flow.freeze > 0);
    if (!c.on && live && tip && tip.y <= L.bottom && tip.y >= L.top) c.on = true;
    if (c.on && live) c.t += dt;
    for (const l of state.world.leaks) {
      if (!l.lab) continue;
      const k = tri(((c.t / l.lab.period + l.lab.phase) % 1 + 1) % 1) - .5;
      l.cx = l.x + Math.cos(l.angle) * l.len * k; l.cy = l.y + Math.sin(l.angle) * l.len * k; l.cr = l.r;
      l.hitFlash = Math.max(0, l.hitFlash - dt);
    }
  }

  FP.labHazards = { update };
})();
