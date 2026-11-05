// play/leakpop.js — bière anti-limaces : une limace saoule touchée par la pointe éclate (ce n'est pas une mort).
// Lit     : state.query.pops (world/collision.js : limaces touchées, seulement sous state.boosts.beer), FP.config.shop.popEco.
// Écrit   : state.world.leaks (la limace est retirée), state.query.pops (vidé), state.events (leakPop { x, y }) ;
//           le bonus passe par FP.scoring.awardFlat (arrondi, multiplié par la saison).
// Expose  : FP.leakPop.update(state) (appelé par FP.flow.update, pousse en cours). Gerbe, rot et cri : render/, audio/, ui/cheer.js.
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function update(state) {
    const pops = state.query.pops;
    if (!pops.length) return;
    state.world.leaks = state.world.leaks.filter(l => !pops.includes(l));
    for (const l of pops) {
      FP.scoring.awardFlat(state, l.cx, l.cy, FP.config.shop.popEco);
      state.events.push({ type: 'leakPop', x: l.cx, y: l.cy });
    }
    state.query.pops = [];
  }

  FP.leakPop = { update };
})();
