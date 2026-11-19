// play/boss-spot.js — repérage des points faibles du boss (v5.16.0, retour de playtest : « des cibles autour des points faibles quand ils
// entrent dans le champ ») : une pompe intacte, puis le cœur à nu, est repérée la première fois qu'elle entre dans le champ pendant le
// niveau ; un événement fait sonner le verrouillage et le réticule doré (render/boss-reticle.js) se referme sur elle.
// Lit     : state.{mode, time, camera.y, bossFight.{destroyed, headOpen}}, state.world.{viewH, bossLevel.{targets, head}}, FP.config.boss.spot.
// Écrit   : state.bossSpot = { level, at: { [i | 'head']: temps du repérage } } (repart de zéro à chaque niveau de boss généré) ;
//           state.events (bossSpot { target: i | 'head', x, y }).
// Expose  : FP.bossSpot.update(state, dt).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function update(state) {
    const bl = state.world.bossLevel;
    if (!bl) return;
    if (!state.bossSpot || state.bossSpot.level !== bl) state.bossSpot = { level: bl, at: {} };
    if (state.mode !== 'playing') return;
    const sp = state.bossSpot, m = FP.config.boss.spot.margin * state.world.viewH, top = state.camera.y + m, bottom = state.camera.y + state.world.viewH - m;
    const spot = (id, o) => {
      if (sp.at[id] !== undefined || o.off || o.y < top || o.y > bottom) return;
      sp.at[id] = state.time;
      state.events.push({ type: 'bossSpot', target: id, x: o.x, y: o.y });
    };
    bl.targets.forEach((t, i) => { if (!state.bossFight.destroyed[i]) spot(i, t.solid); });
    if (state.bossFight.headOpen) spot('head', bl.head.solid);
  }

  FP.bossSpot = { update };
})();
