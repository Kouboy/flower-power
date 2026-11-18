// play/lab-pulse.js — l'impulsion montante des modules du Lab (v5.12.0 ; v5.14.0 : par module) : dans les modules qui en ont une
// (assets/lab/circuits.js, pulse), une colonne de gaz part de la buse au pied d'une voie et remonte la voie plus vite que la pousse,
// mortelle au contact, puis se dissipe en haut de la voie. On l'évite en changeant de voie (la tige ne s'arrête jamais).
// Cycle d'un module : il démarre quand la pointe entre dans sa bande (entre top et bottom), s'arrête quand elle en sort, meurt, ou à la
// génération (nouveau niveau, nouveaux modules). La première impulsion part dans la voie où la pointe n'est pas, puis les voies alternent ;
// une annonce de warn s (la buse s'allume et siffle) précède chaque départ, donc toujours au moins warn s avant que la colonne atteigne la
// pointe ; un départ toutes les period s ; colonne de length × viewH, à speedK × la vitesse de la pousse × pulse.slow.
// Lit     : state.{mode, flow.freeze, plant.tip}, state.world.{viewH, solids, modules (circuit.pulse, lanes, top, bottom, live.pulse)},
//           FP.config.lab.pulse, FP.plant.speed.
// Écrit   : module.live.pulse = { active, next (s avant la prochaine annonce), k (rang dans le tour des voies), shots: [{ lane, warn (s
//           restantes d'annonce), front (haut de la colonne, monde), v (px/s), solid }] } ; solides 'pulse' (rectangle de la colonne, off
//           pendant l'annonce) dans state.world.solids ; state.events (labWarn { lane, module } à chaque annonce, labPulse { lane, module } à chaque départ).
// Expose  : FP.labPulse.update(state, dt), FP.labPulse.speedFor(state, module) → px/s (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  function speedFor(state, M) {
    const p = M.circuit.pulse;
    return FP.config.lab.pulse.speedK * FP.plant.speed(state) * ((p && p.slow) || 1);
  }

  function solidFor(lane) {
    return { kind: 'pulse', lab: true, lane, x: 0, y: 0, a: 0, flip: 1, collision: [[0, 0], [0, 0], [0, 0], [0, 0]], broadR: 0,
      flyoverEligible: false, grazeRadius: 0, off: true };
  }

  // Colonne [front, front + longueur], bornée à la voie (de y0, le haut, à y1, la buse).
  function shape(o, l, front, len) {
    const ya = Math.max(l.y0, front), yb = Math.min(l.y1, front + len);
    if (yb <= ya) { o.off = true; return; }
    const hw = (l.x1 - l.x0) / 2, hh = (yb - ya) / 2;
    o.x = (l.x0 + l.x1) / 2; o.y = (ya + yb) / 2;
    o.collision = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]; o.broadR = Math.hypot(hw, hh);
  }

  function clear(state, st) {
    const solids = state.world.solids;
    for (const s of st.shots) { const i = solids.indexOf(s.solid); if (i >= 0) solids.splice(i, 1); }
    st.shots = []; st.active = false;
  }

  function announce(state, M, lane) {
    const st = M.live.pulse, solid = solidFor(lane);
    st.shots.push({ lane, warn: FP.config.lab.pulse.warn, front: M.lanes[lane].y1, v: 0, solid });
    state.world.solids.push(solid);
    state.events.push({ type: 'labWarn', lane, module: M.index });
  }

  function step(state, M, dt) {
    const st = M.live.pulse, pulse = M.circuit.pulse, tip = state.plant.tip;
    if (state.mode !== 'playing' || !tip || tip.y < M.top || tip.y > M.bottom) { if (st.active || st.shots.length) clear(state, st); return; }
    if (state.flow.freeze > 0) return;
    const cfg = FP.config.lab.pulse, len = cfg.length * state.world.viewH;
    if (!st.active) {   // entrée : la première dans la voie où la pointe n'est pas
      st.active = true;
      const away = pulse.lanes.findIndex(i => tip.x < M.lanes[i].x0 || tip.x > M.lanes[i].x1);
      st.k = away >= 0 ? away : 0; st.next = 0;
    }
    st.next -= dt;
    if (st.next <= 0) { announce(state, M, pulse.lanes[st.k % pulse.lanes.length]); st.k++; st.next += pulse.period || cfg.period; }   // période propre au module (v5.12.2)
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i], l = M.lanes[s.lane];
      if (s.warn > 0) {
        s.warn -= dt;
        if (s.warn > 0) continue;
        s.v = speedFor(state, M); s.solid.off = false; state.events.push({ type: 'labPulse', lane: s.lane, module: M.index });
      }
      s.front -= s.v * dt;
      if (s.front + len <= l.y0) { const j = state.world.solids.indexOf(s.solid); if (j >= 0) state.world.solids.splice(j, 1); st.shots.splice(i, 1); continue; }
      s.solid.off = false; shape(s.solid, l, s.front, len);
    }
  }

  function update(state, dt) {
    for (const M of state.world.modules || []) if (M.circuit.pulse) step(state, M, dt);
  }

  FP.labPulse = { update, speedFor };
})();
