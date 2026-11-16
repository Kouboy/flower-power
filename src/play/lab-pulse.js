// play/lab-pulse.js — l'impulsion montante de l'Encounter Lab (v5.12.0) : dans les circuits qui en ont une (assets/lab/circuits.js,
// pulse), une colonne de gaz part de la buse au pied d'une voie et remonte la voie plus vite que la pousse, mortelle au contact, puis se
// dissipe en haut du circuit. On l'évite en changeant de voie (la tige ne s'arrête jamais).
// Cycle : il démarre quand la pointe entre dans le circuit (entre top et bottom), s'arrête quand elle en sort, meurt, ou à la génération.
// La première impulsion part dans la voie où la pointe n'est pas, puis les voies de l'impulsion alternent ; une annonce de warn s
// (la buse s'allume et siffle) précède chaque départ, donc toujours au moins warn s avant que la colonne atteigne la pointe ; un départ
// toutes les period s ; colonne de length × viewH, à speedK × la vitesse de la pousse × pulse.slow.
// Lit     : state.{mode, flow.freeze, plant.tip}, state.world.{viewH, solids, labLevel.{circuit.pulse, lanes, top, bottom}}, FP.config.lab.pulse,
//           FP.plant.speed.
// Écrit   : state.labPulse = { active, level, next (s avant la prochaine annonce), k (rang dans le tour des voies), shots: [{ lane, warn (s
//           restantes d'annonce), front (haut de la colonne, monde), v (px/s), solid }] } ; solides 'pulse' (rectangle de la colonne, off
//           pendant l'annonce) dans state.world.solids ; state.events (labWarn { lane } à chaque annonce, labPulse { lane } à chaque départ).
// Expose  : FP.labPulse.update(state, dt), FP.labPulse.speedFor(state, lane) → px/s (pur).
(function () {
  'use strict';
  const FP = window.FP = window.FP || {};

  const fresh = (level) => ({ active: false, level, next: 0, k: 0, shots: [] });

  function speedFor(state, lane) {
    const p = state.world.labLevel.circuit.pulse;
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

  function clear(state) {
    const st = state.labPulse, solids = state.world.solids;
    for (const s of st.shots) { const i = solids.indexOf(s.solid); if (i >= 0) solids.splice(i, 1); }
    st.shots = []; st.active = false;
  }

  function announce(state, lane) {
    const st = state.labPulse, solid = solidFor(lane), L = state.world.labLevel;
    st.shots.push({ lane, warn: FP.config.lab.pulse.warn, front: L.lanes[lane].y1, v: 0, solid });
    state.world.solids.push(solid);
    state.events.push({ type: 'labWarn', lane });
  }

  function update(state, dt) {
    const L = state.world.labLevel;
    if (!state.labPulse || state.labPulse.level !== L) state.labPulse = fresh(L);   // nouveau niveau : tout repart de zéro
    const st = state.labPulse, pulse = L && L.circuit.pulse, tip = state.plant.tip;
    if (!pulse) return;
    if (state.mode !== 'playing' || !tip || tip.y < L.top || tip.y > L.bottom) { if (st.active || st.shots.length) clear(state); return; }
    if (state.flow.freeze > 0) return;
    const cfg = FP.config.lab.pulse, len = cfg.length * state.world.viewH;
    if (!st.active) {   // entrée : la première dans la voie où la pointe n'est pas
      st.active = true;
      const away = pulse.lanes.findIndex(i => tip.x < L.lanes[i].x0 || tip.x > L.lanes[i].x1);
      st.k = away >= 0 ? away : 0; st.next = 0;
    }
    st.next -= dt;
    if (st.next <= 0) { announce(state, pulse.lanes[st.k % pulse.lanes.length]); st.k++; st.next += cfg.period; }
    for (let i = st.shots.length - 1; i >= 0; i--) {
      const s = st.shots[i], l = L.lanes[s.lane];
      if (s.warn > 0) {
        s.warn -= dt;
        if (s.warn > 0) continue;
        s.v = speedFor(state, s.lane); s.solid.off = false; state.events.push({ type: 'labPulse', lane: s.lane });
      }
      s.front -= s.v * dt;
      if (s.front + len <= l.y0) { const j = state.world.solids.indexOf(s.solid); if (j >= 0) state.world.solids.splice(j, 1); st.shots.splice(i, 1); continue; }
      s.solid.off = false; shape(s.solid, l, s.front, len);
    }
  }

  FP.labPulse = { update, speedFor };
})();
