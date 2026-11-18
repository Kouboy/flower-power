// play/lab-hazards.js — l'horloge de chaque module du Lab et ses limaces (v5.13.0 ; v5.14.0 : une horloge par module). L'horloge d'un
// module part à l'entrée de la pointe dans sa bande (entre top et bottom) : ses rythmes (limaces, tourelles) sont ainsi les mêmes à chaque
// passage, et s'apprennent. Une limace de module fait un aller-retour sur son trajet, avec une période et une phase fixes ; elle n'accélère
// pas et ignore la bière.
// Lit     : state.{mode, flow.freeze, plant.tip}, state.world.{modules (top, bottom, live), leaks (celles qui ont lab : { period, phase, module })}.
// Écrit   : module.live.{t (s depuis l'entrée), on} ; leak.{cx, cy, cr, s (sens de marche), hitFlash} des limaces de module.
// Expose  : FP.labHazards.update(state, dt).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const tri = (u) => (u < .5 ? 2 * u : 2 - 2 * u);   // 0 → 1 → 0 sur une période

  function update(state, dt) {
    const mods = state.world.modules;
    if (!mods || !mods.length) return;
    const tip = state.plant.tip, live = state.mode === 'playing' && !(state.flow.freeze > 0);
    for (const M of mods) {
      const c = M.live;
      if (!c.on && live && tip && tip.y <= M.bottom && tip.y >= M.top) c.on = true;
      if (c.on && live) c.t += dt;
    }
    for (const l of state.world.leaks) {
      if (!l.lab) continue;
      const c = mods[l.lab.module].live, u = ((c.t / l.lab.period + l.lab.phase) % 1 + 1) % 1, k = tri(u) - .5;
      l.s = u < .5 ? 0 : Math.PI;   // sens de marche lu par FP.hazards.leakHeading (cos(s + phase), phase 0) : aller puis retour
      l.cx = l.x + Math.cos(l.angle) * l.len * k; l.cy = l.y + Math.sin(l.angle) * l.len * k; l.cr = l.r;
      l.hitFlash = Math.max(0, l.hitFlash - dt);
    }
  }

  FP.labHazards = { update };
})();
